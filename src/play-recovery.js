import {resolveCheckpoint} from './play-checkpoint.js'

export function recoveryPosition(current,saved,fallbacks,floorAt,clear){
 const valid=point=>point&&[point.x,point.y,point.z].every(Number.isFinite)
 const origin=valid(current)?current:valid(saved)?saved:null
 return resolveCheckpoint(origin,[...(valid(saved)?[saved]:[]),...fallbacks],floorAt,clear)
}

export function clearStuckMotion(fighter){
 if(!fighter.hp)return
 Object.assign(fighter,{action:'',elapsed:0,duration:0,recovery:0,queued:false,motion:null,reaction:null})
}
