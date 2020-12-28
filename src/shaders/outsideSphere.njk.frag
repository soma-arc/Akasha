#version 300 es
precision mediump float;

in vec2 v_texCoord;
uniform sampler2D u_texture;
uniform float[8] u_mobiusArray;
uniform vec2 u_resolution;
uniform vec3 u_cameraPos;
uniform vec3 u_cameraUp;

// [lng, lat, zoomReal, zoomImag]
{% for n in range(0, numMobiusZoomIn) %}
uniform vec4 u_mobiusZoomIn{{ n }};
uniform bool u_mobiusZoomInVisible{{ n }};
{% endfor %}

// [lng, lat]
{% for n in range(0, numMobiusRotateAroundAxis) %}
uniform vec2 u_mobiusRotateAroundAxis{{ n }};
uniform bool u_mobiusRotateAroundAxisVisible{{ n }};
{% endfor %}

// [p, q, r1, r2]
{% for n in range(0, numMobiusTranslateAlongAxis) %}
uniform vec2 u_mobiusTranslateAlongAxis{{ n }}[4];
uniform bool u_mobiusTranslateAlongAxisVisible{{ n }};
{% endfor %}

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

mat3 computeRotateX(float theta) {
    float cosTheta = cos(theta);
    float sinTheta = sin(theta);
    return mat3(1, 0, 0,
                0, cosTheta, -sinTheta,
                0, sinTheta, cosTheta);
}

mat3 computeRotateY(float theta) {
    float cosTheta = cos(theta);
    float sinTheta = sin(theta);
    return mat3(cosTheta, 0, sinTheta,
                0, 1, 0,
                -sinTheta, 0, cosTheta);
}

mat3 computeRotateZ(float theta) {
    float cosTheta = cos(theta);
    float sinTheta = sin(theta);
    return mat3(cosTheta, -sinTheta, 0,
                sinTheta, cosTheta, 0,
                0, 0, 1);
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

vec3 sphericalView(vec3 dir){
    vec2 lnglat = equirectangularCoord(dir);
    {% for n in range(0, numMobiusRotateAroundAxis) %}
    if (u_mobiusRotateAroundAxisVisible{{ n }} &&
        distance(u_mobiusRotateAroundAxis{{ n }}, lnglat) < 0.1) {
        return YELLOW;
    }
    {% endfor %}
    {% for n in range(0, numMobiusZoomIn) %}
    if (u_mobiusZoomInVisible{{ n }} &&
        distance(lnglat, u_mobiusZoomIn{{ n }}.xy) < 0.1) {
        return PINK;
    }
    if (u_mobiusZoomInVisible{{ n }} &&
        (distance(lnglat, u_mobiusZoomIn{{ n }}.xy + u_mobiusZoomIn{{ n }}.zw) < 0.1 ||
        distance(lnglat + vec2(TWO_PI, 0), u_mobiusZoomIn{{ n }}.xy + u_mobiusZoomIn{{ n }}.zw) < 0.1 ||
         distance(lnglat + vec2(0, PI), u_mobiusZoomIn{{ n }}.xy + u_mobiusZoomIn{{ n }}.zw) < 0.1)) {
        return PINK;
    }
    {% endfor %}

    {% for n in range(0, numMobiusTranslateAlongAxis) %}
    if(u_mobiusTranslateAlongAxisVisible{{ n }}) {
        if (distance(lnglat, u_mobiusTranslateAlongAxis{{ n }}[0]) < 0.1) {
            return RED;
        }
        if (distance(lnglat, u_mobiusTranslateAlongAxis{{ n }}[1]) < 0.1) {
            return RED;
        }
        if (distance(lnglat, u_mobiusTranslateAlongAxis{{ n }}[2]) < 0.1) {
            return GREEN;
        }
        if (distance(lnglat, u_mobiusTranslateAlongAxis{{ n }}[3]) < 0.1) {
            return GREEN;
        }
    }
    {% endfor %}
    
    vec4 z = CP1FromSphere(coordOnSphere(lnglat.x, lnglat.y));
    lnglat = equirectangularCoord(sphereFromCP1(applyMobiusArray(u_mobiusArray, z)));
    vec4 texCol = texture(u_texture, vec2(-1, 1)* (vec2(0, 1)-lnglat/vec2(TWO_PI, PI)));
    return degamma(texCol).rgb;
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

float distCylinder(vec3 p, vec2 h) {
    vec2 d = abs(vec2(length(p.xz),p.y)) - h;
    return min(max(d.x,d.y),0.0) + length(max(d,0.0));
  //    return length(p.xz - c.xy) - c.z;
}

const vec4 SPHERE = vec4(0, 0, 0, 1);
const vec3 PLANE_P = vec3(0, -1, 0);
const vec3 PLANE_NORMAL = vec3(0, 1, 0);
const vec4 PLANE = vec4(0, 1, 0, 1);

const int OBJ_SPHERE = 0;
const int OBJ_PLANE = 1;
const int OBJ_CYLINDER = 2;
vec2 distFunc(vec3 p) {
    vec2 d = opUnion(vec2(distSphere(p, SPHERE), OBJ_SPHERE),
                     vec2(distPlane(p, PLANE), OBJ_PLANE));
    {% for n in range(0, numMobiusRotateAroundAxis) %}
    mat3 m{{ n }} = mat3(1, 0, 0,
                  0, 1, 0,
                  0, 0, 1);
    m{{ n }} *= computeRotateZ(abs(u_mobiusRotateAroundAxis{{ n }}.y));
    m{{ n }} *= computeRotateY(-(u_mobiusRotateAroundAxis{{ n }}.x));
    if(u_mobiusRotateAroundAxisVisible{{ n }}) {
        d = opUnion(d, vec2(distCylinder(m{{ n }} * p, vec2(0.05, 1.5)), OBJ_CYLINDER));
    }
    {% endfor %}
    return d;
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
        } else if (hitObj == OBJ_CYLINDER) {
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
