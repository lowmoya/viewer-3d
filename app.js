var canvas;
var gl;
var program = {};
var vbo;
var running = true;

const vert_source = `
   attribute vec4 a_vertex;
   uniform mat4 u_model;
   uniform mat4 u_proj;

   void
   main()
   {
	gl_Position = u_proj * u_model * a_vertex;
   }
`;
const frag_source = `
   void
   main()
   {
	gl_FragColor = vec4(1., .4, 0., 1.);
   }
`;


init();
render();

function render()
{
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	gl.drawArrays(gl.TRIANGLES, 0, 3);
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
		u_model: gl.getUniformLocation(program.hdl, 'u_model'),
	}

	gl.useProgram(program.hdl);
	gl.uniformMatrix4fv(program.uniforms.u_proj, false,
		[1., 0., 0., 0.,
		 0., 1., 0., 0.,
		 0., 0., 1., 0.,
		 0., 0., 0., 1.]);
	gl.uniformMatrix4fv(program.uniforms.u_model, false,
		[1., 0., 0., 0.,
		 0., 1., 0., 0.,
		 0., 0., 1., 0.,
		 0., 0., 0., 1.]);


	
	<!-- Vertex Info -->
	vbo = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vbo);

	let positions = [
		0., .5,
		.5, -.5,
		-.5, -.5
	];
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
	gl.vertexAttribPointer(program.attribs.vertex, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(program.attribs.vertex);
}
