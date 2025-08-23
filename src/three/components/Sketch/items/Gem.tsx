import type { Mesh } from 'three'
import { useCubeTexture, useGLTF } from '@react-three/drei'
import { calculateBoundingInfo, packPlaneIntoColor } from '@utils/misc'
import { useEffect, useMemo } from 'react'
import { DataTexture, DoubleSide, LinearMipmapLinearFilter, ShaderMaterial, Texture, Uniform, Vector2, Vector3 } from 'three'
import RES from '../../RES'
import diamondFragmentShader from '../shader/diamond/fragment.glsl'
import diamondVertexShader from '../shader/diamond/vertex.glsl'

function Gem() {
  const gltf = useGLTF(RES.models.diamond)

  const envTex = useCubeTexture(RES.textures.cubeEnvMap, { path: '' })
  envTex.generateMipmaps = true
  envTex.minFilter = LinearMipmapLinearFilter

  const uniforms = useMemo(() => ({
    uCenterModel: new Uniform(new Vector3(0, 0, 0)),
    uShapeTexture: new Uniform(new Texture()),
    uPlaneCount: new Uniform(0),
    uSize: new Uniform(new Vector2(1, 1)),
    uScale: new Uniform(0),
    uRefractiveIndex: new Uniform(1.5),
    uDispersionR: new Uniform(0.68),
    uDispersionG: new Uniform(0.4),
    uDispersionB: new Uniform(0.146),
    uDispersion: new Uniform(0.1),
    uFresnelDispersionScale: new Uniform(1),
    uFresnelDispersionPower: new Uniform(1),
    uColorIntensity: new Uniform(1.7),
    uColorByDepth: new Uniform(0.5),
    uBrightness: new Uniform(1.2),
    uPower: new Uniform(1),
    uDispersionIntensity: new Uniform(1),
    uLighttransmission: new Uniform(0),
    uEnvMap: new Uniform(envTex),
    uTotalInternalReflection: new Uniform(2),
    uBaseReflection: new Uniform(0.5),
    uMipMapLevel: new Uniform(3),
  }), [])

  useEffect(() => {
    gltf.scene.traverse((child) => {
      if ((child as Mesh).isMesh) {
        const mesh = child as Mesh
        const verticesData = new Float32Array(mesh.geometry.attributes.position.array)
        const normalData = new Float32Array(mesh.geometry.attributes.normal.array)
        const indexData = mesh.geometry.index?.array as Uint16Array ?? []
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

        const stride = 3

        const faceCount = indexData.length / stride

        const tmpPlanes = new Set<string>()

        const averageNormalHash = new Map()

        for (let i = 0; i < faceCount; i++) {
          const index = i * stride
          const vertexIndex = indexData[index]
          const primaryPosition = new Vector3(verticesData[vertexIndex], verticesData[vertexIndex + 1], verticesData[vertexIndex + 2])
          const normalPosition = new Vector3(normalData[vertexIndex], normalData[vertexIndex + 1], normalData[vertexIndex + 2])
          const key = `${primaryPosition.x},${primaryPosition.y},${primaryPosition.z}`

          // 计算平滑法线
          if (!averageNormalHash.has(key)) {
            averageNormalHash.set(key, normalPosition)
          }
          else {
            const avgNorm = averageNormalHash.get(key)
            avgNorm.add(normalPosition).normalize()
            averageNormalHash.set(key, avgNorm)
          }
          // const packedPlane = packPlaneIntoColor(primaryPosition, normalPosition, scale)
          // const colorString = `${packedPlane[0]},${packedPlane[1]},${packedPlane[2]},${packedPlane[3]}`
          // tmpPlanes.add(colorString)
        }

        averageNormalHash.forEach((value, key) => {
          const packedPlane = packPlaneIntoColor(value, scale)
          const colorString = `${packedPlane[0]},${packedPlane[1]},${packedPlane[2]},${packedPlane[3]}`
          tmpPlanes.add(colorString)
        })

        const planeCount = tmpPlanes.size

        const texSize = 2 ** Math.ceil(Math.log2(Math.sqrt(planeCount)))

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
          side: DoubleSide,
          transparent: true,
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
