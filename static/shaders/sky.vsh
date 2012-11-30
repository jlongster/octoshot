attribute vec3 a_position;
uniform mat4 worldTransform;
uniform mat4 modelTransform;
varying float height;

void main() {
    gl_Position = worldTransform * modelTransform * vec4(a_position, 1);

    height = a_position.y;
}
