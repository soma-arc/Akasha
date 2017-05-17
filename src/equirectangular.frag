#version 300 es
precision mediump float;

in vec2 v_texCoord;
uniform sampler2D u_texture;
uniform vec2 u_resolution;

const float PI = 3.14159265359;
const float TWO_PI = 2. * PI;
const float PI_2 = PI * .5;

const float DISPLAY_GAMMA_COEFF = 1. / 2.2;
vec4 gammaCorrect(vec4 rgba) {
    return vec4((min(pow(rgba.r, DISPLAY_GAMMA_COEFF), 1.)),
                (min(pow(rgba.g, DISPLAY_GAMMA_COEFF), 1.)),
                (min(pow(rgba.b, DISPLAY_GAMMA_COEFF), 1.)),
                rgba.a);
}

out vec4 outColor;
void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    vec2 lnglat = vec2(TWO_PI, PI) * uv;

    float angle = 2. * mod(uv.y, 1.) - 1.;  // [-1, 1]

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
