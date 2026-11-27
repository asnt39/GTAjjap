import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createEpisode} from '../src/episode.js'
import {createLoadout} from '../src/equipment.js'
import {wrongDeal} from '../src/prologue.js'
import {detention,extraction,safeHouse,transferFoot,transferYard,worksBay} from '../src/prologue-plan.js'
import {policeRoute,pursuitRoadNetwork} from '../src/police-road.js'

const jack={id:'courier'}
const key='harborline.episode.v1'
const memory=source=>{
 const values=new Map(source?[[key,JSON.stringify(source)]]:[])
 return {getItem:key=>values.get(key)??null,setItem:(key,val)=>values.set(key,val)}
}

test('the three missions advance through driving, gunfights, pursuit and escort without enabling legacy jobs',()=>{
 const old={version:1,index:1,step:1,status:'active',money:8100,bank:4250,inventory:{bandage:2},
  equipment:{items:{pistol:{mag:3,reserve:11}},selected:'pistol'},firstJob:{status:'complete'}}
 const record=memory(old)
 let offline=true
 const episode=createEpisode({storage:record,mainStory:true,canStartOpening:()=>offline})
 assert.equal(episode.openingContact().resident,'Jack Bennett')
 assert.equal(episode.openingContact().label,'Jack')
 assert.match(episode.snapshot().objective,/^Jack과 /)
 assert.deepEqual(episode.choices(jack).map(x=>x.id),['wrong-deal-start'])
 assert(episode.interact({resident:jack,choice:'wrong-deal-start'}).ok)
 const story=episode.prologue
 assert(!story.update({...transferYard,driving:false}))
 assert(!story.update({...transferYard,driving:true,speed:5}))
 assert(story.update({...transferYard,driving:true,speed:.2}).ok)
 assert(story.update({...transferFoot,onFoot:true}).ok)
 assert(!story.update({cleared:false}))
 assert(story.update({cleared:true}).ok)
 assert(story.update({x:0,z:-14,speed:12,driving:true}).ok)
 assert.equal(episode.snapshot().missionId,'on-our-tail')
 assert(!story.update({evaded:false}))
 assert(story.update({evaded:true}).ok)
 assert(story.update({...safeHouse,driving:true,speed:0}).ok)
 assert.equal(episode.snapshot().missionId,'payback')
 assert(story.update({...worksBay,onFoot:true}).ok)
 assert(!episode.switchJournal().ok)
 assert(episode.fail('테스트용 실패').ok)
 offline=false
 assert(!episode.retry().ok)
 offline=true
 assert(episode.retry().ok)
 assert(story.checkpoint)
 assert(story.update({cleared:true}).ok)
 assert.equal(episode.tracking().goal.label,'Theo')
 assert.equal(episode.tracking().objective,'Theo 구출')
 assert.equal(story.rescue({...detention,y:2}),null)
 assert(story.rescue({...detention,y:.083}).ok)
 assert(!story.update({...extraction,onFoot:true,rescued:false}))
 assert(story.update({...extraction,onFoot:true,rescued:true}).ok)
 assert(!story.update({...extraction,onFoot:true,rescued:true}))
 const resumed=createEpisode({storage:record,mainStory:true})
 const saved=JSON.parse(record.getItem(key))
 assert.deepEqual(resumed.snapshot().storyCompleted,['first-work',...wrongDeal.map(m=>m.id)])
 assert.equal(resumed.snapshot().status,'complete')
 assert.equal(saved.money,old.money+wrongDeal.reduce((sum,m)=>sum+m.reward,0))
 for(const name of ['index','step','status','bank','equipment'])assert.deepEqual(saved[name],old[name])
 assert.equal(saved.inventory.bandage,2)
 assert(resumed.switchJournal().ok)
 assert.equal(resumed.snapshot().missionId,'radio')
 assert.equal(resumed.snapshot().status,'active')
})

test('a concurrently loaded session cannot duplicate a chapter reward',()=>{
 const saved={version:1,index:0,money:5100,wrongDeal:{mission:0,step:3,status:'active'}}
 const record=memory(saved)
 const first=createEpisode({storage:record,mainStory:true}), second=createEpisode({storage:record,mainStory:true})
 const nearExit={x:0,z:-14,driving:true,speed:12}
 assert(first.prologue.update(nearExit).ok)
 assert(!second.prologue.update(nearExit).ok)
 assert.equal(JSON.parse(record.getItem(key)).money,7700)
})

test('a mission can use a temporary pistol without changing personal equipment or ammunition',()=>{
 const source={version:1,index:0,equipment:{selected:'fists',items:{pistol:{mag:3,reserve:10}}}}
 const record=memory(source),episode=createEpisode({storage:record}),loadout=createLoadout(record,episode)
 assert(loadout.missionLoan(true))
 assert(loadout.use());assert.equal(loadout.item.mag,7)
 assert(loadout.reload());loadout.tick(2)
 assert.equal(loadout.reserveSpace('pistol'),0)
 assert.equal(JSON.parse(record.getItem(key)).equipment.items.pistol.mag,3)
 assert(loadout.missionLoan(false));assert.equal(loadout.selected,'fists')
 assert.deepEqual(loadout.items.pistol,source.equipment.items.pistol)
 const empty=createLoadout(memory())
 assert(empty.missionLoan(true)&&empty.use())
 empty.missionLoan(false)
 assert(!empty.items.pistol)
})

test('pursuit lanes have continuous routes into multiple districts while police routes keep their boundaries',()=>{
 const network=pursuitRoadNetwork(),start={x:-1.47,z:-63,heading:Math.PI}
 for(const target of [{x:-78,z:-39.74,heading:-Math.PI/2},{x:-70,z:65,heading:Math.PI},{x:-150,z:21.3,heading:-Math.PI/2}]){
  const path=policeRoute(start,target,network)
  assert(path.length>12)
  assert(Math.hypot(path.at(-1).x-target.x,path.at(-1).z-target.z)<8)
  assert(path.slice(1).every((p,i)=>Math.hypot(p.x-path[i].x,p.z-path[i].z)<7))
 }
 assert(policeRoute(start,{x:-150,z:21.3}).every(p=>p.x>=-90))
})
