#version 300 es

in vec2 a_vertex;
out vec2 v_texCoord;

void main() {
    const vec2 rev = vec2(1, -1);
    v_texCoord = rev * a_vertex.xy * 0.5 + 0.5;
    gl_Position = vec4(a_vertex, 0., 1.0);
}
