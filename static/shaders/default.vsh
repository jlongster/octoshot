attribute vec3 a_position;
attribute vec3 a_normal;
attribute vec3 a_texcoord;
uniform mat4 worldTransform;
uniform mat4 modelTransform;
uniform mat3 normalMatrix;
uniform vec3 matColor;
varying vec3 normal;
varying vec3 color;
varying vec3 position;

void main() {
    vec4 modelVec = modelTransform * vec4(a_position, 1);

    gl_Position = worldTransform * modelVec;
    normal = normalMatrix * a_normal;
    color = matColor;

    position = modelVec.xyz;
    //lightPos = vec3(50.0, 50.0, 50.0);
}
