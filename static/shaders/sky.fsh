precision highp float;
varying vec3 normal;
varying vec3 color;
varying float height;

void main() {
    float s = height * .2;
    gl_FragColor = (vec4(.768, .807, 1.0, 1.0) +
                    vec4(s, s, s, 1.0));
}
