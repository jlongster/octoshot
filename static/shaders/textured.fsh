precision highp float;
varying vec2 texcoord;
varying vec3 normal;
varying vec3 color;
uniform sampler2D sampler;

void main() {
    vec3 light = normalize(vec3(1.0, 1.0, -1.0));
    vec3 nNormal = normalize(normal);
    float diffuse = dot(nNormal, light);

    vec4 sample = texture2D(sampler, texcoord.xy);

    if(sample.w == 0.0)
        discard;
    
    if(sample.x == 1.0 && sample.y == 0.0 && sample.z == 0.0)
        sample = vec4(color, 1.0);

    gl_FragColor = sample;
}

