import {CatmullRomCurve3,Vector3} from 'three'
import {clearPose,overlapsCar,resetVehicleGround} from './driving.js'

export function chapterRoadRoute(points){
 const route=new CatmullRomCurve3(points.map(point=>new Vector3(point.x,point.y??0,point.z)),false,'centripetal')
 route.arcLengthDivisions=512
 const length=route.getLength(),sample=new Vector3(),tangent=new Vector3()
 return {
  length,
  sample(distance){
   const t=Math.max(0,Math.min(1,distance/length))
   route.getPointAt(t,sample);route.getTangentAt(t,tangent)
   return {x:sample.x,z:sample.z,lift:sample.y,heading:Math.atan2(tangent.x,-tangent.z)}
  },
  drive(car,distance,meters,boxes,traffic){
   const next=Math.min(length,distance+meters),pose=this.sample(next)
   const candidate={...car,...pose}
   if(!clearPose(candidate,boxes,true,true)||traffic.some(other=>other!==car&&overlapsCar(candidate,other)))return distance
   Object.assign(car,pose)
   resetVehicleGround(car)
   return next
  }
 }
}
