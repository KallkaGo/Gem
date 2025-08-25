vec3 worldSpaceViewDir(vec3 pos) {
    vec3 worldPos = (objectToWorldMatrix * vec4(pos, 1.)).xyz;
    vec3 viewDir = cameraPosition.xyz - worldPos;
    return viewDir;
}

float Remap(float value, float min1, float max1, float min2, float max2) {
    return (min2 + (value - min1) * (max2 - min2) / (max1 - min1));
}

float CalcReflectionRate(vec3 normal, vec3 ray, float baseReflection, float borderDot) {
    float normalizedDot = clamp((abs(dot(normal, ray)) - borderDot) / (1.0 - borderDot), 0.0, 1.0);

    return baseReflection + (1.0 - baseReflection) * pow(1.0 - normalizedDot, 5.);
}

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
    // 计算垂直向量
    vec3 rayVertical = dot(TriangleNormal.xyz, rayNormalized) * TriangleNormal.xyz;
    reflection = rayNormalized - rayVertical * 2.0; // 计算反射向量

    vec3 rayHorizontal = rayNormalized - rayVertical; // 计算水平分量
    vec3 refractHorizontal = rayHorizontal * startSideRelativeRefraction; // 计算折射水平分量
    float horizontalElementSquared = dot(refractHorizontal, refractHorizontal); // 水平分量的平方

    // 计算全内反射边界
    float borderDot = 0.0;
    if(startSideRelativeRefraction > 1.0) {
        borderDot = sqrt(1.0 - 1.0 / (startSideRelativeRefraction * startSideRelativeRefraction));
    } else {
        borderDot = 0.0;
    }

    HorizontalElementSquared = horizontalElementSquared / 3.0; // 计算水平元素的平方

    // 计算视线方向并归一化
    vec3 _worldViewDir = worldSpaceViewDir(Pos);
    _worldViewDir = normalize(_worldViewDir);

    // 计算 Fresnel 系数
    float fresnelNdotV5 = dot(rayNormalized, _worldViewDir);
    float fresnelEffect = pow(1.0 - fresnelNdotV5, uFresnelDispersionPower); // 调整 Fresnel 理论计算
    float fresnelNode5 = (uFresnelDispersionScale * fresnelEffect);

    // 检查全内反射
    if(horizontalElementSquared >= uTotalInternalReflection) {
        HorizontalElementSquared = 0.0;
        reflectionRate = 1.0; // 完全反射
        reflectionRate2 = 1.0;
        refraction = TriangleNormal.xyz; // 直接使用法线
        return;
    }

    // 计算折射向量
    float verticalSizeSquared = 1.0 - horizontalElementSquared;
    vec3 refractVertical = rayVertical * sqrt(verticalSizeSquared / dot(rayVertical, rayVertical));
    refraction = refractHorizontal + refractVertical;
    // refraction = refract(rayNormalized, TriangleNormal.xyz, startSideRelativeRefraction);

    // 计算反射率
    reflectionRate = CalcReflectionRate(rayNormalized, TriangleNormal.xyz, uBaseReflection * PassCount, borderDot);
    // reflectionRate2 = CalcReflectionRate(rayNormalized, TriangleNormal.xyz, uBaseReflection * PassCount, borderDot);

    //  reflectionRate2 = 0.;

    // 限制反射率的最大值，以避免过于尖锐的反射
    // if(reflectionRate > 0.4)
    //     reflectionRate = 0.4;
    // if(reflectionRate2 > 0.1)
    //     reflectionRate2 = 0.1;
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
//     // 计算平滑法线
//     vec3 SmoothedNormal = normalize(TriangleNormal.xyz);
    
//     // 计算垂直分量
//     vec3 rayVertical = dot(SmoothedNormal, rayNormalized) * SmoothedNormal;

//     // 计算反射向量
//     reflection = rayNormalized - rayVertical * 2.0; 

//     // 计算水平分量
//     vec3 rayHorizontal = rayNormalized - rayVertical;
//     vec3 refractHorizontal = rayHorizontal * startSideRelativeRefraction;
//     float horizontalElementSquared = dot(refractHorizontal, refractHorizontal); 

//     // 计算全内反射边界
//     float borderDot = 0.0;
//     if (startSideRelativeRefraction > 1.0) {
//         borderDot = sqrt(1.0 - (1.0 / (startSideRelativeRefraction * startSideRelativeRefraction)));
//     }

//     HorizontalElementSquared = horizontalElementSquared; 

//     // 计算视线方向并归一化
//     vec3 _worldViewDir = worldSpaceViewDir(Pos);
//     _worldViewDir = normalize(_worldViewDir);

//     // 计算 Fresnel 系数
//     float fresnelNdotV5 = dot(rayNormalized, _worldViewDir);
//     float fresnelEffect = pow(1.0 - fresnelNdotV5, 3.0); // 使用平滑的 Fresnel 计算
//     float fresnelNode5 = (uFresnelDispersionScale * fresnelEffect);

//     // 检查全内反射
//     if (horizontalElementSquared >= uTotalInternalReflection) {
//         HorizontalElementSquared = 0.0;
//         reflectionRate = 1.0; // 完全反射
//         reflectionRate2 = 1.0; // 完全反射
//         refraction = SmoothedNormal; // 直接使用平滑法线作为直接替代
//         return;
//     }

//     // 计算折射向量
//     float verticalSizeSquared = 1.0 - horizontalElementSquared;

//     // 使用 refract 函数来计算折射向量
//     if (verticalSizeSquared >= 0.0) {
//         vec3 refractVertical = rayVertical * sqrt(verticalSizeSquared / dot(rayVertical, rayVertical));
//         refraction = refractHorizontal + refractVertical;
//     } else {
//         refraction = reflect(rayNormalized, SmoothedNormal); // 全内反射的情况下回退到反射
//     }

//     // 计算反射率
//     reflectionRate = CalcReflectionRate(rayNormalized, SmoothedNormal, uBaseReflection * PassCount, borderDot);
//     // reflectionRate2 = CalcReflectionRate(rayNormalized, SmoothedNormal, uBaseReflection * PassCount, borderDot); // 如果需要，计算第二次反射率

//     // 限制反射率的最大值以改善视觉效果
//     // if (reflectionRate > 0.5)
//     //     reflectionRate = 0.5; // 调整反射率上限
//     // if (reflectionRate2 > 0.4) 
//     //     reflectionRate2 = 0.4; // 调整第二次反射率上限
// }

vec4 GetUnpackedPlaneByIndex(int index) {
    int x_index = index % int(uSize.x);
    int y_index = index / int(uSize.x);

    float ustride = 1.0 / uSize.x;
    float vstride = 1.0 / uSize.y;

    vec2 uv = vec2((0.5 + float(x_index)) * ustride, (0.5 + float(y_index)) * vstride);

    vec4 packedPlane = texture2D(uShapeTexture, uv);

    // #if !defined(UNITY_COLORSPACE_GAMMA)
    // packedPlane.xyz = LinearToGammaSpace(packedPlane.xyz);
    // #endif

    vec3 normal = packedPlane.xyz * 2.0 - vec3(1, 1, 1);

    return vec4(normal, packedPlane.w * uScale * uScaleIntensity);
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
    hitTime = 1000000.0;
    hitPlane = vec4(1, 0, 0, 1);
    //[unroll(20)]
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
    vec3 rayWorld = (objectToWorldMatrix * vec4(rayLocal, 0.)).xyz;

    rayWorld = normalize(rayWorld);

    vec4 tex = textureLod(uEnvMap, rayWorld, uMipMapLevel);

    return tex;
    // return float4(DecodeHDR(tex, _Environment_HDR), 1);
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

    //  [unroll(10)]
    for(int i = 0; i < loopCount; ++i) {
        float hitTime = 1000000.0;
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

        CollideRayWithPlane(tmpRayStart, i == 0 ? 1.0 : 0.0, tmpRayDirection, hitPlane, refractiveIndex, reflectionRate, reflectionRate2, reflectionRay, refractionRay, PlaneNull);
        reflectionRates[i] = reflectionRate;

        // reflectionRates2[i] = reflectionRate2;

        vec3 _worldViewDir = worldSpaceViewDir(rayStart.xyz);
        _worldViewDir = normalize(_worldViewDir);

        // vec3 _worldViewDir = normalize(worldSpaceViewDir(tmpRayStart));

        float fresnelNdotV5 = dot(tmpRayStart, _worldViewDir);
        float fresnelNode5 = (uFresnelDispersionScale * pow(1.0 - fresnelNdotV5, uFresnelDispersionPower));

        fresnelNode5 = 1.;

        float DispersionR = uDispersionR * uDispersion * fresnelNode5;
        float DispersionG = uDispersionG * uDispersion * fresnelNode5;
        float DispersionB = uDispersionB * uDispersion * fresnelNode5;

        vec3 rayMix = mix(rayEnd, refractionRay, 2.0);

        vec3 DispersionRay_r = mix(refractionRay, rayMix, DispersionR * PlaneNull);
        vec3 DispersionRay_g = mix(refractionRay, rayMix, DispersionG * PlaneNull);
        vec3 DispersionRay_b = mix(refractionRay, rayMix, DispersionB * PlaneNull);

        // vec3 DispersionRay_r = mix(refractionRay, mix(rayEnd, refractionRay, 2.), DispersionR * PlaneNull);

        //    PlaneNull = lerp(PlaneNull, 1, 0.2);

        // vec3 DispersionRay_g = mix(refractionRay, mix(rayEnd, refractionRay, 2.), DispersionG * PlaneNull);

        //   PlaneNull = lerp(PlaneNull, 1, 0.2);
        // vec3 DispersionRay_b = mix(refractionRay, mix(rayEnd, refractionRay, 2.), DispersionB * PlaneNull);

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

        // depthColors[i] = vec4(CalcColorCoefByDistance(hitTime, vec4(Color.rgb, 1.)), 1.);

        // refractionColors2[i] = clamp(mix(refractionColors3[i], refractionColors2[i], uDispersionIntensity), 0., 1.);

        float CLR = refractionRay.x;

        if(CLR < 0.0) {
            CLR = CLR * -1.0;
        }

        // refractionColors[i] = SampleEnvironment(refractionRay);

        if(i == loopCount - 1) {
            reflectionRates[i] = 0.0;
            // reflectionRates2[i] = 0.0;
        }

        tmpRayStart = tmpRayStart + tmpRayDirection * hitTime;
        // tmpRayStart = rayEnd;

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