#define MAX_REFLECTION 10
#define PI 3.1428

varying vec2 vUv;
varying vec3 vCameraLocalPos;
varying vec3 vPos;
varying vec3 vNormal;
varying mat4 objectToWorldMatrix;
varying vec3 vWorldNormal;
varying vec3 vWorldDir;

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
uniform float uColorByDepth;
uniform float uColorIntensity;
uniform float uDispersionIntensity;
uniform float uLighttransmission;
uniform float uMipMapLevel;
uniform float uScaleIntensity;
uniform vec3 uColor;
uniform float uColorAlpha;
uniform float uReflective;
uniform float uEnvRotation;
uniform vec4 uEnvMapRotationQuat;

uniform int uPlaneCount;
uniform int uMaxReflection;

/* toneMap */
uniform float uPostExposure;
uniform float uDisaturate;
uniform float uMax;
uniform float uMin;
uniform float uContrast;

uniform vec2 uSize;
uniform sampler2D uShapeTexture;
uniform sampler2D uEnvMap;
uniform sampler2D uReflectMap;

vec2 cartesianToPolar(vec3 n) {
  vec2 uv;
  uv.x = atan(n.z, n.x) / (PI * 2.) + 0.5;
  uv.y = asin(n.y) / PI + 0.5;
  return uv;
}

vec3 BRDF_Specular_GGX_Environment(const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float roughness) {
  float dotNV = abs(dot(normal, viewDir));
  const vec4 c0 = vec4(-1, -0.0275, -0.572, 0.022);
  const vec4 c1 = vec4(1, 0.0425, 1.04, -0.04);
  vec4 r = roughness * c0 + c1;
  float a004 = min(r.x * r.x, exp2(-9.28 * dotNV)) * r.x + r.y;
  vec2 AB = vec2(-1.04, 1.04) * a004 + r.zw;
  return specularColor * AB.x + AB.y;
}

vec4 SampleSpecularReflection(sampler2D reflectMap, vec3 direction) {
  direction = (viewMatrix * vec4(direction, 0.)).xyz;
  direction = normalize(direction);
  float cs = cos(uEnvRotation);
  float sn = sin(uEnvRotation);
  float temp = cs * direction.x + sn * direction.z;
  direction.z = -sn * direction.x + cs * direction.z;
  direction.x = temp;
  direction.x *= -1.;
  direction.y *= -1.;
  direction.z *= -1.;
  vec3 t = 2. * cross(uEnvMapRotationQuat.xyz, direction);
  direction += uEnvMapRotationQuat.w * t + cross(uEnvMapRotationQuat.xyz, t);
  return texture2D(reflectMap, cartesianToPolar(direction));
}

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

  vec4 refractionColor = GetColorByRay(pos, refractionRay, tmpR, uMaxReflection, vec4(uColor, uColorAlpha), uLighttransmission);
  refractionColor.a = 1.;

  vec4 finalColor = refractionColor;

  const float n1 = 1.;
  float f0 = (2.4 - n1) / (2.4 + n1);
  f0 *= f0;

  vec3 reflectionColor = vec3(0.);

  vec3 worldDir = normalize(vWorldDir);

  vec3 normalizedNormal = normalize(vWorldNormal);

  vec3 reflectedDirection = reflect(worldDir, normalizedNormal);

  vec3 brdfReflected = BRDF_Specular_GGX_Environment(reflectedDirection, normalizedNormal, vec3(f0), 0.);

  reflectionColor = SampleSpecularReflection(uReflectMap, reflectedDirection).rgb * brdfReflected * 2. * uReflective;

  finalColor.rgb += reflectionColor;

  finalColor = ToneMap(finalColor, uPostExposure, uDisaturate, uMax, uMin, uContrast, 1.);

  finalColor.a = 1.;

  if(finalColor.r > 1.) {
    finalColor.rgb = finalColor.rgb * 2.;
  }

  if(finalColor.r > 1.) {
    finalColor.rgb = finalColor.rgb * 2.;
  }

  if(finalColor.r > 1.) {
    finalColor.rgb = finalColor.rgb * 2.;
  }

  gl_FragColor = finalColor;

  gl_FragColor.rgb = max(gl_FragColor.rgb, 0.);

  gl_FragColor.rgb = pow(gl_FragColor.rgb, vec3(1. / 2.2));

  // gl_FragColor = linearToOutputTexel(gl_FragColor);

  // #include <tonemapping_fragment>
}