attribute vec3 a_position;
uniform mat4 worldTransform;
uniform mat4 modelTransform;

void main() {
    gl_Position = worldTransform * modelTransform * vec4(a_position, 1);
}
