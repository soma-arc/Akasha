#version 300 es
precision mediump float;

in vec2 v_texCoord;
uniform sampler2D u_dualFishEyeTexture;
uniform vec2 u_resolution;
uniform float[8] u_mobiusArray;

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

out vec4 outColor;
void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    vec2 lnglat = vec2(TWO_PI, PI) * uv;

    vec4 z = CP1FromSphere(coordOnSphere(lnglat.x, lnglat.y));
    lnglat = equirectangularCoord(sphereFromCP1(applyMobiusArray(u_mobiusArray, z)));

    //float angle = 2. * mod(uv.y, 1.) - 1.;  // [-1, 1]
    float angle = (lnglat.y * 0.63661977 - 1.0); // angles.y * 2 / PI [-1, 1]
    float blend = 0.5 - clamp(angle * 10.0, -0.5, 0.5);

    vec2 orientation = vec2(cos(lnglat.x), sin(lnglat.x)) * 0.885; // R= 0.885?

    vec2 size = vec2(textureSize(u_dualFishEyeTexture, 0));

    float aspect = size.x * 0.25 / size.y;

    vec2 radius_f = vec2( 0.25, aspect);
    vec2 radius_b = vec2(-0.25, aspect);

    vec2 center_f = vec2(0.75, aspect);
    vec2 center_b = vec2(0.25, aspect);

    vec4 color_f = degamma(texture(u_dualFishEyeTexture,
                                   (1.0 - angle) * orientation * radius_f + center_f));
    vec4 color_b = degamma(texture(u_dualFishEyeTexture,
                                   (1.0 + angle) * orientation * radius_b + center_b));

    outColor = gammaCorrect(mix(color_f, color_b, blend));
}
