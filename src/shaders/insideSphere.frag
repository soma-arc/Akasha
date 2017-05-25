#version 300 es
precision mediump float;

in vec2 v_texCoord;
uniform sampler2D u_texture;
uniform float[8] u_mobiusArray;
uniform vec2 u_resolution;
uniform vec3 u_cameraTarget;
uniform float u_fov;

const float PI = 3.14159265359;
const float TWO_PI = 2. * PI;
const float PI_2 = PI * .5;
const float PI_4 = PI * .25;

const float GAMMA = 2.2;
const float DISPLAY_GAMMA_COEFF = 1. / GAMMA;
vec4 gammaCorrect(const vec4 rgba) {
    return vec4((min(pow(rgba.r, DISPLAY_GAMMA_COEFF), 1.)),
                (min(pow(rgba.g, DISPLAY_GAMMA_COEFF), 1.)),
                (min(pow(rgba.b, DISPLAY_GAMMA_COEFF), 1.)),
                rgba.a);
}

vec4 degamma(const vec4 rgba) {
    return vec4((min(pow(rgba.r, GAMMA), 1.)),
                (min(pow(rgba.g, GAMMA), 1.)),
                (min(pow(rgba.b, GAMMA), 1.)),
                rgba.a);
}

// from Syntopia http://blog.hvidtfeldts.net/index.php/2015/01/path-tracing-3d-fractals/
vec2 rand2n(vec2 co, float sampleIndex) {
    vec2 seed = co * (sampleIndex + 1.0);
    seed+=vec2(-1,1);
    // implementation based on: lumina.sourceforge.net/Tutorials/Noise.html
    return vec2(fract(sin(dot(seed.xy ,vec2(12.9898,78.233))) * 43758.5453),
                 fract(cos(dot(seed.xy ,vec2(4.898,7.23))) * 23421.631));
}

const float EPSILON = 0.0001;

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

vec3 coordOnSphere(float theta, float phi){
    return vec3(sin(phi) * cos(theta),
                cos(phi + PI),
                sin(phi) * sin(theta));
}

vec2 equirectangularCoord(const vec3 coordOnSphere){
    vec3 dir = (coordOnSphere);
    float l = atan(dir.z, dir.x);
    if (l < 0.) l += TWO_PI;
    return vec2(l, abs(acos(dir.y)-PI));
}

vec4 CP1FromSphere(const vec3 pos){
    if(pos.y < 0.)
        return vec4(pos.x, pos.z, 1. - pos.y, 0);
    else
        return vec4(1. + pos.y, 0, pos.x, -pos.z);
}

vec2 compProd(const vec2 a, const vec2 b){
    return vec2(a.x * b.x - a.y * b.y,
                a.x * b.y + a.y * b.x);
}

vec2 compQuot(const vec2 a, const vec2 b){
    float denom = dot(b, b);
    return vec2((a.x * b.x + a.y * b.y) / denom,
                (a.y * b.x - a.x * b.y) / denom);
}

vec2 conjugate(const vec2 a){
    const vec2 conj = vec2(1, -1);
    return a * conj;
}

vec3 sphereFromCP1(const vec4 p){
    vec2 z1 = p.xy;
    vec2 z2 = p.zw;
    if(length(z2) > length(z1)){
        vec2 z = compQuot(z1, z2);
        float denom = 1. + dot(z, z);
        return vec3(2. * z.x / denom, (denom - 2.) / denom, 2. * z.y / denom);
    }else{
        vec2 z = conjugate(compQuot(z2, z1));
        float denom = 1. + dot(z, z);
        return vec3(2. * z.x / denom, (2. - denom) / denom, 2. * z.y / denom);
    }
}

// mobius is SL(2, C), 2x2 complex number matrix
// c is CP1
vec4 applyMobiusArray(const float[8] mobius, const vec4 c){
    return vec4(compProd(vec2(mobius[0], mobius[1]), c.xy) + compProd(vec2(mobius[2], mobius[3]), c.zw),
                compProd(vec2(mobius[4], mobius[5]), c.xy) + compProd(vec2(mobius[6], mobius[7]), c.zw));
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