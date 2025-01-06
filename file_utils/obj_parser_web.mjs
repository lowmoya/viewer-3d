import * as MaterialSelector from '../material_selector.mjs';

export { createGLB };

async function createGLB(data)
{
	/* Extract file information. */
	data = await parseData(data);
	if (data == null)
		return null;

	/* Start the user prompt for materials. */
	const mesh_names = [];
	for (const mesh of data.meshes)
		mesh_names.push(mesh.name);
	var material_prompt_results = MaterialSelector.open(mesh_names);

	/* Start GLB file. */
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

	/* Construct meshes. */
	for (const mesh_index in data.meshes) {
		const face_count = data.meshes[mesh_index].faces.length;

		// Collect data
		const position_data = new Float32Array(face_count * 3 * 3);
		// TODO once GLB supports not having the following data, add support for that here too
		const normal_data = new Float32Array(face_count * 3 * 3);
		const texcoord_data = new Float32Array(face_count * 3 * 2);


		// Collect position data
		for (const face_index in data.meshes[mesh_index].faces) {
			const face = data.meshes[mesh_index].faces[face_index];
			for (const vertex_index in face) {
				for (let comp = 0; comp < 3; ++comp) {
					position_data[9 * face_index + 3 * vertex_index + comp]
						= data.vertices[face[vertex_index][0] - 1][comp];
				}
			}
		}

		// Collect UV data
		if (typeof(data.meshes[mesh_index].faces[0][0][1]) == 'number') {
			for (const face_index in data.meshes[mesh_index].faces) {
				const face = data.meshes[mesh_index].faces[face_index];
				for (const vertex_index in face) {
					for (let comp = 0; comp < 2; ++comp) {
						texcoord_data[9 * face_index + 2 * vertex_index + comp]
							= data.uvs[face[vertex_index][1] - 1][comp];
					}
				}
			}
		}

		// Collect normal data
		if (typeof(data.meshes[mesh_index].faces[0][0][2]) == 'number') {
			for (const face_index in data.meshes[mesh_index].faces) {
				const face = data.meshes[mesh_index].faces[face_index];
				for (const vertex_index in face) {
					for (let comp = 0; comp < 3; ++comp) {
						normal_data[9 * face_index + 3 * vertex_index + comp]
							= data.normals[face[vertex_index][2] - 1][comp];
					}
				}
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

		glb.meshes.push({ name: data.meshes[mesh_index].name, primitives: [ primitive ] });
		glb.nodes.push({ mesh: mesh_index, name: data.meshes[mesh_index].name });
		glb.scenes[0].nodes.push(mesh_index);
	}

	// Handle user-selected materials
	material_prompt_results = await material_prompt_results;
	if (material_prompt_results == 'Canceled')
		return null;

	// TODO add custom samplers
	glb.samplers[0] = { magFilter: 9729, minFilter: 9987 };

	for (const material of material_prompt_results[0]) {
		const materialEntry = {
			doubleSided: false,
			name: material.name,
			pbrMetallicRoughness: {
				name: material.name,
				metallicFactor: 0,
				roughnessFactor: 0.5
			}
		}
		if (material.image != undefined) {
			// TODO make it change mimetype for JPG, not relavent for this viewer but likely will be
			//		for unity
			// TODO copy the file name too
			materialEntry.pbrMetallicRoughness.baseColorTexture = { index: glb.textures.length };
			glb.textures.push({ sampler: 0, source: glb.images.length });
			glb.images.push({
				bufferView: embedded_entries.length,
				mimeType: 'image/png',
				name: 'untitled'
			});
			embedded_entries.push(new Uint8Array(material.image));
		} else {
			materialEntry.pbrMetallicRoughness.baseColorFactor = material.color;
		}

		glb.materials.push(materialEntry);
	}

	for (const mesh_index in material_prompt_results[1])
		glb.meshes[mesh_index].primitives[0].material = material_prompt_results[1][mesh_index];



	// Combine embedded data chunks and generate buffer views
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

async function parseData(data)
{
	/* Extract file information. */
	const vertices = []
	const vertex_normals = [];
	const texture_positions = [];
	const meshes = [{name: 'Default', faces: []}];
	var faces = meshes[0].faces;


	// TODO start out with array buffer data
	for (const line of data.split('\n')) {
		let output_type = -1, output_count, output_destination = null, flip = false;
		switch(line.substring(0, 2)) {
		case 'v ':
			output_type = 0;
			output_count = 3;
			output_destination = vertices;
			break;
		case 'vn':
			output_type = 0;
			output_count = 3;
			output_destination = vertex_normals;
			break;
		case 'vt':
			output_type = 0;
			output_count = 2;
			output_destination = texture_positions;
			flip = true;
			break;
		case 'f ':
			output_type = 1;
			output_destination = faces;
			break;
		case 'o ':
			const new_mesh = { 'name': line.substr(2), 'faces': [] }
			if (faces.length == 0)
				--meshes.length;
			meshes.push(new_mesh);
			faces = new_mesh.faces;
			break;
		}

		if (output_type == 0) {
			const elems = line.split(' ');
			if (elems.length != output_count + 1) {
				console.error(`Invalid line: '${line}'.`);
				return;
			}

			const entry = []
			for (let i = 0; i < output_count; i++) {
				if (isNaN(entry[i] = parseFloat(elems[i + 1]))) {
					console.error(`Invalid line: '${line}'.`);
					return;
				}
			}

			// TODO why doesn't this just flip it
			if (false)
				entry[1] = -entry[1];

			output_destination.push(entry);
		} else if (output_type == 1) {
			const elems = line.split(' ');
			if (elems.length != 4) {
				console.error(`Invalid line: '${line}'.`);
				return;
			}

			const entry = new Array(3);
			for (let i = 0; i < 3; i++) {
				entry[i] = elems[i + 1].split('/');
				if (entry[i] < 1 || entry[i] > 3) {
					console.error(`Invalid line: '${line}'.`);
					return;
				}
				for (let j = 0; j < entry[i].length; j++) {
					if(entry[i][j] != '' && isNaN(entry[i][j] = parseFloat(entry[i][j]))) {
						console.error(`Invalid line: '${line}'.`);
						return;
					}
				}
			}

			output_destination.push(entry);
		}
	}

	return {
		vertices: vertices, normals: vertex_normals, uvs: texture_positions, meshes: meshes
	};
}
