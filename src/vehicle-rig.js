import * as T from 'three'
import { vehicles } from './vehicles.js'

// The GLBs use metres, face -Z and contain a second shell at the same origin.
// Clones share their decoded geometry, atlases and materials across the street.
function streetCar(model) {
  const close = model.scene.clone(true)
  const distant = close.getObjectByName('Distance')
  distant.removeFromParent()
  const root = new T.LOD()
  root.addLevel(close, 0)
  root.addLevel(distant, 32, .12)
  distant.visible = false
  root.traverse(mesh => {
    if (!mesh.isMesh) return
    mesh.castShadow = !mesh.material.transparent
    mesh.receiveShadow = true
    if (mesh.material.transparent) mesh.material.depthWrite = false
  })
  return { root, close }
}

export function parkStreetCar(group, model, x, z, length, angle, addCollider) {
  const { root, close } = streetCar(model)
  const bounds = new T.Box3().setFromObject(close)
  const size = bounds.getSize(new T.Vector3())
  const scale = length / size.z
  root.scale.setScalar(scale)
  root.rotation.y = angle
  root.position.set(x, .015, z)
  group.add(root)
  const halfWidth = size.x * scale / 2
  addCollider(x-halfWidth, x+halfWidth, z-length/2, z+length/2, size.y*scale)
}

export function createVehicleRig(id, model) {
  const config = vehicles[id]
  const { root, close } = streetCar(model)
  root.name = config.name
  const body = new T.Group()
  close.add(body)
  const hull = close.getObjectByName('Hull')
  const leftDoor = close.getObjectByName('LeftDoor')
  const rightDoor = close.getObjectByName('RightDoor')
  body.add(hull, leftDoor, rightDoor)
  const wheels = ['FrontLeft', 'FrontRight', 'RearLeft', 'RearRight'].map(label => {
    const mesh = close.getObjectByName(label + 'Wheel')
    mesh.rotation.order = 'YXZ'
    return mesh
  })
  // Wheel pivots are at the hub in the baked rest pose with the tread on y=0.
  const radius = wheels[0].position.y
  let spin = 0
  let brakeLight
  root.traverse(mesh => {
    if (!mesh.isMesh || mesh.material.name !== 'StopLenses') return
    if (!brakeLight) {
      brakeLight = mesh.material.clone()
      brakeLight.emissive.setHex(0xff2d12)
      brakeLight.emissiveIntensity = 0
    }
    mesh.material = brakeLight
  })
  return {
    ...config, root, hinged: true,
    updatePose({x,z,heading,speed=0,dt=0,travel=speed*dt,steer=0,accel=0,braking=false,door=0}) {
      root.position.set(x, 0, z)
      root.rotation.y = -heading
      spin = (spin - travel/radius) % (Math.PI*2)
      for (let i=0; i<wheels.length; i++) {
        wheels[i].rotation.y = i < 2 ? -steer : 0
        wheels[i].rotation.x = spin
      }
      body.rotation.x = T.MathUtils.damp(body.rotation.x, T.MathUtils.clamp(accel*.004,-.044,.036),9,dt)
      body.rotation.z = T.MathUtils.damp(body.rotation.z, T.MathUtils.clamp(steer*speed*speed*.0014,-.05,.05),8,dt)
      leftDoor.rotation.y = Math.min(0,door)*1.18
      rightDoor.rotation.y = Math.max(0,door)*1.18
      brakeLight.emissiveIntensity = braking ? 1.8 : 0
    }
  }
}
