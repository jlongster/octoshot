precision highp float;
varying vec3 position;
varying vec3 normal;
varying vec3 color;

void main() {
    vec3 nNormal = normalize(normal);

    vec3 lightDir = normalize(vec3(100.0, 100.0, 100.0) - position);
    float diffuse = max(0.0, dot(nNormal, lightDir)) * 1.2;

    lightDir = normalize(vec3(800.0, 100.0, 800.0) - position);
    float diffuse2 = max(0.0, dot(nNormal, lightDir));


    gl_FragColor = vec4(color, 1.0) * diffuse + vec4(color, 1.0) * diffuse2;
}
