import { OrbitControls, useCubeTexture } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, ToneMapping } from '@react-three/postprocessing'
import { useInteractStore, useLoadedStore } from '@utils/Store'
import { ToneMappingMode } from 'postprocessing'
import { useEffect } from 'react'
import { UnsignedByteType } from 'three'
import RES from '../RES'
import Gem2 from './items/Gem2'

function Sketch() {
  const envTex = useCubeTexture(RES.textures.cubeEnvMap, { path: '' })

  const controlDom = useInteractStore(state => state.controlDom)

  const scene = useThree(state => state.scene)

  useEffect(() => {
    scene.background = envTex
    scene.environment = envTex
    useLoadedStore.setState({ ready: true })
  }, [])

  return (
    <>
      <OrbitControls domElement={controlDom} />
      <color attach="background" args={['black']} />
      <Gem2 />
      <EffectComposer
        disableNormalPass
        frameBufferType={UnsignedByteType}
      >
        <Bloom
          mipmapBlur
          luminanceThreshold={0.65}
          intensity={2}
          radius={0.5}
        >
        </Bloom>
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </>
  )
}

export default Sketch
