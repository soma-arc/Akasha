#version 300 es
precision mediump float;

in vec2 v_texCoord;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform vec4 u_internalViewport;
uniform float[8] u_mobiusArray;

// [lng, lat, zoomReal, zoomImag]
{% for n in range(0, numMobiusZoomIn) %}
uniform vec4 u_mobiusZoomIn{{ n }};
{% endfor %}

// [lng, lat]
{% for n in range(0, numMobiusRotateAroundAxis) %}
uniform vec2 u_mobiusRotateAroundAxis{{ n }};
{% endfor %}

// [p, q, r1, r2]
{% for n in range(0, numMobiusTranslateAlongAxis) %}
uniform vec2 u_mobiusTranslateAlongAxis{{ n }}[4];
{% endfor %}

// include radians and colors
{% include "./constants.njk.frag" %}

{% include "./geometry.njk.frag" %}

{% include "./gamma.njk.frag" %}

out vec4 outColor;
void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    vec2 lnglat = vec2(TWO_PI, PI) * uv;

    // [p, q, r1, r2]
    {% for n in range(0, numMobiusTranslateAlongAxis) %}
    if (distance(lnglat, u_mobiusTranslateAlongAxis{{ n }}[0]) < 0.1) {
        outColor = vec4(RED, 1);
        return;
    }
    if (distance(lnglat, u_mobiusTranslateAlongAxis{{ n }}[1]) < 0.1) {
        outColor = vec4(RED, 1);
        return;
    }
    if (distance(lnglat, u_mobiusTranslateAlongAxis{{ n }}[2]) < 0.1) {
        outColor = vec4(GREEN, 1);
        return;
    }
    if (distance(lnglat, u_mobiusTranslateAlongAxis{{ n }}[3]) < 0.1) {
        outColor = vec4(GREEN, 1);
        return;
    }
    {% endfor %}

    vec4 z = CP1FromSphere(coordOnSphere(lnglat.x, lnglat.y));
    lnglat = equirectangularCoord(sphereFromCP1(applyMobiusArray(u_mobiusArray, z)));

    {% for n in range(0, numMobiusRotateAroundAxis) %}
    if (distance(lnglat, u_mobiusRotateAroundAxis{{ n }}) < 0.1) {
        outColor = vec4(YELLOW, 1);
        return;
    }
    {% endfor %}

    outColor = texture(u_texture, vec2(-1, 1)* (vec2(0, 1)-lnglat/vec2(TWO_PI, PI)));
}
