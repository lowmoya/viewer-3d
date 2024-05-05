export { createGLB, createModel, freeModel, saveGLB };

// Take in a raw GLB file, validate it, and read it's
// data into a GLB structure
async function createGLB(data)
{
	const byte_view = new Uint8Array(data);
	const generic_view = new DataView(byte_view.buffer);

	/* Validate header. */
	if (generic_view.getUint32(0, true) != 0x46546C67) {
		console.error("Bad file header");
		return null;
	}
	const file_version = generic_view.getUint32(4, true);
	const file_length = generic_view.getUint32(8, true);

	/* Read first chunk, must be JSON content. */
	var index = 12;

	// Validate chunk header
	if (generic_view.getUint32(index + 4, true) != 0x4E4F534A) {
		console.error("Malformed file");
		return null;
	}

	// Read chunk data
	const first_length = generic_view.getUint32(index, true);
	const glb = JSON.parse(new TextDecoder().decode(byte_view.subarray(index + 8,
		index + 8 + first_length)));
	index += 8 + first_length;

	if (index == file_length) {
		console.log('File end.');
		return glb;
	}

	/* There may be padding between the two chunks, if the end of the first chunk doesn't align
	* to four bytes. */
	index = Math.ceil(index / 4) * 4;

	/* Read optional second chunk, must be binary buffer. */
	if (generic_view.getUint32(20 + first_length + 4, true) != 0x004e4942) {
		console.log('Unknown chunk header, file end.');
		return glb;
	}
	const second_length = generic_view.getUint32(20 + first_length, true);
	glb.embedded = byte_view.subarray(20 + first_length + 8,
		20 + first_length + 8 + second_length);

	return glb;
}

// Take in an OpenGL context and a GLB structure, return a model,
// which is a modification of the structure to removed unused members
// and push some of its data to the GPU
async function createModel(gl, glb) {
	/* Start model collection */
	// TODO change to only clone the fields that it directly copies
	const model = {};
	glb = structuredClone(glb);

	// Get a list of all nodes
	if (glb.scenes != undefined) {
		// Load node indices from a scene
		if (glb.scene == undefined) {
			// TODO change to prompt if #scenes > 1
			model.nodes = glb.scenes[0].nodes;
		} else {
			model.nodes = glb.scenes[glb.scene].nodes;
		}

		// Switch indices out for their objects and handle children
		for (let index = 0; index < model.nodes.length; ++index) {
			model.nodes[index] = glb.nodes[model.nodes[index]];

			// Add this nodes children
			if (model.nodes[index].children != undefined) {
				for (let child in model.nodes[index].children) {
					model.nodes.push(model.nodes[index].children[child]);
					model.nodes[index].children[child] = model.nodes.length - 1;
				}
			}
		}
	} else {
		model.nodes = glb.nodes;
	}
	if (model.nodes == undefined) {
		alert('Malformed file');
		return null;
	}

	// Get the used meshes and convert any individual transforms into a matrix
	model.meshes = [];
	for (let index = 0; index < model.nodes.length; ++index) {
		const node = model.nodes[index];
		if (node.mesh == undefined) {
			continue;
		}


		model.meshes[node.mesh] = glb.meshes[node.mesh];

		if (node.matrix == undefined) {
			node.matrix = [
				1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
			];

			if (node.scale != undefined) {
				node.matrix[0] = node.scale[0];
				node.matrix[5] = node.scale[1];
				node.matrix[10] = node.scale[2];
				delete node.scale;
			}

			if (node.translation != undefined) {
				node.matrix[12] = node.translation[0];
				node.matrix[13] = node.translation[1];
				node.matrix[14] = node.translation[2];
				delete node.translation;
			}

			if (node.rotation != undefined && node.rotation[3] != 1) {
				const q = node.rotation;
				delete node.rotation;

				let s = node.matrix[0];
				node.matrix[0] *= 1 - 2 * (q[1] * q[1] + q[2] * q[2]);
				node.matrix[1] = 2 * (q[0] * q[1] + q[2] * q[3]) * s;
				node.matrix[2] = 2 * (q[0] * q[2] - q[1] * q[3]) * s;

				s = node.matrix[5];
				node.matrix[4] = 2 * (q[0] * q[1] - q[2] * q[3]) * s;
				node.matrix[5] *= 1 - 2 * (q[0] * q[0] + q[2] * q[2]);
				node.matrix[6] = 2 * (q[1] * q[2] + q[0] * q[3]) * s;

				s = node.matrix[10];
				node.matrix[8] = 2 * (q[0] * q[2] + q[1] * q[3]) * s;
				node.matrix[9] = 2 * (q[1] * q[2] - q[0] * q[3]) * s;
				node.matrix[10] *= 1 - 2 * (q[0] * q[0] + q[2] * q[2]);
			}
		}

	}


	// Copy mesh data to primitives and adjust the mesh indices to erase
	// any gaps.
	// TODO if used on a machine of different endianness, will not work
	let last_index = 0;
	for (let index in model.meshes) {
		index = parseInt(index);

		// Copy mesh primitives to the GPU
		let mesh = model.meshes[index];
		for (let primitive of mesh.primitives) {
			if (primitive.indices != undefined) {
				primitive.attributes['INDICES'] = primitive.indices;
				primitive.vertices = glb.accessors[primitive.indices].count;
				primitive.indexed = true;
				delete primitive.indices;
			} else {
				primitive.vertices = glb.accessors[primitive.attributes['POSITION']].count;
				primitive.indexed = false;
			}


			for (let attribute_index in primitive.attributes) {
				const accessor
					= glb.accessors[primitive.attributes[attribute_index]];

				// Set descriptors
				const attribute = {
					componentType: accessor.componentType,
					entryCount: accessor.count
				}

				switch (accessor.type) {
					case 'SCALAR': attribute.componentsPerEntry = 1; break;
					case 'VEC2': attribute.componentsPerEntry = 2; break;
					case 'VEC3': attribute.componentsPerEntry = 3; break;
					case 'VEC4': attribute.componentsPerEntry = 4; break;
					case 'MAT2': attribute.componentsPerEntry = 4; break;
					case 'MAT3': attribute.componentsPerEntry = 9; break;
					case 'MAT4': attribute.componentsPerEntry = 16; break;
					default:
						console.error('Unsupported accessor type');
						attribute.componentsPerEntry = 1;
						break;
				}

				// Copy data to GPU
				// TODO: Support dataurls and for external bin files, prompt
				// for the user to upload them
				const buffer_view = glb.bufferViews[accessor.bufferView];
				if (buffer_view.buffer != 0 || glb.embedded == undefined) {
					console.error('Non data-block data is currently unsupported');
					return null;
				}

				// TODO look into stride
				attribute.buffer = gl.createBuffer()
				const buffer_loc = buffer_view.target ? buffer_view.target
					: attribute_index != 'INDICES' ? gl.ARRAY_BUFFER : gl.ELEMENT_ARRAY_BUFFER;
				gl.bindBuffer(buffer_loc, attribute.buffer);

				const data = glb.embedded.subarray(buffer_view.byteOffset,
					buffer_view.byteOffset + buffer_view.byteLength);
				console.log(attribute_index);
				console.log(new Float32Array(data.buffer, data.byteOffset, data.byteLength / 4));
				gl.bufferData(buffer_loc, data, gl.STATIC_DRAW);

				primitive.attributes[attribute_index] = attribute;
			}


			// Current support validation
			if (primitive.attributes.POSITION == undefined
					|| primitive.attributes.NORMAL == undefined
					|| primitive.attributes.TEXCOORD_0 == undefined) {
				console.error('Only meshes with position, normal, and uv information are supported currently');
				return null;
			}

			// Seperate indices
			// TODO Integer indices are incompatible with WebGL, manually index their elements.
			if (primitive.indexed) {
				primitive.indices = primitive.attributes.INDICES;
				delete primitive.attributes.INDICES;
			}
		}




		// Index is already satisfactory
		if (index - last_index < 2) {
			last_index = index;
			continue;
		}

		// Adjust index
		let new_index = last_index + 1;
		for (let ni in model.nodes)
			if (model.nodes[ni].mesh == index)
				model.nodes[ni].mesh = new_index;
		last_index = new_index;
	}
	model.meshes.length = last_index + 1;


	// Apply any parental nodes' transforms to their children
	// Get a list of top-level nodes
	const indices = new Array(model.nodes.length);
	for (let i = 0; i < indices.length; ++i)
		indices[i] = i;
	for (const node of model.nodes) {
		if (node.children == undefined)
			continue;
		for (let child of node.children) {
			const index = indices.indexOf(child);
			if (index != -1) {
				indices[index] = indices[indices.length - 1];
				--indices.length;
			}
		}
	}
	// Iterate through the indices, applying any needed transformations,
	// and adding children to the end of the list
	let node_index;
	while ((node_index = indices.shift()) != undefined) {
		const node = model.nodes[node_index];

		if (node.parent_matrix) {
			// Right multiply this nodes matrix with its parents transform
			let result = new Array(16);
			for (let lrow = 0; lrow < 4; ++lrow) {
				for (let rcol = 0; rcol < 4; ++rcol) {
					let sum = 0;
					for (let step = 0; step < 4; ++step) {
						sum += node.matrix[lrow * 4 + step]
							* node.parent_matrix[step * 4 + rcol];
					}
					result[lrow * 4 + rcol] = sum;
				}
			}
			delete node.parent_matrix;
			node.matrix = result;
		}

		if (node.children != undefined) {
			for (let child of node.children) {
				model.nodes[child].parent_matrix = node.matrix;
				indices.push(child);
			}
		}
	}

	// Load textures into to the GPU
	// TODO look into adittional textures and the other emissive factors
	// TODO this is an example of where it could just copy that section rather than the whole
	//		format
	model.materials = glb.materials;
	if (glb.textures != undefined)
		model.textures = [];
	for (let index in glb.textures) {
		const image_desc = glb.images[glb.textures[index].source];
		const buffer_view = glb.bufferViews[image_desc.bufferView];

		// TODO Add support for bufferviews with non-embedded buffers
		// TODO Add support for skipping bufferViews entirely
		if (buffer_view?.buffer != 0) {
			console.error("Non-embedded datatypes not currently supported");
			return null;
		}


		// Get an image with the data loaded in
		const rawBlob = new Blob([glb.embedded.subarray(
			buffer_view.byteOffset,
			buffer_view.byteOffset + buffer_view.byteLength
		)]);

		const image = await new Promise((res_img, rej_img) => {
			const image = new Image();
			image.onload = () => {
				res_img(image);
			};
			image.onerror = () => {
				// TODO what to do here
				console.log('Failed to load image');
				res(null);
			};
			const reader = new FileReader();
			reader.onload = () => {
				image.src = reader.result;
			};
			reader.onerror = () => {
				// TODO what to do here
				console.log('Failed to load image');
				res(null);
			}
			reader.readAsDataURL(rawBlob);
		});
		if (image == null)
			return;


		// Create a texture from the image
		model.textures[index] = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, model.textures[index]);

		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

		const sampler = glb.samplers?.[glb.textures[index].sampler];
		if (sampler != undefined) {
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, sampler.minFilter != undefined
				? sampler.minFilter : gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, sampler.magFilter != undefined
				? sampler.magFilter : gl.LINEAR);
		} else {
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		}

		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE,
			image);
		gl.generateMipmap(gl.TEXTURE_2D);
	}

	return model;
}

// Take in a model, created from loadGLB, and unload it's GPU-tied data
function freeModel(gl, model) {
	// Remove ties
	if (model.nodes != undefined)
		for (const node of model.nodes)
			node.mesh = undefined;

	// Free vertex data
	if (model.meshes != undefined) {
		for (const mesh of model.meshes) {
			for (const primitive of mesh.primitives) {
				gl.deleteBuffer(primitive.buffer);
			}
			if (mesh.indices != undefined) {
				gl.deleteBuffer(mesh.indices.buffer);
			}
		}
		model.meshes.length = 0;
	}

	// Free textures
	if (model.textures != undefined) {
		for (const texture of model.textures)
			gl.deleteTexture(texture);
		model.textures.length = 0;
	}
}


// Take in a GLB structure and return an array of output data
function saveGLB(glb) {
}
