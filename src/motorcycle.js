import {Group,MathUtils} from 'three'
import {touringSetup} from './vehicles.js'

export const motorcycleSetup=Object.freeze({...touringSetup,name:'Breakwater 650',bike:true,x:-16.1,z:45.35,heading:Math.PI/2,
 width:.78,length:2.06,height:1.09,top:23,reverse:2,reversePower:2,power:7.2,brake:10.8,handbrake:12,
 steer:.55,steerRate:2.6,wheelbase:.69,camera:1.35,cameraHeight:1.24})

export function createMotorcycle({scene}){
 const root=new Group(),lean=new Group()
 root.add(lean);lean.add(scene);scene.rotation.y=Math.PI
 const fork=scene.getObjectByName('fork'),stand=scene.getObjectByName('kickstand')
 const wheels=['wheel_F','wheel_R'].map(name=>scene.getObjectByName(name))
 scene.traverse(node=>{if(node.isMesh)node.castShadow=node.receiveShadow=true})
 let roll=0,spin=0
 const setup=motorcycleSetup
 const rig={root,...setup,setup,hinged:false,localOnly:true,
  get bank(){return roll},
  updatePose({x,z,heading,speed=0,steer=0,lift=0,dt=0,travel=0,mounted=false}){
   const moving=Math.abs(speed),bank=MathUtils.clamp(-steer*speed*.24,-.47,.47)
   roll=MathUtils.damp(roll,mounted?bank:.105,11,dt)
   lean.rotation.z=roll;root.rotation.y=-heading;root.position.set(x,lift,z)
   spin=(spin+travel/.31)%(Math.PI*2)
   for(const wheel of wheels)wheel.rotation.x=spin
   fork.rotation.y=-steer*(moving>.25?.78:.56)
   stand.rotation.z=mounted?1.25:0
  }
 }
 rig.updatePose(setup)
 return rig
}
