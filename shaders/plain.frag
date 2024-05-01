precision highp float;

varying vec2 p_texture_position;
varying vec4 p_color;

varying vec3 p_normal;
varying vec3 p_camera_position;
varying vec3 p_model_position;

uniform bool u_use_texture;
uniform sampler2D sampler;

const vec3 sun = vec3(0, 1, 2);

void
main()
{
	vec3 unit_normal = normalize(p_normal);
	float sun_factor = .6 * dot(unit_normal, normalize(sun));
	if (sun_factor < .0)
		sun_factor = .0;

	gl_FragColor = u_use_texture ?
		texture2D(sampler, p_texture_position) : p_color;
	if (gl_FragColor.a == 0.0 || gl_FragColor.rgb == vec3(0.0))
		gl_FragColor = vec4(1.0, 0.0, 0.3, 1.0);
	gl_FragColor.xyz *= (.1 + sun_factor);
}
