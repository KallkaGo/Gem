import diamond from '@models/gem.glb'
import nx from '@textures/skybox/nx.png'
import ny from '@textures/skybox/ny.png'
import nz from '@textures/skybox/nz.png'
import px from '@textures/skybox/px.png'
import py from '@textures/skybox/py.png'
import pz from '@textures/skybox/pz.png'

export default {
  models: {
    diamond,
  },
  textures: {
    cubeEnvMap: [px, nx, py, ny, pz, nz],
  },
}
