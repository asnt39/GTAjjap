import {inBunker} from './basin-skyline-plan.js'

export const PLAY_CHECKPOINT_KEY='harborline.lastPosition.v1'
const fields=['x','y','z','face','yaw','pitch','distance']

export function isCheckpointPosition(snapshot){
 return !!snapshot&&fields.every(field=>Number.isFinite(snapshot[field]))&&
  Math.abs(snapshot.x)<2048&&Math.abs(snapshot.z)<2048&&
  (snapshot.y>=-.1&&snapshot.y<32||inBunker(snapshot.x,snapshot.z,snapshot.y))&&
  snapshot.pitch>=-.19&&snapshot.pitch<=.93&&snapshot.distance>=2.3&&snapshot.distance<=7.4
}

export function createCheckpoint(storage,{onSave}={}){
 let encoded=null,checkpoint,vehiclePoses={}
 try{
  encoded=storage?.getItem(PLAY_CHECKPOINT_KEY)??null
  const loaded=JSON.parse(encoded??'null')
  if(isCheckpointPosition(loaded)){
   checkpoint=Object.fromEntries(fields.map(field=>[field,loaded[field]]))
   if(loaded.vehicles&&typeof loaded.vehicles==='object'&&!Array.isArray(loaded.vehicles))vehiclePoses=loaded.vehicles
  }
 }catch{}
 return {
  get current(){return checkpoint},
  get vehicles(){return vehiclePoses},
  sampleVehicles(poses,offline){
   if(offline)vehiclePoses=poses
  },
  sample(point,{offline,grounded,safe}){
   if(!offline||!grounded||!safe||!isCheckpointPosition(point))return false
   checkpoint=Object.fromEntries(fields.map(field=>[field,point[field]]))
   return true
  },
  flush(){
   if(!checkpoint||!storage)return false
   try{
    if((storage.getItem(PLAY_CHECKPOINT_KEY)??null)!==encoded)return false
    const next=JSON.stringify({...checkpoint,vehicles:vehiclePoses})
    if(next===encoded)return true
    storage.setItem(PLAY_CHECKPOINT_KEY,next)
    encoded=next
   }catch{return false}
   try{onSave?.()}catch{}
   return true
  }
 }
}

export function resolveCheckpoint(saved,fallbacks,floorAt,clear){
 function candidate(x,z,feet,maxDrop=Infinity){
  const y=floorAt(x,z,feet)
  if(Number.isFinite(y)&&Math.abs(y-feet)<=maxDrop&&clear(x,z,y))return {x,y,z}
 }
 if(saved){
  const exact=candidate(saved.x,saved.z,saved.y,.30)
  if(exact)return exact
  // Search small, increasing steps and first keep the previously occupied floor.
  for(const tolerance of [.35,Infinity]){
   for(let radius=.4;radius<=6.01;radius+=.4){
    for(let i=0;i<16;i++){
     const angle=i*Math.PI/8
     const nearby=candidate(saved.x+radius*Math.cos(angle),saved.z+radius*Math.sin(angle),saved.y,tolerance)
     if(nearby)return nearby
    }
   }
  }
 }
 for(const point of fallbacks){
  const ground=candidate(point.x,point.z,point.y??0)
  if(ground)return ground
 }
}
