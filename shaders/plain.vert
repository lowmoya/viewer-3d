precision highp float;

attribute vec4 a_vertex;
attribute vec3 a_normal;
attribute vec2 a_texture_position;

uniform mat4 u_proj;
uniform mat4 u_mesh;
uniform float u_view[5]; // x y z x_pitch y_pitch
uniform vec4 u_color;

varying vec2 p_texture_position;
varying vec4 p_color;

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
	p_texture_position = a_texture_position;
	p_color = u_color;

	// Apply the mesh transform onto the normals, but remove the
	// translation aspect of the matrix for this
	mat4 u_mesh_no_trans = u_mesh;
	u_mesh_no_trans[3][0] = 0.0;
	u_mesh_no_trans[3][1] = 0.0;
	u_mesh_no_trans[3][2] = 0.0;
	p_normal = (u_mesh_no_trans * vec4(a_normal, 1.0)).xyz;

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
		* (u_mesh * a_vertex
			+ vec4(u_view[xi], u_view[yi], u_view[zi], 0));
}
