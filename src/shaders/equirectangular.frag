#version 300 es
precision mediump float;

in vec2 v_texCoord;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform vec4 u_internalViewport;

const float PI = 3.14159265359;
const float TWO_PI = 2. * PI;
const float PI_2 = PI * .5;
const float PI_4 = PI * .25;

struct SL2C{
	vec2 a;
    vec2 b;
    vec2 c;
    vec2 d;
};

uniform float[8] u_mobiusArray;

const vec2 COMPLEX_ONE = vec2(1, 0);
const vec2 COMPLEX_ZERO = vec2(0);
const SL2C MAT_UNIT = SL2C(COMPLEX_ONE, COMPLEX_ZERO,
                      	   COMPLEX_ZERO, COMPLEX_ONE);

const float THREE_PI_2 = 3. * PI / 2.;

vec2 equirectangularCoord(vec3 coordOnSphere){
	vec3 dir = (coordOnSphere);
    float l = atan(dir.z, dir.x);
    if (l < 0.) l += TWO_PI;
    return vec2(l, acos(dir.y));
}

vec3 coordOnSphere(float theta, float phi){
	return vec3(sin(phi) * cos(theta),
                cos(phi),
                sin(phi) * sin(theta));
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

SL2C matInverse(const SL2C m){
    vec2 invDet =  compQuot(COMPLEX_ONE, (compProd(m.a, m.d)-compProd(m.b, m.c)));
	return SL2C(compProd(m.d, invDet), compProd(m.b * -1., invDet),
                compProd(m.c * -1., invDet), compProd(m.a, invDet));
}

SL2C matProd(const SL2C m1, const SL2C m2){
    return SL2C(compProd(m1.a, m2.a) + compProd(m1.b, m2.c),
                compProd(m1.a, m2.b) + compProd(m1.b, m2.d),
                compProd(m1.c, m2.a) + compProd(m1.d, m2.c),
                compProd(m1.c, m2.b) + compProd(m1.d, m2.d));
}

vec4 applyMatVec(const SL2C m, const vec4 c){
	return vec4(compProd(m.a, c.xy) + compProd(m.b, c.zw),
                compProd(m.c, c.xy) + compProd(m.d, c.zw));
}

vec4 CP1FromSphere(vec3 pos){
	if(pos.y < 0.)
        return vec4(pos.x, pos.z, 1. - pos.y, 0);
    else
        return vec4(1. + pos.y, 0, pos.x, -pos.z);
}

vec3 sphereFromCP1(vec4 p){
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

const float DISPLAY_GAMMA_COEFF = 1. / 2.2;
vec4 gammaCorrect(vec4 rgba) {
    return vec4((min(pow(rgba.r, DISPLAY_GAMMA_COEFF), 1.)),
                (min(pow(rgba.g, DISPLAY_GAMMA_COEFF), 1.)),
                (min(pow(rgba.b, DISPLAY_GAMMA_COEFF), 1.)),
                rgba.a);
}

mat2 getRotationMat2(float theta) {
    return mat2(cos(theta), -sin(theta),
                sin(theta), cos(theta));
}

out vec4 outColor;
void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    vec2 lnglat = vec2(TWO_PI, PI) * uv;

    SL2C mobius = SL2C(vec2(u_mobiusArray[0], u_mobiusArray[1]), vec2(u_mobiusArray[2], u_mobiusArray[3]),
                       vec2(u_mobiusArray[4], u_mobiusArray[5]), vec2(u_mobiusArray[6], u_mobiusArray[7]));
    vec4 z = CP1FromSphere(coordOnSphere(lnglat.x, lnglat.y));
    lnglat = equirectangularCoord(sphereFromCP1(applyMatVec(mobius, z)));

    //float angle = 2. * mod(uv.y, 1.) - 1.;  // [-1, 1]
    float angle = (lnglat.y * 0.63661977 - 1.0); // angles.y * 2 / PI
    float blend = 0.5 - clamp(angle * 10.0, -0.5, 0.5);

    vec2 orientation = vec2(cos(lnglat.x), sin(lnglat.x)) * 0.885; // R= 0.885?

    vec2 size = vec2(textureSize(u_texture, 0));

    float aspect = size.x * 0.25 / size.y;

    vec2 radius_f = vec2( 0.25, aspect);
    vec2 radius_b = vec2(-0.25, aspect);

    vec2 center_f = vec2(0.75, aspect);
    vec2 center_b = vec2(0.25, aspect);

    vec4 color_f = texture(u_texture, (1.0 - angle) * orientation * radius_f + center_f);
    vec4 color_b = texture(u_texture, (1.0 + angle) * orientation * radius_b + center_b);

    //outColor = vec4(v_texCoord.xy, 0, 1);
    //    outColor = (texture(u_texture, gl_FragCoord.xy/u_resolution));
    outColor = mix(color_f, color_b, blend);
}
