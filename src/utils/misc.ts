import type { ObjectMap } from '@react-three/fiber'
import type { GLTF } from 'three-stdlib'
import { type Mesh, type Object3D, Vector3 } from 'three'

// 打印扁平模型的所有部分
function printModel(modelParts: Object3D[], modelName = 'modelParts') {
  const strArray = modelParts.map((obj, i) => {
    const row = `const ${obj.name} = ${modelName}[${i}]-${obj.type};`
    return row
  })
  const str = strArray.join('\n')
  console.log(str)
  return str
}

// 扁平化模型
function flatModel(gltf: GLTF & ObjectMap) {
  const modelArr: Mesh[] = []
  gltf.scene.traverse((child) => {
    modelArr.push(child as Mesh)
  })
  return modelArr
}

function calculateBoundingInfo(verticesData: Float32Array) {
  const minPos = new Vector3(Infinity, Infinity, Infinity)
  const maxPos = new Vector3(-Infinity, -Infinity, -Infinity)
  for (let i = 0; i < verticesData.length; i += 3) {
    const x = verticesData[i]
    const y = verticesData[i + 1]
    const z = verticesData[i + 2]
    minPos.min(new Vector3(x, y, z))
    maxPos.max(new Vector3(x, y, z))
  }
  return { minPos, maxPos }
}

function packPlaneIntoColor(position: Vector3, normal: Vector3, inScale: number) {
  // 创建包含 RGB 和 alpha 的数组
  const colorWithAlpha = []
  // 计算颜色的 RGB 值
  colorWithAlpha[0] = (normal.x + 1) * 0.5 // Red
  colorWithAlpha[1] = (normal.y + 1) * 0.5 // Green
  colorWithAlpha[2] = (normal.z + 1) * 0.5 // Blue

  // 计算 alpha 值并确保在 [0, 1] 范围
  const dotProduct = position.dot(normal)
  // colorWithAlpha[3] = MathUtils.clamp(dotProduct / inScale, 0, 1) // Alpha
  colorWithAlpha[3] = 1 // Alpha

  for (let i = 0; i < colorWithAlpha.length; i++) {
    colorWithAlpha[i] = Math.round(colorWithAlpha[i] * 100) / 100
  }

  return colorWithAlpha // 返回带有 Alpha 值的颜色数组
}

export {
  calculateBoundingInfo,
  flatModel,
  packPlaneIntoColor,
  printModel,
}
