varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;
varying vec3 vViewPosition;

void main(){

  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vec4 viewPosition = viewMatrix * worldPosition;
  gl_Position = projectionMatrix * viewPosition;
  vWorldNormal = (modelMatrix * vec4(normal, 0.0)).xyz;
  vNormal = normal;
  vWorldPosition = worldPosition.xyz;
  vViewPosition = viewPosition.xyz;
  vUv = uv;
}