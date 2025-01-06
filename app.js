<<<<<<< HEAD
var canvas;
var gl;
var program = {};
var vbo;
var vertex_count;
var texture;
//var ibo;
var running = true;
var tick_delay = 1000 / 30;
var ActionLabels = {
=======
// Imports
import * as FBXParser from './file_utils/fbx_parser_web.mjs';
import * as GLBParser from './file_utils/glb_parser_web.mjs';
import * as OBJParser from './file_utils/obj_parser_web.mjs';


// Definitions
const ActionLabels = {
>>>>>>> b853bfe6a279fa153c8fae1a104bd26df7fa023a
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
<<<<<<< HEAD
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
attribute vec3 a_normal;
attribute vec2 a_uv;
uniform mat4 u_proj;
uniform float u_view[5]; // x y z x_pitch y_pitch
precision highp float;

varying vec2 p_uv;
varying vec3 p_normal;
varying vec3 p_camera_position;
varying vec3 p_model_position;

#define xi	0
#define yi	1
#define zi	2
#define xpi	3
#define ypi	4

void
main()
{
	p_uv = a_uv;
	// Note: when rotating the model itself, remember to also roate the normals
	p_normal = a_normal;
	p_camera_position = vec3(u_view[xi], u_view[yi], u_view[zi]);
	p_model_position = a_vertex.xyz;

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
precision highp float;

uniform sampler2D u_sampler;

varying vec2 p_uv;
varying vec3 p_normal;
varying vec3 p_camera_position;
varying vec3 p_model_position;

const vec3 sun = vec3(0, 1, 2);

void
main()
{
	vec3 unit_normal = normalize(p_normal);
	float sun_factor = .6 * dot(unit_normal, normalize(sun));
	if (sun_factor < .0)
		sun_factor = .0;

	gl_FragColor = texture2D(u_sampler, p_uv);
	//gl_FragColor.xyz *= 0.1 + sun_factor;
	gl_FragColor += vec4(.1);
}
`;

=======
const tick_delay = 1000 / 30;
>>>>>>> b853bfe6a279fa153c8fae1a104bd26df7fa023a

// DOM elements
const model_selector = document.getElementById('model-selector');
const model_selector_label = document.getElementById('model-label');
<<<<<<< HEAD
const texture_selector = document.getElementById('texture-selector');
const texture_selector_label = document.getElementById('texture-label');
=======

// Variables
var canvas;
var gl;
var running = true;
>>>>>>> b853bfe6a279fa153c8fae1a104bd26df7fa023a

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

<<<<<<< HEAD
	gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
	gl.vertexAttribPointer(program.attribs.vertex, 3, gl.FLOAT, false, 32, 0);
	gl.enableVertexAttribArray(program.attribs.vertex);
	gl.vertexAttribPointer(program.attribs.normal, 3, gl.FLOAT, false, 32, 12);
	gl.enableVertexAttribArray(program.attribs.normal);
	gl.vertexAttribPointer(program.attribs.uv, 2, gl.FLOAT, false, 32, 24);
	gl.enableVertexAttribArray(program.attribs.uv);

	gl.drawArrays(gl.TRIANGLES, 0, vertex_count);
	
=======

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

>>>>>>> b853bfe6a279fa153c8fae1a104bd26df7fa023a
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
<<<<<<< HEAD
		uv: 2
	};
	gl.bindAttribLocation(program.hdl, program.attribs.vertex, 'a_vertex');
	gl.bindAttribLocation(program.hdl, program.attribs.normal, 'a_normal');
	gl.bindAttribLocation(program.hdl, program.attribs.uv, 'a_uv');
=======
		texture_position: 2,
	};
	gl.bindAttribLocation(program.hdl, program.attribs.vertex, 'a_vertex');
	gl.bindAttribLocation(program.hdl, program.attribs.normal, 'a_normal');
	gl.bindAttribLocation(program.hdl, program.attribs.texture_position, 'a_texture_position');
>>>>>>> b853bfe6a279fa153c8fae1a104bd26df7fa023a
	program.uniforms = {
		proj: gl.getUniformLocation(program.hdl, 'u_proj'),
		mesh: gl.getUniformLocation(program.hdl, 'u_mesh'),
		view: gl.getUniformLocation(program.hdl, 'u_view'),
		use_texture: gl.getUniformLocation(program.hdl, 'u_use_texture'),
		color: gl.getUniformLocation(program.hdl, 'u_color'),
	}
	

<<<<<<< HEAD
	gl.useProgram(program.hdl);
	gl.uniform1i(gl.getUniformLocation(program.hdl, 'u_sampler'), 0);


	
	<!-- Vertex Info -->
	vbo = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vbo);

	let vbi = [
		 .0,  .5,  .0,		3/3,	-2/3,	4/3,
		 .5, -.5, -.5,		4/3,	-4/3,	2/3,
		-.5, -.5, -.5,		-1/3,	-2/3,	6/3,

		 .0,  .5,  .0,		3/3,	-2/3,	4/3,
		-.5, -.5, -.5,		-1/3,	-2/3,	6/3,
		 .0, -.5,  .5,		3/3,	-1/3,	0/3,

		 .0,  .5,  .0,		3/3,	-2/3,	4/3,
		 .0, -.5,  .5,		3/3,	-1/3,	0/3,
		 .5, -.5, -.5,		4/3,	-4/3,	2/3,

		 .5, -.5, -.5,		4/3,	-4/3,	2/3,
		 .0, -.5,  .5,		3/3,	-1/3,	0/3,
		-.5, -.5, -.5,		-1/3,	-2/3,	6/3,
	];
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vbi), gl.DYNAMIC_DRAW);
	vertex_count = vbi.length / 6;


	<!-- Add Callbacks -->
=======

	// Add Callbacks
>>>>>>> b853bfe6a279fa153c8fae1a104bd26df7fa023a
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
	texture_selector.onchange = () => {
		let file_name = texture_selector.files[0].name;
		if (!file_name.endsWith('.png')) {
			alert('Unsupported file format');
			return;
		}
		texture_selector_label.textContent = file_name;


		const img = new Image();
		img.onload = () => {
			if (texture != undefined)
				gl.deleteTexture(texture);
			console.log(img);
			texture = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE,
				img);
		};

		const reader = new FileReader();
		reader.onload = event => {
			img.src = event.target.result;
		}
		reader.readAsDataURL(texture_selector.files[0]);

	};

	// Other Data
	actions.fill(0);
}

// Start
async function main() {
	await init();
	if (!running)
		return;

<<<<<<< HEAD
	/* There will be multiple geometry children in the case of multiple meshes.
	 * Handle this by having a parse geometry that if geometry is typeof Number
	 * will check each of the geometries for that number, or will just check
	 * the geometry of the single object if there is only one.
	 *
	 * If embeded texture, load it, and change the name of the texture file
	 *
	 * */

	/* Look into the models rotation and scale within the fbx file and applying it.
	 * For OBJ can just default to a scale of 1 and a rotation of 0. */

	let geometry = root.Objects.Geometry;
	let polygon_indices = geometry.PolygonVertexIndex.properties[0];
	let face_count = polygon_indices.length / 3;
	let vertices = geometry.Vertices.properties[0];
	let normals = geometry.LayerElementNormal.Normals.properties[0];

	
	vbi = new Float32Array(face_count * 3 * 6);
	for (let f = 0; f < face_count; f++) {
		let face_indices = polygon_indices.slice(f * 3, f * 3 + 3);
		face_indices[2] = -face_indices[2] - 1;
		if (face_indices[0] < 0 || face_indices[1] < 0 || face_indices[2] < 0) {
			alert('Non-triangle faces not supported.');
			return;
		}
		

		for (let v = 0; v < 3; v++) {
			vbi[f * 18 + v * 6 + 0] = vertices[face_indices[v] * 3];
			vbi[f * 18 + v * 6 + 1] = vertices[face_indices[v] * 3 + 1];
			vbi[f * 18 + v * 6 + 2] = vertices[face_indices[v] * 3 + 2];

			vbi[f * 18 + v * 6 + 3] = normals[f * 9 + v * 3 + 0];
			vbi[f * 18 + v * 6 + 4] = normals[f * 9 + v * 3 + 1];
			vbi[f * 18 + v * 6 + 5] = normals[f * 9 + v * 3 + 2];
		}

	}
	
	console.log('FBX VBI: ');
	console.log(vbi);
	gl.bufferData(gl.ARRAY_BUFFER, vbi, gl.DYNAMIC_DRAW);
	vertex_count = face_count * 3;
}

function parseObjModel(data)
{
	/* Extract file information. */
	var lines = data.split('\n');
	var vertices = []
	var vertex_normals = [];
	var uvs = [];
	var faces = [];

	for (line of lines) {
		let output_type = -1, elem_count, output_destination = null;
		switch(line.substring(0, 2)) {
		case 'v ':
			output_type = 0;
			elem_count = 3;
			output_destination = vertices;
			break;
		case 'vn':
			output_type = 0;
			elem_count = 3;
			output_destination = vertex_normals;
			break;
		case 'vt':
			output_type = 0;
			elem_count = 2;
			output_destination = uvs;
			break;
		case 'f ':
			output_type = 1;
			output_destination = faces;
			break;
		}

		if (output_type == 0) {
			let elems = line.split(' ');
			if (elems.length != elem_count + 1) {
				console.error(`Invalid line: '${line}'.`);
				return;
			}

			let entry = []
			for (let i = 0; i < elem_count; i++) {
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
			vbi = vbi.concat(vertices[elem[0] - 1].concat(vertex_normals[elem[2] - 1]).concat(uvs[elem[1] - 1]));
	console.log('OBJ VBI: ');
	console.log(vbi);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vbi), gl.DYNAMIC_DRAW);
	vertex_count = faces.length * 3;
}
