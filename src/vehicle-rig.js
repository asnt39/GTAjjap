import * as T from 'three'
import {vehicles} from './vehicles.js'

// Original cars with open sides, seats and hinged doors. All parts share the
// same coordinate convention as Touring: the front faces negative Z.
export function createVehicleRig(id) {
 const config=vehicles[id],van=id==='van'
 const {width:w,length:l,height:h}=config
 const root=new T.Group(),body=new T.Group()
 root.name=config.name
 root.add(body)
 const material=(color,roughness=.56)=>new T.MeshStandardMaterial({color,roughness})
 const paint=material(van?0x70876e:0xb96443,.36),rubber=material(0x222629,.88)
 const trim=material(0x363c3a),glass=material(van?0x52696b:0x48626b,.24)
 const metal=material(0x9b9b8d,.4),headlights=material(0xeee3ae)
 const brake=material(0x952b20)
 brake.emissive.setHex(0xff2d12)
 const box=(parent,mat,x,y,z,sx,sy,sz,angle=0)=>{
  const mesh=new T.Mesh(new T.BoxGeometry(sx,sy,sz),mat)
  mesh.position.set(x,y,z);mesh.rotation.x=angle
  mesh.castShadow=mesh.receiveShadow=true
  parent.add(mesh)
  return mesh
 }
 const tireRadius=van?.38:.34,wheelbase=l*config.wheelbase
 const wheelGeom=new T.CylinderGeometry(tireRadius,tireRadius,.26,16).rotateZ(Math.PI/2)
 const rimGeom=new T.CylinderGeometry(tireRadius*.55,tireRadius*.55,.275,12).rotateZ(Math.PI/2)
 const wheels=[]
 for(const z of [-wheelbase/2,wheelbase/2])for(const side of [-1,1]){
  const pivot=new T.Group(),axle=new T.Group()
  pivot.position.set(side*(w/2-.14),tireRadius,z);root.add(pivot);pivot.add(axle)
  for(const [geo,mat] of [[wheelGeom,rubber],[rimGeom,metal]]){
   const wheel=new T.Mesh(geo,mat);wheel.castShadow=true;axle.add(wheel)
  }
  wheels.push({pivot,axle,front:z<0})
 }
 const sill=.44,belt=van?1.09:.83,front=-l*.24,rear=l*.124
 box(body,trim,0,sill,0,w*.94,.15,l*.96)
 box(body,paint,0,.62,-l*.373,w,.39,l*.25,van?0:.06)
 box(body,paint,0,van?1.16:.64,l*.308,w,van?1.92:.43,l*.368,van?0:-.04)
 box(body,trim,0,belt-.14,front+.05,w*.91,.17,.14)
 box(body,paint,0,h-.055,(front+rear)*.5,w*.89,.11,rear-front+.23)
 box(body,glass,0,(h+belt)*.5,front,w*.88,h-belt,.065,van?-.14:-.43)
 box(body,glass,0,(h+belt)*.5,rear,w*.88,h-belt,.065,van?0:.38)
 for(const z of [-l/2+.04,l/2-.04])box(body,trim,0,.45,z,w*.98,.18,.08)
 const doors=[]
 for(const side of [-1,1]){
  box(body,trim,side*w*.245,.59,.13,.43,.13,.43)
  box(body,trim,side*w*.245,.80,.32,.43,.48,.13,-.10)
  box(body,headlights,side*w*.35,.68,-l/2,.36,.135,.03)
  box(body,brake,side*w*.38,.69,l/2,.29,.145,.03)
  // The hinge sits on the front edge. The panel trails behind the hinge.
  const hinge=new T.Group(),span=rear-front-.07
  hinge.position.set(side*(w/2-.054),0,front+.034)
  body.add(hinge);doors.push(hinge)
  box(hinge,paint,0,(sill+belt)*.5,span*.5,.095,belt-sill,span)
  box(hinge,metal,side*.053,belt-.075,span*.82,.025,.027,.145)
  box(hinge,trim,-side*.01,h-.126,span*.5,.05,.04,span)
  for(const z of [.027,span-.027])box(hinge,trim,-side*.014,(h+belt-.12)*.5,z,.055,h-belt-.12,.042)
 }
 let spin=0
 return {root,...config, hinged:true,
  updatePose({x,z,heading,speed=0,dt=0,travel=speed*dt,steer=0,accel=0,braking=false,door=0}){
   root.position.set(x,0,z);root.rotation.y=-heading
   spin=(spin-travel/tireRadius)%(Math.PI*2)
   for(const {pivot,axle,front} of wheels){pivot.rotation.y=front?-steer:0;axle.rotation.x=spin}
   body.rotation.x=T.MathUtils.damp(body.rotation.x,T.MathUtils.clamp(accel*.004,-.044,.036),9,dt)
   body.rotation.z=T.MathUtils.damp(body.rotation.z,T.MathUtils.clamp(steer*speed*speed*.0014,-.05,.05),8,dt)
   doors[0].rotation.y=Math.min(0,door)*1.18
   doors[1].rotation.y=Math.max(0,door)*1.18
   brake.emissiveIntensity=braking?1.8:0
  }
 }
}
