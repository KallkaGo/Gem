varying vec3 vNormal;
varying vec3 vecPosition;
uniform mat4 offsetMatrixInv;
uniform vec3 offsetCenter;
#include <morphtarget_pars_vertex>
void main() {
  vNormal = normalize((offsetMatrixInv * vec4(normal, 0.)).xyz);
#include <begin_vertex>
  transformed -= offsetCenter;
#include <morphtarget_vertex>
  vec4 offsetPos = offsetMatrixInv * vec4(transformed, 1.);
  vecPosition = (modelMatrix * offsetPos).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * offsetPos;
}