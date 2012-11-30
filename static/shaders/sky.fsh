precision highp float;
varying vec3 normal;
varying vec3 color;
varying float height;

void main() {
    gl_FragColor = vec4(0.0, 0.0, height, 1.0);
}
