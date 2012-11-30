attribute vec3 a_position;
attribute vec3 a_normal;
attribute vec2 a_texcoord;
uniform mat4 worldTransform;
uniform mat4 modelTransform;
uniform mat3 normalMatrix;
uniform vec3 matColor;
uniform vec2 textureScale;
varying vec2 texcoord;
varying vec3 normal;
varying vec3 color;

void main() {
    gl_Position = worldTransform * modelTransform * vec4(a_position, 1);
    normal = normalMatrix * a_normal;
    texcoord = a_texcoord * textureScale;
    color = matColor;
}
