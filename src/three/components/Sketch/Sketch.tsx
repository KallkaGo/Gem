import { OrbitControls, useCubeTexture } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useInteractStore, useLoadedStore } from '@utils/Store'
import { useControls } from 'leva'
import { BloomEffect, EdgeDetectionMode, EffectComposer, EffectPass, RenderPass, SMAAEffect, SMAAPreset, ToneMappingEffect, ToneMappingMode, VignetteEffect } from 'postprocessing'
import { useEffect, useMemo, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import RES from '../RES'
import Gem2Inc from './items/Gem2Inc'

function Sketch() {
  const envTex = useCubeTexture(RES.textures.cubeEnvMap, { path: '' })

  const controlDom = useInteractStore(state => state.controlDom)

  const { scene, camera, gl } = useThree(useShallow(state => ({
    scene: state.scene,
    camera: state.camera,
    gl: state.gl,
  })))

  const [isEnabled, setIsEnabled] = useState(true)

  const composer = useMemo(() => new EffectComposer(gl), [])

  useControls('PostProcessing', { enabled: { value: isEnabled, onChange: setIsEnabled } })

  useEffect(() => {
    scene.background = envTex
    scene.environment = envTex
    /* post processing init */
    const bloomEffect = new BloomEffect({ intensity: 2, luminanceThreshold: 0.5, luminanceSmoothing: 0.5, mipmapBlur: true, radius: 0.1 })
    const vignetteEffect = new VignetteEffect()
    const smaaEffect = new SMAAEffect({
      preset: SMAAPreset.ULTRA,
      edgeDetectionMode: EdgeDetectionMode.DEPTH,
    })
    composer.addPass(new RenderPass(scene, camera))
    composer.addPass(new EffectPass(
      camera,
      bloomEffect,
      vignetteEffect,
      smaaEffect
      ,
      new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC }),
    ))
    useLoadedStore.setState({ ready: true })
  }, [])

  useFrame((state, delta) => {
    if (isEnabled) {
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
      <Gem2Inc />
    </>
  )
}

export default Sketch
