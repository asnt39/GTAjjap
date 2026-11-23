import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {PerspectiveCamera,Scene,Texture,TextureLoader,Vector3} from 'three'
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'
import {createResidents} from '../src/residents.js'
import {buildStreet} from '../src/street.js'
import {buildOldTown} from '../src/old-town.js'
import {buildWestBank} from '../src/west-bank.js'
import {buildArchitecture} from '../src/architecture.js'
import {stationColliders} from '../src/custody.js'
import {beacons,districtGates} from '../src/atmosphere.js'
import {marketCollision,insidePremises} from '../src/market-plan.js'
import {archive} from '../src/chart-room.js'
import {canWalk} from '../src/navigation.js'
import {walkingGraph,residentRounds} from '../src/resident-routes.js'
import {fighter} from '../src/melee.js'
import {nearBody} from '../src/driving.js'
import {createEpisode} from '../src/episode.js'

globalThis.self=globalThis
const paint=new Proxy({}, {get:()=>()=>paint})
globalThis.document={createElement:()=>({getContext:()=>paint})}
TextureLoader.prototype.load=function(url,cb){const t=new Texture();queueMicrotask(()=>cb(t));return t}
GLTFLoader.prototype.loadAsync=async function(url){
 const b=await readFile(new URL('../public'+url,import.meta.url))
 return this.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')
}
let seed=41
Math.random=()=>((seed=Math.imul(1664525,seed)+1013904223|0)>>>0)/4294967296
const boxes=[],scene=new Scene()
const add=(a,b,c,d,h=3)=>{if(h>.15)boxes.push([Math.min(a,b),Math.max(a,b),Math.min(c,d),Math.max(c,d),h])}
beacons(scene,add);districtGates(scene,add);marketCollision(add);stationColliders(add)
const maps={}
const [,rigs]=await Promise.all([buildArchitecture(scene,add,maps),buildStreet(scene,add,maps)])
buildOldTown(scene,add,boxes,maps);buildWestBank(scene,add,maps)
const fleet=Object.values(rigs).map(rig=>({...rig,speed:0}))
const graph=walkingGraph((a,b)=>{
 const count=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.22)
 for(let i=0;i<=count;i++){
  const t=i/count
  if(!canWalk(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t,boxes,.35))return false
 }
 return true
})
for(const [id,stops] of Object.entries(residentRounds))for(const [index,[stop]] of stops.entries()){
 const [next]=stops[(index+1)%stops.length]
 assert(graph.path(stop,next).length>0,id+' '+stop+' → '+next)
}

const camera=new PerspectiveCamera(60,1.77,.08,420)
camera.position.set(-3,2.5,35);camera.lookAt(-4,1,20);camera.updateMatrixWorld()
const crowd=await createResidents(scene,boxes,fleet[0],fleet)
const player={pos:new Vector3(-3,0,34),available:false,f:fighter(100)}
const citizen=id=>crowd.all.find(n=>n.id===id)
const civilians=crowd.all.filter(n=>!n.officer)
const areas=new Map(),activities=new Map()
const obstruction={x:0,z:30.5,width:2.4,length:4.5,speed:0,heading:0}
let greeting=false
for(let i=0;i<60*142;i++){
 if(i===60*13)fleet.push(obstruction)
 if(i===60*29)fleet.pop()
 if(i===60*68){player.pos.set(-36,0,-42);camera.position.set(-38,2,-41);camera.lookAt(-47,1,-43);camera.updateMatrixWorld()}
 crowd.update(1/60,camera,player,()=>false)
 let paired=0
 for(const [j,n] of civilians.entries()){
  const zone=insidePremises(n.pos.x,n.pos.z)?.id??(n.pos.x<archive.front&&n.pos.x>archive.back&&n.pos.z>archive.north&&n.pos.z<archive.south?'chart-room':n.pos.x<-36?'market':n.pos.x>0?'east':'west')
  if(!areas.has(n.id)){areas.set(n.id,new Set());activities.set(n.id,new Set())}
  areas.get(n.id).add(zone);activities.get(n.id).add(n.activity)
  if(i>=60*13&&i<60*29)assert(!nearBody(obstruction,n.pos.x,n.pos.z,.29))
  if(n.state==='greet')paired++
  for(const other of civilians.slice(j+1))assert(n.pos.distanceTo(other.pos)>.585)
 }
 greeting ||= paired===2
}
assert(areas.get('foreman').has('chart-room'))
assert(activities.get('merchant').has('serve'))
assert(areas.get('courier').has('west')&&areas.get('courier').has('east'))
assert(areas.get('regular').has('market')&&areas.get('regular').has('tide-office'))
assert(areas.get('tide-clerk').has('provisions')&&areas.get('tide-clerk').has('tide-office'))
assert(areas.get('tide-clerk').has('market')&&activities.get('tide-clerk').has('work'))
for(const [id,activity] of [['clock-keeper','check'],['west-courier','deliver'],['foundry-gardener','inspect'],['ferry-keeper','check']]){
 assert(activities.get(id).has(activity),id+' reaches a stop and '+activity)
 assert(canWalk(citizen(id).pos.x,citizen(id).pos.z,boxes),id+' remains on accessible ground')
}
assert(greeting)
const jack=citizen('courier'),episode=createEpisode({storage:null})
assert(episode.choices(jack).some(option=>option.id==='accept'))
crowd.beginTalk(jack)
assert.equal(crowd.dialogue.name,'Jack Bennett')
assert(episode.interact({resident:jack,choice:'accept'}).ok)
crowd.endTalk()
assert.equal(crowd.officers.length,9)
console.log('Cross-district trips, interiors, role stops, greetings, spacing and quest dialogue passed.')
