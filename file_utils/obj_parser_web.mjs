export { parseData };

function parseData(data)
{
	/* Extract file information. */
	const vertices = []
	const vertex_normals = [];
	const texture_positions = [];

	var faces = [];

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

	return { vertices: vertices, normals: vertex_normals, uvs: texture_positions, faces: faces };
}

async function parseOBJModel(data)
{
	/* Extract file information. */
	const model = objParser.parseFileData(data);

	/* Construct new vertex information. */
	const vbi = new Float32Array(model.faces.length * 3 * 8);
	var has_uvs = false;
	var has_normals = false;
	if (model.faces.length != 0) {
		if (typeof(model.faces[0][0][1]) == 'number')
			has_uvs = true;
		if (typeof(model.faces[0][0][2]) == 'number')
			has_normals = true;
	}

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
	gl.bufferData(gl.ARRAY_BUFFER, vbi, gl.DYNAMIC_DRAW);
	vertex_count = model.faces.length * 3;
}
