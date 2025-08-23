varying vec2 vUv;
varying vec3 vCameraLocalPos;
varying vec3 vPos;
varying vec3 vNormal;
varying mat4 objectToWorldMatrix;

uniform vec3 uCenterModel;

void main(){

  vec3 pos = position;
  pos.x = pos.x - uCenterModel.x;
  pos.y = pos.y - uCenterModel.y;
  pos.z = pos.z - uCenterModel.z;

  mat4 worldToLocalMatrix = inverse( modelMatrix );
  worldToLocalMatrix[3][0] = worldToLocalMatrix[3][0] - uCenterModel.x;
  worldToLocalMatrix[3][1] = worldToLocalMatrix[3][1] - uCenterModel.y;
  worldToLocalMatrix[3][2] = worldToLocalMatrix[3][2] - uCenterModel.z;

  vec3 cameraLocalPos = (worldToLocalMatrix * vec4( cameraPosition, 1.0 )).xyz;
  vec4 modelPosition = modelMatrix * vec4( position, 1.0 );
  vec4 viewPosition = viewMatrix * modelPosition;
  gl_Position = projectionMatrix * viewPosition;

  vPos = pos;
  vUv = uv;
  vNormal = normal;
  vCameraLocalPos = cameraLocalPos;
  objectToWorldMatrix = modelMatrix;
}