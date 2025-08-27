vec3 worldSpaceViewDir(vec3 pos) {
    vec3 worldPos = (objectToWorldMatrix * vec4(pos, 1.0)).xyz;
    vec3 viewDir = cameraPosition.xyz - worldPos;
    return viewDir;
}

float Remap(float value, float min1, float max1, float min2, float max2) {
    return (min2 + (value - min1) * (max2 - min2) / (max1 - min1));
}

vec4 CalculateContrast(float contrastValue, vec4 colorTarget) {
    float t = 0.5 * (1.0 - contrastValue);

    // Create the transformation matrix
    mat4 contrastMatrix = mat4(contrastValue, 0.0, 0.0, t, 0.0, contrastValue, 0.0, t, 0.0, 0.0, contrastValue, t, 0.0, 0.0, 0.0, 1.0);

    // Apply the transformation
    return contrastMatrix * colorTarget;
}
vec4 ToneMap(vec4 MainColor, float brightness, float Disaturate, float _max, float _min, float contrast, float Satur) {
    vec4 outputColor = MainColor;

    // Apply brightness adjustment
    outputColor *= brightness;

    // Apply contrast
    outputColor = CalculateContrast(contrast, outputColor);

    // Desaturate
    float disatur = dot(outputColor.rgb, vec3(0.299, 0.587, 0.114));
    outputColor = mix(outputColor, vec4(disatur, disatur, disatur, outputColor.a), clamp(pow((outputColor.r + outputColor.g + outputColor.b) / 3.0 * Disaturate, 1.3), 0.0, 1.0));

    // Remap colors
    outputColor.r = clamp(Remap(outputColor.r, 0.0, 1.0, _min, mix(_max, 1.0, 0.5)), 0.0, 1.5);
    outputColor.g = clamp(Remap(outputColor.g, 0.0, 1.0, _min, mix(_max, 1.0, 0.5)), 0.0, 1.5);
    outputColor.b = clamp(Remap(outputColor.b, 0.0, 1.0, _min, mix(_max, 1.0, 0.5)), 0.0, 1.5);

    // Apply contrast using exponentiation
    outputColor = pow(outputColor, vec4(contrast));

    // Adjust output with smoothstep for limits
    outputColor = mix(clamp(outputColor, 0.0, _max), outputColor, pow(_max, 4.0));

    // Apply smoothstep logic
    outputColor = mix(smoothstep(-0.1, 0.25, outputColor), outputColor, (1.0 - distance(vec3(1.0), vec3(_max)) * 2.0));

    // Blend with the desaturated value based on saturation parameter
    outputColor = mix(vec4(disatur, disatur, disatur, outputColor.a), outputColor, Satur);

    // Final brightness adjustment
    outputColor *= mix(vec4(brightness), vec4(1.0), 0.75);

    return outputColor;
}

// Note: Ensure the Remap function is implemented properly in GLSL.

float CalcReflectionRate(vec3 normal, vec3 ray, float baseReflection, float borderDot) {
    float normalizedDot = clamp((abs(dot(normal, ray)) - borderDot) / (1.0 - borderDot), 0.0, 1.0);

    return baseReflection + (1.0 - baseReflection) * pow(1.0 - normalizedDot, 5.);
}

// void CollideRayWithPlane(
//     vec3 Pos,
//     float PassCount,
//     vec3 rayNormalized,
//     vec4 TriangleNormal,
//     float startSideRelativeRefraction,
//     out float reflectionRate,
//     out float reflectionRate2,
//     out vec3 reflection,
//     out vec3 refraction,
//     out float HorizontalElementSquared
// ) {

//     vec3 rayVertical = dot(TriangleNormal.xyz, rayNormalized) * TriangleNormal.xyz;
//     reflection = rayNormalized - rayVertical * 2.0;

//     //  reflection.r = pow(reflection.r, reflection.r * 2);

//     vec3 rayHorizontal = rayNormalized - rayVertical;

//     vec3 refractHorizontal = rayHorizontal * startSideRelativeRefraction;

//     float horizontalElementSquared = dot(refractHorizontal, refractHorizontal);

//     float borderDot = 0.;

//     if(startSideRelativeRefraction > 1.0) {
//         borderDot = sqrt(1.0 - 1.0 / (startSideRelativeRefraction * startSideRelativeRefraction));
//     } else {
//         borderDot = 0.0;
//     }

//     HorizontalElementSquared = 0.;
//     //  HorizontalElementSquared = horizontalElementSquared;

//     vec3 _worldViewDir = worldSpaceViewDir(Pos);
//     _worldViewDir = normalize(_worldViewDir);

//     float fresnelNdotV5 = dot(rayNormalized.xyz, _worldViewDir);

//     float fresnelNode5 = (uFresnelDispersionScale * pow(1.0 - fresnelNdotV5, uFresnelDispersionPower));

//     HorizontalElementSquared = horizontalElementSquared / 3.;
//     if(horizontalElementSquared >= uTotalInternalReflection) {
//         HorizontalElementSquared = 0.;

//         reflectionRate = 1.0;
//         reflectionRate2 = 1.0;
//         refraction = TriangleNormal.xyz;

//         return;
//     }

//     float verticalSizeSquared = 1. - horizontalElementSquared;

//     vec3 refractVertical = rayVertical * sqrt(verticalSizeSquared / dot(rayVertical, rayVertical));

//     refraction = refractHorizontal + refractVertical;

//     reflectionRate = CalcReflectionRate(rayNormalized, TriangleNormal.xyz, uBaseReflection * PassCount, borderDot);

//     // reflectionRate2 = CalcReflectionRate(rayNormalized, TriangleNormal.xyz, uBaseReflection * PassCount, borderDot);
// }

void CollideRayWithPlane(
    vec3 Pos,
    float PassCount,
    vec3 rayNormalized,
    vec4 TriangleNormal,
    float startSideRelativeRefraction,
    out float reflectionRate,
    out float reflectionRate2,
    out vec3 reflection,
    out vec3 refraction,
    out float HorizontalElementSquared
) {
    // 计算射线与三角形法线的垂直分量
    vec3 triangleNormal = TriangleNormal.xyz;
    float normalDotRay = dot(triangleNormal, rayNormalized);
    vec3 rayVertical = normalDotRay * triangleNormal; // 计算法向量的投影
    reflection = rayNormalized - 2.0 * rayVertical; // 计算反射向量

    // 计算水平分量
    vec3 rayHorizontal = rayNormalized - rayVertical;
    vec3 refractHorizontal = rayHorizontal * startSideRelativeRefraction;

    // 计算水平分量的平方长度
    float horizontalElementSquared = dot(refractHorizontal, refractHorizontal);
    float borderDot = 0.0; // 在这里初始化 borderDot

    // 处理全内反射的检查
    if(startSideRelativeRefraction > 1.0) {
        borderDot = sqrt(1.0 - 1.0 / (startSideRelativeRefraction * startSideRelativeRefraction));
        // 更新反射率以处理全内反射情况
        if(horizontalElementSquared >= uTotalInternalReflection) {
            HorizontalElementSquared = 0.0;
            reflectionRate = 1.0;
            reflectionRate2 = 1.0;
            refraction = triangleNormal;
            return;
        }
    }

    // 计算垂直分量
    float verticalSizeSquared = 1.0 - horizontalElementSquared;
    vec3 refractVertical = rayVertical * sqrt(verticalSizeSquared / dot(rayVertical, rayVertical));
    refraction = refractHorizontal + refractVertical;

    // refraction = refract(rayNormalized, triangleNormal, startSideRelativeRefraction);

    // 计算反射率
    vec3 _worldViewDir = normalize(worldSpaceViewDir(Pos)); // 归一化视线方向
    float fresnelNdotV = dot(rayNormalized, _worldViewDir); // 简化变量名称
    float fresnelFactor = uFresnelDispersionScale * pow(1.0 - fresnelNdotV, uFresnelDispersionPower);

    // 最终水平元素平方的计算
    HorizontalElementSquared = horizontalElementSquared / 3.0;

    // 计算反射率
    reflectionRate = CalcReflectionRate(rayNormalized, triangleNormal, uBaseReflection * PassCount, borderDot);
    // reflectionRate2 = reflectionRate;
}

vec4 GetUnpackedPlaneByIndex(int index) {
    int x_index = index % int(uSize.x);
    int y_index = index / int(uSize.x);

    float ustride = 1.0 / uSize.x;
    float vstride = 1.0 / uSize.y;

    vec2 uv = vec2((0.5 + float(x_index)) * ustride, (0.5 + float(y_index)) * vstride);

    vec4 packedPlane = texture2D(uShapeTexture, uv);

    vec3 normal = packedPlane.xyz * 2.0 - vec3(1, 1, 1);

    return vec4(normal, packedPlane.w * uScale);
}

// plane - normal.xyz и normal.w - distance
float CheckCollideRayWithPlane(vec3 rayStart, vec3 rayNormalized, vec4 normalTriangle) {
    float dp = dot(rayNormalized, normalTriangle.xyz);

    if(dp < 0.) {
        return -1.;
    } else {
        float distanceNormalized = normalTriangle.w - dot(rayStart.xyz, normalTriangle.xyz);

        if(distanceNormalized < 0.) {
            return -1.;
        }

        return distanceNormalized / dp;
    }

    return -1.;
}

void CheckCollideRayWithAllPlanes(vec3 rayStart, vec3 rayDirection, out vec4 hitPlane, out float hitTime) {
    hitTime = 1e6;
    hitPlane = vec4(1, 0, 0, 1);
    for(int i = 0; i < uPlaneCount; ++i) {
        vec4 plane = GetUnpackedPlaneByIndex(i);
        float tmpTime = CheckCollideRayWithPlane(rayStart, rayDirection, plane);

        if(tmpTime >= -0.001 && tmpTime < hitTime) {
            hitTime = tmpTime;
            hitPlane = plane;
        }
    }
}

vec4 SampleEnvironment(vec3 rayLocal) {
    vec3 direction = (objectToWorldMatrix * vec4(rayLocal, 0.)).xyz;
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

    vec4 tex = textureLod(uEnvMap, cartesianToPolar(direction), uMipMapLevel);

    return tex;
}

vec3 CalcColorCoefByDistance(float distance, vec4 Color) {
    return mix(pow(max(Color.xyz, vec3(0.01)), vec3(distance * Color.w)), Color.rgb, uColorByDepth);
    //  return pow(max(Color.xyz, 0.01), distance * Color.w);
}

vec4 GetColorByRay(
    vec3 rayStart,
    vec3 rayDirection,
    float refractiveIndex,
    int MaxReflection,
    vec4 Color,
    float lighttransmission
) {
    vec3 tmpRayStart = rayStart;
    vec3 tmpRayDirection = rayDirection;

    float reflectionRates[MAX_REFLECTION];
    float reflectionRates2[MAX_REFLECTION];
    vec4 refractionColors[MAX_REFLECTION];
    vec4 refractionColors2[MAX_REFLECTION];
    vec4 refractionColors3[MAX_REFLECTION];
    vec4 depthColors[MAX_REFLECTION];

    int loopCount = min(MAX_REFLECTION, MaxReflection);

    int badRay = 0;

    for(int i = 0; i < loopCount; ++i) {
        float hitTime = 1e6;
        vec4 hitPlane = vec4(1, 0, 0, 1);
        CheckCollideRayWithAllPlanes(tmpRayStart, tmpRayDirection, hitPlane, hitTime);

        if(hitTime < 0.0) {
            badRay = 1;
        }

        vec3 rayEnd = tmpRayStart + tmpRayDirection * hitTime;

        float reflectionRate;
        float reflectionRate2;
        vec3 reflectionRay;
        vec3 refractionRay;
        float PlaneNull;

        float i_Pass = float(i);

        if(i_Pass >= 2.0) {
            i_Pass = 0.0;
        }

        if(i_Pass < 2.0) {
            i_Pass = 1.0;
        }

        CollideRayWithPlane(rayStart, i_Pass, tmpRayDirection, hitPlane, refractiveIndex, reflectionRate, reflectionRate2, reflectionRay, refractionRay, PlaneNull);

        reflectionRates[i] = reflectionRate;

        // reflectionRates2[i] = reflectionRate2;

        vec3 _worldViewDir = worldSpaceViewDir(rayStart.xyz);
        _worldViewDir = normalize(_worldViewDir);

        float fresnelNdotV5 = dot(tmpRayStart, _worldViewDir);
        float fresnelNode5 = (uFresnelDispersionScale * pow(1.0 - fresnelNdotV5, uFresnelDispersionPower));

        fresnelNode5 = 1.0;

        float DispersionR = uDispersionR * uDispersion * fresnelNode5;
        float DispersionG = uDispersionG * uDispersion * fresnelNode5;
        float DispersionB = uDispersionB * uDispersion * fresnelNode5;

        vec3 rayMix = mix(rayEnd, refractionRay, 2.);

        vec3 DispersionRay_r = mix(refractionRay, rayMix, DispersionR * PlaneNull);

        //    PlaneNull = lerp(PlaneNull, 1, 0.2);

        vec3 DispersionRay_g = mix(refractionRay, rayMix, DispersionG * PlaneNull);

        //   PlaneNull = lerp(PlaneNull, 1, 0.2);
        vec3 DispersionRay_b = mix(refractionRay, rayMix, DispersionB * PlaneNull);

        // float Depth_ = depthColors[i];

        // Depth_ = Remap(Depth_, 0.997, 0.999, 1, 0);

        refractionColors3[i] = SampleEnvironment(refractionRay);

        refractionColors2[i] = vec4(1);

        refractionColors2[i].r = SampleEnvironment(DispersionRay_r).r;
        refractionColors2[i].g = SampleEnvironment(DispersionRay_g).g;
        refractionColors2[i].b = SampleEnvironment(DispersionRay_b).b;

        Color.rgb = mix(vec4(1), Color, uColorIntensity).rgb;

        depthColors[i] = vec4(CalcColorCoefByDistance(hitTime, mix(Color, vec4(1), mix(0., (refractionColors3[i].r + refractionColors3[i].g +
            refractionColors3[i].b) / 2., lighttransmission))), 1.);

        refractionColors2[i] = clamp(mix(refractionColors3[i], refractionColors2[i], uDispersionIntensity), 0., 1.);

        // float CLR = refractionRay.x;

        // if(CLR < 0.0) {
        //     CLR = CLR * -1.0;
        // }

        // refractionColors[i] = SampleEnvironment(refractionRay);

        if(i == loopCount - 1) {
            reflectionRates[i] = 0.0;
            // reflectionRates2[i] = 0.0;
        }

        tmpRayStart = tmpRayStart + tmpRayDirection * hitTime;
        tmpRayDirection = reflectionRay;
    }

    vec4 tmpReflectionColor = vec4(0, 0, 0, 0);

    // reverse calc
    for(int j = loopCount - 1; j >= 0; --j) {

        tmpReflectionColor = mix(refractionColors2[j], tmpReflectionColor, reflectionRates[j]) * depthColors[j];

        tmpReflectionColor = pow(tmpReflectionColor * uBrightness, vec4(uPower));
    }

    if(badRay > 0) {
        return vec4(1, 0, 0, 1);
    }
    return tmpReflectionColor;
}