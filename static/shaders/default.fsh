precision highp float;
varying vec3 normal;
varying vec3 color;

void main() {
    vec3 light = normalize(vec3(1.0, 1.0, -1.0));
    vec3 nNormal = normalize(normal);
    float diffuse = dot(nNormal, light);

    gl_FragColor = vec4(color, 1.0) * diffuse;
}
