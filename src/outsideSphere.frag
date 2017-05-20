#version 300 es
precision mediump float;

in vec2 v_texCoord;
uniform sampler2D u_texture;
uniform float[8] u_mobiusArray;
uniform vec2 u_resolution;
uniform vec3 u_cameraPos;
uniform vec3 u_cameraUp;

const float PI = 3.14159265359;
const float TWO_PI = 2. * PI;
const float PI_2 = PI * .5;
const float PI_4 = PI * .25;

const float EPSILON = 0.00001;

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

const float DISPLAY_GAMMA_COEFF = 1. / 2.2;
vec4 gammaCorrect(vec4 rgba) {
    return vec4((min(pow(rgba.r, DISPLAY_GAMMA_COEFF), 1.)),
                (min(pow(rgba.g, DISPLAY_GAMMA_COEFF), 1.)),
                (min(pow(rgba.b, DISPLAY_GAMMA_COEFF), 1.)),
                rgba.a);
}

const float GAMMA = 2.2;
vec4 degamma(vec4 rgba) {
    return vec4((min(pow(rgba.r, GAMMA), 1.)),
                (min(pow(rgba.g, GAMMA), 1.)),
                (min(pow(rgba.b, GAMMA), 1.)),
                rgba.a);
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

bool intersectPlane(vec3 p, vec3 n, vec3 rayOrigin, vec3 rayDir,
                    inout float minDist, inout vec3 intersection,
                    inout vec3 normal) {
    float d = -dot(p, n);
    float v = dot(n, rayDir);
    float t = -(dot(n, rayOrigin) + d) / v;
    if(EPSILON < t && t < minDist){
        minDist = t;
        intersection = rayOrigin + t * rayDir;
        normal = n;
        return true;
    }
    return false;
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

vec4 CP1FromSphere(vec3 pos){
	if(pos.y < 0.)
        return vec4(pos.x, pos.z, 1. - pos.y, 0);
    else
        return vec4(1. + pos.y, 0, pos.x, -pos.z);
}

vec2 equirectangularCoord(vec3 coordOnSphere){
	vec3 dir = (coordOnSphere);
    float l = atan(dir.z, dir.x);
    if (l < 0.) l += TWO_PI;
    return vec2(l, acos(dir.y));
}

struct SL2C{
	vec2 a;
    vec2 b;
    vec2 c;
    vec2 d;
};

vec2 compProd(const vec2 a, const vec2 b){
	return vec2(a.x * b.x - a.y * b.y,
                a.x * b.y + a.y * b.x);
}

vec4 applyMatVec(const SL2C m, const vec4 c){
	return vec4(compProd(m.a, c.xy) + compProd(m.b, c.zw),
                compProd(m.c, c.xy) + compProd(m.d, c.zw));
}

vec3 coordOnSphere(float theta, float phi){
	return vec3(sin(phi) * cos(theta),
                cos(phi),
                sin(phi) * sin(theta));
}

vec3 sphericalView(vec3 dir){
    //    vec4 z = CP1FromSphere(dir);
    vec2 angles = equirectangularCoord(dir);

    SL2C mobius = SL2C(vec2(u_mobiusArray[0], u_mobiusArray[1]), vec2(u_mobiusArray[2], u_mobiusArray[3]),
                       vec2(u_mobiusArray[4], u_mobiusArray[5]), vec2(u_mobiusArray[6], u_mobiusArray[7]));
    vec4 z = CP1FromSphere(coordOnSphere(angles.x, angles.y));
    angles = equirectangularCoord(sphereFromCP1(applyMatVec(mobius, z)));


    float angle = angles.y * 0.63661977 - 1.0; // angles.y / PI
    float blend = 0.5 - clamp(angle * 10.0, -0.5, 0.5);

    vec2 orientation = vec2(cos(angles.x), sin(angles.x)) * 0.885; // R= 0.885?

    vec2 size = vec2(textureSize(u_texture, 0));

    float aspect = size.x * 0.25 / size.y;

    vec2 radius_f = vec2( 0.25, aspect);
    vec2 radius_b = vec2(-0.25, aspect);

    vec2 center_f = vec2(0.75, aspect);
    vec2 center_b = vec2(0.25, aspect);

    vec4 color_f = degamma(texture(u_texture,
                                   (1.0 - angle) * orientation * radius_f + center_f));
    vec4 color_b = degamma(texture(u_texture,
                                   (1.0 + angle) * orientation * radius_b + center_b));

    //outColor = vec4(v_texCoord.xy, 0, 1);
    //    outColor = (texture(u_texture, gl_FragCoord.xy/u_resolution));
    return mix(color_f, color_b, blend).rgb;

    //	return equirectangularMap(angles);
}

vec2 opUnion(vec2 d1, vec2 d2) {
	return (d1.x < d2.x) ? d1 : d2;
}

float distSphere(vec3 p, vec4 sphere) {
    return distance(p, sphere.xyz) - sphere.w;
}

float distPlane(vec3 p, vec4 n) {
    return dot(p, n.xyz) + n.w;
}

const vec4 SPHERE = vec4(0, 0, 0, 1);
const vec3 PLANE_P = vec3(0, -1, 0);
const vec3 PLANE_NORMAL = vec3(0, 1, 0);
const vec4 PLANE = vec4(0, 1, 0, 1);

const int OBJ_SPHERE = 0;
const int OBJ_PLANE = 1;
vec2 distFunc(vec3 p) {
    return opUnion(vec2(distSphere(p, SPHERE), OBJ_SPHERE),
                   vec2(distPlane(p, PLANE), OBJ_PLANE));
}

const vec2 NORMAL_COEFF = vec2(0.01, 0.);
vec3 computeNormal(const vec3 p){
  return normalize(vec3(distFunc(p + NORMAL_COEFF.xyy).x - distFunc(p - NORMAL_COEFF.xyy).x,
                        distFunc(p + NORMAL_COEFF.yxy).x - distFunc(p - NORMAL_COEFF.yxy).x,
                        distFunc(p + NORMAL_COEFF.yyx).x - distFunc(p - NORMAL_COEFF.yyx).x));
}

const int MAX_MARCHING_LOOP = 500;
int march (vec3 rayOrg, vec3 rayDir, inout float minDist,
           inout vec3 intersection, inout vec3 normal) {
    vec3 rayPos = rayOrg;
    vec2 dist = vec2(-1);
    float rayLength = 0.;
    for(int i = 0 ; i < MAX_MARCHING_LOOP ; i++){
        dist = distFunc(rayPos);
        rayLength += dist.x;
        rayPos = rayOrg + rayDir * rayLength;
        if(dist.x < EPSILON){
            int objId = int(dist.y);
            intersection = rayPos;
            normal = computeNormal(intersection);
            minDist = rayLength;
            return objId;
        }
    }
    return -1;
}

float computeShadowFactor (vec3 rayOrg, vec3 rayDir,
                           float mint, float maxt, float k) {
    float shadowFactor = 1.0;
    for(float t = mint ; t < maxt ;){
        float d = distFunc(rayOrg + rayDir * t).x;
        if(d < EPSILON) {
            shadowFactor = 0.;
            break;
        }

        shadowFactor = min(shadowFactor, k * d / t);
        t += d;
    }
    return clamp(shadowFactor, 0.0, 1.0);
}

const vec3 AMBIENT_FACTOR = vec3(0.1);
const vec3 LIGHT_DIR = normalize(vec3(1, 1, 0));
vec3 calcColor(vec3 rayOrg, vec3 rayDir) {
    float minDist = 9999999.;
    vec3 intersection, normal;
    vec3 color = vec3(0);

    int hitObj = march(rayOrg, rayDir, minDist, intersection, normal);

    if(hitObj != -1) {
        vec3 matColor;
        if(hitObj == OBJ_SPHERE){
            matColor = sphericalView(normalize(intersection - SPHERE.xyz));
        } else if (hitObj == OBJ_PLANE) {
            matColor = vec3(1);
        }

        float k = computeShadowFactor(intersection + 0.01 * normal, LIGHT_DIR,
                                      0., 500., 2.);
        vec3 diffuse =  clamp(dot(normal, LIGHT_DIR), 0., 1.) * matColor;
        vec3 ambient = matColor * AMBIENT_FACTOR;
        color = (diffuse * k + ambient);
    }
    color = mix( vec3(0.6, 0.7, 1.0), color, exp( -0.000002*minDist * minDist * minDist ) );
    return color;
}

const float SAMPLE_NUM = 5.;
out vec4 outColor;
void main() {
    const vec3 up = normalize(vec3(0, 1, 0));
    const vec3 eye = vec3(3, 1, 1);
    const vec3 target = vec3(0);
    const float fov = radians(60.);
    vec3 sum = vec3(0);
    for(float i = 0. ; i < SAMPLE_NUM ; i++){
    	vec2 coordOffset = rand2n(gl_FragCoord.xy, i);
    	vec3 ray = calcRay(u_cameraPos, target, u_cameraUp, fov,
        	               u_resolution.xy,
            	           gl_FragCoord.xy + coordOffset);

    	sum += calcColor(u_cameraPos, ray);
	}
    outColor = gammaCorrect(vec4(sum/SAMPLE_NUM, 1));
}
