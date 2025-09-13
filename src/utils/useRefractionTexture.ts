import type { Object3D, WebGLRenderer } from 'three'
import combineFragment from '@/three/components/Sketch/shader/combine/fragment.glsl'
import commonVertex from '@/three/components/Sketch/shader/common/vertex.glsl'
import mipmapBlurFragment from '@/three/components/Sketch/shader/mipmapBlur/fragment.glsl'
import { useFBO } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useCallback, useMemo } from 'react'

import { Color, FloatType, HalfFloatType, LinearFilter, NearestFilter, RepeatWrapping, ShaderMaterial, Uniform, UnsignedByteType, Vector2, WebGLRenderTarget } from 'three'
import { FullScreenQuad } from 'three-stdlib'
import { useShallow } from 'zustand/react/shallow'

const KERNEL_RADIUS = [3, 5, 7, 9, 11, 13]
/**
 * 
 * @returns 带mipmap的折射贴图
 */
function useRefractionTexture() {
  const { gl, scene, camera } = useThree(useShallow(state => ({
    gl: state.gl,
    scene: state.scene,
    camera: state.camera,
  })))

  const screenRT = useFBO(innerWidth, innerHeight, {
    generateMipmaps: false,
    type: UnsignedByteType,
  })

  // 垂直堆叠的mipmap需要 w * 2h的尺寸
  const mipmapRT = useFBO(innerWidth, innerHeight * 2, {
    generateMipmaps: false,
    minFilter: NearestFilter,
    magFilter: NearestFilter,
    wrapS: RepeatWrapping,
    wrapT: RepeatWrapping,
    type: FloatType,
  })

  const combineMaterial = useMemo(() => new ShaderMaterial({
    vertexShader: commonVertex,
    fragmentShader: combineFragment,
    uniforms: {
      uDiffuse: new Uniform(null),
      uDiffuseBlur1: new Uniform(null),
      uDiffuseBlur2: new Uniform(null),
      uDiffuseBlur3: new Uniform(null),
      uDiffuseBlur4: new Uniform(null),
      uDiffuseBlur5: new Uniform(null),
      uDiffuseBlur6: new Uniform(null),
    },
  }), [])

  const combinePassFT = useMemo(() => new FullScreenQuad(combineMaterial), [])

  const { mipmapRTArray, separableBlurMaterials, tmpRTs, fullScreenTriangles } = useMemo(() => {
    const mipmapRTArray: WebGLRenderTarget[] = []
    const separableBlurMaterials: ShaderMaterial[] = []
    const tmpRTs = []
    const fullScreenTriangles = []

    for (let i = 0; i < KERNEL_RADIUS.length; i++) {
      const width = innerWidth / 2
      const height = innerHeight / 2
      const rt = new WebGLRenderTarget(width, height, {
        generateMipmaps: false,
        type: HalfFloatType,
      })

      rt.texture.minFilter = rt.texture.magFilter = LinearFilter
      rt.texture.wrapS = rt.texture.wrapT = RepeatWrapping

      const tmpRt = new WebGLRenderTarget(width, height, {
        generateMipmaps: false,
        type: HalfFloatType,
      })

      tmpRt.texture.minFilter = tmpRt.texture.magFilter = LinearFilter

      const material = new ShaderMaterial({
        vertexShader: commonVertex,
        fragmentShader: mipmapBlurFragment,
        uniforms: {
          uDiffuse: new Uniform(null),
          texSize: new Uniform(new Vector2()),
          direction: new Uniform(new Vector2()),
        },
        defines: {
          KERNEL_RADIUS: KERNEL_RADIUS[i],
          SIGMA: KERNEL_RADIUS[i],
        },
      })

      const fullScreenTriangle = new FullScreenQuad(material)

      fullScreenTriangles.push(fullScreenTriangle)
      mipmapRTArray.push(rt)
      separableBlurMaterials.push(material)
      tmpRTs.push(tmpRt)
    }

    return { mipmapRTArray, separableBlurMaterials, tmpRTs, fullScreenTriangles }
  }, [])

  const clearColor = new Color(0x000000)
  const oldClearColor = new Color()

  const blurRenderTarget = useCallback((render: WebGLRenderer, baseRT: WebGLRenderTarget) => {
    for (let i = 0; i < KERNEL_RADIUS.length; i++) {
      const tmpRt = tmpRTs[i]
      const rt = mipmapRTArray[i]
      const material = separableBlurMaterials[i]
      const quad = fullScreenTriangles[i]
      material.uniforms.uDiffuse.value = baseRT.texture
      material.uniforms.texSize.value.set(baseRT.width / 2, baseRT.height / 2)
      material.uniforms.direction.value.set(1, 0)
      render.setRenderTarget(tmpRt)
      quad.render(render)
      material.uniforms.uDiffuse.value = tmpRt.texture
      material.uniforms.direction.value.set(0, 1)
      render.setRenderTarget(rt)
      quad.render(render)
    }
  }, [])

  const render = useCallback((ignoreList: Object3D[] = []) => {
    const validObjects = ignoreList.filter((obj) => {
      return obj === null || obj === undefined
    })
    if (validObjects.length !== 0)
      return
    gl.setRenderTarget(screenRT)
    gl.getClearColor(oldClearColor)
    const oldAlpha = gl.getClearAlpha()
    const oldBackGround = scene.background
    const autoClearState = gl.autoClear
    scene.background = null
    gl.setClearColor(clearColor, 1)
    gl.autoClear = true
    ignoreList.forEach(mesh => (mesh.visible = false))
    gl.render(scene, camera)
    scene.background = oldBackGround
    gl.setClearColor(oldClearColor, oldAlpha)
    ignoreList.forEach(mesh => (mesh.visible = true))
    blurRenderTarget(gl, screenRT)
    combineMaterial.uniforms.uDiffuse.value = screenRT.texture
    combineMaterial.uniforms.uDiffuseBlur1.value = mipmapRTArray[0].texture
    combineMaterial.uniforms.uDiffuseBlur2.value = mipmapRTArray[1].texture
    combineMaterial.uniforms.uDiffuseBlur3.value = mipmapRTArray[2].texture
    combineMaterial.uniforms.uDiffuseBlur4.value = mipmapRTArray[3].texture
    combineMaterial.uniforms.uDiffuseBlur5.value = mipmapRTArray[4].texture
    combineMaterial.uniforms.uDiffuseBlur6.value = mipmapRTArray[5].texture
    gl.setRenderTarget(mipmapRT)
    combinePassFT.render(gl)
    gl.autoClear = autoClearState
    gl.setRenderTarget(null)
  }, [])

  const diapose = useCallback(() => {
    for (let i = 0; i < KERNEL_RADIUS.length; i++) {
      mipmapRTArray[i].dispose()
      tmpRTs[i].dispose()
      fullScreenTriangles[i].dispose()
      separableBlurMaterials[i].dispose()
    }
    combinePassFT.dispose()
  }, [])

  return { render, mipmapRT, diapose }
}

export default useRefractionTexture
