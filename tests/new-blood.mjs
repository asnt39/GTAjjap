import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createEpisode} from '../src/episode.js'
import {clubPlan} from '../src/new-blood-club-plan.js'
import {extraction} from '../src/prologue-plan.js'

const key='harborline.episode.v1'
const jack={id:'courier',name:'Jack Bennett'}
const finishedPrologue={mission:2,step:0,status:'complete',reason:''}
const legacy={version:1,index:0,money:9300,bank:4700,inventory:{bandage:2},
 equipment:{selected:'pistol',items:{pistol:{mag:3,reserve:11}}},wrongDeal:finishedPrologue}
function store(saved){
 let value=JSON.stringify(saved)
 return {getItem:()=>value,setItem:(name,data)=>{assert.equal(name,key);value=data}}
}
const session=(storage,available=()=>true)=>createEpisode({storage,mainStory:true,chapterOne:clubPlan,canStartOpening:available})

test('Jack offers New Blood after the completed prologue only in an available solo session',()=>{
 let offline=false
 const episode=session(store(legacy),()=>offline)
 assert(!episode.openingContact())
 assert.deepEqual(episode.choices(jack),[])
 offline=true
 assert.equal(episode.openingContact().residentId,'courier')
 assert.equal(episode.openingContact().jobTitle,'불청객')
 assert(episode.interact({resident:jack,choice:'new-blood-start'}).ok)
 assert.equal(episode.chapter.stage.set,'entry')
 assert.equal(episode.tracking().missionId,'uninvited-guests')
 assert(!episode.switchJournal().ok)
 const earlier=session(store({...legacy,wrongDeal:{mission:2,step:2,status:'active'}}))
 assert.equal(earlier.chapter,null)
 assert.equal(earlier.tracking().missionId,'payback')
})

test('Theo arriving at the extraction unlocks Jack’s invitation in the same session',()=>{
 const storage=store({...legacy,wrongDeal:{mission:2,step:3,status:'active'}})
 const episode=session(storage)
 assert(!episode.chapter)
 assert(episode.prologue.update({...extraction,onFoot:true,rescued:true}).ok)
 assert(episode.chapter)
 assert.equal(episode.openingContact().jobTitle,'불청객')
 assert(episode.snapshot().storyCompleted.includes('payback'))
 assert.equal(episode.snapshot().status,'available')
})

test('club objectives persist through failure and retry and award once without rewriting previous progress',()=>{
 const storage=store(legacy),episode=session(storage)
 assert(episode.interact({resident:jack,choice:'new-blood-start'}).ok)
 const story=episode.chapter
 assert.equal(story.update({cleared:true}),null)
 assert(story.update({arrived:true}).ok)
 assert(story.update({met:true}).ok)
 assert(story.update({cleared:true}).ok)
 assert.equal(story.stage.set,'evacuation')
 assert(episode.fail('Victor를 보호하지 못했습니다.').ok)
 const restored=session(storage)
 assert.equal(restored.snapshot().status,'failed')
 assert(restored.retry().ok)
 assert.equal(restored.chapter.stage.set,'evacuation')
 assert(restored.chapter.checkpoint)
 assert.equal(restored.chapter.update({cleared:true}),null)
 assert(restored.chapter.update({escaped:true}).ok)
 const stale=session(storage)
 assert(restored.chapter.update({cleared:true}).ok)
 assert(!stale.chapter.update({cleared:true}).ok)
 const saved=JSON.parse(storage.getItem(key))
 assert(saved.money>legacy.money)
 assert.equal(saved.bank,legacy.bank)
 assert.equal(saved.inventory.bandage,2)
 assert.deepEqual(saved.equipment,legacy.equipment)
 assert.deepEqual(saved.wrongDeal,finishedPrologue)
 assert.equal(session(storage).snapshot().status,'complete')
 assert(session(storage).snapshot().storyCompleted.includes('uninvited-guests'))
 assert.match(session(storage).storyComment(jack),/Victor/)
 assert.equal(session(storage).storyComment({id:'merchant'}),null)
})
