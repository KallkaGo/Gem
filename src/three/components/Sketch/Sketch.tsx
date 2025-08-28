import { OrbitControls, useCubeTexture } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useInteractStore, useLoadedStore } from '@utils/Store'
import { useEffect } from 'react'
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
    </>
  )
}

export default Sketch
