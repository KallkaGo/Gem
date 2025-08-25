import diamond2 from '@models/gem2.glb'
import diamond from '@models/gem.glb'
import env_nx from '@textures/env/nx.png'
import env_ny from '@textures/env/ny.png'
import env_nz from '@textures/env/nz.png'
import env_px from '@textures/env/px.png'
import env_py from '@textures/env/py.png'
import env_pz from '@textures/env/pz.png'
import skybox_nx from '@textures/skybox/nx.png'
import skybox_ny from '@textures/skybox/ny.png'
import skybox_nz from '@textures/skybox/nz.png'
import skybox_px from '@textures/skybox/px.png'
import skybox_py from '@textures/skybox/py.png'
import skybox_pz from '@textures/skybox/pz.png'

export default {
  models: {
    diamond,
    diamond2,
  },
  textures: {
    cubeEnvMap: [skybox_px, skybox_nx, skybox_py, skybox_ny, skybox_pz, skybox_nz],
    envMap: [env_px, env_nx, env_py, env_ny, env_pz, env_nz],
  },
}
