varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;
varying vec3 vViewPosition;

uniform float radius;
uniform vec3 centerOffset;
uniform float transmission;
uniform sampler2D transmissionSamplerMap;

uniform mat4 modelOffsetMatrixInv;
uniform mat4 modelOffsetMatrix;
uniform mat4 projectionMatrix;
uniform samplerCube tCubeMapNormals;
uniform float envMapIntensity;
uniform float refractiveIndex;
uniform float rIndexDelta;
uniform float squashFactor;
uniform float geometryFactor;
uniform vec3 color;
uniform vec3 colorCorrection;
uniform vec3 boostFactors;
uniform float gammaFactor;
uniform float absorptionFactor;
uniform float envMapRotation;
uniform vec4 envMapRotationQuat;
uniform float reflectivity;
uniform sampler2D envMap;
uniform int bounces;
uniform int transmissionMode;
uniform vec2 resolution;
uniform sampler2D uInclusionMap;
uniform sampler2D uIncRouhnessMap;
uniform sampler2D uInclusionNormalMap;
uniform sampler2D uRoughnessMap;
uniform sampler2D uBumpMap;
uniform vec4 uScaleParams;
uniform float surfaceRoughness;
uniform sampler2D refractionSamplerMap;
uniform vec4 uNoiseParams;
uniform float blurRadius;
uniform bool RGBMEncoding;

#define MODEL_OFFSET_MATRIX  modelOffsetMatrix
#define INV_MODEL_OFFSET_MATRIX  modelOffsetMatrixInv
#define CENTER_OFFSET  (centerOffset) 
#define PI 3.1428
#define ENV_MAP_TYPE 1
#define FIX_ENV_DIRECTION 1
#define USE_ENVMAP
#define DIA_ORIENT_ENVMAP 0
#define RAY_BOUNCES (bounces)

#include '../common/tools.glsl'

float mod289(float x) {
  return x - floor(x * (1. / uNoiseParams.y)) * uNoiseParams.y;
}
vec4 mod289(vec4 x) {
  return x - floor(x * (1. / uNoiseParams.z)) * uNoiseParams.z;
}

vec4 perm(vec4 x) {
  return mod289(((x * uNoiseParams.w) + 1.) * x);
}

float noise2(vec3 p) {
  vec3 a = floor(p);
  vec3 d = p - a;
  d = d * d * (3. - 2. * d);
  vec4 b = a.xxyy + vec4(0., 1., 0., 1.);
  vec4 k1 = perm(b.xyxy);
  vec4 k2 = perm(k1.xyxy + b.zzww);
  vec4 c = k2 + a.zzzz;
  vec4 k3 = perm(c);
  vec4 k4 = perm(c + 1.);
  vec4 o1 = fract(k3 * (1. / 41.));
  vec4 o2 = fract(k4 * (1. / 41.));
  vec4 o3 = o2 * d.z + o1 * (1. - d.z);
  vec2 o4 = o3.yw * d.x + o3.xz * (1. - d.x);
  return o4.y * d.y + o4.x * (1. - d.y);
}

mat3 GetTangentBasis(vec3 TangentZ) {
  vec3 up = vec3(0., 1., 1.);
  vec3 TangentX = normalize(cross((dot(TangentZ, up)) < 0.8 ? up : vec3(1., 0., 0.), TangentZ));
  vec3 TangentY = cross(TangentZ, TangentX);
  return mat3(TangentX, TangentY, TangentZ);
}

void getNormalAndRoughness(inout vec3 normal, inout float roughness) {
  mat3 basis = GetTangentBasis(normal);
  // 等同于 inverse(basis) * vWorldPosition
  vec3 transformedPos = vWorldPosition * basis;
  vec2 uvSurface = 0.5 * uScaleParams.x * transformedPos.xy / radius;
  roughness = surfaceRoughness * 7.;
  roughness *= texture2D(uRoughnessMap, uvSurface).r;
  vec3 perturbedNormal = texture2D(uBumpMap, uvSurface).rgb * 2. - 1.;
  perturbedNormal.xy *= uScaleParams.y;
  perturbedNormal = normalize(basis * perturbedNormal);
  normal = perturbedNormal;
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

vec2 cartesianToPolar(vec3 n) {
  vec2 uv;
  uv.x = atan(n.z, n.x) / (PI * 2.) + 0.5;
  uv.y = asin(n.y) / PI + 0.5;
  return uv;
}

vec4 sampleEnvMap(vec3 direction, float roughness) {
    #if !defined(USE_ENVMAP)
  return vec4(direction, 1);
    #else
  float cs = cos(envMapRotation);
  float sn = sin(envMapRotation);
  float temp = cs * direction.x + sn * direction.z;
  direction.z = -sn * direction.x + cs * direction.z;
  direction.x = temp;
  direction.x *= -1.;
  direction.y *= -1.;
  direction.z *= -1.;
  vec3 t = 2. * cross(envMapRotationQuat.xyz, direction);
  direction += envMapRotationQuat.w * t + cross(envMapRotationQuat.xyz, t);
        #if ENV_MAP_TYPE == 0
  return (textureCube(envMap, direction));
            #elif ENV_MAP_TYPE == 1
  return (texture2DLodEXT(envMap, cartesianToPolar(direction), roughness));
        #endif
  return vec4(1, 0, 1, 1);
    #endif
}

vec4 RGBM16ToLinear(in vec4 value) {
  return vec4(value.rgb * value.a * 16.0, 1.0);
}

vec4 transmissionSamplerMapTexelToLinear(vec4 value) {
  return RGBM16ToLinear(value);
}

vec4 SampleSpecularReflection(vec3 direction, float roughness) {
    #if defined(FIX_ENV_DIRECTION)
  direction = (viewMatrix * vec4(direction, 0.)).xyz;
    #endif
  return envMapIntensity * (sampleEnvMap(direction, roughness));
}

vec4 getNormalDistance(vec3 d) {
  return textureCube(tCubeMapNormals, d);
}

vec3 getSurfaceNormal(vec4 surfaceInfos) {
  vec3 surfaceNormal = surfaceInfos.rgb;
  surfaceNormal = surfaceNormal * 2. - 1.;
  return -normalize(surfaceNormal);
}

vec4 SampleSpecularContributionRef(vec3 origin, int i) {
  vec4 ndcPos = projectionMatrix * viewMatrix * vec4(origin, 1.);
  vec2 refractionCoords = ndcPos.xy / ndcPos.w;
  refractionCoords += 1.;
  refractionCoords /= 2.;
  return transmissionSamplerMapTexelToLinear(texture2D(transmissionSamplerMap, refractionCoords));
}

vec4 SampleSpecularContribution(vec3 direction, float roughness) {
    #if DIA_ORIENT_ENVMAP < 1
  direction = mat3(MODEL_OFFSET_MATRIX) * direction;
    #endif
    #if defined(FIX_ENV_DIRECTION)
  direction = (viewMatrix * vec4(direction, 0.)).xyz;
    #endif
  direction = normalize(direction);
  direction.x *= -1.;
  direction.z *= -1.;
  return envMapIntensity * (sampleEnvMap(direction, roughness));
}

vec3 intersectSphere(vec3 origin, vec3 direction) {
  origin -= CENTER_OFFSET;
  direction.y /= squashFactor;
  float A = dot(direction, direction);
  float B = 2. * dot(origin, direction);
  float C = dot(origin, origin) - radius * radius;
  float disc = B * B - 4. * A * C;
  if(disc > 0.) {
    disc = sqrt(disc);
    float t1 = (-B + disc) * geometryFactor / A;
    float t2 = (-B - disc) * geometryFactor / A;
    float t = (t1 > t2) ? t1 : t2;
    direction.y *= squashFactor;
    return vec3(origin + CENTER_OFFSET + direction * t);
  }
  return vec3(0.);
}

vec3 linePlaneIntersect(in vec3 pointOnLine, in vec3 lineDirection, in vec3 pointOnPlane, in vec3 planeNormal) {
  return lineDirection * (dot(planeNormal, pointOnPlane - pointOnLine) / dot(planeNormal, lineDirection)) + pointOnLine;
}

vec3 intersect(vec3 rayOrigin, vec3 rayDirection, inout vec3 hitNormal) {
  vec3 sphereHitPoint = intersectSphere(rayOrigin, rayDirection);
  vec3 direction1 = normalize(sphereHitPoint - CENTER_OFFSET);

  vec4 normalDistanceData1 = getNormalDistance(direction1);
  float distance1 = normalDistanceData1.a * radius;
  vec3 pointOnPlane1 = CENTER_OFFSET + direction1 * distance1;
  vec3 planeNormal1 = getSurfaceNormal(normalDistanceData1);
  vec3 hitPoint1 = linePlaneIntersect(rayOrigin, rayDirection, pointOnPlane1, planeNormal1);
  vec3 direction2 = normalize(hitPoint1 - CENTER_OFFSET);
  vec4 normalDistanceData2 = getNormalDistance(direction2);
  float distance2 = normalDistanceData2.a * radius;
  vec3 pointOnPlane2 = CENTER_OFFSET + direction2 * distance2;
  vec3 hitPoint = hitPoint1;
  vec3 planeNormal2 = getSurfaceNormal(normalDistanceData2);
  hitNormal = planeNormal2;
  hitPoint = linePlaneIntersect(rayOrigin, rayDirection, pointOnPlane2, planeNormal2);
  return hitPoint;
}

void getInclusionColorNormal(vec3 intersectedPos, vec3 hitNormal, inout vec3 inclusionColor, inout vec3 inclusionNormal, inout float roughnessVol) {
  mat3 basis = GetTangentBasis(hitNormal);
  vec3 transformedPos = intersectedPos * basis;
  inclusionColor = vec3(1.);
  inclusionColor = texture2D(uInclusionMap, 0.5 * uScaleParams.w * transformedPos.xy / radius).rgb;
  roughnessVol = texture2D(uIncRouhnessMap, 0.5 * uScaleParams.w * transformedPos.xy / radius).r * 7.;
  inclusionNormal = texture2D(uInclusionNormalMap, 0.5 * uScaleParams.w * transformedPos.xy / radius).rgb;
  inclusionNormal = 2. * inclusionNormal - 1.;
  inclusionNormal.xy *= uScaleParams.z;
  inclusionNormal = normalize(basis * inclusionNormal);
}

vec3 getRefractionColor(vec3 origin, vec3 direction, vec3 normal) {
  vec3 outColor = vec3(0.);
  const float n1 = 1.;
  const float epsilon = 1e-5;
  float f0 = (2.4 - n1) / (2.4 + n1);
  f0 *= f0;
  vec3 attenuationFactor = vec3(1.);
  vec3 newDirection = refract(direction, normal, n1 / refractiveIndex);
  vec3 brdfRefracted = BRDF_Specular_GGX_Environment(newDirection, -normal, vec3(f0), 0.);
  attenuationFactor *= (vec3(1.) - brdfRefracted);
  int count = 0;
  mat4 invModelOffsetMatrix = INV_MODEL_OFFSET_MATRIX;
  // 通过特征变换矩阵和世界矩阵构成的矩阵求逆使得这个方向向量变换到标准化的本地坐标系中，后续进行光线弹射的计算可以最大限度上保证效果
  newDirection = normalize((invModelOffsetMatrix * vec4(newDirection, 0.)).xyz);
  origin = (invModelOffsetMatrix * vec4(origin, 1.)).xyz;
  for(int i = 0; i < RAY_BOUNCES; i++) {
    vec3 hitNormal;
    vec3 intersectedPos = intersect(origin, newDirection, hitNormal);
    vec3 dist = intersectedPos - origin;
    vec3 d = normalize(intersectedPos - CENTER_OFFSET);
    vec3 inclusionColor = vec3(1.);
    vec3 inclusionNormal = vec3(1.);
    vec3 mappedNormal = getNormalDistance(d).rgb;
    mappedNormal = 2. * mappedNormal - 1.;
    mappedNormal = -normalize(mappedNormal);
    float roughnessVol = 0.;
    getInclusionColorNormal(intersectedPos, hitNormal, inclusionColor, inclusionNormal, roughnessVol);
    mappedNormal = mix(mappedNormal, inclusionNormal, .5);
    float r = length(dist) / radius * absorptionFactor;
    attenuationFactor *= exp(-r * (1. - color));

    origin = intersectedPos;
    vec3 origin2 = (MODEL_OFFSET_MATRIX * vec4(intersectedPos, 1)).xyz;
    vec3 oldDir = newDirection;
    newDirection = refract(newDirection, mappedNormal, refractiveIndex / n1);
    if(dot(newDirection, newDirection) < epsilon) {
      newDirection = reflect(oldDir, mappedNormal);
      if(i == RAY_BOUNCES - 1) {
        vec3 brdfReflected = BRDF_Specular_GGX_Environment(-oldDir, mappedNormal, vec3(f0), 0.);
        vec3 d1 = mat3(MODEL_OFFSET_MATRIX) * oldDir;
        d1 = normalize(d1);
        float cosT = 1. - dot(direction, d1);
        outColor += ((transmission > 0. && cosT < transmission) ? SampleSpecularContributionRef(origin2 + 0.5 * d1 * cosT, i).rgb : SampleSpecularContribution(oldDir, roughnessVol).rgb) * attenuationFactor * colorCorrection * boostFactors * (vec3(1.) - min(vec3(1.), brdfReflected));
        outColor *= inclusionColor;
      }

    } else {
      vec3 brdfRefracted = vec3(1.) - min(vec3(1.), BRDF_Specular_GGX_Environment(newDirection, -mappedNormal, vec3(f0), 0.));
      vec3 d1 = normalize(mat3(MODEL_OFFSET_MATRIX) * newDirection);
      float cosT = 1. - dot(direction, d1);
      if(transmission > 0. && cosT < transmission) {
        vec3 specRefColor = SampleSpecularContributionRef(origin2 + 0.5 * d1 * cosT, i).rgb * brdfRefracted * attenuationFactor * colorCorrection * boostFactors;
        specRefColor *= inclusionColor;
        outColor += specRefColor;
      } else {
        vec3 dir0 = newDirection;
        vec3 dir1 = refract(oldDir, mappedNormal, (refractiveIndex + rIndexDelta) / n1);
        vec3 dir2 = refract(oldDir, mappedNormal, (refractiveIndex - rIndexDelta) / n1);
        vec3 specRefColor = vec3(SampleSpecularContribution(dir1, roughnessVol).r, SampleSpecularContribution(dir0, roughnessVol).g, SampleSpecularContribution(dir2, roughnessVol).b) * brdfRefracted * attenuationFactor * colorCorrection * boostFactors;
        specRefColor *= inclusionColor;
        outColor += specRefColor;
      }
      newDirection = reflect(oldDir, mappedNormal);
      vec3 brdfReflected = BRDF_Specular_GGX_Environment(newDirection, mappedNormal, vec3(f0), 0.);
      attenuationFactor *= brdfReflected * boostFactors;
      count++;
    }

  }
  return outColor;
}

// vec3 getRefractionColor(vec3 origin, vec3 direction, vec3 normal) {
//   vec3 outColor = vec3(0.);
//   const float n1 = 1.;
//   const float epsilon = 1e-4;
//   float f0 = (2.4 - n1) / (2.4 + n1);
//   f0 *= f0;
//   vec3 attenuationFactor = vec3(1.);
//   vec3 newDirection = refract(direction, normal, n1 / refractiveIndex);
//   vec3 brdfRefracted = BRDF_Specular_GGX_Environment(newDirection, -normal, vec3(f0), 0.);
//   attenuationFactor *= (vec3(1.) - brdfRefracted);
//   int count = 0;
//   mat4 invModelOffsetMatrix = INV_MODEL_OFFSET_MATRIX;
//   newDirection = normalize((invModelOffsetMatrix * vec4(newDirection, 0.)).xyz);
//   origin = (invModelOffsetMatrix * vec4(origin, 1.)).xyz;

//   for(int i = 0; i < RAY_BOUNCES; i++) {
//     vec3 hitNormal;
//     vec3 intersectedPos = intersect(origin, newDirection, hitNormal);
//     vec3 dist = intersectedPos - origin;
//     vec3 d = normalize(intersectedPos - CENTER_OFFSET);
//     vec3 inclusionColor = vec3(1.);
//     vec3 inclusionNormal = vec3(1.);
//     vec3 mappedNormal = getNormalDistance(d).rgb;
//     mappedNormal = 2. * mappedNormal - 1.;
//     mappedNormal = -normalize(mappedNormal);
//     float roughnessVol = 0.;

//     //  inclusionsColorNormalTag
//     //  inclusionsTag2

//     float rawR = length(dist) / radius * absorptionFactor;
//     float r = clamp(rawR, 0.0, 6.0);
//     vec3 absorptionCoeff = r * (1. - color);
//     absorptionCoeff = clamp(absorptionCoeff, 0.0, 5.0);
//     vec3 newAttenuation = exp(-absorptionCoeff);
//     newAttenuation = max(newAttenuation, vec3(0.02));
//     attenuationFactor *= newAttenuation;

//     origin = intersectedPos;
//     vec3 origin2 = (MODEL_OFFSET_MATRIX * vec4(intersectedPos, 1)).xyz;
//     vec3 oldDir = newDirection;
//     newDirection = refract(newDirection, mappedNormal, refractiveIndex / n1);

//     float refractLength = length(newDirection);
//     if(refractLength < epsilon) {
//       newDirection = reflect(oldDir, mappedNormal);
//       if(i == RAY_BOUNCES - 1) {
//         vec3 brdfReflected = BRDF_Specular_GGX_Environment(-oldDir, mappedNormal, vec3(f0), 0.);
//         vec3 d1 = mat3(MODEL_OFFSET_MATRIX) * oldDir;
//         d1 = normalize(d1);
//         float cosT = 1. - dot(direction, d1);

//         vec3 contribution = ((transmission > 0. && cosT < transmission) ? SampleSpecularContributionRef(origin2 + 0.5 * d1 * cosT, i).rgb : SampleSpecularContribution(oldDir, roughnessVol).rgb);
//         contribution = clamp(contribution, 0.0, 2.0);

//         outColor += contribution * attenuationFactor * colorCorrection * boostFactors * (vec3(1.) - min(vec3(1.), brdfReflected));
//         outColor *= inclusionColor;
//       }
//     } else {
//       newDirection = normalize(newDirection);

//       vec3 brdfRefracted = vec3(1.) - min(vec3(1.), BRDF_Specular_GGX_Environment(newDirection, -mappedNormal, vec3(f0), 0.));
//       vec3 d1 = normalize(mat3(MODEL_OFFSET_MATRIX) * newDirection);
//       float cosT = 1. - dot(direction, d1);

//       if(transmission > 0. && cosT < transmission) {
//         vec3 specRefColor = SampleSpecularContributionRef(origin2 + 0.5 * d1 * cosT, i).rgb * brdfRefracted * attenuationFactor * colorCorrection * boostFactors;

//         specRefColor = clamp(specRefColor, 0.0, 2.0);

//         specRefColor *= inclusionColor;
//         outColor += specRefColor;
//       } else {
//         vec3 dir0 = newDirection;
//         vec3 dir1 = refract(oldDir, mappedNormal, (refractiveIndex + rIndexDelta) / n1);
//         vec3 dir2 = refract(oldDir, mappedNormal, (refractiveIndex - rIndexDelta) / n1);

//         if(length(dir1) < epsilon)
//           dir1 = dir0;
//         if(length(dir2) < epsilon)
//           dir2 = dir0;

//         vec3 specRefColor = vec3(SampleSpecularContribution(dir1, roughnessVol).r, SampleSpecularContribution(dir0, roughnessVol).g, SampleSpecularContribution(dir2, roughnessVol).b) * brdfRefracted * attenuationFactor * colorCorrection * boostFactors;

//         specRefColor = clamp(specRefColor, 0.0, 2.0);

//         specRefColor *= inclusionColor;
//         outColor += specRefColor;
//       }

//       newDirection = reflect(oldDir, mappedNormal);
//       vec3 brdfReflected = BRDF_Specular_GGX_Environment(newDirection, mappedNormal, vec3(f0), 0.);

//       vec3 reflectionAtten = clamp(brdfReflected * boostFactors, 0.02, 1.0);
//       attenuationFactor *= reflectionAtten;

//       count++;
//     }
//   }

//   return clamp(outColor, 0.0, 4.0);
// }

// const vec2 poissonDisk[8] = vec2[](vec2(-0.7071, 0.7071), vec2(-0.0000, -0.8750), vec2(0.5303, 0.5303), vec2(-0.6250, -0.0000), vec2(0.3536, -0.3536), vec2(-0.3536, 0.3536), vec2(0.8750, 0.0000), vec2(0.0000, 0.6250));

const vec2 poissonDisk[4] = vec2[](vec2(-0.94201624, -0.39906216), vec2(0.94558609, -0.76890725), vec2(-0.094184101, -0.92938870), vec2(0.34495938, 0.29387760));

vec3 getRefractionColorPoissonSample(vec3 origin, vec3 direction, vec3 normal) {
  vec3 totalColor = vec3(0.0);
  const int sampleCount = 4;

  for(int i = 0; i < sampleCount; i++) {
    vec2 offset = poissonDisk[i] * (1. / resolution) * 5.;

    vec3 jitteredDirection = normalize(direction + vec3(offset.x, offset.y, offset.x * 0.5));

    vec3 sampleColor = getRefractionColor(origin, jitteredDirection, normal);
    totalColor += sampleColor;
  }

  return totalColor / float(sampleCount);
}

float getRoughnessModifier(vec3 origin, vec3 direction, vec3 normal) {
  const float n1 = 1.;
  const float epsilon = 1e-4;
  float f0 = (2.4 - n1) / (2.4 + n1);
  f0 *= f0;
  vec3 newDirection = refract(direction, normal, n1 / refractiveIndex);
  int count = 0;
  mat4 invModelOffsetMatrix = INV_MODEL_OFFSET_MATRIX;
  newDirection = normalize((invModelOffsetMatrix * vec4(newDirection, 0.)).xyz);
  origin = (invModelOffsetMatrix * vec4(origin, 1.)).xyz;
  float totalDistance = 0.;
  for(int i = 0; i < RAY_BOUNCES; i++) {
    vec3 hitNormal;
    vec3 intersectedPos = intersect(origin, newDirection, hitNormal);
    vec3 dist = intersectedPos - origin;
    vec3 d = normalize(intersectedPos - CENTER_OFFSET);
    totalDistance += sqrt(length(dist) / radius);
    vec3 mappedNormal = getNormalDistance(d).rgb;
    mappedNormal = 2. * mappedNormal - 1.;
    mappedNormal = -normalize(mappedNormal);
    origin = intersectedPos;
    vec3 origin2 = (MODEL_OFFSET_MATRIX * vec4(intersectedPos, 1)).xyz;
    vec3 oldDir = newDirection;
    newDirection = refract(newDirection, mappedNormal, refractiveIndex / n1);
    if(dot(newDirection, newDirection) < epsilon) {
      newDirection = reflect(oldDir, mappedNormal);
    } else {
      newDirection = reflect(oldDir, mappedNormal);
      count++;
    }

  }
  return pow(noise2(vec3(origin.xy, totalDistance)), 2.);
  return 1.;
}

vec4 Sample(in sampler2D mipMapTexture, vec2 uv) {
  vec4 color = textureLod(mipMapTexture, uv, 5.);
  return color;
  // return mix(color, RGBM16ToLinear1(color), RGBMEncoding ? 0. : 1.);
}

vec4 SamplePossion(in sampler2D mipMapTexture, vec2 uv) {
  vec4 totalColor = vec4(0.0);
  const int sampleCount = 4;

  for(int i = 0; i < sampleCount; i++) {
    vec2 offset = poissonDisk[i] * (1. / resolution) * 5.;

    vec2 jitteredUV = uv + vec2(offset.x, offset.y);

    vec4 sampleColor = texture2D(mipMapTexture, jitteredUV);
    // sampleColor = mix(sampleColor, RGBM16ToLinear1(sampleColor), RGBMEncoding ? 0. :1.);
    totalColor += sampleColor;
  }
  return totalColor / float(sampleCount);
  // vec4 color = texture2D(mipMapTexture, uv);
  // return color;

}

vec4 SampleMipMap(in sampler2D mipMapTexture, in vec2 uvCoord, in vec2 textureSize, float roughness) {
  float maxMipLevel = 6.;
  float mipLevel = maxMipLevel * min(1., roughness);
  float lowerMipLevel = floor(mipLevel);
  float t = mipLevel - lowerMipLevel;
  float higherMipLevel = min(lowerMipLevel + 1., maxMipLevel);
  float powLevel = pow(2., higherMipLevel);
  vec2 texelSize = 2. * powLevel / textureSize;
  vec2 uv = max(min(uvCoord, 1. - texelSize), texelSize);
  vec2 uvLower = vec2(2. * uv.x, powLevel - 2. + uv.y) / powLevel;
  powLevel *= 2.;
  vec2 uvHigher = vec2(2. * uv.x, powLevel - 2. + uv.y) / powLevel;
  vec4 outColor = vec4(0);
  #ifdef POISSONSAMPLE
  outColor = mix(SamplePossion(mipMapTexture, uvLower), SamplePossion(mipMapTexture, uvHigher), t);
  #else
  outColor = mix(Sample(mipMapTexture, uvLower), Sample(mipMapTexture, uvHigher), t);
  #endif
  vec4 outColor1 = (texture2D(mipMapTexture, uvCoord));
  return (outColor);
}

vec4 sampleRefractionColor(in vec3 position, float roughness) {
  vec4 ndcPos = projectionMatrix * viewMatrix * vec4(position, 1.);
  vec2 refractionCoords = ndcPos.xy / ndcPos.w;
  refractionCoords += 1.;
  refractionCoords /= 2.;
  float radiusModifier = clamp(3. / (1. + pow(vViewPosition.z, 0.5)), 0., 1.);
  vec4 color = SampleMipMap(refractionSamplerMap, refractionCoords, resolution, roughness * blurRadius * radiusModifier);
  return color;

}

void main() {
  vec3 normalizedNormal = normalize(vWorldNormal);
  vec3 viewVector = normalize(vWorldPosition - cameraPosition);
  vec3 reflectionColor = vec3(0.);
  vec3 refractionColor = vec3(0.);
  const float n1 = 1.;
  float f0 = (2.4 - n1) / (2.4 + n1);
  f0 *= f0;
  vec3 reflectedDirection = reflect(viewVector, normalizedNormal);
  float roughness = 0.;

  if(transmissionMode == 0 || transmissionMode == 2) {
    getNormalAndRoughness(normalizedNormal, roughness);
    // 考虑下是否要进行二次折射 会有闪点的效果
    // reflectedDirection = reflect(viewVector, normalizedNormal);
  }

  vec3 brdfReflected = BRDF_Specular_GGX_Environment(reflectedDirection, normalizedNormal, vec3(f0), 0.);

  if(transmissionMode == 0 || transmissionMode == 2) {
    reflectionColor = SampleSpecularReflection(reflectedDirection, roughness).rgb * brdfReflected * reflectivity * 2.;
  }

  float modRoughness = 1.;
  if(transmissionMode == 0) {
    // modRoughness = getRoughnessModifier(vWorldPosition, viewVector, normalizedNormal);
    modRoughness += roughness;
    modRoughness = max(min(modRoughness, 1.), 0.);
    if(uNoiseParams.x < 0.01)
      modRoughness = roughness;
    refractionColor = sampleRefractionColor(vWorldPosition.xyz, modRoughness).rgb;

  }

  if(transmissionMode == 1 || transmissionMode == 2) {
  // #ifdef POISSONSAMPLE
  //   refractionColor = getRefractionColorPoissonSample(vWorldPosition, viewVector, normalizedNormal);
  // #else
  //   refractionColor = getRefractionColor(vWorldPosition, viewVector, normalizedNormal);
  // #endif
    refractionColor = getRefractionColor(vWorldPosition, viewVector, normalizedNormal);
  }

  vec3 diffuseColor = vec3(1.);

  //  beforeAccumulation
  gl_FragColor = vec4((refractionColor.rgb + reflectionColor.rgb) * diffuseColor, 1.);
  // gl_FragColor.rgb = vec3(normalizedNormal);
  // gl_FragColor = test;
  gl_FragColor.rgb = pow(gl_FragColor.rgb, vec3(gammaFactor));
  gl_FragColor.rgb = max(gl_FragColor.rgb, 0.);
  // gl_FragColor = mix(gl_FragColor, LinearToRGBM16_1(gl_FragColor), RGBMEncoding ? 1. : 0.);

}