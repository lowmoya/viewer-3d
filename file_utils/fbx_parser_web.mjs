import * as MaterialSelector from '../material_selector.mjs';

export { createGLB };

const FBX_HEADER = 'Kaydara FBX Binary  \0';

function collectNodes(parent_node, label) {
	switch(typeof(parent_node[label])) {
		case 'number':
			let count = parent_node[label];
			let collection = [];
			while (count-- != 0)
				collection[count] = parent_node[label + count];
			return collection;
		case 'object':
			return [ parent_node[label] ];
		default:
			return [];
	}
}


// Get a model from the parsed data
async function createGLB(data)
{
	const root = await parseData(data);
	console.log('fbx.createGLB input', structuredClone(root));

	const glb = {
		asset: { generator: 'Custom GLB Generator', version: '2.0' },
		buffers: [],
		bufferViews: [],
		accessors: [],
		meshes: [],
		nodes: [],
		scene: 0,
		scenes: [ { nodes: [] } ],
		samplers: [],
		images: [],
		textures: [],
		materials: [],
	}
	const embedded_entries = [];

	// Collect geometry and model information
	const geometries = collectNodes(root.Objects, 'Geometry');
	const models = collectNodes(root.Objects, 'Model');

	// Form GLB meshes from the geometry information
	for (let geometry of geometries) {
		const polygon_indices = geometry.PolygonVertexIndex.properties[0];
		const face_count = polygon_indices.length / 3;
		const vertices = geometry.Vertices.properties[0];
		const normals = geometry.LayerElementNormal.Normals.properties[0];
		const uvs = geometry.LayerElementUV.UV.properties[0];
		const uv_indices = geometry.LayerElementUV.UVIndex.properties[0];

		// Collect the vertex datas
		const position_data = new Float32Array(face_count * 3 * 3);
		const normal_data = new Float32Array(face_count * 3 * 3);
		const texcoord_data = new Float32Array(face_count * 3 * 2);

		for (let f = 0; f < face_count; f++) {
			let face_indices = polygon_indices.slice(f * 3, f * 3 + 3);
			face_indices[2] = -face_indices[2] - 1;
			if (face_indices[0] < 0 || face_indices[1] < 0 || face_indices[2] < 0) {
				alert('Non-triangle faces not supported.');
				return;
			}

			// TODO Look into the case of not having normals and/or uvs
			for (let v = 0; v < 3; v++) {
				position_data[f * 9 + v * 3 + 0] = vertices[face_indices[v] * 3 + 0];
				position_data[f * 9 + v * 3 + 1] = vertices[face_indices[v] * 3 + 1];
				position_data[f * 9 + v * 3 + 2] = vertices[face_indices[v] * 3 + 2];

				normal_data[f * 9 + v * 3 + 0] = normals[f * 9 + v * 3 + 0];
				normal_data[f * 9 + v * 3 + 1] = normals[f * 9 + v * 3 + 1];
				normal_data[f * 9 + v * 3 + 2] = normals[f * 9 + v * 3 + 2];

				texcoord_data[f * 9 + v * 2 + 0] = uvs[uv_indices[f * 3 + v] * 2 + 0];
				texcoord_data[f * 9 + v * 2 + 1] = uvs[uv_indices[f * 3 + v] * 2 + 1];
			}
		}

		// Create structures
		const primitive = { attributes: {} };

		primitive.attributes.POSITION = glb.accessors.length;
		glb.accessors.push({
			bufferView: embedded_entries.length,
			componentType: 5126,
			count: position_data.length / 3,
			type: 'VEC3'
		});
		embedded_entries.push(new Uint8Array(position_data.buffer));

		primitive.attributes.TEXCOORD_0 = glb.accessors.length;
		glb.accessors.push({
			bufferView: embedded_entries.length,
			componentType: 5126,
			count: texcoord_data.length / 2,
			type: 'VEC2'
		});
		embedded_entries.push(new Uint8Array(texcoord_data.buffer));

		primitive.attributes.NORMAL = glb.accessors.length;
		glb.accessors.push({
			bufferView: embedded_entries.length,
			componentType: 5126,
			count: normal_data.length / 3,
			type: 'VEC3'
		});
		embedded_entries.push(new Uint8Array(normal_data.buffer));

		// Add to GLB meshes list
		let mesh_name = geometry.properties?.[1];
		if (typeof(mesh_name) != 'string')
			mesh_name = 'Unnamed Mesh';
		glb.meshes.push({ name: mesh_name, primitives: [ primitive ] });
	}

	// Form GLB nodes from model information
	for (let model of models) {

		// Create the node
		let model_name = model.properties[1];
		if (typeof(model_name) != 'string')
			model_name = 'Unnamed Model';
		const node = { name: model_name };

		// Add the node to the scene and the node list
		glb.scenes[0].nodes.push(glb.nodes.length);
		glb.nodes.push(node);

		// Default translation information
		let translation = [0, 0, 0];
		let scale = [1, 1, 1];
		let rotation = [0, 0, 0];
		console.log('collected data', translation, scale, rotation);

		// Look through the properties for translation information
		let properties = collectNodes(model.Properties70, 'P');
		for (let property of properties) {
			property = property.properties;
			if (typeof(property[4]) != 'number' || typeof(property[5]) != 'number'
					|| typeof(property[6]) != 'number')
				continue;

			switch(property[0]) {
				case 'Lcl Translation':
					translation = [property[4], property[5], property[6]];
					break;
				case 'Lcl Scaling':
					if (property[4] != 100 || property[5] != 100 || property[6] != 100)
						scale = [property[4], property[5], property[6]];
					break
				case 'Lcl Rotation':
					rotation = [property[4] * Math.PI / 180, property[5] * Math.PI / 180,
						property[6] * Math.PI / 180];
					break
			}
		}
		console.log('SET TRANSFORMS', translation, scale, rotation);

		// Combine the translations into one matrix and store the matrix in the node
		const cx = Math.cos(rotation[0]), sx = Math.sin(rotation[0]);
		const cy = Math.cos(rotation[1]), sy = Math.sin(rotation[1]);
		const cz = Math.cos(rotation[2]), sz = Math.sin(rotation[2]);
		node.matrix = [
			scale[0] * cy * cz,	sx * sy * cz + cx * sz,	-cx * sy * cz + sx * sz, 0,
			-cy * sz, scale[1] * (-sx * sy * sz + cx * cz), cx * sy * sz + sx * cz, 0,
			sy, -sx * cy, scale[2] * cx * cy, 0,
			translation[0], translation[1],	translation[2], 1
		];
	}
	
	// Add the connections the geometry-model connections to the GLB structure
	let connections = collectNodes(root.Connections, 'C');
	const parented = []
	for (let connection of connections) {
		// TODO Currently no support for objects that belong to multiple objects. Need to loook
		// into how the multiple parent models works as well as how I could handle multiple meshes
		connection = connection.properties;
		if (parented[connection[1]] || connection[2] == 0n)
			continue;
		parented[connection[1]] = true;

		// The nodes and meshes were added in the same order of the models and geometry, so it can
		// be assumed that the index of a model/geometry will correspond to the index of its
		// GLB node/mesh
		let source = null, target = null;

		// Look for the source id in the geometries list
		for (const gi in geometries) {
			if (geometries[gi].properties[0] == connection[1]) {
				source = gi;
				break;
			}
		}

		// Source is a mesh, the target should be the node it belongs to
		if (source != null) {
			for (const mi in models) {
				if (models[mi].properties[0] == connection[2]) {
					target = mi;
					break;
				}
			}
			if (target == null)
				continue;

			glb.nodes[target].mesh = source;

			continue;

			// In the case of changing it to be primitive based, Consider replacing the stored
			// primitive in the primitives array with a structured
			// clone of it, if there are later changes to be made to it.
		}
		

		// Look for the source id in the models list
		for (const mi in models) {
			if (models[mi].properties[0] == connection[1]) {
				source = mi;
				break;
			}
		}

		// Source is a model, the target should be a parent model
		if (source != null) {
			for (const mi in models) {
				if (models[mi].properties[0] == connection[2]) {
					target = mi;
					break;
				}
			}
			if (target == null)
				continue;

			if (glb.nodes[target].children == null)
				glb.nodes[target].children = [ source ];
			else
				glb.nodes[target].children.push(source);

			glb.scenes[0].nodes[source] = glb.scenes[0].nodes[glb.scenes[0].nodes.length - 1];
			--glb.scenes[0].nodes.length;

			continue;
		}
	}

	

	// Stop here, unless there is an embedded texture
	/*if (root.Objects.Video == undefined || root.Objects.Video.Content == undefined)
		return;

	if (texture == undefined) {
		texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, texture);
	}

	const image = new Image();
	image.onload = () => {
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
	}
	const reader = new FileReader();
	reader.onload = () => {
		image.src = reader.result;
	};
	reader.readAsDataURL(new Blob([root.Objects.Video.Content.properties[0]]));*/



	// Embed all of the binary data
	var buffer_index = 0;
	for (const entry of embedded_entries)
		buffer_index += entry.byteLength;
	glb.buffers.push({ byteLength: buffer_index });

	glb.embedded = new Uint8Array(buffer_index);

	var buffer_index = 0;
	for (const entry of embedded_entries) {
		glb.bufferViews.push({
			buffer: 0,
			byteOffset: buffer_index,
			byteLength: entry.byteLength
		});
		glb.embedded.set(entry, buffer_index);
		buffer_index += entry.byteLength;
	}


	return glb;
}


// Get an object from the raw data, containing all of the information in the FBX file
async function parseData(data) {
	const byte_view = new Uint8Array(data);
	const generic_view = new DataView(byte_view.buffer);


	// Verify header
	const char_header = String.fromCharCode(...byte_view.slice(0, 21));
	for (let index = 0; index < 21; index++) {
		if (char_header[index] != FBX_HEADER[index]) {
			console.error('Invalid FBX header');
			return null;
		}
	}


	// can stop slicing , use byte offsets instead
	const version = generic_view.getUint32(23, true) & 16777215;
	if (version >= 7500) {
		console.error('Version unsupported...');
		return null;
	}


	// Storage
	const root = {}
	const last_parent = [ root ]

	// Loop
	var indices = [ {index: 27, depth: 0} ];
	let end, property_count, property_list_len, name_len, name;
	while (indices.length) {
		const {index, depth} = indices.pop();
		const node = {}

		end = generic_view.getUint32(index, true);
		property_count = generic_view.getUint32(index + 4, true);
		property_list_len = generic_view.getUint32(index + 8, true);
		name_len = byte_view[index + 12];
		name = String.fromCharCode(...byte_view.slice(index + 13, index + 13 + name_len))

		// Get the last parent and add the current node to this list
		last_parent.length = depth + 1;
		parent = last_parent[last_parent.length - 1];
		last_parent.push(node);


		// Add this node to the parent
		switch (typeof parent[name]) {
			case 'undefined':
				parent[name] = node;
				break;
			case 'number':
				parent[name + parent[name]] = node;
				++parent[name];
				break;
			default:
				parent[name + 0] = parent[name];
				parent[name + 1] = node;
				parent[name] = 2;
		}



		// Parse property
		node.properties = new Array()
		let offset = 13 + name_len
		while (property_count--) {
			let {read_size, data} = await parseProperty(index + offset);
			offset += read_size;
			node.properties.push(data);
		}

		// Add next node in sequence
		if (checkIndex(end))
			indices.push({index: end, depth: depth});

		// Add recursive list / null buffer
		let first_inner_node_index = index + 13 + name_len + property_list_len
		if (end != first_inner_node_index && checkIndex(first_inner_node_index))
			indices.push({index: first_inner_node_index, depth: depth + 1});
	}

	return root;


	// Related functions.
	function checkIndex(index) {
		for (let i = 0; i < 13; ++i)
			if (byte_view[index + i])
				return true;
		return false;
	}


	async function parseProperty(index) {
		let length;
		switch (String.fromCharCode(byte_view[index])) {
			case 'Y':
				return {
					read_size: 1 + 2,
					data: generic_view.getInt16(index + 1, true)
				};
			case 'C':
				return {
					read_size: 1 + 1,
					data: Boolean(byte_view[index + 1])
				};
			case 'I':
				return {
					read_size: 1 + 4,
					data: generic_view.getInt32(index + 1, true)
				};
			case 'F':
				return {
					read_size: 1 + 4,
					data: generic_view.getFloat32(index + 1, true)
				};
			case 'D':
				return {
					read_size: 1 + 8,
					data: generic_view.getFloat64(index + 1, true)
				};
			case 'L':
				return {
					read_size: 1 + 8,
					data: generic_view.getBigInt64(index + 1, true)
				};
			case 'f':
				return await parsePropertyArray(index + 1, Float32Array);
			case 'd':
				return await parsePropertyArray(index + 1, Float64Array);
			case 'l':
				return await parsePropertyArray(index + 1, Int64Array);
			case 'i':
				return await parsePropertyArray(index + 1, Int32Array);
			case 'b':
				// Can have something with map here at the return stage to make it return actual boolean
				// values.
				return await parsePropertyArray(index + 1, Int8Array);
			case 'S':
				length = generic_view.getUint32(index + 1, true);
				return {
					read_size: 1 + 4 + length,
					data: String.fromCharCode(...byte_view.slice(index + 1 + 4, index + 1 + 4 + length))
				};
			case 'R':
				length = generic_view.getUint32(index + 1, true);
				return {
					read_size: 1 + 4 + length,
					data: byte_view.slice(index + 1 + 4, index + 1 + 4 + length)
				};
		}

	}

	// idea, have a compressed count in root, increment each time an encoded array is passed,
	// have a .then for the decompressed data access overide the data and decrement the encoded array,
	// then either have a repeated check on completion every small frame of time for promise.resolve
	// or have on decrement if complete and then on complete checks, can delete root.complete
	async function parsePropertyArray(index, view_constructor) {
		const array_length = generic_view.getUint32(index, true);
		const encoded = generic_view.getUint32(index + 4, true);
		const compressed_length = generic_view.getUint32(index + 8, true);
		if (encoded) {
			const encoded_blob = new Blob([byte_view.slice(index + 12, index + 12 + compressed_length)]);
			const ds = new DecompressionStream('deflate');
			const sp = encoded_blob.stream().pipeThrough(ds);
			const decoded_blob = await new Response(sp).blob();
			const decoded = await decoded_blob.arrayBuffer();
			return {
				read_size: compressed_length,
				data: new view_constructor(decoded)
			};
		} else {
			const properties = { read_size: array_length * view_constructor.BYTES_PER_ELEMENT };
			properties.data = new view_constructor(byte_view.slice(index + 12, index + 12 +
					properties.read_size).buffer);
			return properties;
		}
	}
}



function arrayEquals(a, b) {
	if (a.length != b.length)
		return false;
	for (i in a)
		if (a[i] != b[i])
			return false;
	return true;
}



