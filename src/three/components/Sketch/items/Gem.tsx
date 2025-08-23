import type { Mesh } from 'three'
import { useGLTF } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { calculateBoundingInfo, packPlaneIntoColor } from '@utils/misc'
import { useEffect } from 'react'
import { DataTexture, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace, Vector3 } from 'three'
import RES from '../../RES'

const flag = false

function Gem() {
  const gltf = useGLTF(RES.models.diamond)

  const scene = useThree(state => state.scene)

  useEffect(() => {
    gltf.scene.traverse((child) => {
      if ((child as Mesh).isMesh) {
        const mesh = child as Mesh
        const verticesData = mesh.geometry.attributes.position.array as Float32Array
        const normalData = mesh.geometry.attributes.normal.array as Float32Array
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

        for (let i = 0; i < faceCount; i++) {
          const index = i * stride
          const vertexIndex = indexData[index]
          const primaryPosition = new Vector3(verticesData[vertexIndex], verticesData[vertexIndex + 1], verticesData[vertexIndex + 2])
          const normalPosition = new Vector3(normalData[vertexIndex], normalData[vertexIndex + 1], normalData[vertexIndex + 2])
          const packedPlane = packPlaneIntoColor(primaryPosition, normalPosition, scale)
          const colorString = `${packedPlane[0]},${packedPlane[1]},${packedPlane[2]},${packedPlane[3]}`
          tmpPlanes.add(colorString) 
        }

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

        const shapeTex = new DataTexture(planeColor, 16, 16)

        shapeTex.generateMipmaps = false

        shapeTex.flipY = true

        shapeTex.needsUpdate = true

        const mat = new MeshBasicMaterial({
          map: shapeTex,
        })

        const geo = new PlaneGeometry()

        // scene.add(new Mesh(geo, mat))

        mesh.material = mat
      }
    })
  }, [])

  return (
    <primitive object={gltf.scene} />
  )
}

export default Gem
