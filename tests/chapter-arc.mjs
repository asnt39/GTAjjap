import assert from 'node:assert/strict'
import {test} from 'node:test'
import {chapterIds,createChapterArc,readChapterArc} from '../src/chapter-arc.js'

const missions=chapterIds.map((id,index)=>({
 id,title:'Mission '+(index+5),reward:10,contact:{residentId:'contact',label:'Maya'},brief:['Maya','계획'],
 stages:[{event:'pursued',objective:'찾기',line:['Maya','먼저 찾아.']},{event:'reported',objective:'보고',line:['Victor','보고해.']}],
 finish:['Victor','끝났다.']
}))
test('chapter records are independent of Mission 04 and retry preserves the active objective',()=>{
 let saved=readChapterArc(),money=0,failWrite=false
 const make=()=>createChapterArc({saved,missions,available:()=>true,commit(next,reward){
  if(failWrite)return {ok:false}
  saved=next;money+=reward;return {ok:true}
 }})
 let chapter=make()
 assert.equal(chapter.interact({resident:{id:'other'},choice:'chapter-accept'}),null)
 assert(chapter.interact({resident:{id:'contact'},choice:'chapter-accept'}).ok)
 assert.equal(chapter.update({reported:true}),null)
 chapter.update({pursued:true})
 chapter.fail('문 앞에서 보호 대상이 쓰러졌습니다.')
 chapter=make()
 assert.equal(chapter.snapshot().reason,'문 앞에서 보호 대상이 쓰러졌습니다.')
 chapter.retry()
 assert.equal(chapter.tracking().step,1)
 failWrite=true
 assert.equal(chapter.update({reported:true}).ok,false)
 assert.equal(money,0)
 failWrite=false
 chapter.update({reported:true})
 assert.equal(money,10)
 assert.equal(chapter.update({reported:true}),null)
 assert.deepEqual(chapter.snapshot().storyCompleted,[chapterIds[0]])
})

import {createEpisode,EPISODE_SAVE_KEY} from '../src/episode.js'
import {chapterMissions} from '../src/chapter-missions.js'

test('completed Mission 04 saves unlock all four missions and retain the chosen lead on reload',()=>{
 const initial={version:1,index:0,status:'available',money:8000,bank:2500,inventory:{water:3},
  wrongDeal:{mission:2,step:0,status:'complete'},newBlood:{step:0,status:'complete'}}
 for(const lead of ['intercepted','escaped']){
  const records=new Map([[EPISODE_SAVE_KEY,JSON.stringify(initial)]])
  const storage={getItem:key=>records.get(key)??null,setItem:(key,value)=>records.set(key,value)}
  const options={storage,mainStory:true,chapterOne:{},chapterMissions}
  let episode=createEpisode(options)
  for(const job of chapterMissions){
   assert.equal(episode.openingContact().jobTitle,job.title)
   assert.ok(episode.interact({resident:{id:'courier'},choice:'chapter-accept'}).ok)
   for(const stage of job.stages){
    assert.equal(episode.chapter.stage,stage)
    assert.ok(episode.chapter.update({[stage.event]:stage.event==='adrianLead'?lead:true}).ok)
   }
   episode=createEpisode(options)
  }
  const state=episode.snapshot(),saved=JSON.parse(records.get(EPISODE_SAVE_KEY))
  assert.ok(episode.chapter.complete)
  assert.equal(state.lead,lead)
  assert.ok(state.storyCompleted.includes('uninvited-guests'))
  assert.deepEqual(state.storyCompleted.slice(-4),chapterIds)
  assert.equal(saved.money,8000+chapterMissions.reduce((sum,job)=>sum+job.reward,0))
  assert.equal(saved.bank,2500)
  assert.deepEqual(saved.newBlood,{step:0,status:'complete',reason:''})
  assert.equal(episode.chapter.update({reported:true}),null)
  assert.deepEqual(state.journal.at(-1),chapterMissions.at(-1).finish)
 }
})
