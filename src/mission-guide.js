import {Mesh, MeshBasicMaterial, RingGeometry, Vector3} from 'three'

// Intersect the target bearing with safe viewport edges, including targets behind the camera.
export function guidePosition(projected, behind, viewport, bounds) {
 const x = projected.x * viewport.width / 2
 const y = -projected.y * viewport.height / 2
 const cx = viewport.width / 2, cy = viewport.height / 2
 const inset = cx + x >= bounds.left && cx + x <= bounds.right &&
  cy + y >= bounds.top && cy + y <= bounds.bottom
 if (!behind && inset) return { x: cx + x, y: cy + y, angle: 0, edge: false }

 const dx = behind ? -x : x
 const dy = Math.abs(dx) + Math.abs(y) < .001 ? 1 : behind ? -y : y
 const tx = dx < 0 ? (bounds.left - cx) / dx : dx > 0 ? (bounds.right - cx) / dx : Infinity
 const ty = dy < 0 ? (bounds.top - cy) / dy : dy > 0 ? (bounds.bottom - cy) / dy : Infinity
 const scale = Math.min(tx, ty)
 return { x: cx + dx * scale, y: cy + dy * scale, angle: Math.atan2(dy, dx), edge: true }
}

export function missionGuide(scene, camera, groundHeight) {
 const frame = document.querySelector('#guide-frame')
 const marker = frame.querySelector('#guide-marker')
 const distanceLabel = marker.querySelector('span')
 const ring = new Mesh(new RingGeometry(.42, .53, 32),new MeshBasicMaterial({
  color: 0xffcf8d, transparent: true, opacity: .64, depthWrite: false, toneMapped: false,
  polygonOffset: true, polygonOffsetFactor: -2
 }))
 ring.rotation.x = -Math.PI / 2
 ring.visible = false
 scene.add(ring)

 const anchor = new Vector3(), local = new Vector3(), projected = new Vector3()
 let bounds
 const measure = () => { bounds = frame.getBoundingClientRect() }
 window.addEventListener('resize', measure)

 return (goal, player) => {
  const hidden = !goal
  marker.hidden = hidden
  ring.visible = false
  if (hidden) return
  bounds ??= frame.getBoundingClientRect()

  const floor = goal.y ?? groundHeight(goal.x, goal.z)
  const distance = Math.hypot(goal.x - player.x, goal.z - player.z)
  ring.visible = distance < 36
  if (ring.visible) ring.position.set(goal.x, floor + .019, goal.z)
  anchor.set(goal.x, floor + (goal.markerHeight ?? .8), goal.z)
  local.copy(anchor).applyMatrix4(camera.matrixWorldInverse)
  // Keep the sign of the camera-space bearing when projection crosses z=0.
  const behind = local.z >= 0
  if (Math.abs(local.z) < .001) local.z = behind ? .001 : -.001
  projected.copy(local).applyMatrix4(camera.projectionMatrix)
  const point = guidePosition(projected, behind,{width:innerWidth,height:innerHeight},bounds)
  marker.classList.toggle('edge',point.edge)
  marker.style.transform = 'translate3d('+(point.x-bounds.left)+'px,'+(point.y-bounds.top)+'px,0) translate(-50%,-50%)'
  marker.style.setProperty('--bearing',point.angle+'rad')
  const label = Math.round(distance)+' m'
  if (distanceLabel.textContent !== label) distanceLabel.textContent = label
 }
}
