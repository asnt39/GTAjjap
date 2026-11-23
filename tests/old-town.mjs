import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {Scene, Texture, TextureLoader} from 'three'
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'
import {buildOldTown} from '../src/old-town.js'
import {buildStreet} from '../src/street.js'
import {buildArchitecture} from '../src/architecture.js'
import {districtGates} from '../src/atmosphere.js'
import {firstWorkRoadblock} from '../src/first-work-roadblock.js'
import {marketCollision} from '../src/market-plan.js'
import {stationColliders} from '../src/custody.js'
import {clockCourt,oldTownHeight,townRoadSurface} from '../src/old-town-plan.js'
import {availableDoor,clearPose,newDrive,safeExit,stepDrive} from '../src/driving.js'
import {spawn,canWalk,movePlayer} from '../src/navigation.js'
import {vehicles} from '../src/vehicles.js'

globalThis.self=globalThis
const paint=new Proxy({}, {get:()=>()=>paint})
globalThis.document={createElement:()=>({getContext:()=>paint})}
TextureLoader.prototype.load=function(url,cb){const t=new Texture();queueMicrotask(()=>cb(t));return t}
GLTFLoader.prototype.loadAsync=async function(url){
 const b=await readFile(new URL('../public'+url,import.meta.url))
 return this.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')
}
const model=new Scene(),boxes=[],surfaceMaps={}
const add=(...bounds)=>boxes.push(bounds)
districtGates(model,add);marketCollision(add);stationColliders(add)
const [,rigs]=await Promise.all([buildArchitecture(model,add,surfaceMaps),buildStreet(model,add,surfaceMaps)])
const traffic=Object.entries(rigs).map(([id,rig])=>newDrive(rig,rig.setup??vehicles[id]))
const dockBoxes=boxes.length,town=buildOldTown(model,add,boxes,surfaceMaps)
const parked=Object.values(rigs).filter(rig=>rig.localOnly)
assert.equal(parked.length,5)
for(const rig of parked){
 const vehicle=newDrive(rig,rig.setup)
 const space=safeExit(vehicle,boxes)
 assert(space&&availableDoor(vehicle,space.door,boxes),rig.name)
 assert(clearPose(vehicle,boxes,true,true),rig.name)
}
const textures=new Set()
model.getObjectByName('Old Town').traverse(obj=>{if(obj.material?.map)textures.add(obj.material.map)})
assert(textures.has(surfaceMaps.street[0])&&textures.has(surfaceMaps.architecture[4]))
assert(canWalk(spawn.x,spawn.z,boxes))
assert(!canWalk(clockCourt.x,clockCourt.z,boxes))
assert(canWalk(clockCourt.x+3,clockCourt.z+1,boxes))
const alley={x:-51.5,z:68}
movePlayer(alley,0,23,boxes)
assert(alley.z>90.9,'walkable shortcut behind the terraces')
movePlayer(alley,0,-17,boxes)
movePlayer(alley,16.5,0,boxes)
assert(alley.x>-35.2,'the alley connects to Clock Street')
for(const [a,b,c,d] of townRoadSurface)for(const [l,r,n,s] of boxes.slice(dockBoxes)){
 assert(a>=r||b<=l||c>=s||d<=n,'new structure overlaps an asphalt tile')
}
assert.equal(oldTownHeight(0,64),.008)
assert.equal(oldTownHeight(-68,-28),.008)
assert.equal(oldTownHeight(-74.2,-26),.083)
for(const [x,z,dx,dz] of [[-40.5,66,-1,0],[-73.5,-28,-1,0],[6,64,1,0]]){
 const road=oldTownHeight(x,z),edge=oldTownHeight(x+dx*.05,z+dz*.05)
 assert(edge>road&&edge<road+.04,'an Old Town curb should rise progressively')
 assert.equal(oldTownHeight(x+dx*.19,z+dz*.19),.083)
}

function path(points){
 const result=[points[0]]
 let last=points[0]
 function line(to){
  const pieces=Math.max(1,Math.ceil(Math.hypot(to[0]-last[0],to[1]-last[1])/.45))
  for(let i=1;i<=pieces;i++)result.push(last.map((v,k)=>v+(to[k]-v)*i/pieces))
  last=to
 }
 for(let i=1;i<points.length-1;i++){
  const [a,b,c]=points.slice(i-1,i+2)
  const enter=b.map((v,k)=>v+(a[k]-v)*4.8/Math.hypot(a[0]-b[0],a[1]-b[1]))
  const exit=b.map((v,k)=>v+(c[k]-v)*4.8/Math.hypot(c[0]-b[0],c[1]-b[1]))
  line(enter)
  for(let j=1;j<=14;j++){
   const t=j/14,u=1-t
   result.push(b.map((v,k)=>u*u*enter[k]+2*t*u*v+t*t*exit[k]))
  }
  last=exit
 }
 line(points.at(-1))
 return result
}
function drive(setup,route){
 const points=path(route),[[x,z],[nx,nz]]=points
 const car=Object.assign(newDrive(setup,setup),{x,z,heading:Math.atan2(nx-x,z-nz)})
 assert(clearPose(car,boxes,true,true))
 let cursor=0
 for(let frame=0;frame<60*100;frame++){
  const gap=([px,pz])=>Math.hypot(car.x-px,car.z-pz)
  if(cursor>points.length-30&&gap(points.at(-1))<1.2)return {car,seconds:frame/60}
  while(cursor<points.length-1&&gap(points[cursor])<1.8)cursor++
  let look=cursor
  while(look<points.length-1&&gap(points[look])<3.1)look++
  const [fx,fz]=points[look],angle=Math.atan2(fx-car.x,car.z-fz)-car.heading
  const error=Math.atan2(Math.sin(angle),Math.cos(angle))
  const speed=Math.abs(error)<.045?9:Math.abs(error)<.16?6:4
  stepDrive(car,{forward:car.speed<speed?1:0,back:0,handbrake:car.speed>speed+.3,steer:Math.max(-1,Math.min(1,error*2.2))},boxes,1/60,traffic,true)
  assert(clearPose(car,boxes,true,true))
  assert.equal(car.impact,0,setup.name+' contacted a curb or object at '+car.x.toFixed(1)+', '+car.z.toFixed(1))
 }
 assert.fail(setup.name+' did not complete the route')
}

const connection=[[0,49],[0,84],[-35,84],[-35,109],[-68,109],[-68,-37],[-51,-37]]
const loop=[[-68,26],[-68,32],[-35,32],[-35,109],[-68,109],[-68,25]]
for(const v of [vehicles.touring,vehicles.van,vehicles.sport]){
 const outward=drive(v,connection),back=drive(v,[...connection].reverse()),lap=drive(v,loop)
 assert(safeExit(lap.car,boxes))
 console.log(v.name,'gateway route',outward.seconds.toFixed(1),back.seconds.toFixed(1),'s · loop',lap.seconds.toFixed(1),'s')
}
for(const start of [{x:-68,z:-36},{x:0,z:51}]){
 movePlayer(start,0,16,boxes)
 assert(start.z>0||start.x===-68&&start.z>-25)
 assert(canWalk(start.x,start.z,boxes))
}
const northbound={...vehicles.touring,x:0,z:59,heading:Math.PI}
assert(clearPose(northbound,boxes))
assert(!clearPose(northbound,boxes,false))
assert(town(false,{x:0,z:48}))
assert(!clearPose({...northbound,z:56},boxes))
assert(!canWalk(-68,-27.7,boxes))
town(true,{x:0,z:48})
assert(clearPose({...northbound,z:56},boxes))
assert(canWalk(-68,-27.7,boxes))

const setRoadblock=firstWorkRoadblock(model,boxes)
const barrier=model.getObjectByName('Breakwater temporary road closure')
const noClosure=boxes.length
const start={...vehicles.touring,x:0,z:65,heading:Math.PI}
const direct={...start,z:74}
assert(!barrier.visible)
assert(clearPose(direct,boxes,true,true))
assert(setRoadblock(true))
assert(!setRoadblock(true))
assert.equal(boxes.length,noClosure+1)
assert(barrier.visible)
assert(clearPose(start,boxes,true,true))
for(const x of [-6,0,6])assert(!clearPose({...direct,x},boxes,true,true))
const toCheckpoint=drive(vehicles.touring,[[0,-76],[0,60]])
const detour=drive(vehicles.touring,[[0,60],[0,-37],[-68,-37],[-68,109],[-52,109]])
assert(detour.car.x>-53.5&&safeExit(detour.car,boxes))
assert(setRoadblock(false))
assert(!barrier.visible)
assert.equal(boxes.length,noClosure)
assert(clearPose(direct,boxes,true,true))
console.log('First Work physical checkpoint and detour passed in',Math.round(toCheckpoint.seconds+detour.seconds),'driving seconds.')
