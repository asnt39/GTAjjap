import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createEpisode,EPISODE_SAVE_KEY} from '../src/episode.js'
import {createLoadout} from '../src/equipment.js'
import {createMissionCheckpoint,missionVehicleSnapshot,restoreMissionVehicle} from '../src/mission-checkpoint.js'

const active={missionId:'first-deal',step:3}
const memory=record=>{
 const values=new Map([[EPISODE_SAVE_KEY,JSON.stringify(record)]])
 return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),values}
}

test('a mission step samples one isolated in-memory checkpoint when all domains are ready',()=>{
 const checkpoint=createMissionCheckpoint(),sample={player:{hp:82,x:15,z:-38},world:{manifestTaken:true}}
 assert.equal(checkpoint.capture(active,()=>null),false)
 assert.equal(checkpoint.capture(active,()=>sample),true)
 assert.equal(checkpoint.capture(active,()=>assert.fail('an existing checkpoint must not move')),false)
 sample.player.hp=0
 const read=checkpoint.current(active)
 read.world.manifestTaken=false
 assert.deepEqual(checkpoint.current(active),{player:{hp:82,x:15,z:-38},world:{manifestTaken:true}})
 assert.equal(checkpoint.restore({...active,step:2},()=>assert.fail('mismatched step')),false)
 assert.equal(checkpoint.restore({...active,missionId:'payback'},()=>assert.fail('mismatched mission')),false)
 assert.equal(checkpoint.restore(null,()=>assert.fail('inactive mission')),false)
 assert.equal(checkpoint.restore(active,()=>null),false)
 let result
 assert.equal(checkpoint.restore(active,entry=>()=>{result=entry}),true)
 assert.equal(result.player.hp,82)
 checkpoint.clear()
 assert.equal(checkpoint.current(active),null)
})

test('failed validation leaves all domains in place and valid retries restore quantities without reversing purchases or rewards',()=>{
 const storage=memory({version:1,index:0,money:12000,bank:2000,inventory:{bandage:2},
  wrongDeal:{mission:0,step:3,status:'active'},equipment:{selected:'shotgun',
   items:{pistol:{mag:3,reserve:6},shotgun:{mag:4,reserve:4},grenade:{mag:0,reserve:2}}}})
 const episode=createEpisode({storage,mainStory:true}),loadout=createLoadout(storage,episode)
 const checkpoint=createMissionCheckpoint(),car={x:0,z:-22,heading:Math.PI,speed:2,dents:{front:{depth:.04}}}
 loadout.missionLoan(true)
 assert(loadout.use())
 checkpoint.capture(episode.tracking(),()=>({equipment:loadout.missionSnapshot(),vehicle:missionVehicleSnapshot(car)}))
 assert(loadout.buy('sniper','weapon').ok)
 assert(loadout.buy('sniper','ammo').ok)
 assert(episode.transfer(1000).ok)
 assert(episode.use('bandage',{hp:75,maxHealth:100}).ok)
 loadout.tick(.4);assert(loadout.use())
 assert(loadout.select('grenade'));loadout.tick(.4);assert(loadout.use())
 car.x=2;car.dents.front.depth=.26;car.collision={}
 const prepare=valid=>entry=>{
  const equipment=loadout.planMissionRestore(entry.equipment)
  if(!equipment||!valid)return null
  return ()=>{equipment();restoreMissionVehicle(car,entry.vehicle)}
 }
 assert.equal(checkpoint.restore(episode.tracking(),prepare(false)),false)
 assert.equal(car.x,2)
 assert.equal(loadout.items.pistol.mag,6)
 assert.equal(loadout.items.grenade.reserve,1)
 const money=episode.snapshot().money
 for(let attempt=0;attempt<3;attempt++){
  assert(checkpoint.restore(episode.tracking(),prepare(true)))
  assert.equal(car.x,0);assert.equal(car.dents.front.depth,.04);assert.equal(car.collision,null)
  assert.equal(loadout.selected,'pistol');assert.equal(loadout.item.mag,7)
  assert.equal(loadout.items.grenade.reserve,2)
  assert.deepEqual(loadout.items.sniper,{mag:0,reserve:3})
  assert.equal(episode.snapshot().money,money);assert.equal(episode.snapshot().bank,3000)
  assert.equal(episode.snapshot().items.find(item=>item.id==='bandage').count,1)
  assert(loadout.use())
 }
 assert.deepEqual(Object.keys(JSON.parse(storage.getItem(EPISODE_SAVE_KEY)).equipment.items),['fists','pistol','shotgun','grenade','sniper'])
 assert(loadout.missionLoan(false));assert.equal(loadout.selected,'shotgun')
 assert.deepEqual(loadout.items.pistol,{mag:3,reserve:6})
 const exit={x:0,z:-14,driving:true,speed:12}
 assert(episode.prologue.update(exit).ok)
 assert.equal(checkpoint.restore(episode.tracking(),prepare(true)),false)
 assert.equal(episode.prologue.update(exit),null)
 assert.equal(episode.snapshot().money,money+2600)
 assert.deepEqual([...storage.values.keys()],[EPISODE_SAVE_KEY])
})
