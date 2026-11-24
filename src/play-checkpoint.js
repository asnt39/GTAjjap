const key='harborline.lastPosition.v1'
const fields=['x','y','z','face','yaw','pitch','distance']

function valid(snapshot){
 return snapshot&&fields.every(field=>Number.isFinite(snapshot[field]))&&
  Math.abs(snapshot.x)<2048&&Math.abs(snapshot.z)<2048&&snapshot.y>=-.1&&snapshot.y<32&&
  snapshot.pitch>=-.19&&snapshot.pitch<=.93&&snapshot.distance>=2.3&&snapshot.distance<=7.4
}

export function createCheckpoint(storage){
 let encoded,checkpoint,vehiclePoses={}
 try{
  encoded=storage?.getItem(key)
  const loaded=JSON.parse(encoded??'null')
  if(valid(loaded)){
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
   if(offline&&grounded&&safe&&valid(point)){
    checkpoint=Object.fromEntries(fields.map(field=>[field,point[field]]))
   }
  },
  flush(){
   if(!checkpoint)return
   const next=JSON.stringify({...checkpoint,vehicles:vehiclePoses})
   if(next===encoded)return
   try{storage?.setItem(key,next);encoded=next}catch{}
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
  const ground=candidate(point.x,point.z,0)
  if(ground)return ground
 }
}
