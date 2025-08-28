import type { ObjectMap } from '@react-three/fiber'
import type { BufferAttribute, BufferGeometry, CubeCamera, Material, Mesh, Object3D, Scene, WebGLCubeRenderTarget, WebGLProgramParametersWithUniforms } from 'three'
import type CustomShaderMaterial from 'three-custom-shader-material/vanilla'
import type { GLTF } from 'three-stdlib'
// @ts-ignore
import PCA from 'pca-js'
import { useLayoutEffect } from 'react'
import { Matrix4, Vector3 } from 'three'

function useModifyCSM(gltf: GLTF & ObjectMap, mat: CustomShaderMaterial) {
  useLayoutEffect(() => {
    gltf.scene.traverse((child: Object3D) => {
      if ((child as Mesh).isMesh) {
        const mesh = child as Mesh
        mesh.material = mat
      }
    })
  }, [])
}

function useModifyMaterial(gltf: GLTF & ObjectMap, onBeforeCompileFn: (shader: WebGLProgramParametersWithUniforms) => void) {
  useLayoutEffect(() => {
    gltf.scene.traverse((child: Object3D) => {
      if ((child as Mesh).isMesh) {
        const mesh = child as Mesh
        const mat = mesh.material as Material
        mat.onBeforeCompile = onBeforeCompileFn
      }
    })
  }, [])
}
/**
 * 辅助函数：计算三角形面积
 */
function calculateTriangleArea(v1: Vector3, v2: Vector3, v3: Vector3) {
  // 使用叉积计算面积: ||(v2-v1) × (v3-v1)|| / 2
  const edge1 = new Vector3().subVectors(v2, v1)
  const edge2 = new Vector3().subVectors(v3, v1)
  return edge2.cross(edge1).length() / 2
}

function calculateTetrahedronVolume(v1: Vector3, v2: Vector3, v3: Vector3) {
  return v1.dot(v2.clone().cross(v3)) / 6
}
function createTransformMatrix(eigenVectors: Array<{ eigenvalue: number, vector: number[] }>, geometryProperties: {
  center: Vector3
  com: Vector3
  volume: number
  area: number
}) {
  const transformMatrix = new Matrix4()

  // 设置旋转部分（主成分向量作为新的坐标轴）
  transformMatrix.elements[0] = eigenVectors[0].vector[0] // 第一主成分 X
  transformMatrix.elements[1] = eigenVectors[0].vector[1] // 第一主成分 Y
  transformMatrix.elements[2] = eigenVectors[0].vector[2] // 第一主成分 Z
  transformMatrix.elements[3] = 0

  transformMatrix.elements[4] = eigenVectors[1].vector[0] // 第二主成分 X
  transformMatrix.elements[5] = eigenVectors[1].vector[1] // 第二主成分 Y
  transformMatrix.elements[6] = eigenVectors[1].vector[2] // 第二主成分 Z
  transformMatrix.elements[7] = 0

  transformMatrix.elements[8] = eigenVectors[2].vector[0] // 第三主成分 X
  transformMatrix.elements[9] = eigenVectors[2].vector[1] // 第三主成分 Y
  transformMatrix.elements[10] = eigenVectors[2].vector[2] // 第三主成分 Z
  transformMatrix.elements[11] = 0

  transformMatrix.elements[12] = 0
  transformMatrix.elements[13] = 0
  transformMatrix.elements[14] = 0
  transformMatrix.elements[15] = 1

  // 调整坐标系方向
  const comToCenterDirection = new Vector3()
  comToCenterDirection.copy(geometryProperties.com).sub(geometryProperties.center)
  comToCenterDirection.normalize()

  const thirdPrincipalComponent = new Vector3(
    eigenVectors[2].vector[0],
    eigenVectors[2].vector[1],
    eigenVectors[2].vector[2],
  )

  // 确保坐标系方向一致
  if (comToCenterDirection.dot(thirdPrincipalComponent) < 0) {
    // 翻转第二和第三主成分
    transformMatrix.elements[4] = -eigenVectors[1].vector[0]
    transformMatrix.elements[5] = -eigenVectors[1].vector[1]
    transformMatrix.elements[6] = -eigenVectors[1].vector[2]

    transformMatrix.elements[8] = -eigenVectors[2].vector[0]
    transformMatrix.elements[9] = -eigenVectors[2].vector[1]
    transformMatrix.elements[10] = -eigenVectors[2].vector[2]
  }

  return transformMatrix
}

function flipNormals(normalAttribute: BufferAttribute) {
  for (let i = 0; i < normalAttribute.count; i++) {
    normalAttribute.setX(i, -normalAttribute.getX(i))
    normalAttribute.setY(i, -normalAttribute.getY(i))
    normalAttribute.setZ(i, -normalAttribute.getZ(i))
  }
  normalAttribute.needsUpdate = true
}

function calculateGeometryProperties(flatVertices: Float32Array, triangleVertices: number[][]) {
  // 计算几何重心
  const centroid = new Vector3()
  for (let i = 0; i < flatVertices.length; i += 3) {
    centroid.x += flatVertices[i]
    centroid.y += flatVertices[i + 1]
    centroid.z += flatVertices[i + 2]
  }
  centroid.multiplyScalar(1 / (flatVertices.length / 3))

  // 计算质心、面积和体积
  const vertex1 = new Vector3()
  const vertex2 = new Vector3()
  const vertex3 = new Vector3()
  const centerOfMass = new Vector3()
  const triangleCenter = new Vector3()

  let totalArea = 0
  let totalVolume = 0
  let triangleCount = triangleVertices.length

  // 确保是3的倍数
  triangleCount -= triangleCount % 3

  for (let i = 0; i < triangleCount; i += 3) {
    vertex1.set(triangleVertices[i][0], triangleVertices[i][1], triangleVertices[i][2])
    vertex2.set(triangleVertices[i + 1][0], triangleVertices[i + 1][1], triangleVertices[i + 1][2])
    vertex3.set(triangleVertices[i + 2][0], triangleVertices[i + 2][1], triangleVertices[i + 2][2])

    triangleCenter.copy(vertex1).add(vertex2).add(vertex3)

    const triangleArea = calculateTriangleArea(vertex1, vertex2, vertex3)
    triangleCenter.multiplyScalar(triangleArea / 3)
    centerOfMass.add(triangleCenter)

    totalArea += triangleArea
    totalVolume += calculateTetrahedronVolume(vertex1, vertex2, vertex3)
  }

  centerOfMass.multiplyScalar(1 / totalArea)

  return {
    center: centroid,
    com: centerOfMass,
    volume: totalVolume,
    area: totalArea,
  }
}

function analyzeGeometryAndCreateTransform(geometry: BufferGeometry) {
  const positionAttribute = geometry.getAttribute('position') as BufferAttribute
  const normalAttribute = geometry.getAttribute('normal') as BufferAttribute
  const indexAttribute = geometry.index as BufferAttribute
  if (positionAttribute.count / 3 > 1500) {
    console.warn('DiamondPlugin:: Too many faces. Mirror/Topology issues will not be fixed', positionAttribute.count / 3)
  }
  const position_x = new Vector3()
  const position_y = new Vector3()
  const position_z = new Vector3()

  const positionArray: number[][] = []

  if (indexAttribute) {
    for (let i = Math.max(0, geometry.drawRange.start), j = Math.min(indexAttribute.count, geometry.drawRange.start + geometry.drawRange.count) - 1; i < j; i += 3) {
    // 获取三角形的三个顶点索引
      const index1 = indexAttribute.getX(i)
      const index2 = indexAttribute.getX(i + 1)
      const index3 = indexAttribute.getX(i + 2)

      // 获取三个顶点的坐标
      position_x.set(positionAttribute.getX(index1), positionAttribute.getY(index1), positionAttribute.getZ(index1))
      position_y.set(positionAttribute.getX(index2), positionAttribute.getY(index2), positionAttribute.getZ(index2))
      position_z.set(positionAttribute.getX(index3), positionAttribute.getY(index3), positionAttribute.getZ(index3))

      // 将三个顶点的坐标添加到 positionArray 中
      positionArray.push(position_x.toArray(), position_y.toArray(), position_z.toArray())
    }
  }
  else {
    const tmpVector = new Vector3()
    for (let i = 0; i < positionAttribute.count; i++) {
      tmpVector.set(positionAttribute.getX(i), positionAttribute.getY(i), positionAttribute.getZ(i))
      positionArray.push(tmpVector.toArray())
    }
  }

  const geometryProperties = calculateGeometryProperties(positionAttribute.array as Float32Array, positionArray)

  // 4. 修复负体积（翻转法线）
  if (geometryProperties.volume < 0) {
    console.warn('DiamondPlugin:: Negative Volume, Fixing Normals')
    flipNormals(normalAttribute)
  }

  const tmpArray = []

  for (let i = 0; i < positionAttribute.array.length; i += 3) {
    tmpArray.push([positionAttribute.array[i], positionAttribute.array[i + 1], positionAttribute.array[i + 2]])
  }

  // 5. 进行主成分分析
  const eigenVectors = PCA.getEigenVectors(tmpArray)

  // 6. 构建变换矩阵
  const transformMatrix = createTransformMatrix(eigenVectors, geometryProperties)

  // 7. 应用边界球缩放
  geometry.computeBoundingSphere()
  const boundingRadius = geometry.boundingSphere!.radius
  const scaleMatrix = new Matrix4().makeScale(boundingRadius, boundingRadius, boundingRadius)

  transformMatrix.multiply(scaleMatrix)

  return transformMatrix
}

function computeOffsets(geo: BufferGeometry) {
  geo.computeBoundingBox()
  const center = geo.boundingBox!.getCenter(new Vector3()).toArray()
  const offsetMatrix = analyzeGeometryAndCreateTransform(geo).toArray()

  // 6. 计算逆变换矩阵
  const transformMatrix = new Matrix4().fromArray(offsetMatrix)
  const inverseMatrix = transformMatrix.clone().invert()
  const offsetMatrixInv = inverseMatrix.toArray()

  // 7. 计算变换后的中心偏移
  const centerVector = new Vector3().fromArray(center)
  const centerOffset = centerVector.applyMatrix4(inverseMatrix).toArray()

  const offsets = {
    center, // 几何体原始中心点
    offsetMatrix, // 标准化变换矩阵
    offsetMatrixInv, // 逆变换矩阵
    radius: 1, // 标准化半径（固定为1）
    centerOffset, // 变换空间中的中心偏移
  }
  geo.userData.normalsCaptureOffsets = offsets

  return offsets
}

function captureNormals() {

}


export {
  captureNormals,
  computeOffsets,
  useModifyCSM,
  useModifyMaterial,

}
