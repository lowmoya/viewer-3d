var canvas;
var gl;
var program = {};
var vbo;
var ibo;
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

const vert_source = `
attribute vec4 a_vertex;
uniform mat4 u_proj;
uniform float u_view[5]; // x y z x_pitch y_pitch

precision highp float;
varying float p_depth;

#define xi	0
#define yi	1
#define zi	2
#define xpi	3
#define ypi	4

void
main()
{
	p_depth = a_vertex.z;
	float cx = cos(u_view[xpi]);
	float sx = sin(u_view[xpi]);
	float cy = cos(u_view[ypi]);
	float sy = sin(u_view[ypi]);
	gl_Position = u_proj
		* mat4(
			cy,		sx * sy,	-cx * sy,	0.,
			0.,		cx,			sx,			0.,
			sy,		-sx * cy,	cx * cy,	0.,
			0.,		0.,			0.,			1.)
		* (a_vertex + vec4(u_view[xi], u_view[yi], u_view[zi], 0));
}
`;
const frag_source = `
precision mediump float;
varying float p_depth;

void
main()
{
	gl_FragColor = vec4(1., 0, p_depth + .5, 1.);
}
`;


const model_selector = document.getElementById('model-selector');
const model_selector_label = document.getElementById('model-label');


init();
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
	gl.uniform1fv(program.uniforms.u_view, new Float32Array(view));

	gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
	gl.vertexAttribPointer(program.attribs.vertex, 3, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(program.attribs.vertex);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);

	gl.drawElements(gl.TRIANGLES, 12, gl.UNSIGNED_BYTE, null);
	
	requestAnimationFrame(render);
}

function resize_callback(event)
{
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	gl.viewport(0, 0, canvas.width, canvas.height);

	gl.useProgram(program.hdl);
	gl.uniformMatrix4fv(program.uniforms.u_proj, false,
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

function init()
{
	<!-- Context -->
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


	<!-- Shader Program -->
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

	if (!gl.getProgramParameter(program.hdl, gl.LINK_STATUS)) {
		console.error('| Failed to link shader program |\n'
			+ gl.getProgramInfoLog(program.hdl));
		running = false;
		return;
	}
	
	program.attribs = {
		vertex: gl.getAttribLocation(program.hdl, 'a_vertex'),
	};
	program.uniforms = {
		u_proj: gl.getUniformLocation(program.hdl, 'u_proj'),
		u_view: gl.getUniformLocation(program.hdl, 'u_view'),
	}



	
	<!-- Vertex Info -->
	vbo = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vbo);

	let positions = [
		0., .5, 0.,
		.5, -.5, -.5,
		-.5, -.5, -.5,
		0., -.5, .5,
	];
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

	ibo = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
	let indices = [
		0, 1, 2,
		0, 2, 3,
		0, 3, 1,
		1, 3, 2,
	];
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(indices),
		gl.STATIC_DRAW);


	<!-- Add Callbacks -->
	window.onkeyup = keyup_callback;
	window.onkeydown = keydown_callback;
	window.addEventListener('resize', resize_callback);
	document.addEventListener('mousemove', mouse_callback);
	resize_callback();

	canvas.onclick = canvas.requestPointerLock;
	model_selector.onchange = () => {
		model_selector_label.textContent = model_selector.files[0].name;
	};

	<!-- Other Data -->
	actions.fill(0);
}
