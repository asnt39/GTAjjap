import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'

// Each fitted prop is one opaque, single-material mesh in metres.
export async function loadPortProp(name) {
  try {
    const {scene} = await new GLTFLoader().loadAsync(`/assets/port/${name}.glb`)
    return scene.children[0]
  } catch (error) {
    console.warn(`Harborline prop ${name}: ${error.message}`)
    return null
  }
}
