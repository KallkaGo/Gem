vec4 LinearToRGBM16_1(in vec4 value) {
  float maxRGB = max(value.r, max(value.g, value.b));
  float M = clamp(maxRGB / 16., 0., 1.);
  M = ceil(M * 255.) / 255.;
  return vec4(value.rgb / (M * 16.), M);
}

vec4 RGBM16ToLinear1(in vec4 value) {
  return vec4(value.rgb * value.a * 16., 1.);
}
