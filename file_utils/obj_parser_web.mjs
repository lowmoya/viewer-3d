export { parseFileData };

function parseFileData(data)
{
	/* Extract file information. */
	const vertices = []
	const vertex_normals = [];
	const texture_positions = [];
	const faces = [];

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
