import * as fbxParser from './file_utils/fbx_parser_web.mjs'
import * as glbParser from './file_utils/glb_parser_web.mjs'
import * as objParser from './file_utils/obj_parser_web.mjs'

var canvas;
var gl;
var program = {};
var vbo;
var texture;
var vertex_count;
//var ibo;
var running = true;
var tick_delay = 1000 / 30;
var ActionLabels = {
	FOREWARD: 0,
	BACKWARD: 1,
	RIGHT: 2,
	LEFT: 3,
	UP: 4,
	DOWN: 5,
	PITCH_RIGHT: 6,
	PITCH_LEFT: 7,
	PITCH_UP: 8,
	PITCH_DOWN: 9,
	COUNT: 10,
}
var bindings = {
	87: ActionLabels.FOREWARD, // w
	65: ActionLabels.LEFT, // a
	83: ActionLabels.BACKWARD, // s
	68: ActionLabels.RIGHT, // d
	32: ActionLabels.UP, // Space
	16: ActionLabels.DOWN, // Shift
	39: ActionLabels.PITCH_RIGHT, // RIGHT
	37: ActionLabels.PITCH_LEFT, // LEFT
	38: ActionLabels.PITCH_UP, // UP
	40: ActionLabels.PITCH_DOWN, // DOWN
};
var actions = new Array(ActionLabels.COUNT);

const camera_velocity = .04;
const camera_pitch_key_velocity = .06;
const camera_pitch_mouse_velocity = .005;
var camera = {
	pos: {
		x: 0.,
		y: 0.,
		z: 0.,
	},
	pitch: {
		x: 0.,
		y: 0.,
	},
};

const model_selector = document.getElementById('model-selector');
const model_selector_label = document.getElementById('model-label');
const texture_selector = document.getElementById('texture-selector');
const texture_selector_label = document.getElementById('texture-label');


await init();
if (running) {
	tick();
	render();
}

function tick()
{
	// Facing direction
	let move = { }
	move.x = actions[ActionLabels.PITCH_UP] - actions[ActionLabels.PITCH_DOWN];
	move.y = actions[ActionLabels.PITCH_LEFT] - actions[ActionLabels.PITCH_RIGHT];
	if (move.x != 0 && move.y != 0) {
		move.x *= .71;
		move.y *= .71;
	}
	camera.pitch.x += move.x * camera_pitch_key_velocity;
	camera.pitch.y += move.y * camera_pitch_key_velocity;
	if (camera.pitch.x < 0)
		camera.pitch.x += 2 * Math.PI;
	else if (camera.pitch.x > 2 * Math.PI)
		camera.pitch.x -= 2 * Math.PI;
	if (camera.pitch.y < 0)
		camera.pitch.y += 2 * Math.PI;
	else if (camera.pitch.y > 2 * Math.PI)
		camera.pitch.y -= 2 * Math.PI;


	// Movement
	move.x = actions[ActionLabels.RIGHT] - actions[ActionLabels.LEFT],
	move.y = actions[ActionLabels.UP] - actions[ActionLabels.DOWN],
	move.z = actions[ActionLabels.BACKWARD] - actions[ActionLabels.FOREWARD]
	let camera_int_mag = Math.sqrt(Math.abs(move.x) + Math.abs(move.y)
			+ Math.abs(move.z));
	if (camera_int_mag != 0) {
		move.x *= camera_velocity / camera_int_mag;
		move.y *= camera_velocity / camera_int_mag;
		move.z *= camera_velocity / camera_int_mag;
		let cx = Math.cos(camera.pitch.x);
		let sx = Math.sin(camera.pitch.x);
		let cy = Math.cos(camera.pitch.y);
		let sy = Math.sin(camera.pitch.y);

		camera.pos.x += move.x * cy + move.z * sy;
		camera.pos.y += move.y;
		camera.pos.z += -move.x * sy + move.z * cy;
	}



	setTimeout(tick, tick_delay);
}

function render()
{
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	gl.useProgram(program.hdl);
	let view = [-camera.pos.x, -camera.pos.y, -camera.pos.z, -camera.pitch.x,
		-camera.pitch.y];
	gl.uniform1fv(program.uniforms.view, new Float32Array(view));

	gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
	gl.vertexAttribPointer(program.attribs.vertex, 3, gl.FLOAT, false, 32, 0);
	gl.enableVertexAttribArray(program.attribs.vertex);
	gl.vertexAttribPointer(program.attribs.normal, 3, gl.FLOAT, false, 32, 12);
	gl.enableVertexAttribArray(program.attribs.normal);
	gl.vertexAttribPointer(program.attribs.texture_position, 2, gl.FLOAT, false, 32, 24);
	gl.enableVertexAttribArray(program.attribs.texture_position);

	gl.drawArrays(gl.TRIANGLES, 0, vertex_count);
	
	requestAnimationFrame(render);
}

function resize_callback(event)
{
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	gl.viewport(0, 0, canvas.width, canvas.height);

	gl.useProgram(program.hdl);
	gl.uniformMatrix4fv(program.uniforms.proj, false,
		[1., 0., 0., 0.,
		 0., canvas.width / canvas.height, 0., 0.,
		 0., 0., -100.01/99.99, -1,
		 0., 0., -2/99.99, 0]);
}

function mouse_callback(event)
{
	if (document.pointerLockElement != canvas)
		return;
	camera.pitch.x -= event.movementY * camera_pitch_mouse_velocity;
	camera.pitch.y -= event.movementX * camera_pitch_mouse_velocity;
}

function keyup_callback(event)
{
	if (bindings[event.keyCode] != undefined)
		actions[bindings[event.keyCode]] = 0;
}

function keydown_callback(event)
{
	if (bindings[event.keyCode] != undefined)
		actions[bindings[event.keyCode]] = 1;
}

async function init()
{
	// Context
	canvas = document.getElementById('webgl-canvas');
	gl = canvas.getContext('webgl');
	if (gl === null) {
		alert('WebGL unsupported on this browser or machine.');
		running = false;
		return;
	}
	
	gl.clearColor(0., 0., 0., 1.);
	gl.clearDepth(1.);
	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.CULL_FACE);
	gl.depthFunc(gl.LEQUAL);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);


	// Shader Program
	const vert_source = await (await fetch('shaders/plain.vert')).text();
	const frag_source = await (await fetch('shaders/plain.frag')).text();
	
	const vert_shader = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vert_shader, vert_source);
	gl.compileShader(vert_shader);
	const frag_shader = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(frag_shader, frag_source);
	gl.compileShader(frag_shader);

	program.hdl = gl.createProgram();
	gl.attachShader(program.hdl, vert_shader);
	gl.attachShader(program.hdl, frag_shader);
	gl.linkProgram(program.hdl);
	gl.deleteShader(vert_shader);
	gl.deleteShader(frag_shader);

	if (!gl.getProgramParameter(program.hdl, gl.LINK_STATUS)) {
		console.error('| Failed to link shader program |\n'
			+ gl.getProgramInfoLog(program.hdl));
		running = false;
		return;
	}
	
	program.attribs = {
		vertex: 0,
		normal: 1,
		texture_position: 2,
	};
	gl.bindAttribLocation(program.hdl, program.attribs.vertex, 'a_vertex');
	gl.bindAttribLocation(program.hdl, program.attribs.normal, 'a_normal');
	gl.bindAttribLocation(program.hdl, program.attribs.texture_position, 'a_texture_position');
	program.uniforms = {
		proj: gl.getUniformLocation(program.hdl, 'u_proj'),
		view: gl.getUniformLocation(program.hdl, 'u_view'),
	}




	
	// Vertex Info
	vbo = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vbo);

	let vbi = [
		 .0,  .5,  .0,		3/3,	-2/3,	4/3, 0.0, 0.0,
		 .5, -.5, -.5,		4/3,	-4/3,	2/3, 0.0, 0.0,
		-.5, -.5, -.5,		-1/3,	-2/3,	6/3, 0.0, 0.0,

		 .0,  .5,  .0,		3/3,	-2/3,	4/3, 0.0, 0.0,
		-.5, -.5, -.5,		-1/3,	-2/3,	6/3, 0.0, 0.0,
		 .0, -.5,  .5,		3/3,	-1/3,	0/3, 0.0, 0.0,

		 .0,  .5,  .0,		3/3,	-2/3,	4/3, 0.0, 0.0,
		 .0, -.5,  .5,		3/3,	-1/3,	0/3, 0.0, 0.0,
		 .5, -.5, -.5,		4/3,	-4/3,	2/3, 0.0, 0.0,

		 .5, -.5, -.5,		4/3,	-4/3,	2/3, 0.0, 0.0,
		 .0, -.5,  .5,		3/3,	-1/3,	0/3, 0.0, 0.0,
		-.5, -.5, -.5,		-1/3,	-2/3,	6/3, 0.0, 0.0,
	];
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vbi), gl.DYNAMIC_DRAW);
	vertex_count = vbi.length / 8;


	// Add Callbacks
	window.onkeyup = keyup_callback;
	window.onkeydown = keydown_callback;
	window.addEventListener('resize', resize_callback);
	document.addEventListener('mousemove', mouse_callback);
	resize_callback();

	canvas.onclick = canvas.requestPointerLock;
	model_selector.onchange = () => {
		let file_name = model_selector.files[0].name;
		let model_parser;

		let reader = new FileReader();
		reader.onload = () => {
			model_parser(reader.result).then(value => {
				if (value == true)
					texture_selector_label.textContent = '(embedded)';
			});
		}

		if (file_name.endsWith('.obj')) {
			model_selector_label.textContent = file_name;
			model_parser = parseOBJModel;
			reader.readAsText(model_selector.files[0], 'UTF-8');
		} else if (file_name.endsWith('.fbx')) {
			model_selector_label.textContent = file_name;
			model_parser = parseFBXModel;
			reader.readAsArrayBuffer(model_selector.files[0], 'UTF-8');
		} else if (file_name.endsWith('.glb')) {
			model_selector_label.textContent = file_name;
			model_parser = parseGLBModel;
			reader.readAsArrayBuffer(model_selector.files[0], 'UTF-8');
		} else {
			alert('Unsupported file extension');
			return;
		}
	};
	texture_selector.onchange = () => {
		if (texture == undefined) {
			texture = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_2D, texture);
		}


		const image = new Image();
		image.onload = () => {
			texture_selector_label.textContent = texture_selector.files[0].name;

			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
		};
		image.onerror = () => {
			alert('Unsupported file.');
		}
		const reader = new FileReader();
		reader.onload = () => {
			image.src = reader.result;
		}
		reader.readAsDataURL(texture_selector.files[0]);
	}

	// Other Data
	actions.fill(0);
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

async function parseGLBModel(data)
{
	glbParser.parseFileData(data);
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
