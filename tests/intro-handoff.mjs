import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {runInNewContext} from 'node:vm'
import {setImmediate} from 'node:timers/promises'
import {test} from 'node:test'

const source=await readFile(new URL('../src/cinematic-intro.js',import.meta.url),'utf8')
function boot({stored=false,discarded=false,hidden=true}={}){
 const elements=new Map(),globalEvents=new Map(),visibility=[]
 let playing=0,ready,started=0,initializations=0
 const record=new Map(stored?[['harborline.introSeen.v1','1']]:[])
 function element(querySelector){
  return {classList:{add(){},remove(){},toggle(){}},listeners:{},querySelector,contains(){return false},
   addEventListener(type,fn){this.listeners[type]=fn},focus(){},pause(){},load(){},
   play(){playing++;return Promise.resolve()},getAttribute(){},removeAttribute(){},remove(){this.removed=true},
   cloneNode(){const children=new Map();return element(id=>{
    if(!children.has(id))children.set(id,element(()=>null))
    return children.get(id)
   })}
  }
 }
 const get=id=>{
  if(!elements.has(id))elements.set(id,element(get))
  return elements.get(id)
 }
 const game=get('#game')
 game.inert=true;game.before=node=>{game.replay=node}
 const doc={hidden,wasDiscarded:discarded,querySelector:get,
  addEventListener(type,fn,{signal}){if(type==='visibilitychange')visibility.push({fn,signal})}}
 const mainModule=new Promise(resolve=>{ready=()=>resolve({start:()=>{initializations++;return ()=>{started++}}})})
 runInNewContext(source.replace(/^import .*?\n/,'').replace("import('./main.js')",'mainModule'),{
  document:doc,window:{addEventListener:(type,fn)=>globalEvents.set(type,fn),
   localStorage:{getItem:key=>record.get(key),setItem:(key,value)=>record.set(key,value)}},
  AbortController,mainModule,requestAnimationFrame(){},
  setTimeout:()=>0,clearTimeout(){},console
 })
 const tapSkip=node=>node.listeners.click({target:{closest:selector=>selector==='#intro-skip'}})
 return {ready,game,intro:get('#cinematic-intro'),status:get('#status'),started:()=>started,playing:()=>playing,
  inits:()=>initializations,record,replay:()=>globalEvents.get('harborline:replay-intro')(),tapSkip,
  visible(value){doc.hidden=!value;for(const {fn,signal} of visibility)if(!signal.aborted)fn()}}
}

test('a skipped intro starts the game once on the first ready frame',async()=>{
 const app=boot()
 app.tapSkip(app.intro)
 app.tapSkip(app.intro)
 await setImmediate()
 assert(app.game.inert)
 assert.equal(app.started(),0)
 app.ready()
 await setImmediate()
 assert.equal(app.started(),1)
 assert.equal(app.inits(),1)
 assert.equal(app.game.inert,false)
 assert.equal(app.status.hidden,true)
 assert.equal(app.intro.removed,true)
})
test('backgrounding during playback hands off once, and replay does not reset the game',async()=>{
 const app=boot({hidden:false})
 assert.equal(app.playing(),1)
 app.visible(false)
 app.ready()
 await setImmediate()
 app.visible(true)
 assert.equal(app.playing(),1)
 assert.equal(app.record.get('harborline.introSeen.v1'),'1')
 app.replay()
 assert.equal(app.playing(),2)
 assert(app.game.inert)
 app.replay()
 assert.equal(app.playing(),2)
 app.tapSkip(app.game.replay)
 assert.equal(app.game.inert,false)
 assert.equal(app.started(),1)
 assert.equal(app.inits(),1)
})
test('repeat launches and browser-discarded pages boot without playing the video',async()=>{
 for(const options of [{stored:true},{discarded:true}]){
  const app=boot({...options,hidden:false})
  app.ready()
  await setImmediate()
  assert.equal(app.playing(),0)
  assert.equal(app.started(),1)
 }
})
