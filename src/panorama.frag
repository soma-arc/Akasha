#version 300 es
precision mediump float;

in vec2 v_texCoord;
uniform sampler2D u_texture;
uniform vec2 u_resolution;

const float PI = 3.14159265359;
const float TWO_PI = 2. * PI;
const float PI_2 = PI * .5;
const float PI_4 = PI * .25;


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
              const float width, const float height, const vec2 coord){
    float imagePlane = (height * .5) / tan(fov * .5);
    vec3 v = normalize(target - eye);
    vec3 xaxis = normalize(cross(v, up));
    vec3 yaxis =  normalize(cross(v, xaxis));
    vec3 center = v * imagePlane;
    vec3 origin = center - (xaxis * (width  *.5)) - (yaxis * (height * .5));
    return normalize(origin + (xaxis * coord.x) + (yaxis * (height - coord.y)));
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

vec4 CP1FromSphere(vec3 pos){
	if(pos.y < 0.)
        return vec4(pos.x, pos.z, 1. - pos.y, 0);
    else
        return vec4(1. + pos.y, 0, pos.x, -pos.z);
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

vec2 equirectangularCoord(vec3 coordOnSphere){
	vec3 dir = (coordOnSphere);
    float l = atan(dir.z, dir.x);
    if (l < 0.) l += TWO_PI;
    return vec2(l, acos(dir.y));
}


vec3 sphericalView(vec3 dir){
    //    vec4 z = CP1FromSphere(dir);
    vec2 angles = equirectangularCoord(dir);

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
    return mix(color_f, color_b, blend).rgb;

    //	return equirectangularMap(angles);
}

const float DISPLAY_GAMMA_COEFF = 1. / 2.2;
vec4 gammaCorrect(vec4 rgba) {
    return vec4((min(pow(rgba.r, DISPLAY_GAMMA_COEFF), 1.)),
                (min(pow(rgba.g, DISPLAY_GAMMA_COEFF), 1.)),
                (min(pow(rgba.b, DISPLAY_GAMMA_COEFF), 1.)),
                rgba.a);
}

const vec3 up = vec3(0, 1, 0);
float fov = radians(60.);
vec3 target = vec3(1);
const float SAMPLE_NUM = 3.;

out vec4 outColor;
void main() {
    vec3 eye = vec3(0);

    vec3 sum = vec3(0);
    for(float i = 0. ; i < SAMPLE_NUM ; i++){
    	vec2 coordOffset = rand2n(gl_FragCoord.xy, i);
    	vec3 ray = calcRay(eye, target, up, fov,
        	               u_resolution.x, u_resolution.y,
            	           gl_FragCoord.xy + coordOffset);

    	sum += sphericalView(ray);
	}
	vec3 col = (sum/SAMPLE_NUM);

    outColor = vec4(col, 1);
}
