import * as T from 'three'

// Keep lane floors flush with surrounding pavement. High fixtures span the alley
// from wall to wall and the pedestrian route remains open at both ends.
export function buildClockLane({batch,box,materials}){
 const {iron,roof,stone,lamp,trim}=materials
 function cable(a,b,sag){
  const start=new T.Vector3(...a),end=new T.Vector3(...b)
  const mid=start.clone().lerp(end,.5);mid.y-=sag
  const wire=new T.QuadraticBezierCurve3(start,mid,end)
  batch(new T.TubeGeometry(wire,8,.021,4,false),iron)
 }
 for(const z of [65,86]){
  const span=z===65?[-53.05,-49.20]:[-53.10,-49.04]
  // Only anchor both ends where houses actually face the lane.
  cable([span[0],5.05,z],[span[1],4.71,z],.56)
 }
 for(const [x,z] of [[-53.0,65],[-53.05,83],[-53.4,96]]){
  box(x-.075,2.44,z-.5,.21,.29,.19,iron)
  box(x+.125,2.42,z-.5,.34,.08,.13,iron)
  box(x+.23,2.30,z-.5,.21,.19,.20,lamp)
 }
 // Bluestone wheel strips frame a central run of small granite setts.
 for(const x of [-52.52,-50.82])box(x,.087,81,.39,.007,28,stone)
 for(let z=67.5;z<94;z+=3.1){
  box(-51.66,.089,z,1.24,.008,.19,trim)
  for(let j=0;j<5;j++)box(-52.15+j*.244,.094,z,.139,.005,.11,roof)
 }
 for(const [x,z] of [[-51.7,74],[-51.7,91]]){
  batch(new T.CylinderGeometry(.33,.33,.012,12).translate(x,.092,z),iron)
  for(const dx of [-.13,0,.13])box(x+dx,.102,z,.033,.005,.37,roof)
 }
}
