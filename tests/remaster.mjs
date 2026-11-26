import {worldColliders} from '../src/world-colliders.js'
import assert from 'node:assert/strict'
import {test} from 'node:test'
import {readFile} from 'node:fs/promises'
import {Scene,Texture,TextureLoader} from 'three'
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'
import {buildArchitecture} from '../src/architecture.js'
import {buildPort} from '../src/port.js'
import {buildStreet} from '../src/street.js'
import {buildOldTown} from '../src/old-town.js'
import {buildWestBank} from '../src/west-bank.js'
import {stationColliders} from '../src/custody.js'
import {buildWeaponShop} from '../src/weapon-shop.js'
import {marketCollision} from '../src/market-plan.js'
import {districtGates,beacons} from '../src/atmosphere.js'
import {terracePoint,terraceRooms} from '../src/terrace-plan.js'
import {streamTerraceRooms} from '../src/terrace-interior.js'
import {createTerraceDoors} from '../src/terrace-doors.js'
import {waterfrontEdges} from '../src/estuary.js'
import {canWalk,movePlayer,inDistrict} from '../src/navigation.js'
import {motorcycleSetup} from '../src/motorcycle.js'
import {vehicles} from '../src/vehicles.js'
import {clearPose,newDrive,stepDrive} from '../src/driving.js'

globalThis.self=globalThis
const paint=new Proxy({},{get:()=>()=>paint})
globalThis.document={createElement:()=>({getContext:()=>paint})}
TextureLoader.prototype.load=function(url,cb){const t=new Texture();queueMicrotask(()=>cb?.(t));return t}
GLTFLoader.prototype.loadAsync=async function(url){
 const b=await readFile(new URL('../public'+url,import.meta.url))
 return this.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')
}
const scene=new Scene(),boxes=worldColliders(),maps={},add=(...b)=>boxes.push(b)
await Promise.all([buildStreet(scene,add,maps),buildArchitecture(scene,add,maps),buildPort(scene,add)])
buildOldTown(scene,add,boxes,maps);buildWestBank(scene,add,maps,boxes)
beacons(scene,add);districtGates(scene,add);stationColliders(add);marketCollision(add);buildWeaponShop(scene,add)
const system=createTerraceDoors(scene,boxes)
function stand(r,x,z){return {...terracePoint(r,x,z),y:.083}}
function advance(p,npcs=[]){for(let i=0;i<60;i++)system.update(1/60,p,npcs)}

test('all fifteen doors block when closed, open onto a walkable room, and allow exit',()=>{
 for(const {r} of system.doors){
  const front=r.depth/2,p=stand(r,0,front+1.20),inside=stand(r,0,0),threshold=stand(r,0,front-.08)
  assert(canWalk(p.x,p.z,boxes),r.title+' approach')
  assert(!canWalk(threshold.x,threshold.z,boxes),r.title+' closed')
  if(r.door!=='auto')assert(system.toggle(p),r.title+' interact')
  advance(p)
  assert(canWalk(threshold.x,threshold.z,boxes),r.title+' open')
  const entered={...p};movePlayer(entered,inside.x-p.x,inside.z-p.z,boxes,undefined,.083)
  assert(Math.hypot(entered.x-inside.x,entered.z-inside.z)<.02,r.title+' interior')
  movePlayer(entered,p.x-inside.x,p.z-inside.z,boxes,undefined,.083)
  assert(Math.hypot(entered.x-p.x,entered.z-p.z)<.02,r.title+' exit')
  if(r.door!=='auto')assert(system.toggle(p))
  advance({x:0,z:0,y:0});assert(!canWalk(threshold.x,threshold.z,boxes),r.title+' reclosed')
 }
})
test('doors pause for occupants and a visiting NPC can pass in either direction',()=>{
 const d=system.doors[0],r=d.r,threshold=stand(r,0,r.depth/2-.08)
 const p=stand(r,0,r.depth/2+1.2),off={x:0,y:0,z:0}
 assert(system.toggle(p));advance(p)
 assert(system.toggle(p));advance(threshold)
 assert(d.progress>0&&canWalk(threshold.x,threshold.z,boxes))
 advance(off);assert.equal(d.progress,0)
 const npc={pos:p,f:{hp:100}};advance(off,[npc]);assert.equal(d.progress,1)
 const flat=stand(r,0,0)
 movePlayer(npc.pos,flat.x-p.x,flat.z-p.z,boxes);assert(Math.hypot(p.x-flat.x,p.z-flat.z)<.02)
 advance(off);assert.equal(d.progress,0)
 npc.pos=stand(r,0,r.depth/2-1);advance(off,[npc]);assert.equal(d.progress,1)
 advance(off);assert.equal(d.progress,0)
})
test('fittings stream out while shell collision stays resident',()=>{
 const update=streamTerraceRooms(scene),r=terraceRooms[0],count=boxes.length
 assert(update(r));const mesh=scene.getObjectByName(r.title+' fittings');assert(mesh)
 let disposed=false;mesh.geometry.addEventListener('dispose',()=>{disposed=true})
 assert(update({x:0,z:-120}));assert(disposed);assert(!mesh.parent);assert.equal(boxes.length,count)
 assert(update(r));assert(scene.getObjectByName(r.title+' fittings'))
})
test('quay service aisle supports walking, driving and riding to its physical end rails',()=>{
 for(const setup of [vehicles.touring,motorcycleSetup]){
  for(const [z,heading,end] of [[-58,0,-68],[29,Math.PI,40]]){
   const car=Object.assign(newDrive(setup,setup),{x:14.5,z,heading})
   for(let i=0;i<60*8&&Math.abs(car.z-z)<Math.abs(end-z);i++)stepDrive(car,{forward:1,back:0,steer:0},boxes,1/60,[],true)
   assert(Math.abs(car.z-z)>=Math.abs(end-z),setup.name+' apron '+end)
   assert(clearPose(car,boxes,true,true))
  }
 }
 for(const [from,to] of [[-60,-69],[32,41]]){
  const p={x:14.5,z:from};movePlayer(p,0,to-from,boxes);assert(Math.abs(p.z-to)<.01)
 }
 for(const [x,z] of [[25.8,0],[16,-71.2],[16,43.2]])assert(!canWalk(x,z,boxes))
})
test('retaining rails only run along actual Old Town boundaries',()=>{
 const edges=waterfrontEdges();assert(edges.length>15)
 for(const e of edges){
  const mid=(e.start+e.end)/2
  const valid=side=>inDistrict(e.vertical?e.fixed+side*e.inward*.03:mid,e.vertical?mid:e.fixed+side*e.inward*.03)
  assert(valid(1));assert(!valid(-1),JSON.stringify(e))
 }
})

test('city-wide pedestrian flood reaches every new entrance and existing district gateways',()=>{
 // A 0.5 m survey samples real shell, terminal and prop colliders. Doors stay
 // closed here; each threshold is separately tested through its full animation.
 const step=.5,x0=-225,z0=-101,width=502,height=491,seen=new Uint8Array(width*height)
 const index=(x,z)=>Math.round((z-z0)/step)*width+Math.round((x-x0)/step)
 const queue=[index(-3.5,25)];seen[queue[0]]=1
 // Bin static bounds for this exhaustive survey; canWalk still decides clearance.
 const cells=new Map(),cell=(x,z)=>Math.floor(x/8)+','+Math.floor(z/8)
 for(const b of boxes)for(let x=Math.floor((b[0]-.4)/8);x<=Math.floor((b[1]+.4)/8);x++)
  for(let z=Math.floor((b[2]-.4)/8);z<=Math.floor((b[3]+.4)/8);z++){
   const key=x+','+z,list=cells.get(key)??[];list.push(b);cells.set(key,list)
  }
 const marked=new Uint8Array(seen.length);marked[queue[0]]=1
 for(let j=0;j<queue.length;j++){
  const id=queue[j],col=id%width,row=Math.floor(id/width)
  for(const [dx,dz] of [[0,1],[0,-1],[1,0],[-1,0]]){
   const c=col+dx,r=row+dz,k=r*width+c
   if(c<0||c>=width||r<0||r>=height||marked[k])continue
   marked[k]=1
   const x=x0+c*step,z=z0+r*step
   if(canWalk(x,z,cells.get(cell(x,z))??[],.32,.083)){seen[k]=1;queue.push(k)}
  }
 }
 const targets=terraceRooms.map(r=>({...terracePoint(r,0,r.depth/2+1.3),name:r.title}))
 for(const [x,z] of [[-129,34],[-212,105],[-163,45],[-68,32],[0,64],[-56,-51],[-47,-50],[-93,-49],[14.5,-68],[14.5,41],[-16,42]])targets.push({x,z,name:x+','+z})
 for(const {x,z,name} of targets)assert(seen[index(x,z)],name+' must connect to Breakwater Avenue')
 console.log('Connected half-metre samples:',queue.length)
})
