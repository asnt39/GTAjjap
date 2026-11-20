// Units are metres and seconds. Braking before a reversal keeps the old heading
// briefly, without spending the entire turn sliding along the old velocity.
export function accelerateOnFoot(velocity, targetX, targetZ, dt) {
 const targetSpeed = Math.hypot(targetX, targetZ)
 let speed = velocity.length()
 if (!targetSpeed || velocity.x * targetX + velocity.y * targetZ < 0) {
  const stopTime = speed / 28
  if (stopTime > dt) {
   velocity.multiplyScalar(1 - dt / stopTime)
   return
  }
  velocity.set(0, 0)
  speed = 0
  dt -= stopTime
 }
 const dx = targetX - velocity.x, dz = targetZ - velocity.y
 const difference = Math.hypot(dx, dz)
 if (difference === 0) return
 const rate = targetSpeed < speed ? 23 : targetSpeed < 2 ? 15 : 14
 const fraction = Math.min(1, dt * rate / difference)
 velocity.x += dx * fraction
 velocity.y += dz * fraction
}
