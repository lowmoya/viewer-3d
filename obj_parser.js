const fs = require('fs');



function parse(data) {
	/* Extract file information. */
	var lines = data.split('\n');
	var vertices = []
	var vertex_normals = [];
	var faces = [];

	for (line of lines) {
		let output_type = -1, output_destination = null;
		switch(line.substring(0, 2)) {
		case 'v ':
			output_type = 0;
			output_destination = vertices;
			break;
		case 'vn':
			output_type = 0;
			output_destination = vertex_normals;
			break;
		case 'f ':
			output_type = 1;
			output_destination = faces;
			break;
		}

		if (output_type == 0) {
			let elems = line.split(' ');
			if (elems.length != 4) {
				console.error(`Invalid line: '${line}'.`);
				return;
			}

			let entry = []
			for (let i = 0; i < 3; i++) {
				if (isNaN(entry[i] = parseFloat(elems[i + 1]))) {
					console.error(`Invalid line: '${line}'.`);
					return;
				}
			}

			output_destination.push(entry);
		} else if (output_type == 1) {
			elems = line.split(' ');
			if (elems.length != 4) {
				console.error(`Invalid line: '${line}'.`);
				return;
			}

			let entry = new Array(3);
			for (let i = 0; i < 3; i++) {
				if ((entry[i] = elems[i + 1].split('/')).length != 3) {
					console.error(`Invalid line: '${line}'.`);
					return;
				}
				for (let j = 0; j < 3; j++) {
					if(isNaN(entry[i][j] = parseFloat(entry[i][j]))) {
						console.error(`Invalid line: '${line}'.`);
						return;
					}
				}
			}

			output_destination.push(entry);
		}
	}


	/* Construct new vertex information. */
	let vbi = [];
	for (face of faces)
		for (elem of face)
			vbi.push(vertices[elem[0] - 1].concat(vertex_normals[elem[2] - 1]));
}




fs.readFile('monkey.obj', 'utf8', (err, data) => { parse(data); });
