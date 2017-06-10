#version 300 es
precision mediump float;

in vec2 v_texCoord;
uniform sampler2D u_texture;
uniform float[8] u_mobiusArray;
uniform vec2 u_resolution;
uniform vec3 u_cameraTarget;
uniform float u_fov;

{% include "./constants.njk.frag" %}
{% include "./geometry.njk.frag" %}
{% include "./gamma.njk.frag" %}

// from Syntopia http://blog.hvidtfeldts.net/index.php/2015/01/path-tracing-3d-fractals/
vec2 rand2n(vec2 co, float sampleIndex) {
    vec2 seed = co * (sampleIndex + 1.0);
    seed+=vec2(-1,1);
    // implementation based on: lumina.sourceforge.net/Tutorials/Noise.html
    return vec2(fract(sin(dot(seed.xy ,vec2(12.9898,78.233))) * 43758.5453),
                 fract(cos(dot(seed.xy ,vec2(4.898,7.23))) * 23421.631));
}

vec3 calcRay (const vec3 eye, const vec3 target, const vec3 up, const float fov,
              const vec2 resolution, const vec2 coord){
    float imagePlane = (resolution.y * .5) / tan(fov * .5);
    vec3 v = normalize(target - eye);
    vec3 xaxis = normalize(cross(v, up));
    vec3 yaxis =  normalize(cross(v, xaxis));
    vec3 center = v * imagePlane;
    vec3 origin = center - (xaxis * (resolution.x  *.5)) - (yaxis * (resolution.y * .5));
    return normalize(origin + (xaxis * coord.x) + (yaxis * (resolution.y - coord.y)));
}

bool intersectSphere(vec4 sphere,
                     vec3 rayOrigin, vec3 rayDir,
                     inout float minDist,
                     inout vec3 intersection, inout vec3 normal){
    vec3 v = rayOrigin - sphere.xyz;
    float b = dot(rayDir, v);
    float c = dot(v, v) - sphere.w * sphere.w;
    float d = b * b - c;
    if(d >= 0.){
        float s = sqrt(d);
        float t = -b - s;
        if(t <= EPSILON) t = -b + s;
        if(EPSILON < t && t < minDist){
            intersection = (rayOrigin + t * rayDir);
            minDist = t;
            normal = normalize(intersection - sphere.xyz);
            return true;
        }
    }
    return false;
}

vec3 sphericalView(vec3 dir){
    vec2 lnglat = equirectangularCoord(dir);
    vec4 z = CP1FromSphere(coordOnSphere(lnglat.x, lnglat.y));
    lnglat = equirectangularCoord(sphereFromCP1(applyMobiusArray(u_mobiusArray, z)));
    vec4 texCol = texture(u_texture, vec2(-1, 1)* (vec2(0, 1)-lnglat/vec2(TWO_PI, PI)));
    return degamma(texCol).rgb;
}

const float SAMPLE_NUM = 10.;
out vec4 outColor;
void main() {
    const vec3 up = vec3(0, 1, 0);
    const vec3 eye = vec3(0);

    vec3 sum = vec3(0);
    for(float i = 0. ; i < SAMPLE_NUM ; i++){
        vec2 coordOffset = rand2n(gl_FragCoord.xy, i);
        vec3 ray = calcRay(eye, u_cameraTarget, up, u_fov,
                           u_resolution.xy,
                           gl_FragCoord.xy + coordOffset);

        sum += sphericalView(ray);
    }
    vec3 col = (sum/SAMPLE_NUM);

    outColor = gammaCorrect(vec4(col, 1));
}
