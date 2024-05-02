const http = require('http')
const fs = require('fs')

const pages = [
	'/',
	'/app.css',
	'/app.js',
	'/material_selector.mjs',
	'/file_utils/fbx_parser_web.mjs',
	'/file_utils/glb_parser_web.mjs',
	'/file_utils/obj_parser_web.mjs',
	'/shaders/plain.vert',
	'/shaders/plain.frag',
];
const page_bindings = [
	{ location: 'app.html',							type: 'text/html'},
	{ location: 'app.css',							type: 'text/css'},
	{ location: 'app.js',							type: 'text/javascript'},
	{ location: 'material_selector.mjs',			type: 'text/javascript'},
	{ location: 'file_utils/fbx_parser_web.mjs',	type: 'text/javascript'},
	{ location: 'file_utils/glb_parser_web.mjs',	type: 'text/javascript'},
	{ location: 'file_utils/obj_parser_web.mjs',	type: 'text/javascript'},
	{ location: 'shaders/plain.vert',				type: 'text/plain'},
	{ location: 'shaders/plain.frag',				type: 'text/plain'},
]

function requestHandler(req, res)
{
	if (req.method != 'GET') {
		res.statusCode = 409;
		res.end();
		return;
	}

	const page_index = pages.indexOf(req.url);
	if (page_index == -1) {
		res.statusCode = 400;
		res.end();
		console.log('Unbound file requested:', req.url);
		return;
	}

	console.log(page_index, page_bindings[page_index]);
	fs.readFile(page_bindings[page_index].location, (err, data) => {
		if (err) {
			res.statusCode = 501;
			res.end();
			console.log(err);
			return;
		}
		res.writeHead(200, { 'Content-Type': page_bindings[page_index].type });
		res.end(data);
	});
}

http.createServer(requestHandler).listen(4000);
console.log('Server running at http://localhost:4000');
