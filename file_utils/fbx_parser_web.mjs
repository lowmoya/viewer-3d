const FBX_HEADER = 'Kaydara FBX Binary  \0';

export { parseData };

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



async function parseFBXModel(data)
{
	const root = await fbxParser.parseFileData(data);
	console.log(root);

	/* There will be multiple geometry children in the case of multiple meshes.
	 * Handle this by having a parse geometry that if geometry is typeof Number
	 * will check each of the geometries for that number, or will just check
	 * the geometry of the single object if there is only one. */

	/* Look into the models rotation and scale within the fbx file and applying it.
	 * For OBJ can just default to a scale of 1 and a rotation of 0. */

	const geometry = root.Objects.Geometry;
	const polygon_indices = geometry.PolygonVertexIndex.properties[0];
	const face_count = polygon_indices.length / 3;
	const vertices = geometry.Vertices.properties[0];
	const normals = geometry.LayerElementNormal.Normals.properties[0];
	const uvs = geometry.LayerElementUV.UV.properties[0];
	const uv_indices = geometry.LayerElementUV.UVIndex.properties[0];

	
	const vbi = new Float32Array(face_count * 3 * 8);
	for (let f = 0; f < face_count; f++) {
		let face_indices = polygon_indices.slice(f * 3, f * 3 + 3);
		face_indices[2] = -face_indices[2] - 1;
		if (face_indices[0] < 0 || face_indices[1] < 0 || face_indices[2] < 0) {
			alert('Non-triangle faces not supported.');
			return;
		}
		

		for (let v = 0; v < 3; v++) {
			vbi[f * 24 + v * 8 + 0] = vertices[face_indices[v] * 3];
			vbi[f * 24 + v * 8 + 1] = vertices[face_indices[v] * 3 + 1];
			vbi[f * 24 + v * 8 + 2] = vertices[face_indices[v] * 3 + 2];

			vbi[f * 24 + v * 8 + 3] = normals[f * 9 + v * 3 + 0];
			vbi[f * 24 + v * 8 + 4] = normals[f * 9 + v * 3 + 1];
			vbi[f * 24 + v * 8 + 5] = normals[f * 9 + v * 3 + 2];

			vbi[f * 24 + v * 8 + 6] = uvs[uv_indices[f * 3 + v] * 2 + 0];
			vbi[f * 24 + v * 8 + 7] = uvs[uv_indices[f * 3 + v] * 2 + 1];
		}

	}
	
	gl.bufferData(gl.ARRAY_BUFFER, vbi, gl.DYNAMIC_DRAW);
	vertex_count = face_count * 3;


	// Stop here, unless there is an embedded texture
	if (root.Objects.Video == undefined || root.Objects.Video.Content == undefined)
		return;
	
	if (texture == undefined) {
		texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, texture);
	}



	// Load the texture from the embedded image.
	// The embedded image stored is the entire png file, turn it to a blob so the file reader
	// can read it, then use that to convert it to the data url, so the image can take it as a
	// source.
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
	reader.readAsDataURL(new Blob([root.Objects.Video.Content.properties[0]]));

	return true;
}
