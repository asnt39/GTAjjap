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
