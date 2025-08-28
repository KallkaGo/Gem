import type { Mesh } from 'three'
import { useGLTF } from '@react-three/drei'
import { prepareDiamondMesh } from '@utils/tools'
import { useEffect } from 'react'
import RES from '../../RES'

function Gem2() {
  const gltf = useGLTF(RES.models.diamond3)

  useEffect(() => {
    prepareDiamondMesh(gltf.scene.children[0] as Mesh)
  }, [])

  return (

    <primitive
      object={gltf.scene}
    />

  )
}

export default Gem2
