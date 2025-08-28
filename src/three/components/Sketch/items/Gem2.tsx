import { useGLTF } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { computeOffsets } from '@utils/tools'
import { useEffect, useMemo } from 'react'
import { CubeCamera, DoubleSide, HalfFloatType, Matrix4, Mesh, NearestFilter, Scene, ShaderMaterial, Vector3, WebGLCubeRenderTarget } from 'three'
import RES from '../../RES'
import captureFragmentShader from '../shader/captureNormal/fragment.glsl'
import captureVertexShader from '../shader/captureNormal/vertex.glsl'

function Gem2() {
  const gltf = useGLTF(RES.models.diamond3)

  const gl = useThree(state => state.gl)

  const cubeRT = useMemo(() => new WebGLCubeRenderTarget(512, {
    generateMipmaps: false,
    minFilter: NearestFilter,
    magFilter: NearestFilter,
    type: HalfFloatType,
  }), [])

  const cubeCamera = useMemo(() => new CubeCamera(0.1, 1000, cubeRT), [])

  const scene = useThree(state => state.scene)

  const captureScene = useMemo(() => {
    return new Scene()
  }, [])

  const captureMaterial = useMemo(() => {
    return new ShaderMaterial({
      vertexShader: captureVertexShader,
      fragmentShader: captureFragmentShader,
      uniforms: {
        radius: { value: 1 },
        offsetCenter: { value: new Vector3(0, 0, 0) },
        offsetMatrixInv: { value: new Matrix4() },
      },
      side: DoubleSide,
      // transparent: true,
    })
  }, [])

  const captureMesh = useMemo(() => {
    const mesh = new Mesh()
    mesh.material = captureMaterial
    return mesh
  }, [])

  useEffect(() => {
    const mesh = gltf.scene.children[0] as Mesh
    const offset = computeOffsets(mesh.geometry)

    console.log('offset', offset)

    captureMaterial.uniforms.radius.value = offset.radius
    captureMaterial.uniforms.offsetCenter.value.fromArray(offset.center)
    captureMaterial.uniforms.offsetMatrixInv.value.fromArray(offset.offsetMatrixInv)
    captureMesh.geometry = mesh.geometry

    captureScene.add(captureMesh)
    cubeCamera.update(gl, captureScene)
  }, [])

  return (

    <>
      <primitive
        object={gltf.scene}
      />
      <mesh position={[2, 2, 0]}>
        <planeGeometry></planeGeometry>
        <meshBasicMaterial envMap={cubeRT.texture} />
      </mesh>
    </>

  )
}

export default Gem2
