import * as T from 'three'

// Measurements in the Touring GLB's mesh coordinates. Its nose points along +Y
// and its roof along -Z. The front and rear hubs have slightly different tracks.
const axles = [
  { y: 133.6, track: 73.8, front: true },
  { y: -106, track: 72.0, front: false }
]
const hubZ = -36.2
const tireRadius = 26.35

// The tire tread, rims and hubcaps are disconnected islands in one primitive.
// The outer hubcaps are wider than the tread. These envelopes were checked
// against the individual connected components to keep the fenders on the body.
function wheelAt(position, index) {
  const x = position.getX(index)
  const y = position.getY(index)
  const front = y > 0
  const radius = Math.hypot(y - axles[front ? 0 : 1].y, position.getZ(index) - hubZ)
  const outerEdge = radius < 15 ? 92 : front ? 88.4 : 88.2
  if (Math.abs(x) < 55 || Math.abs(x) > outerEdge || radius > 26.7) return -1
  return (front ? 0 : 2) + (x > 0 ? 0 : 1)
}

function splitShell(geometry) {
  const { position, uv } = geometry.attributes
  const shell = [], lenses = [], wheels = [[], [], [], []]
  const wheelIds = Int8Array.from({ length: position.count }, (_, i) => wheelAt(position, i))
  const indices = geometry.index.array
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i], b = indices[i + 1], c = indices[i + 2]
    const wheel = wheelIds[a]
    let part = shell
    if (wheel >= 0 && wheel === wheelIds[b] && wheel === wheelIds[c]) {
      part = wheels[wheel]
    } else if (position.getY(a) < -170) {
      // The existing red tail lenses use the second-row, first-column atlas tile.
      const u = (uv.getX(a) + uv.getX(b) + uv.getX(c)) / 3
      const v = (uv.getY(a) + uv.getY(b) + uv.getY(c)) / 3
      if (u < .25 && v >= .25 && v < .5) part = lenses
    }
    part.push(a, b, c)
  }
  return { shell, lenses, wheels }
}

function addPart(parent, geometry, material, indices) {
  const part = new T.BufferGeometry()
  for (const [name, attr] of Object.entries(geometry.attributes)) part.setAttribute(name, attr)
  part.setIndex(indices)
  const mesh = new T.Mesh(part, material)
  // Keep the asset's vertex buffers shared. Moving the parent to its hinge and
  // applying the opposite mesh offset preserves every vertex at rest.
  mesh.position.copy(parent.position).negate()
  mesh.castShadow = mesh.receiveShadow = true
  parent.add(mesh)
}

export function createTouring(model, x, z, length) {
  let painted, glass
  model.scene.traverse(mesh => {
    if (!mesh.isMesh) return
    if (mesh.material.name === 'ToyCar') painted = mesh
    if (mesh.material.name === 'Window') glass = mesh
  })
  // The third primitive, Fabric, is the sample's display stand. Measure the
  // vehicle itself so its wheels meet the road and its bumper span is correct.
  const raw = painted.geometry
  raw.computeBoundingBox()
  const box = raw.boundingBox
  const center = box.getCenter(new T.Vector3())
  const size = box.getSize(new T.Vector3())
  const scale = length / size.y
  const transform = new T.Matrix4().set(
    -scale, 0, 0, scale * center.x,
    0, 0, -scale, scale * box.max.z,
    0, -scale, 0, scale * center.y,
    0, 0, 0, 1
  )
  const bodyGeometry = raw.clone().applyMatrix4(transform)
  const glassGeometry = glass.geometry.clone().applyMatrix4(transform)
  const parts = splitShell(raw)
  const root = new T.Group()
  root.name = 'Touring'
  root.position.set(x, 0, z)
  const chassis = new T.Group()
  chassis.name = 'Touring body'
  chassis.position.y = .37
  root.add(chassis)
  const lights = painted.material.clone()
  lights.emissive.setHex(0xff2713)
  lights.emissiveIntensity = 0
  addPart(chassis, bodyGeometry, painted.material, parts.shell)
  addPart(chassis, glassGeometry, glass.material, glassGeometry.index)
  addPart(chassis, bodyGeometry, lights, parts.lenses)
  const wheels = parts.wheels.map((indices, i) => {
    const axle = axles[Math.floor(i / 2)]
    const pivot = new T.Group()
    pivot.name = (axle.front ? 'Front' : 'Rear') + (i % 2 === 0 ? ' left wheel' : ' right wheel')
    pivot.rotation.order = 'YXZ'
    pivot.position.set(i % 2 === 0 ? axle.track : -axle.track, axle.y, hubZ).applyMatrix4(transform)
    root.add(pivot)
    addPart(pivot, bodyGeometry, painted.material, indices)
    return pivot
  })
  let spin = 0
  let impactPitch = 0
  const vehicle = {
    root, x, z, heading: 0, width: size.x * scale, length, height: size.z * scale,
    updatePose({ x, z, heading, speed = 0, steer = 0, accel = 0, braking = 0, dt = 0, travel = speed * dt, impact = 0 }) {
      vehicle.x = x
      vehicle.z = z
      vehicle.heading = heading
      root.position.set(x, 0, z)
      root.rotation.y = -heading
      spin = (spin - travel / (tireRadius * scale)) % (2 * Math.PI)
      for (let i = 0; i < wheels.length; i++) {
        wheels[i].rotation.x = spin
        wheels[i].rotation.y = i < 2 ? -steer : 0
      }
      lights.emissiveIntensity = 1.8 * T.MathUtils.clamp(Number(braking), 0, 1)
      impactPitch = Math.max(impactPitch * Math.exp(-dt * 10), T.MathUtils.clamp(impact / 7, 0, 1))
      const lateralAccel = Math.tan(steer) * speed * speed / ((axles[0].y - axles[1].y) * scale)
      const roll = T.MathUtils.clamp(lateralAccel * .004, -.054, .054)
      const pitch = T.MathUtils.clamp(accel * .004, -.041, .032) - impactPitch * .045
      chassis.rotation.z = T.MathUtils.damp(chassis.rotation.z, roll, 7, dt)
      chassis.rotation.x = T.MathUtils.damp(chassis.rotation.x, pitch, 10, dt)
    }
  }
  return vehicle
}
