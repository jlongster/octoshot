attribute vec3 a_position;
attribute vec3 a_normal;
uniform mat4 pers;
uniform mat4 transform;
uniform mat3 normalMatrix;
varying vec3 normal;

void main() {
    gl_Position = pers * transform * vec4(a_position, 1);
    normal = normalMatrix * a_normal;
}
