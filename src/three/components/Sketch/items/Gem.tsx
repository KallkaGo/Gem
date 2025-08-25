import type { Mesh } from 'three'
import { useCubeTexture, useGLTF } from '@react-three/drei'
import { calculateBoundingInfo, packPlaneIntoColor } from '@utils/misc'
import { useControls } from 'leva'
import { useEffect, useMemo } from 'react'
import { Color, DataTexture, LinearMipmapLinearFilter, ShaderMaterial, Texture, Uniform, Vector2, Vector3 } from 'three'
import { BufferGeometryUtils } from 'three/examples/jsm/Addons.js'
import RES from '../../RES'
import diamondFragmentShader from '../shader/diamond/fragment.glsl'
import diamondVertexShader from '../shader/diamond/vertex.glsl'

function Gem() {
  const gltf = useGLTF(RES.models.diamond2)

  const envTex = useCubeTexture(RES.textures.envMap, { path: '' })
  envTex.generateMipmaps = true
  envTex.minFilter = LinearMipmapLinearFilter

  const uniforms = useMemo(() => ({
    uCenterModel: new Uniform(new Vector3(0, 0, 0)),
    uShapeTexture: new Uniform(new Texture()),
    uPlaneCount: new Uniform(0),
    uSize: new Uniform(new Vector2(1, 1)),
    uScale: new Uniform(0),
    uScaleIntensity: new Uniform(1),
    uRefractiveIndex: new Uniform(1.5),
    uDispersionR: new Uniform(0.68),
    uDispersionG: new Uniform(0.4),
    uDispersionB: new Uniform(0.146),
    uDispersion: new Uniform(0),
    uFresnelDispersionScale: new Uniform(1),
    uFresnelDispersionPower: new Uniform(1),
    uColorIntensity: new Uniform(1),
    uColorByDepth: new Uniform(0.15),
    uBrightness: new Uniform(1.2),
    uPower: new Uniform(1),
    uDispersionIntensity: new Uniform(1),
    uLighttransmission: new Uniform(0.6),
    uEnvMap: new Uniform(envTex),
    uTotalInternalReflection: new Uniform(2),
    uBaseReflection: new Uniform(0.5),
    uMipMapLevel: new Uniform(4),
    uMaxReflection: new Uniform(3),
    uColor: new Uniform(new Color('#00CFFF')),
    uColorAlpha: new Uniform(0.4),
  }), [])

  useControls('gem', {
    Color: {
      value: '#00CFFF',
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
      max: 3,
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
  })

  useEffect(() => {
    gltf.scene.traverse((child) => {
      if ((child as Mesh).isMesh) {
        const mesh = child as Mesh
        const geometry = BufferGeometryUtils.mergeVertices(mesh.geometry)
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
          // 计算平滑法线
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

        shapeTex.generateMipmaps = true

        shapeTex.needsUpdate = true

        const diamondMaterial = new ShaderMaterial({
          vertexShader: diamondVertexShader,
          fragmentShader: diamondFragmentShader,
          uniforms,
        })

        uniforms.uCenterModel.value.copy(center)
        uniforms.uShapeTexture.value = shapeTex
        uniforms.uScale.value = Math.round(scale * 100) / 100
        uniforms.uPlaneCount.value = planeCount
        uniforms.uSize.value.set(texSize, texSize)

        mesh.material = diamondMaterial

        // clean
        averageNormalHash.clear()
        tmpPlanes.clear()
      }
    })
  }, [])

  return (
    <primitive object={gltf.scene} />
  )
}

export default Gem
