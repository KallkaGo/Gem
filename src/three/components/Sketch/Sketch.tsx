import { Environment, OrbitControls, useCubeTexture } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useInteractStore, useLoadedStore } from '@utils/Store'
import { useControls } from 'leva'
import { BloomEffect, EdgeDetectionMode, EffectComposer, EffectPass, RenderPass, SMAAEffect, SMAAPreset, ToneMappingEffect, ToneMappingMode, VignetteEffect } from 'postprocessing'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import RES from '../RES'
import Gem2 from './items/Gem2'
import Gem2Inc from './items/Gem2Inc'

function Sketch() {
  const envTex = useCubeTexture(RES.textures.cubeEnvMap, { path: '' })

  const controlDom = useInteractStore(state => state.controlDom)

  const { scene, camera, gl } = useThree(useShallow(state => ({
    scene: state.scene,
    camera: state.camera,
    gl: state.gl,
  })))

  const baseParams = useRef({
    enablePostProcessing: true,
  })

  const [gemType, setGemType] = useState('gem')

  const composer = useMemo(() => new EffectComposer(gl), [])

  useControls('PostProcessing', { enabled: { value: baseParams.current.enablePostProcessing, onChange: (value) => {
    baseParams.current.enablePostProcessing = value
  } } })

  useControls('GemType', { type: {
    value: gemType,
    options: ['gem', 'gemInc'],
    onChange: setGemType,
  } })

  useEffect(() => {
    useLoadedStore.setState({ ready: true })
  }, [])

  useEffect(() => {
    /* post processing init */
    const bloomEffect = new BloomEffect({
      intensity: 2,
      luminanceThreshold: 0.3,
      luminanceSmoothing: 0.5,
      mipmapBlur: true,
      radius: 0.5,
    })
    const vignetteEffect = new VignetteEffect()
    const smaaEffect = new SMAAEffect({
      preset: SMAAPreset.ULTRA,
      edgeDetectionMode: EdgeDetectionMode.DEPTH,
    })
    smaaEffect.edgeDetectionMaterial.edgeDetectionThreshold = 0.1

    composer.addPass(new RenderPass(scene, camera))
    composer.addPass(new EffectPass(
      camera,
      bloomEffect,
      vignetteEffect,
      smaaEffect,
      new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC }),
    ))

    return () => {
      composer.dispose()
    }
  }, [])

  useFrame((state, delta) => {
    const { enablePostProcessing } = baseParams.current
    if (enablePostProcessing) {
      composer.render()
    }
    else {
      state.gl.render(state.scene, state.camera)
    }
  }, 1)

  return (
    <>
      <OrbitControls domElement={controlDom} />
      <color attach="background" args={['black']} />
      {
        gemType === 'gem' ? <Gem2 /> : <Gem2Inc />
      }
      <Environment map={envTex} background />
    </>
  )
}

export default Sketch
