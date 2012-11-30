precision highp float;
varying vec2 texcoord;
uniform sampler2D sampler;

void main() {
    gl_FragColor = texture2D(sampler, texcoord.xy);
}
