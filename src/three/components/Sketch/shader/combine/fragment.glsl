uniform sampler2D uDiffuse;
uniform sampler2D uDiffuseBlur1;
uniform sampler2D uDiffuseBlur2;
uniform sampler2D uDiffuseBlur3;
uniform sampler2D uDiffuseBlur4;
uniform sampler2D uDiffuseBlur5;
uniform sampler2D uDiffuseBlur6;

varying vec2 vUv;
void main() {
  float yRange = floor(1. - log2(1. - vUv.y)) - 1.;
  float powRange = pow(2., yRange + 1.);
  vec2 texCoord = vec2(0.5 * powRange * vUv.x, 2. - powRange * (1. - vUv.y));
  vec4 color = vec4(0.);
  if(yRange < 0.01) {
    color = (texture2D(uDiffuse, texCoord));
  } else if(yRange < 1.01) {
    color = (texture2D(uDiffuseBlur1, texCoord));
  } else if(yRange < 2.01) {
    color = (texture2D(uDiffuseBlur2, texCoord));
  } else if(yRange < 3.01) {
    color = (texture2D(uDiffuseBlur3, texCoord));
  } else if(yRange < 4.01) {
    color = (texture2D(uDiffuseBlur4, texCoord));
  } else if(yRange < 5.01) {
    color = (texture2D(uDiffuseBlur5, texCoord));
  } else if(yRange < 6.01) {
    color = (texture2D(uDiffuseBlur6, texCoord));
  }
  gl_FragColor = color;
}