varying vec3 vNormal;
varying vec3 vecPosition;
uniform float radius;
void main() {
  vec3 color = normalize(vNormal);
  color = color * 0.5 + 0.5;
  gl_FragColor = vec4(color.x, color.y, color.z, length(vecPosition) / radius);
}