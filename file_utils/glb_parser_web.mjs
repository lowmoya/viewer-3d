export { parseFileData };

function parseFileData(data)
{
	const byte_view = new Uint8Array(data);
	const generic_view = new DataView(byte_view.buffer);

	/* Read header. */
	if (generic_view.getUint32(0, true) != 0x46546C67) {
		console.error("Bad file header");
		return null;
	}
	const file_version = generic_view.getUint32(4, true);
	const file_length = generic_view.getUint32(8, true);

	var index = 12;

	/* Read first chunk, must be JSON content. */
	if (generic_view.getUint32(index + 4, true) != 0x4E4F534A) {
		console.error("Malformed file");
		return null;
	}
	const first_length = generic_view.getUint32(index, true);
	const first_data = byte_view.subarray(index + 8, index + 8 + first_length);
	console.log('First Chunk:', JSON.parse(new TextDecoder().decode(first_data)));

	index += 8 + first_length;

	if (index == file_length) {
		console.log('File end.');
		return null;
	}

	/* There may be padding between the two chunks, if the end of the first chunk doesn't align
	 * to four bytes. */
	index = Math.ceil(index / 4) * 4;

	/* Read optional second chunk, must be binary buffer. */
	if (generic_view.getUint32(20 + first_length + 4, true) != 0x004e4942) {
		console.log('Unknown chunk header, file end.');
		return null;
	}
	const second_length = generic_view.getUint32(20 + first_length, true);
	const second_data = byte_view.subarray(20 + first_length + 8, 20 + first_length + 8
			+ second_length);
	console.log('Second Chunk:', second_data);
	
}
