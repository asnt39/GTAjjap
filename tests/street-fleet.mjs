import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {Box3,Texture,TextureLoader,Vector3} from 'three'
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js'
import {createVehicleRig} from '../src/vehicle-rig.js'
import {vehicles} from '../src/vehicles.js'
import {availableDoor,cabinPoint,doorPoint,newDrive,stepDrive,clearPose} from '../src/driving.js'
import {dentVehicle} from '../src/vehicle-damage.js'
import {entryPose,entryTime} from '../src/vehicle-entry.js'

globalThis.self=globalThis
TextureLoader.prototype.load=function(url,done){const texture=new Texture();queueMicrotask(()=>done(texture));return texture}
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
for(const [asset,id] of [['dock-panel','van'],['sprint-coupe','sport'],['fairheaven'],['riverside']]){
 const data=await readFile(new URL('../public/assets/street/'+asset+'.glb',import.meta.url))
 const model=await loader.parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'')
 const parked=createVehicleRig(id??'touring',model,{name:asset,x:4.8,z:15,length:4.4,heading:0})
 const local=newDrive(parked,parked.setup)
 assert.equal(parked.root.levels.length,2)
 assert(parked.localOnly)
 assert.equal(parked.hinged,!!id)
 assert(availableDoor(local,doorPoint(local,-1),[]))
 for(let i=0;i<120;i++)stepDrive(local,{forward:1,back:0,steer:-.25,handbrake:false},[],1/60,[],true)
 assert(local.speed>3&&local.z<12&&clearPose(local,[],true,true),asset)
 const hull=parked.root.levels[0].object.getObjectByName('Hull')
 let panel
 hull.traverse(node=>{if(node.isMesh&&!panel)panel=node})
 const original=panel.geometry
 dentVehicle(local,0,-local.length*.5,12)
 parked.updatePose(local)
 assert.notEqual(panel.geometry,original)
 assert(panel.geometry.attributes.position.array.some((value,i)=>value!==original.attributes.position.array[i]))
 parked.updatePose({...local,dents:undefined})
 assert.equal(panel.geometry,original)
 if(!id)continue
 const rig=createVehicleRig(id,model),config=vehicles[id],body=rig.root.levels[0].object
 const extent=new Box3().setFromObject(body,true).getSize(new Vector3())
 for(const [axis,field] of [['x','width'],['y','height'],['z','length']])
  assert(Math.abs(extent[axis]-config[field])<.04,[asset,axis,extent[axis],config[field]])
 const car=newDrive(rig,config),door=doorPoint(car,-1),access=availableDoor(car,door,[])
 assert(access)
 if(id==='van')assert(Math.abs(door.z-car.z+.23)<1e-9) // stable seat validation anchor
 const pose=entryPose(car,{...access,from:door,time:entryTime},true)
 assert(Math.abs(pose.z-cabinPoint(car,-1,.26).z)<.001)
 rig.updatePose({...car,door:-1,steer:.3,travel:.4,dt:.1,braking:true})
 assert(body.getObjectByName('LeftDoor').rotation.y<0)
 assert(body.getObjectByName('FrontRightWheel').rotation.x<0)
 assert.equal(body.getObjectByName('FrontRightWheel').rotation.y,-.3)
 assert.equal(body.getObjectByName('RearRightWheel').rotation.y,0)
 const lenses=[];body.traverse(n=>{if(n.material?.name==='StopLenses')lenses.push(n.material)})
 assert(lenses.length&&lenses.every(m=>m.emissiveIntensity>0))
 rig.updatePose({...car,door:1,dt:.1})
 assert(body.getObjectByName('RightDoor').rotation.y>0)
 assert(lenses.every(m=>m.emissiveIntensity===0))
}
console.log('Four decoded street GLBs, close/distant LOD, footprint, wheels, steering, both doors, cab alignment and brake lights passed.')
