import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {Box3,Group,Texture,TextureLoader,Vector3} from 'three'
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js'
import {createVehicleRig,parkStreetCar} from '../src/vehicle-rig.js'
import {vehicles} from '../src/vehicles.js'
import {availableDoor,cabinPoint,doorPoint,newDrive} from '../src/driving.js'
import {entryPose,entryTime} from '../src/vehicle-entry.js'

globalThis.self=globalThis
TextureLoader.prototype.load=function(url,done){const texture=new Texture();queueMicrotask(()=>done(texture));return texture}
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
for(const [asset,id] of [['dock-panel','van'],['sprint-coupe','sport'],['fairheaven'],['riverside']]){
 const data=await readFile(new URL('../public/assets/street/'+asset+'.glb',import.meta.url))
 const model=await loader.parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'')
 const group=new Group()
 let obstacle
 parkStreetCar(group,model,0,0,4.4,Math.PI,(...args)=>{obstacle=args})
 assert.equal(group.children[0].levels.length,2)
 assert(Math.abs(obstacle[3]-obstacle[2]-4.4)<.001)
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
