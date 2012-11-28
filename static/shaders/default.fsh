precision highp float;
varying vec3 normal;

void main() {
    vec3 light = normalize(vec3(1.0, 1.0, -1.0));
    vec3 nNormal = normalize(normal);
    float diffuse = dot(nNormal, light);

    gl_FragColor = vec4(1.0, .8, .8, 1.0) * diffuse;
}
