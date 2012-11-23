precision highp float;
varying vec3 v;
varying vec2 texcoord;
varying vec3 normal;
uniform sampler2D sampler;

void main() {
    float density = 0.002;
    float z = gl_FragCoord.z / gl_FragCoord.w;
    float LOG2 = 1.442695;
    float fogFactor = exp2(-density*density*z*z*LOG2);
    fogFactor = clamp(fogFactor, 0.0, 1.0);

    vec3 nNormal = normalize(normal);
    float diffuse = dot(nNormal, vec3(1.0, 1.0, 0.0));

    gl_FragColor = (vec4(.2, .2, .2, 1.0) +
                    mix(vec4(0.0, 0.0, 0.0, 1.0),
                        texture2D(sampler, texcoord.xy),
                        fogFactor) *
                    diffuse);
}
