varying vec2 vUv;
uniform vec2 texSize;
uniform vec2 direction;
uniform bool clampFlag;
uniform sampler2D uDiffuse;
vec4 RGBM16ToLinear1(in vec4 value) {
  return vec4(value.rgb * value.a * 16., 1.);
}
vec4 LinearToRGBM16_1(in vec4 value) {
  float maxRGB = max(value.r, max(value.g, value.b));
  float M = clamp(maxRGB / 16., 0., 1.);
  M = ceil(M * 255.) / 255.;
  return vec4(value.rgb / (M * 16.), M);
}
int getDiamondBit(in int number) {
#ifdef WebGL2Context
  return (number / 32) % 2;
#else
  return int(mod(floor(float(number) / 32.), 2.));
#endif
}
float gaussianPdf(in float x, in float sigma) {
  return 0.39894 * exp(-0.5 * x * x / (sigma * sigma)) / sigma;
}
vec4 Sample(sampler2D sampler, vec2 uv) {
  vec4 color = RGBM16ToLinear1(texture2D(sampler, uv));
  float clampVal = mix(1e5, 1., clampFlag);
  color = clamp(color, vec4(0.), vec4(clampVal));
  return color;
}
vec4 SampleBox(sampler2D sampler, vec2 uv, float delta) {
  vec4 o = vec2(-delta, delta).xxyy / texSize.xyxy;
  vec4 s = Sample(sampler, uv + o.xy) + Sample(sampler, uv + o.zy) + Sample(sampler, uv + o.xw) + Sample(sampler, uv + o.zw);
  return s * 0.25;
}

void main() {
  vec2 invSize = 2. / texSize;
  float fSigma = float(SIGMA);
  float weightSum = gaussianPdf(0., fSigma);
  vec4 diffuseSum;
  float delta = 0.5;
  {
    diffuseSum = (SampleBox(uDiffuse, vUv, delta)) * weightSum;
    for(int i = 1; i < KERNEL_RADIUS; i++) {
      float x = float(i);
      float w = gaussianPdf(x, fSigma);
      vec2 uvOffset = direction * invSize * x;
      vec2 tempUv1 = vUv + uvOffset;
      vec2 tempUv2 = vUv - uvOffset;
      float limit1 = 0.;
      float limit2 = 1.;
      vec4 sample1 = (Sample(uDiffuse, vUv + uvOffset));
      vec4 sample2 = (Sample(uDiffuse, vUv - uvOffset));
      diffuseSum += (sample1 + sample2) * w;
      weightSum += 2. * w;
    }
    gl_FragColor = diffuseSum / weightSum;
    gl_FragColor = LinearToRGBM16_1(gl_FragColor);
  }
}
