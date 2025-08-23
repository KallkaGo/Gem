#define MAX_REFLECTION 3

varying vec2 vUv;
varying vec3 vCameraLocalPos;
varying vec3 vPos;
varying vec3 vNormal;
varying mat4 objectToWorldMatrix;

uniform float uRefractiveIndex;
uniform float uFresnelDispersionScale;
uniform float uFresnelDispersionPower;
uniform float uTotalInternalReflection;
uniform float uBaseReflection;
uniform float uScale;
uniform float uDispersion;
uniform float uDispersionR;
uniform float uDispersionG;
uniform float uDispersionB;
uniform float uBrightness;
uniform float uPower;
uniform int uPlaneCount;
uniform float uColorByDepth;
uniform float uColorIntensity;
uniform float uDispersionIntensity;
uniform float uLighttransmission;
uniform float uMipMapLevel;

uniform vec2 uSize;
uniform sampler2D uShapeTexture;
uniform samplerCube uEnvMap;

#include "../includes/includes.glsl"

void main() {
  vec3 cameraLocal = vCameraLocalPos;
  vec3 pos = vPos;
  vec3 normal = normalize(vNormal);

  vec3 localRay = normalize(pos - cameraLocal);

  vec4 plane = vec4(normal, dot(pos, normal));

  float reflectionRate = 0.;
  float reflectionRate2 = 0.;
  vec3 reflectionRay;
  vec3 refractionRay;

  float tmpR = uRefractiveIndex;

  float PlaneNull;

  CollideRayWithPlane(pos, 0., localRay, plane, 1.0 / tmpR, reflectionRate, reflectionRate2, reflectionRay, refractionRay, PlaneNull);

  vec4 refractionColor = GetColorByRay(pos, refractionRay, tmpR, MAX_REFLECTION, vec4(1.), uLighttransmission);
  refractionColor.w = 1.;

  vec4 test = texture2D(uShapeTexture, vUv);

  gl_FragColor = pow(refractionColor,vec4(1./2.2));

  // gl_FragColor =vec4(test.rgb,1.);

}