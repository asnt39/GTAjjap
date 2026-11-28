const validTracking=tracking=>typeof tracking?.missionId==='string'&&tracking.missionId.length>0&&
 Number.isSafeInteger(tracking.step)&&tracking.step>=0
const matches=(entry,tracking)=>!!entry&&validTracking(tracking)&&
 entry.missionId===tracking.missionId&&entry.step===tracking.step

// This checkpoint belongs to the current session. Episode progress and rewards
// are still governed by the existing save and mission transitions.
export function createMissionCheckpoint(){
 let entry=null
 return {
  capture(tracking,sample){
   if(matches(entry,tracking))return false
   entry=null
   if(!validTracking(tracking))return false
   const snapshot=sample()
   if(snapshot==null)return false
   entry={missionId:tracking.missionId,step:tracking.step,snapshot:structuredClone(snapshot)}
   return true
  },
  current:tracking=>matches(entry,tracking)?structuredClone(entry.snapshot):null,
  restore(tracking,prepare){
   if(!matches(entry,tracking))return false
   const apply=prepare(structuredClone(entry.snapshot))
   if(typeof apply!=='function')return false
   apply()
   return true
  },
  clear(){entry=null}
 }
}

export function missionActorSnapshot(actor){
 const {id,joined,pos,face,speed,stepping,f}=actor
 return {id,joined,pos:pos.toArray(),face,speed,stepping,
  fighter:structuredClone({...f,previousHand:f.previousHand.toArray()})}
}

export function restoreMissionActor(actor,snapshot,scene,residents,pose){
 const {pos,joined,face,speed,stepping,fighter}=snapshot
 const {previousHand,...combat}=structuredClone(fighter)
 Object.assign(actor.f,combat)
 actor.f.previousHand.fromArray(previousHand)
 actor.pos.fromArray(pos)
 Object.assign(actor,{joined,face,speed,stepping})
 actor.rig.root.position.copy(actor.pos)
 actor.rig.root.rotation.y=face
 actor.rig.clearImpacts?.()
 actor.rig.clearImpacts?.()
 actor.rig.update(0,stepping,pose(actor.f))
 actor.outline?.show(false)
 const index=residents.indexOf(actor)
 if(joined){
  if(actor.rig.root.parent!==scene)scene.add(actor.rig.root)
  if(index===-1)residents.push(actor)
 }else{
  actor.rig.root.removeFromParent()
  if(index!==-1)residents.splice(index,1)
 }
}

const driveFields=['x','z','heading','speed','throttle','steer','remainder','shiftDelay','braking','accel','impact',
 'lift','curbLift','roadLift','roadPitch','roadRoll','slip','travel','dents']

export function missionVehicleSnapshot(car){
 return Object.fromEntries(driveFields.map(field=>[field,structuredClone(car[field])]))
}

export function restoreMissionVehicle(car,snapshot){
 Object.assign(car,structuredClone(snapshot),{collision:null,hardContact:null})
}
