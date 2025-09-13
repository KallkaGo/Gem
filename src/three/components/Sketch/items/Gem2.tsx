import type { MeshStandardMaterial } from 'three'
import { useEnvironment, useGLTF } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { computeOffsets } from '@utils/tools'
import { useControls } from 'leva'
import { useEffect, useMemo, useRef } from 'react'
import { Color, CubeCamera, DoubleSide, Euler, HalfFloatType, LinearMipmapLinearFilter, Matrix4, Mesh, NearestFilter, Quaternion, Scene, ShaderMaterial, Uniform, Vector2, Vector3, WebGLCubeRenderTarget } from 'three'
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

  const baseParams = useRef({
    envRotationX: 0,
    envRotationY: 0,
    envRotationZ: 0,
    euler: new Euler(0, 0, 0),
  })

  const gl = useThree(state => state.gl)

  const cubeRT = useMemo(() => new WebGLCubeRenderTarget(1024, {
    generateMipmaps: false,
    minFilter: NearestFilter,
    magFilter: NearestFilter,
    type: HalfFloatType,
  }), [])

  const cubeCamera = useMemo(() => new CubeCamera(0.1, 1000, cubeRT), [])

  const captureScene = useMemo(() => {
    return new Scene()
  }, [])

  const captureMaterial = useMemo(() => {
    return new ShaderMaterial({
      defines: {
        OPTIMIZED_REFRACTION: '1',
      },
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
    envMapRotationQuat: new Uniform(new Quaternion()),
    reflectivity: new Uniform(0.1),
    transmissionMode: new Uniform(2),
    envMap: new Uniform(envMap),
    bounces: new Uniform(5),
    centerOffset: new Uniform(new Vector3(0, 0, 0)),
    modelOffsetMatrix: new Uniform(new Matrix4()),
    modelOffsetMatrixInv: new Uniform(new Matrix4()),
    tCubeMapNormals: new Uniform(null),
    transmissionSamplerMap: new Uniform(null),
    transmission: new Uniform(0),
    colorCorrection: new Uniform(new Vector3(1, 1, 1)),
    boostFactors: new Uniform(new Vector3(1, 1, 1)),
    absorptionFactor: new Uniform(1),
    squashFactor: new Uniform(0.98),
    refractiveIndex: new Uniform(2.6),
    rIndexDelta: new Uniform(0.012),
    radius: new Uniform(1),
    geometryFactor: new Uniform(0.5),
    color: new Uniform(new Color('#ff0000')),
    resolution: new Uniform(new Vector2()),
  }), [])

  const diamondMaterial = useMemo(() => new ShaderMaterial({
    defines: {
      POISSONSAMPLE: true,
    },
    vertexShader: diamondVertexShader,
    fragmentShader: diamondFragmentShader,
    uniforms: diamondUniforms,
  }), [])

  useControls('Gem', {
    color: {
      value: `#${diamondUniforms.color.value.getHexString()}`,
      onChange: (value) => {
        diamondUniforms.color.value.set(value)
      },
    },
    gammaFactor: {
      value: diamondUniforms.gammaFactor.value,
      min: 0.1,
      max: 4,
      onChange: (value) => {
        diamondUniforms.gammaFactor.value = value
      },
    },
    dispersion: {
      value: diamondUniforms.rIndexDelta.value,
      min: 0.0,
      max: 0.1,
      step: 0.01,
      onChange: (value) => {
        diamondUniforms.rIndexDelta.value = value
      },
    },
    absorption: {
      value: diamondUniforms.absorptionFactor.value,
      min: 0,
      max: 15,
      onChange: (value) => {
        diamondUniforms.absorptionFactor.value = value
      },
    },
    transmission: {
      value: diamondUniforms.transmission.value,
      min: 0,
      max: 1,
      onChange: (value) => {
        diamondUniforms.transmission.value = value
      },
    },
    envIntensity: {
      value: diamondUniforms.envMapIntensity.value,
      min: 0,
      max: 2,
      onChange: (value) => {
        diamondUniforms.envMapIntensity.value = value
      },
    },
    refractiveIndex: {
      value: diamondUniforms.refractiveIndex.value,
      min: 1,
      max: 3,
      onChange: (value) => {
        diamondUniforms.refractiveIndex.value = value
      },
    },
    rayBounces: {
      value: diamondUniforms.bounces.value,
      min: 0,
      max: 10,
      step: 1,
      onChange: (value) => {
        diamondUniforms.bounces.value = value
      },
    },
    boostFactor: {
      value: diamondUniforms.boostFactors.value.toArray(),
      onChange: (value) => {
        diamondUniforms.boostFactors.value.fromArray(value)
      },
    },
    envRotation: {
      value: diamondUniforms.envMapRotation.value,
      min: -Math.PI,
      max: Math.PI,
      onChange: (value) => {
        diamondUniforms.envMapRotation.value = value
      },
    },
    envRotationX: {
      value: baseParams.current.envRotationX,
      min: -Math.PI,
      max: Math.PI,
      onChange: (value) => {
        baseParams.current.envRotationX = value
        baseParams.current.euler.set(value, baseParams.current.envRotationY, baseParams.current.envRotationZ)
        diamondUniforms.envMapRotationQuat.value.setFromEuler(baseParams.current.euler)
      },
    },
    envRotationY: {
      value: baseParams.current.envRotationY,
      min: -Math.PI,
      max: Math.PI,
      onChange: (value) => {
        baseParams.current.envRotationY = value
        baseParams.current.euler.set(baseParams.current.envRotationX, value, baseParams.current.envRotationZ)
        diamondUniforms.envMapRotationQuat.value.setFromEuler(baseParams.current.euler)
      },
    },
    envRotationZ: {
      value: baseParams.current.envRotationZ,
      min: -Math.PI,
      max: Math.PI,
      onChange: (value) => {
        baseParams.current.envRotationZ = value
        baseParams.current.euler.set(baseParams.current.envRotationX, baseParams.current.envRotationY, value)
        diamondUniforms.envMapRotationQuat.value.setFromEuler(baseParams.current.euler)
      },
    },
    reflectivity: {
      value: diamondUniforms.reflectivity.value,
      min: 0,
      max: 2,
      onChange: (value) => {
        diamondUniforms.reflectivity.value = value
      },
    },
    poissonSample: {
      value: true,
      min: 0,
      max: 1,
      onChange: (value) => {
        if (value) {
          diamondMaterial.defines.POISSONSAMPLE = value
        }
        else {
          delete diamondMaterial.defines.POISSONSAMPLE
        }
        diamondMaterial.needsUpdate = true
      },
    },
  })

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

    return () => {
      cubeRT.dispose()
      captureMesh.geometry.dispose();
      (captureMesh.material as MeshStandardMaterial).dispose()
      diamondMaterial.dispose()
    }
  }, [])

  useFrame((state, delta) => {
    const dpr = state.gl.getPixelRatio()
    diamondUniforms.resolution.value.set(innerWidth * dpr, innerHeight * dpr)
  })

  return (
    <primitive
      object={gltf.scene}
    />
  )
}

export default Gem2
