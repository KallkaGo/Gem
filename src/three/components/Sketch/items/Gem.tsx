import type { Group, Mesh } from 'three'
import { useCubeTexture, useEnvironment, useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { calculateBoundingInfo, packPlaneIntoColor } from '@utils/misc'
import { useControls } from 'leva'
import { useEffect, useMemo, useRef } from 'react'
import { Color, DataTexture, Euler, LinearMipmapLinearFilter, Quaternion, ShaderMaterial, Texture, Uniform, Vector2, Vector3 } from 'three'
import { BufferGeometryUtils } from 'three/examples/jsm/Addons.js'
import RES from '../../RES'
import diamondFragmentShader from '../shader/diamond/fragment.glsl'
import diamondVertexShader from '../shader/diamond/vertex.glsl'

function Gem() {
  const gltf = useGLTF(RES.models.diamond3)

  const envTex = useCubeTexture(RES.textures.envMap, { path: '' })
  envTex.minFilter = LinearMipmapLinearFilter

  const baseParam = useRef({
    envRotationX: 0,
    envRotationY: 0,
    envRotationZ: 0,
  })

  const reflectTex = useEnvironment({ files: RES.textures.env_gem })
  reflectTex.generateMipmaps = true
  reflectTex.minFilter = LinearMipmapLinearFilter

  // const reflectTex = useLoader(EXRLoader, RES.textures.env_gem)
  // reflectTex.repeat.set(2, 2)

  const diamondref = useRef<Group>(null)

  const uniforms = useMemo(() => ({
    uCenterModel: new Uniform(new Vector3(0, 0, 0)),
    uShapeTexture: new Uniform(new Texture()),
    uPlaneCount: new Uniform(0),
    uSize: new Uniform(new Vector2(1, 1)),
    uScale: new Uniform(0),
    uScaleIntensity: new Uniform(1),
    uRefractiveIndex: new Uniform(1.7),
    uDispersionR: new Uniform(-0.32),
    uDispersionG: new Uniform(-0.167),
    uDispersionB: new Uniform(0.146),
    uDispersion: new Uniform(1),
    uFresnelDispersionScale: new Uniform(1),
    uFresnelDispersionPower: new Uniform(1),
    uColorIntensity: new Uniform(1),
    uColorByDepth: new Uniform(0.46),
    uBrightness: new Uniform(1.2),
    uPower: new Uniform(1.06),
    uDispersionIntensity: new Uniform(1),
    uLighttransmission: new Uniform(0.3),
    uEnvMap: new Uniform(reflectTex),
    uTotalInternalReflection: new Uniform(1),
    uBaseReflection: new Uniform(0.5),
    uMipMapLevel: new Uniform(0),
    uMaxReflection: new Uniform(5),
    uColor: new Uniform(new Color('#6dc6ff')),
    uColorAlpha: new Uniform(1),
    uPostExposure: new Uniform(1),
    uDisaturate: new Uniform(1),
    uMin: new Uniform(0),
    uMax: new Uniform(1),
    uContrast: new Uniform(1.16),
    uReflectMap: new Uniform(reflectTex),
    uReflective: new Uniform(0.2),
    uEnvRotation: new Uniform(0),
    uEnvMapRotationQuat: new Uniform(new Quaternion()),

  }), [])

  useControls('gem', {
    Color: {
      value: '#00c42a',
      onChange: (value) => {
        uniforms.uColor.value = new Color(value)
      },
    },
    RefractiveIndex: {
      value: uniforms.uRefractiveIndex.value,
      min: 1,
      max: 5,
      onChange: (value) => {
        uniforms.uRefractiveIndex.value = value
      },
    },
    MaxReflection: {
      value: uniforms.uMaxReflection.value,
      min: 0,
      max: 10,
      step: 1,
      onChange: (value) => {
        uniforms.uMaxReflection.value = value
      },
    },
    Lighttransmission: {
      value: uniforms.uLighttransmission.value,
      min: 0,
      max: 1.5,
      onChange: (value) => {
        uniforms.uLighttransmission.value = value
      },
    },
    ColorByDepth: {
      value: uniforms.uColorByDepth.value,
      min: 0,
      max: 1,
      onChange: (value) => {
        uniforms.uColorByDepth.value = value
      },
    },
    ColorIntensity: {
      value: uniforms.uColorIntensity.value,
      min: 0,
      max: 1,
      onChange: (value) => {
        uniforms.uColorIntensity.value = value
      },
    },
    ColorAlpha: {
      value: uniforms.uColorAlpha.value,
      min: 0,
      max: 1,
      onChange: (value) => {
        uniforms.uColorAlpha.value = value
      },
    },
    BaseReflection: {
      value: uniforms.uBaseReflection.value,
      min: 0,
      max: 1,
      onChange: (value) => {
        uniforms.uBaseReflection.value = value
      },
    },
    TotalInternalReflection: {
      value: uniforms.uTotalInternalReflection.value,
      min: 0,
      max: 2,
      onChange: (value) => {
        uniforms.uTotalInternalReflection.value = value
      },
    },
    MipMapLevel: {
      value: uniforms.uMipMapLevel.value,
      min: 0,
      max: 10,
      step: 1,
      onChange: (value) => {
        uniforms.uMipMapLevel.value = value
      },
    },
  })

  useControls('dispersion', {
    Dispersion: {
      value: uniforms.uDispersion.value,
      min: 0,
      max: 2,
      onChange: (value) => {
        uniforms.uDispersion.value = value
      },
    },
    DispersionIntensity: {
      value: uniforms.uDispersionIntensity.value,
      min: 0,
      max: 10,
      onChange: (value) => {
        uniforms.uDispersionIntensity.value = value
      },
    },
    DispersionR: {
      value: uniforms.uDispersionR.value,
      min: -0.5,
      max: 1,
      onChange: (value) => {
        uniforms.uDispersionR.value = value
      },
    },
    DispersionG: {
      value: uniforms.uDispersionG.value,
      min: -0.5,
      max: 1,
      onChange: (value) => {
        uniforms.uDispersionG.value = value
      },
    },
    DispersionB: {
      value: uniforms.uDispersionB.value,
      min: -0.5,
      max: 1,
      onChange: (value) => {
        uniforms.uDispersionB.value = value
      },
    },
  })

  useControls('ToneMap', {
    Brightness: {
      value: uniforms.uBrightness.value,
      min: 0,
      max: 2,
      onChange: (value) => {
        uniforms.uBrightness.value = value
      },
    },
    Power: {
      value: uniforms.uPower.value,
      min: 0,
      max: 2,
      onChange: (value) => {
        uniforms.uPower.value = value
      },
    },
    Contrast: {
      value: uniforms.uContrast.value,
      min: 0,
      max: 2,
      onChange: (value) => {
        uniforms.uContrast.value = value
      },
    },
    Disaturate: {
      value: uniforms.uDisaturate.value,
      min: 0,
      max: 2,
      onChange: (value) => {
        uniforms.uDisaturate.value = value
      },
    },
    Min: {
      value: uniforms.uMin.value,
      min: -1,
      max: 1,
      onChange: (value) => {
        uniforms.uMin.value = value
      },
    },
    Max: {
      value: uniforms.uMax.value,
      min: 0,
      max: 2,
      onChange: (value) => {
        uniforms.uMax.value = value
      },
    },
    PostExposure: {
      value: uniforms.uPostExposure.value,
      min: 0,
      max: 10,
      onChange: (value) => {
        uniforms.uPostExposure.value = value
      },
    },
    Reflective: {
      value: uniforms.uReflective.value,
      min: 0,
      max: 2,
      onChange: (value) => {
        uniforms.uReflective.value = value
      },
    },
  })

  useControls('Env', {
    rotationX: {
      value: baseParam.current.envRotationX,
      min: 0,
      max: Math.PI * 2,
      onChange: (value) => {
        baseParam.current.envRotationX = value
      },
    },
    rotationY: {
      value: baseParam.current.envRotationY,
      min: 0,
      max: Math.PI * 2,
      onChange: (value) => {
        baseParam.current.envRotationY = value
      },
    },
    rotationZ: {
      value: baseParam.current.envRotationZ,
      min: 0,
      max: Math.PI * 2,
      onChange: (value) => {
        baseParam.current.envRotationZ = value
      },
    },

  })

  useEffect(() => {
    gltf.scene.traverse((child) => {
      if ((child as Mesh).isMesh) {
        const mesh = child as Mesh
        // if (mesh.name !== 'Gem') {
        //   // mesh.visible = false
        //   return
        // }
        const geometry = BufferGeometryUtils.mergeVertices(mesh.geometry)
        // const geometry = mesh.geometry
        const verticesData = new Float32Array(geometry.attributes.position.array)
        const normalData = new Float32Array(geometry.attributes.normal.array)
        // const indexData = mesh.geometry.index?.array as Uint16Array ?? []
        const { minPos, maxPos } = calculateBoundingInfo(verticesData)
        const center = new Vector3((minPos.x + maxPos.x) / 2, (minPos.y + maxPos.y) / 2, (minPos.z + maxPos.z) / 2)

        // 处理顶点数据
        for (let i = 0; i < verticesData.length; i += 3) {
          verticesData[i] -= center.x
          verticesData[i + 1] -= center.y
          verticesData[i + 2] -= center.z
        }

        let scale = 0

        for (let i = 0; i < verticesData.length; i += 3) {
          const x = verticesData[i]
          const y = verticesData[i + 1]
          const z = verticesData[i + 2]
          const length = Math.sqrt(x * x + y * y + z * z)
          scale = Math.max(length * 1.05, scale)
        }

        // const stride = 3

        // const faceCount = indexData.length / stride

        const tmpPlanes = new Set<string>()

        const averageNormalHash = new Map()

        // for (let i = 0; i < faceCount; i++) {
        //   const index = i * stride
        //   const vertexIndex = indexData[index]
        //   const primaryPosition = new Vector3(verticesData[vertexIndex], verticesData[vertexIndex + 1], verticesData[vertexIndex + 2])
        //   const normalPosition = new Vector3(normalData[vertexIndex], normalData[vertexIndex + 1], normalData[vertexIndex + 2])
        //   const key = `${primaryPosition.x},${primaryPosition.y},${primaryPosition.z}`

        //   // 计算平滑法线
        //   if (!averageNormalHash.has(key)) {
        //     averageNormalHash.set(key, normalPosition)
        //   }
        //   else {
        //     const avgNorm = averageNormalHash.get(key)
        //     avgNorm.add(normalPosition).normalize()
        //     averageNormalHash.set(key, avgNorm)
        //   }
        //   // const packedPlane = packPlaneIntoColor(primaryPosition, normalPosition, scale)
        //   // const colorString = `${packedPlane[0]},${packedPlane[1]},${packedPlane[2]},${packedPlane[3]}`
        //   // tmpPlanes.add(colorString)
        // }

        for (let i = 0; i < verticesData.length; i += 3) {
          const primaryPosition = new Vector3(verticesData[i], verticesData[i + 1], verticesData[i + 2])
          const primaryNormal = new Vector3(normalData[i], normalData[i + 1], normalData[i + 2])
          // // 计算平滑法线
          // const key = `${primaryPosition.x},${primaryPosition.y},${primaryPosition.z}`
          // if (!averageNormalHash.has(key)) {
          //   averageNormalHash.set(key, primaryNormal)
          // }
          // else {
          //   const avgNorm = averageNormalHash.get(key)
          //   avgNorm.add(primaryNormal).normalize()
          //   averageNormalHash.set(key, avgNorm)
          // }
          const packedPlane = packPlaneIntoColor(primaryPosition, primaryNormal, scale)
          const colorString = `${packedPlane[0]},${packedPlane[1]},${packedPlane[2]},${packedPlane[3]}`
          tmpPlanes.add(colorString)
        }

        // averageNormalHash.forEach((value, key) => {
        //   const packedPlane = packPlaneIntoColor(value, scale)
        //   const colorString = `${packedPlane[0]},${packedPlane[1]},${packedPlane[2]},${packedPlane[3]}`
        //   tmpPlanes.add(colorString)
        // })

        const planeCount = tmpPlanes.size

        const texSize = 2 ** Math.ceil(Math.log2(Math.sqrt(planeCount)))

        console.log('planeCount', planeCount, 'texSize', texSize)

        const planeColor = new Uint8Array(texSize * texSize * 4)

        let index = 0

        for (const colorString of tmpPlanes) {
          const [r, g, b, a] = colorString.split(',').map(Number)
          // 逐个将 rgba 值赋值到 resultArray，并确保更新索引
          planeColor[index] = r * 255
          planeColor[index + 1] = g * 255
          planeColor[index + 2] = b * 255
          planeColor[index + 3] = a * 255

          index += 4 // 移动到下一个位置
        }

        const shapeTex = new DataTexture(planeColor, texSize, texSize)

        shapeTex.generateMipmaps = false

        shapeTex.needsUpdate = true

        const diamondMaterial = new ShaderMaterial({
          vertexShader: diamondVertexShader,
          fragmentShader: diamondFragmentShader,
          uniforms,
        })

        uniforms.uCenterModel.value.copy(center)
        uniforms.uShapeTexture.value = shapeTex
        uniforms.uScale.value = scale
        uniforms.uPlaneCount.value = planeCount
        uniforms.uSize.value.set(texSize, texSize)

        mesh.material = diamondMaterial

        // clean
        averageNormalHash.clear()
        tmpPlanes.clear()
      }
    })
  }, [])

  useFrame((_, delta) => {
    delta %= 1
    const { envRotationX, envRotationY, envRotationZ } = baseParam.current
    uniforms.uEnvMapRotationQuat.value.setFromEuler(new Euler(envRotationX, envRotationY, envRotationZ))
    // diamondref.current!.rotation.y += delta * 0.2
  })

  return (
    <group ref={diamondref}>
      <primitive
        object={gltf.scene}
        // rotation-x={Math.PI / 3}
      />
    </group>

  )
}

export default Gem
