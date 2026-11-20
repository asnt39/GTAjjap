import {Box3,Ray,Sphere,Vector3} from 'three'
import {localPoint} from './driving.js'
import {archive} from './chart-room.js'
import {back,front,premises} from './market-plan.js'

const bounds=(left,right,bottom,top,north,south)=>new Box3(new Vector3(left,bottom,north),new Vector3(right,top,south))

// Snapshot stationary colliders once. Cars keep their live, oriented footprint.
export function equipmentTrace(boxes,cars,residents){
 const solids=boxes.map(([l,r,n,s,h])=>bounds(l,r,-.1,h,n,s))
 solids.push(bounds(-200,200,-2,0,-250,150),bounds(archive.back,archive.front,archive.ceiling,archive.ceiling+1,archive.north,archive.south))
 for(const p of premises)solids.push(bounds(p.x-5.5,p.x+5.5,3.44,4,back,front))
 const ray=new Ray(),localRay=new Ray(),hit=new Vector3(),carBox=new Box3(),sphere=new Sphere()
 return (origin,direction,limit)=>{
  ray.set(origin,direction);let distance=limit,target=null,blocked=false
  function nearest(t,n=null){if(t>=0&&t<distance){distance=t;target=n;blocked=!n}}
  for(const box of solids){
   if(box.containsPoint(origin)){nearest(0);break}
   if(ray.intersectBox(box,hit))nearest(hit.distanceTo(origin))
  }
  for(const car of cars){
   const p=localPoint(car,origin.x,origin.z),c=Math.cos(car.heading),s=Math.sin(car.heading)
   localRay.origin.set(p.x,origin.y,p.z);localRay.direction.set(direction.x*c+direction.z*s,direction.y,-direction.x*s+direction.z*c)
   carBox.min.set(-car.width/2,0,-car.length/2);carBox.max.set(car.width/2,car.height,car.length/2)
   if(carBox.containsPoint(localRay.origin))nearest(0)
   else if(localRay.intersectBox(carBox,hit))nearest(hit.distanceTo(localRay.origin))
  }
  for(const n of residents){
   if(n.f.hp<=0||n.pos.distanceToSquared(origin)>(distance+2)**2)continue
   // Overlapping spheres follow the game's upright resident volume.
   for(const [height,radius] of bodyVolumes){
    sphere.center.copy(n.pos);sphere.center.y+=height*n.height;sphere.radius=radius
    if(ray.intersectSphere(sphere,hit))nearest(hit.distanceTo(origin),n)
   }
  }
  return {target,distance,blocked}
 }
}
const bodyVolumes=[[.19,.27],[.39,.34],[.57,.32],[.72,.29],[.89,.20]]
