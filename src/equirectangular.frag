#version 300 es
precision mediump float;

in vec2 v_texCoord;
uniform sampler2D u_texture;
uniform vec2 u_resolution;

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

vec2 reverseStereoProject(const vec3 pos){
	return vec2(pos.x, pos.z) / (1. - pos.z);
}

vec3 stereoProject(vec2 pos){
    pos *= .5;
    float x = pos.x;
    float y = pos.y;
    float x2y2 = x * x + y * y;
    return vec3((2. * x) / (1. + x2y2),
                (-1. + x2y2) / (1. + x2y2),
                (2. * y) / (1. + x2y2));
}

SL2C infZeroOneToTriple(const vec4 p, const vec4 q, const vec4 r){
	vec2 p1 = p.xy; vec2 p2 = p.zw;
    vec2 q1 = q.xy; vec2 q2 = q.zw;
    vec2 r1 = r.xy; vec2 r2 = r.zw;
    SL2C m = SL2C(p1, q1, p2, q2);
    SL2C mInv = matInverse(m);
    vec4 v = applyMatVec(mInv, r);
    return SL2C(compProd(v.xy, p1), compProd(v.zw, q1),
                compProd(v.xy, p2), compProd(v.zw, q2));
}

SL2C twoTriplesToSL(const vec4 a1, const vec4 b1, const vec4 c1,
                    const vec4 a2, const vec4 b2, const vec4 c2){
	return matProd(infZeroOneToTriple(a2, b2, c2),
                   matInverse(infZeroOneToTriple(a1, b1, c1)));
}

vec3 vectorPerpToPQ(vec3 p, vec3 q){
    if(abs(dot(p, q) + 1.) < 0.0001){
        if(abs(dot(p, vec3(1, 0, 0))) > 0.999){
        	return vec3(0, 1, 0);
        }else{
        	return normalize(cross(p, vec3(1, 0, 0)));
        }
    }else{
    	return normalize(cross(p, q));
    }
}

SL2C rotateAroundAxisSpherePointsPQ(const vec3 p, const vec3 q, const float theta){
	vec4 CP1p = CP1FromSphere(p);
    vec4 CP1q = CP1FromSphere(q);
	vec3 r = vectorPerpToPQ(p, q);
    vec4 CP1r = CP1FromSphere(r);
    SL2C st = twoTriplesToSL(CP1p, CP1q, CP1r,
            	           vec4(0, 0, 1, 0),
                           vec4(1, 0, 0, 0),
                           vec4(1, 0, 1, 0));
    SL2C mTheta = SL2C(vec2(cos(theta), sin(theta)), COMPLEX_ZERO,
                       COMPLEX_ZERO, COMPLEX_ONE);
    return matProd( matProd(matInverse(st), mTheta), st);
}

SL2C rotateSpherePointsPQ(const vec3 p, const vec3 q){
	vec4 CP1p = CP1FromSphere(p);
    vec4 CP1q = CP1FromSphere(q);
    if(abs(dot(p, q) - 1.) < 0.0001){
    	return SL2C(COMPLEX_ONE, COMPLEX_ZERO, COMPLEX_ZERO, COMPLEX_ONE);
    }else{
    	vec3 r = vectorPerpToPQ(p, q);
        vec4 CP1r = CP1FromSphere(r);
        vec4 CP1mr = CP1FromSphere(-r);
        return twoTriplesToSL(CP1p, CP1r, CP1mr, CP1q, CP1r, CP1mr);
    }
}

SL2C rotateAroundAxis(const vec3 p, const float theta){
	return rotateAroundAxisSpherePointsPQ(p, -p, theta);
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

    SL2C mobius = rotateAroundAxis(coordOnSphere(0., 0.), PI);
    mobius = matProd(rotateAroundAxis(coordOnSphere(0., PI_2), PI_2),
                     mobius);
    vec4 z = CP1FromSphere(coordOnSphere(lnglat.x, lnglat.y));
    vec2 angles = equirectangularCoord(sphereFromCP1(applyMatVec(mobius, z)));

    //    float angle = 2. * mod(uv.y, 1.) - 1.;  // [-1, 1]
    float angle = angles.y * 0.63661977 - 1.0; // angles.y / PI
    float blend = 0.5 - clamp(angle * 10.0, -0.5, 0.5);

    vec2 orientation = vec2(cos(angles.x), sin(angles.x)) * 0.885; // R= 0.885?

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
