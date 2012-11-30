attribute vec3 a_position;
attribute vec2 a_texcoord;
uniform mat4 worldTransform;
uniform mat4 modelTransform;
varying vec2 texcoord;

void main() {
    gl_Position = worldTransform * modelTransform * vec4(a_position, 1);
    texcoord = a_texcoord;
}
