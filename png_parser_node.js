const zlib = require('zlib');

const ChunkTypes = Object.freeze({
	IHDR: 1229472850,
	PLTE: 1347179589,
	IDAT: 1229209940,
	IEND: 1229278788,
});

require('fs').readFile('pyramid.png', (error, data) => {
	if (error) {
		console.error('missing file');
	} else {
		parsePNG(data);
	}
})


/* Note: PNGs are big-endian. */
const header = Uint8Array.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
async function parsePNG(data) {
	const byte_view = new Uint8Array(data);
	const generic_view = new DataView(data.buffer);

	// Check header
	for (let i = 0; i < header.length; i++) {
		if (header[i] != byte_view[i]) {
			console.log('Bad header');
			return null;
		}
	}


	// Image variables
	var image = {}
	var color_type, compression_method, filter_method, interlace_method;
	var data;

	// Parse chunks
	let index = header.length;
	while (index < data.length) {
		let length = generic_view.getUint32(index);
		let chunk_type = generic_view.getUint32(index + 4);
	
		// Ensure 'header' chunk is included once at the front, and only that time
		// Consider moving this into associated types ? at IHDR ensure index = start,
		// at ones that require the reading properties, fail if unstored
		if (index == header.length) {
			if (chunk_type != ChunkTypes.IHDR) {
				console.log('First chunk must be IHDR.');
				console.log(chunk_type, ChunkTypes.IHDR);
				return null;
			}
		} else {
			if (chunk_type == ChunkTypes.IHDR) {
				console.log('IHDR chunk can only be in the first chunk.');
				return null;
			}
		}

		switch (chunk_type) {
			case ChunkTypes.IHDR:
				console.log('IHDR', length);
				image.width = generic_view.getUint32(index + 8);
				image.height = generic_view.getUint32(index + 12);
				image.bit_depth = byte_view[index + 16];
				color_type = byte_view[index + 17];
				compression_method = byte_view[index + 18];
				filter_method = byte_view[index + 19];
				interlace_method = byte_view[index + 20]
				
				console.log('Bit depth ', image.bit_depth, '\nColor type ', color_type, '\nCompression method ',
						compression_method, '\nFilter method ', filter_method, '\nInterlace method ', interlace_method, '\n');
				break;
			case ChunkTypes.PLTE:
				console.log('PLTE', length);
				if (color_type != 3) {
					console.error('PLTE chunk invalid with this color type.');
				}
				break;
			case ChunkTypes.IDAT:
				console.log('IDAT', length);
				if (data == undefined)
					data = Buffer.from(byte_view.slice(index + 8, index + 8 + length));
				else
					data = Buffer.concat([data, byte_view.slice(index + 8, index + 8 + length)]);
				break;
			case ChunkTypes.IEND:
				console.log('IEND', length);
				pixels = await new Promise((resolve, reject) => {
					zlib.inflate(data, (error, result) => {
						if (error) {
							reject(error);
						} else {
							resolve(result);
						}
					});
				});
				console.log(pixels);
				break;
			default:
				if (!(byte_view[index + 4] & 32)) {
					console.error('Unimplemented required chunk type:', chunk_type);
					return null;
				}
		}


		index += length + 12;
	}
}

