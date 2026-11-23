import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {PerspectiveCamera,Scene,Texture,TextureLoader,Vector3} from 'three'
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'
import {createResidents} from '../src/residents.js'
import {policeChase} from '../src/police-chase.js'
import {policeRoute,roadDriver} from '../src/police-road.js'
import {fighter} from '../src/melee.js'
import {newDrive,clearPose,overlapsCar} from '../src/driving.js'
import {vehicles} from '../src/vehicles.js'

const roadObstacles=[[-8.82,-8.38,-38.24,-37.76,1.75],[-6.95,-2.75,-59.11,-54.89,1.65]]
const from={x:4.39,z:24.5,heading:0},west={x:-30,z:-39.74,heading:-Math.PI/2}
const route=policeRoute(from,west)
assert(route.some(node=>Math.abs(node.x)<3&&node.z<-27))
assert(route.some(node=>node.x<-14&&Math.abs(node.z+39.74)<.01))
assert(route.every(node=>Math.abs(node.x)<6.05||node.z>-43&&node.z<-31))
const config={...vehicles.sport,top:15,power:5.1,wheelbase:.55,steer:.88,steerRate:3.2}
const car=Object.assign(newDrive(config,config),from)
const driver=roadDriver(car)
for(let i=0;i<1000;i++){
 const finished=driver.step(1/60,roadObstacles,[],west,{follow:true})
 assert.equal(car.impact,0)
 assert(clearPose(car,roadObstacles))
 if(finished)break
}
assert(car.x<-24&&Math.abs(car.z+39.74)<.3)
// Returning along the north road uses the opposite lane without clipping the parked estate.
Object.assign(car,newDrive(config,config),{x:1.46,z:-64,heading:0});driver.reset()
for(let i=0;i<1100;i++){
 const finished=driver.step(1/60,roadObstacles,[],{x:-1.46,z:-47,heading:Math.PI},{follow:true})
 assert(clearPose(car,roadObstacles))
 if(finished)break
}
assert(car.z>-54&&car.x<0&&Math.cos(car.heading)<-.9)

globalThis.self=globalThis
TextureLoader.prototype.load=function(url,cb){const t=new Texture();queueMicrotask(()=>cb(t));return t}
GLTFLoader.prototype.loadAsync=async function(url){
 const b=await readFile(new URL('../public'+url,import.meta.url))
 return this.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')
}
let seed=31
Math.random=()=>((seed=Math.imul(1664525,seed)+1013904223|0)>>>0)/4294967296
const scene=new Scene(),camera=new PerspectiveCamera(58,1.77,.08,420)
camera.position.set(3,2.5,20);camera.lookAt(2,1,8);camera.updateMatrixWorld()
const player={pos:new Vector3(2.35,0,8),f:fighter(100),available:false,inVehicle:null}
const target=Object.assign(newDrive(vehicles.touring),{x:2.35,z:8,speed:2})
const traffic=[target],crowd=await createResidents(scene,roadObstacles,target,traffic)
const ai=policeChase(scene,roadObstacles,traffic,1,crowd,()=>0),law=crowd.wanted
law.report(player.pos,3)
const stages=ai.units.map(()=>new Set())
for(let i=0;i<4000;i++){
 const driving=i<1100
 target.z=8-Math.min(i,1100)/30
 target.speed=driving?2:0
 player.pos.z=target.z;player.inVehicle=driving?target:null;player.available=!driving
 if(i===1520)law.clear()
 const result=ai.update(1/60,player.pos,player.inVehicle,law,true)
 player.squadObserver=result.observed
 crowd.update(1/60,camera,player,()=>false,()=>{})
 const bodies=ai.units.map(u=>u.car)
 assert(!overlapsCar(bodies[0],bodies[1]))
 for(const [index,unit] of ai.units.entries())stages[index].add(unit.stage)
}
for(const events of stages)for(const state of ['board','chase','stopping','exit','foot','return','parked'])assert(events.has(state),state)
assert(ai.units.every(unit=>unit.stage==='parked'&&!unit.crew.policeOrder))
assert(crowd.officers.length===8)
ai.update(1/60,player.pos,null,law,false)
assert.equal(traffic.length,1)
assert(ai.units.every(u=>!u.rig.root.visible))
console.log('Road corners, reversal, two driving squads, collision, on-foot transition, return and online isolation passed.')
