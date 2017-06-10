vec3 coordOnSphere(const float theta, const float phi){
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
