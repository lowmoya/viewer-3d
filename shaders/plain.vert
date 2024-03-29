attribute vec4 a_vertex;
attribute vec3 a_normal;
attribute vec2 a_texture_position;
uniform mat4 u_proj;
uniform float u_view[5]; // x y z x_pitch y_pitch
precision highp float;

varying vec2 p_texture_position;
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
	// Don't forget, for model rotations, normals need to be rotated as well
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
