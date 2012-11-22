attribute vec3 a_position;
attribute vec2 a_texcoord;
attribute vec3 a_normal;
uniform mat4 pers;
uniform mat4 transform;
uniform mat3 normalMatrix;
varying vec3 v;
varying vec2 texcoord;
varying vec3 normal;

float rand(vec2 n) {
    return 0.5 + 0.5 *
        fract(sin(dot(n.xy, vec2(12.9898, 78.233)))* 43758.5453);
}

void main() {
    gl_Position = pers * transform * vec4(a_position, 1);
    v = a_position;
    normal = normalMatrix * a_normal;
    texcoord = a_texcoord;
}
