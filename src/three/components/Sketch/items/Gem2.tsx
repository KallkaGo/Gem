import { useEnvironment, useGLTF } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { computeOffsets } from '@utils/tools'
import { useEffect, useMemo } from 'react'
import { Color, CubeCamera, DoubleSide, HalfFloatType, LinearMipmapLinearFilter, Matrix4, Mesh, NearestFilter, Scene, ShaderMaterial, Texture, Uniform, Vector3, Vector4, WebGLCubeRenderTarget } from 'three'
import RES from '../../RES'
import captureFragmentShader from '../shader/captureNormal/fragment.glsl'
import captureVertexShader from '../shader/captureNormal/vertex.glsl'
import diamondFragmentShader from '../shader/diamond_opt/fragment.glsl'
import diamondVertexShader from '../shader/diamond_opt/vertex.glsl'

function Gem2() {
  const gltf = useGLTF(RES.models.diamond3)

  const envMap = useEnvironment({ files: RES.textures.env_gem })
  envMap.generateMipmaps = true
  envMap.minFilter = LinearMipmapLinearFilter

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

  const offset = useMemo(() => {
    const mesh = gltf.scene.children[0] as Mesh
    const res = computeOffsets(mesh.geometry)
    return res
  }, [])

  const diamondUniforms = useMemo(() => ({
    envMapIntensity: new Uniform(1.3),
    gammaFactor: new Uniform(1),
    envMapRotation: new Uniform(0),
    envMapRotationQuat: new Uniform(new Vector4(0, 0, 0, 1)),
    reflectivity: new Uniform(0),
    transmissionMode: new Uniform(2),
    envMap: new Uniform(envMap),
    bounces: new Uniform(8),
    centerOffset: new Uniform(new Vector3(0, 0, 0)),
    modelOffsetMatrix: new Uniform(new Matrix4()),
    modelOffsetMatrixInv: new Uniform(new Matrix4()),
    tCubeMapNormals: new Uniform(cubeRT.texture),
    transmissionSamplerMap: new Uniform(new Texture()),
    transmission: new Uniform(0),
    colorCorrection: new Uniform(new Vector3(1, 1, 1)),
    boostFactors: new Uniform(new Vector3(1, 1, 1)),
    absorptionFactor: new Uniform(1),
    squashFactor: new Uniform(0.98),
    refractiveIndex: new Uniform(2.6),
    rIndexDelta: new Uniform(0.1),
    radius: new Uniform(1),
    geometryFactor: new Uniform(0.5),
    color: new Uniform(new Color('#ff009d')),
  }), [])

  const diamondMaterial = useMemo(() => new ShaderMaterial({
    vertexShader: diamondVertexShader,
    fragmentShader: diamondFragmentShader,
    uniforms: diamondUniforms,
    transparent: true,
  }), [])

  useEffect(() => {
    const mesh = gltf.scene.children[0] as Mesh
    captureMaterial.uniforms.radius.value = offset.radius
    captureMaterial.uniforms.offsetCenter.value.fromArray(offset.center)
    captureMaterial.uniforms.offsetMatrixInv.value.fromArray(offset.offsetMatrixInv)
    captureMesh.geometry = mesh.geometry

    captureScene.add(captureMesh)
    cubeCamera.update(gl, captureScene)

    gltf.scene.traverse((child) => {
      if ((child as Mesh).isMesh) {
        const mesh = child as Mesh
        mesh.material = diamondMaterial
        diamondMaterial.uniforms.tCubeMapNormals.value = cubeRT.texture
        diamondUniforms.modelOffsetMatrix.value.fromArray(offset.offsetMatrix).premultiply(mesh.matrixWorld)
        diamondUniforms.modelOffsetMatrixInv.value.copy(diamondUniforms.modelOffsetMatrix.value).invert()
      }
    })
  }, [])

  return (
    <primitive
      object={gltf.scene}
    />
  )
}

export default Gem2
