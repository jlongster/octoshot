attribute vec3 a_position;
attribute vec3 a_normal;
uniform mat4 worldTransform;
uniform mat4 modelTransform;
uniform mat3 normalMatrix;
varying vec3 normal;

void main() {
    gl_Position = worldTransform * modelTransform * vec4(a_position, 1);
    normal = normalMatrix * a_normal;
}
