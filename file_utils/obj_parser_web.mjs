import * as MaterialSelector from '../material_selector.mjs'

export { createGLB };

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
		let output_type = -1, output_count, output_destination = null;
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

	console.log(meshes);
	return {
		vertices: vertices, normals: vertex_normals, uvs: texture_positions, meshes: meshes
	};
}

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
		accessors: [],
		meshes: [],
		nodes: [],
		scene: 0,
		scenes: [ [] ],
	}
	const embedded_entries = [];

	/* Construct meshes. */
	for (const mesh_index in data.meshes) {
		const face_count = data.meshes[mesh_index].faces.length;
		// TODO this can mess up indexing with the materials
		if (face_count == 0)
			continue;

		// Collect data
		const position_data = new Float32Array(face_count * 3 * 3);
		const normal_data = new Float32Array(face_count * 3 * 3);
		const texcoord_data = new Float32Array(face_count * 3 * 2);


		console.log(face_count);
		// Collect position data
		for (const face_index in data.meshes[mesh_index].faces.length) {
			const face = data.meshes[mesh_index].faces[face_index];
			for (const vertex_index in face) {
				for (let comp = 0; comp < 3; ++comp) {
					position_data[9 * face_index + 3 * vertex_index + comp]
						= data.vertices[9 * face[vertex_index][0] + 3 * vertex_index][comp];
				}
			}
		}
		console.log(position_data, data.vertices);

		// Collect UV data
		if (typeof(data.meshes[mesh_index].faces[0][0][1]) == 'number') {
			for (const face in data.meshes[mesh_index].faces.length) {
				for (const vertex in face) {

				}
			}
		}

		// Collect normal data
		if (typeof(data.meshes[mesh_index].faces[0][0][2]) == 'number') {
			for (const face in data.meshes[mesh_index].faces.length) {
				for (const vertex in face) {

				}
			}

		}

		const primitive = {};


		// Create structures
		glb.meshes.push({ name: data.meshes[mesh_index].name, primitives: [ primitive ] });
		glb.nodes.push({ mesh: mesh_index, name: data.meshes[mesh_index].name });
		glb.scenes[0].push(mesh_index);

		for (const face in model.faces) {
			for (const vertex in model.faces[face]) {
				/* Common values */
				const vertex_data = model.faces[face][vertex];
				var offset = face * 3 * 8 + vertex * 8;

				/* Insert vertex data */
				for (let e = 0; e < 3; ++e)
					vbi[offset + e] = model.vertices[vertex_data[0] - 1][e];
				offset += 3;
				if (has_normals)
					for (let e = 0; e < 3; ++e)
						vbi[offset + e] = model.normals[vertex_data[2] - 1][e];
				else
					for (let e = 0; e < 3; ++e)
						vbi[offset + e] = 0;
				offset += 3;
				if (has_uvs)
					for (let e = 0; e < 2; ++e)
						vbi[offset + e] = model.uvs[vertex_data[1] - 1][e];
				else
					for (let e = 0; e < 2; ++e)
						vbi[offset + e] = 0;
			}
		}

		vertex_count = model.faces.length * 3;
	}

	// Handle user-selected materials
	

	// Combine embedded data and generate buffer views

	return glb;
}
