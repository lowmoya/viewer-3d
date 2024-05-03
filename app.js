// Imports
import * as FBXParser from './file_utils/fbx_parser_web.mjs';
import * as GLBParser from './file_utils/glb_parser_web.mjs';
import * as OBJParser from './file_utils/obj_parser_web.mjs';


// Definitions
const ActionLabels = {
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
const bindings = {
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
const matrix_identity = [
	1, 0, 0, 0,
	0, 1, 0, 0,
	0, 0, 1, 0,
	0, 0, 0, 1,
];

const camera_velocity = .04;
const camera_pitch_key_velocity = .06;
const camera_pitch_mouse_velocity = .005;
const tick_delay = 1000 / 30;

// DOM elements
const model_selector = document.getElementById('model-selector');
const model_selector_label = document.getElementById('model-label');

// Variables
var canvas;
var gl;
var running = true;

var actions = new Array(ActionLabels.COUNT);
var camera = {
	pos: { x: 0., y: 0., z: 0., },
	pitch: { x: 0., y: 0., },
};

var program = {};

var models = [];

// Functions

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

	let view = [-camera.pos.x, -camera.pos.y, -camera.pos.z, -camera.pitch.x,
		-camera.pitch.y];
	gl.uniform1fv(program.uniforms.view, new Float32Array(view));


	for (let model of models) {
		for (let node of model.nodes) {
			if (node.mesh == undefined)
				continue;

			const mesh = model.meshes[node.mesh];
			gl.uniformMatrix4fv(program.uniforms.mesh, false,
				node.matrix == undefined ? matrix_identity : node.matrix);
		
			for (let primitive of mesh.primitives) {
				// Bind the material
				// TODO look into roughness factor and metallic factor rendering
				if (primitive.material != undefined) {
					const material = model.materials[primitive.material]
							.pbrMetallicRoughness;
					if (material.baseColorTexture != undefined) {
						gl.uniform1i(program.uniforms.use_texture, 1);
						gl.bindTexture(gl.TEXTURE_2D,
							model.textures[material.baseColorTexture.index]);
					} else {
						gl.uniform1i(program.uniforms.use_texture, 0);
						gl.uniform4fv(program.uniforms.color,
							material.baseColorFactor != undefined
								? material.baseColorFactor : [.9, .9, .8, 1.0]);
					}
				} else {
					gl.uniform1i(program.uniforms.use_texture, 0);
					gl.uniform4f(program.uniforms.color, .9, .9, .8, 1.0);
				}

				// Bind attributes
				gl.enableVertexAttribArray(program.attribs.vertex);
				gl.enableVertexAttribArray(program.attribs.normal);
				gl.enableVertexAttribArray(program.attribs.texture_position);

				// TODO Cleanup
				let attrib = primitive.attributes.POSITION;
				gl.bindBuffer(gl.ARRAY_BUFFER, attrib.buffer);
				gl.vertexAttribPointer(program.attribs.vertex,
					attrib.componentsPerEntry, attrib.componentType, false, 0, 0);

				attrib = primitive.attributes.NORMAL;
				gl.bindBuffer(gl.ARRAY_BUFFER, attrib.buffer);
				gl.vertexAttribPointer(program.attribs.normal,
					attrib.componentsPerEntry, attrib.componentType, false, 0, 0);

				attrib = primitive.attributes.TEXCOORD_0;
				gl.bindBuffer(gl.ARRAY_BUFFER, attrib.buffer);
				gl.vertexAttribPointer(program.attribs.texture_position,
					attrib.componentsPerEntry, attrib.componentType, false, 0, 0);
				
				// TODO support both indexed and non-indexed drawing
				if (primitive.indexed)  {
					gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, primitive.indices.buffer);
					gl.drawElements(gl.TRIANGLES, primitive.vertices,
						primitive.indices.componentType, 0);
				} else {
					gl.drawArrays(gl.TRIANGLES, 0, primitive.vertices);
				}

				let err = gl.getError();
				if (err != 0) {
					console.error('ERROR', err);
					return;
				}
			}
		}
	}

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
	// TODO grant control per material for culling faces
	gl.disable(gl.CULL_FACE);
	gl.depthFunc(gl.LEQUAL);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);


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
		mesh: gl.getUniformLocation(program.hdl, 'u_mesh'),
		view: gl.getUniformLocation(program.hdl, 'u_view'),
		use_texture: gl.getUniformLocation(program.hdl, 'u_use_texture'),
		color: gl.getUniformLocation(program.hdl, 'u_color'),
	}


	// Add Callbacks
	window.onkeyup = keyup_callback;
	window.onkeydown = keydown_callback;
	window.addEventListener('resize', resize_callback);
	document.addEventListener('mousemove', mouse_callback);
	resize_callback();

	canvas.onclick = canvas.requestPointerLock;
	model_selector.onchange = () => {
		model_selector.disabled = true;
		let file_name = model_selector.files[0].name;
		let parser;

		let reader = new FileReader();
		reader.onload = () => {
			parser.createGLB(reader.result).then(glb => {
				if (glb != null) {
					GLBParser.createModel(gl, glb).then(result => {
						while (models.length != 0)
							GLBParser.freeModel(gl, models.pop());
						models.push(result);
						model_selector.disabled = false;
					});
				} else {
					model_selector.disabled = false;
				}
			});
		};

		if (file_name.endsWith('.obj')) {
			model_selector_label.textContent = file_name;
			parser = OBJParser;

			reader.readAsText(model_selector.files[0], 'UTF-8');
		} else if (file_name.endsWith('.fbx')) {
			model_selector_label.textContent = file_name;
			parser = FBXParser;

			reader.readAsArrayBuffer(model_selector.files[0], 'UTF-8');
		} else if (file_name.endsWith('.glb')) {
			model_selector_label.textContent = file_name;
			parser = GLBParser;

			reader.readAsArrayBuffer(model_selector.files[0], 'UTF-8');
		} else {
			alert('Unsupported file extension');
			model_selector.disabled = false;
			return;
		}
	};

	// Other Data
	actions.fill(0);
}

// Start
async function main() {
	await init();
	if (!running)
		return;

	tick();
	render();
}

main()
