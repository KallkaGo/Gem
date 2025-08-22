import { useGLTF } from '@react-three/drei'
import RES from '../../RES'

function Gem() {
  const gltf = useGLTF(RES.models.diamond)

  return (
    <primitive object={gltf.scene} />
  )
}

export default Gem
