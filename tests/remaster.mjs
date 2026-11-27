import {buildSouthBasin} from '../src/south-basin.js'
import {basinCarLayout} from '../src/basin-navigation.js'
import {civilianTraffic} from '../src/civilian-traffic.js'
import {basinSights} from '../src/south-basin-plan.js'
import {Group} from 'three'
import {weaponShop} from '../src/weapon-shop-plan.js'
import {cityFixtures} from "../src/city-fixtures.js"
import {citySpots} from "../src/city-life-plan.js"
import {crossings} from "../src/street-plan.js"
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
import {loftHome,terraceCeilingAt,terraceFloorAt,terracePoint,terraceRooms} from '../src/terrace-plan.js'
import {streamTerraceRooms} from '../src/terrace-interior.js'
import {createTerraceDoors} from '../src/terrace-doors.js'
import {buildEstuary,waterfrontEdges} from '../src/estuary.js'
import {canWalk,movePlayer,inCoreDistrict,inDistrict,cameraFraction,sights} from '../src/navigation.js'
import {nearbyAction} from '../src/city-actions.js'
import {beachGate} from '../src/coast-plan.js'
import {motorcycleSetup} from '../src/motorcycle.js'
import {vehicles} from '../src/vehicles.js'
import {clearPose,newDrive,overlapsCar,stepDrive} from '../src/driving.js'

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
const updateBasin=buildSouthBasin(scene,add,maps)
buildOldTown(scene,add,boxes,maps);buildWestBank(scene,add,maps,boxes)
beacons(scene,add);districtGates(scene,add);stationColliders(add);marketCollision(add);buildWeaponShop(scene,add)
const system=createTerraceDoors(scene,boxes)
function stand(r,x,z){return {...terracePoint(r,x,z),y:.083}}
function advance(p,npcs=[]){for(let i=0;i<60;i++)system.update(1/60,p,npcs)}

test('all terrace doors block when closed, open onto a walkable room, and allow exit',()=>{
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
test('Cooper House stairs join two supported floors and the upstairs rail blocks falls',()=>{
 const r=terraceRooms.find(room=>room.loft),stairs=loftHome.stair
 const across=(stairs.left+stairs.right)*.5
 const start=terracePoint(r,across,stairs.bottom+.1),p={...start,y:loftHome.ground}
 const visit=z=>{
  const next=terracePoint(r,across,z)
  movePlayer(p,next.x-p.x,next.z-p.z,boxes,undefined,p.y)
  assert(Math.hypot(p.x-next.x,p.z-next.z)<.01)
  p.y=terraceFloorAt(r,p.x,p.z,p.y,false)
  assert(terraceCeilingAt(r,p.x,p.z,p.y)-p.y>1.8)
 }
 for(let i=0;i<=54;i++)visit(stairs.bottom-.082*i)
 assert.equal(p.y,loftHome.upper)
 const rail=terracePoint(r,0,stairs.top-.12)
 assert(!canWalk(rail.x,rail.z,boxes,.32,loftHome.upper))
 assert(canWalk(rail.x,rail.z,boxes,.32,loftHome.ground))
 for(let i=54;i>=0;i--)visit(stairs.bottom-.082*i)
 assert(Math.abs(p.y-loftHome.ground)<1e-8)
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
  const valid=side=>inCoreDistrict(e.vertical?e.fixed+side*e.inward*.03:mid,e.vertical?mid:e.fixed+side*e.inward*.03)
  assert(valid(1));assert(!valid(-1),JSON.stringify(e))
 }
})

test('the existing South Basin railing is physically open at the beach entrance only',()=>{
 const barriers=worldColliders()
 buildEstuary(new Scene(),undefined,(...b)=>barriers.push(b))
 const crossing={x:24,z:beachGate.z}
 movePlayer(crossing,12,0,barriers,undefined,.083)
 assert.equal(Math.round(crossing.x),36)
 const railing={x:25,z:beachGate.z+4}
 movePlayer(railing,12,0,barriers,undefined,.083)
 assert(railing.x<29)
})

test('city-wide pedestrian flood reaches every new entrance and existing district gateways',()=>{
 // A 0.5 m survey samples real shell, terminal and prop colliders. Doors stay
 // closed here; each threshold is separately tested through its full animation.
 const step=.5,x0=-225,z0=-101,width=510,height=621,seen=new Uint8Array(width*height)
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
 for(const [x,z] of [[-129,34],[-212,105],[-163,45],[-68,32],[0,64],[weaponShop.x,weaponShop.z],[-47,-50],[-93,-49],[14.5,-68],[14.5,41],[-16,42]])targets.push({x,z,name:x+','+z})
 targets.push(...basinSights.map(s=>({...s,name:s.title})))
 for(const {x,z,name} of targets)assert(seen[index(x,z)],name+' must connect to Breakwater Avenue')
 console.log('Connected half-metre samples:',queue.length)
})

test('market and West Bank sidewalks lead to interaction fixtures without walking through a wall',()=>{
 const fixtureScene=new Scene()
 cityFixtures(fixtureScene,add)
 advance({x:0,z:0,y:0})
 for(const s of citySpots.filter(s=>s.type!=='discovery')){
  assert(canWalk(s.x,s.z,boxes,.32,.083),s.id+' approach')
 }
 for(const c of crossings){
  const p=c.axis==='z'?{x:c.x-c.span/2-1.15,z:c.z}:{x:c.x,z:c.z-c.span/2-1.15}
  assert(canWalk(p.x,p.z,boxes),'crossing start '+JSON.stringify(c))
  movePlayer(p,c.axis==='z'?c.span+2.30:0,c.axis==='x'?c.span+2.30:0,boxes)
  assert(Math.hypot(p.x-c.x,p.z-c.z)>c.span/2+1,'crossing arrival '+JSON.stringify(c))
 }
})
test('vans and motorcycles enter the new repair court from West Bank road',()=>{
 for(const setup of [vehicles.van,motorcycleSetup]){
  const car=Object.assign(newDrive(setup,setup),{x:-110.5,z:51.7,heading:-Math.PI/2})
  for(let i=0;i<1200&&car.x>-127;i++)stepDrive(car,{forward:1,back:0,steer:0},boxes,1/60,[],true)
  assert(car.x<=-127&&clearPose(car,boxes,true,true),setup.name+' reached the garage')
 }
})

test('the south approach carries a car and bike into the new blocks with no seam impact',()=>{
 for(const setup of [vehicles.touring,motorcycleSetup]){
  const car=Object.assign(newDrive(setup,setup),{x:0,z:79,heading:Math.PI})
  for(let i=0;i<1500&&car.z<170;i++){
   stepDrive(car,{forward:car.speed<7?1:0,steer:0,back:0},boxes,1/60,[],true)
   assert.equal(car.impact,0)
   assert(clearPose(car,boxes,true,true))
  }
  assert(car.z>=170)
 }
})

test('the generated South Basin lane allows two civilian cars to run multiple turns without overlap',()=>{
 const layout=basinCarLayout(),player={x:5,z:154}
 const rigs=Array.from({length:2},()=>({...vehicles.sport,setup:vehicles.sport,root:new Group(),updatePose(){}}))
 const traffic=[]
 const ai=civilianTraffic(new Scene(),boxes,traffic,rigs,{entries:layout.entries,nextNode:layout.next,junction:null})
 const spans=new Map()
 for(let i=0;i<5400;i++){
  ai.update(1/60,player,{enabled:true,walkers:[]})
  for(const car of traffic){
   const previous=spans.get(car)??{x:car.x,z:car.z,metres:0}
   spans.set(car,{x:car.x,z:car.z,metres:previous.metres+Math.hypot(car.x-previous.x,car.z-previous.z)})
   assert(clearPose(car,boxes))
  }
  if(traffic.length===2)assert(!overlapsCar(traffic[0],traffic[1]))
 }
 assert.equal(traffic.length,2)
 assert([...spans.values()].every(v=>v.metres>220),JSON.stringify([...spans.values()]))
})

test('basin scenery streams out with its GPU geometry while roads and colliders stay available',async()=>{
 const starting=boxes.length,near={x:0,z:152},far={x:0,z:-110}
 updateBasin(far)
 assert(!scene.getObjectByName('South Basin foliage and planters'))
 // A fast northbound-to-southbound approach loads the detail ahead of the car.
 const approach={x:0,z:8}
 updateBasin(approach,28,Math.PI)
 for(let i=0;i<30&&!scene.getObjectByName('South Basin foliage and planters');i++){
  await new Promise(resolve=>setTimeout(resolve,3));updateBasin(approach,28,Math.PI)
 }
 const detail=scene.getObjectByName('South Basin foliage and planters')
 assert(detail)
 updateBasin(near)
 let freed=false
 detail.children[0].geometry.addEventListener('dispose',()=>{freed=true})
 assert(updateBasin(far))
 assert(freed&&!detail.parent)
 assert.equal(boxes.length,starting)
 assert(canWalk(0,173,boxes))
})

test('the unmarked signal plate can be found and reached from the public garden path',()=>{
 const spot=citySpots.find(s=>s.type==='discovery'),pos={x:spot.x,y:.083,z:spot.z-1.1}
 assert(!sights.some(s=>s.x===spot.x&&s.z===spot.z))
 assert(canWalk(pos.x,pos.z,boxes))
 const visible=()=>cameraFraction({...pos,y:pos.y+1.36},{x:spot.x,y:spot.targetY,z:spot.z},boxes)>.84
 assert.equal(nearbyAction([spot],pos,Math.PI,visible),spot)
})
