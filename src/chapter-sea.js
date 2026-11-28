import {boatPoseClear,driveBoat,steerTo} from './coastal-motion.js'

export const cargoLaunch={
 id:'chapter-cargo-launch',name:'Cargo Tender',x:111.8,z:138.2,heading:Math.PI*.67,length:5.25,width:1.86,top:10.1,
 power:3.85,draft:.38,turn:1.14,color:0x354854,missionOnly:true,storyLocked:true
}
export const cargoRoute=[{x:132,z:155.8},{x:129,z:173.1},{x:109.5,z:178.9},{x:109.3,z:183.3},{x:118.6,z:186.45}]
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n))

export function pursueCargoBoat(target,index,player,boats,dt){
 const waypoint=cargoRoute[index]
 if(!waypoint){driveBoat(target,{forward:0,back:0,steer:0,brake:true},dt,boats);return index}
 const gap=Math.hypot(waypoint.x-target.x,waypoint.z-target.z)
 const last=index===cargoRoute.length-1
 if(gap<(last?1.08:index===2?2.15:index===3?4.35:3.1)){
  if(!last||Math.abs(target.speed)<.7)return index+1
  driveBoat(target,{forward:0,back:0,steer:0,brake:true},dt,boats);return index
 }
 const desired=Math.atan2(waypoint.x-target.x,target.z-waypoint.z)
 const safe=[0,.34,-.34,.77,-.77,1.25,-1.25]
 const heading=safe.map(offset=>desired+offset).find(candidate=>{
  const metre=last?1.55:Math.min(4.4,gap)
  return boatPoseClear({...target,x:target.x+Math.sin(candidate)*metre,z:target.z-Math.cos(candidate)*metre,heading:candidate},
   boats.filter(boat=>boat!==target))
 })??desired
 const steering=steerTo(target.heading,heading),foe=player&&Math.hypot(target.x-player.x,target.z-player.z)<17
 const cap=last?1.85:Math.abs(steering)>.43?2.7:gap<7?3.8:foe?9:7.1
 const brake=target.speed>cap&&(last||gap<7||Math.abs(steering)>.6)
 const reverse=target.hit>0&&target.speed===0
 const forward=target.speed<cap&&!reverse?1:0
 if(reverse)target.speed=-.65
 driveBoat(target,{forward,back:reverse?.65:0,steer:clamp(steering*1.9,-1,1),brake},dt,boats)
 return index
}

export const quaySkiff={
 id:'chapter-quay-skiff',name:'Quay Skiff',x:117.3,z:194.8,heading:-Math.PI/2,length:4.7,width:1.65,top:10.7,
 power:3.3,draft:.40,turn:1.09,color:0x6b7964,missionOnly:true
}
