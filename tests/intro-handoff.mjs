import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {runInNewContext} from 'node:vm'
import {setImmediate} from 'node:timers/promises'
import {test} from 'node:test'

const source=await readFile(new URL('../src/cinematic-intro.js',import.meta.url),'utf8')
function boot({stored=false,discarded=false,hidden=true,preview=false,blockUnmuted=false}={}){
 const elements=new Map(),globalEvents=new Map(),visibility=[]
 const updateLifecycle=[]
 let playing=0,ready,started=0,initializations=0
 const record=new Map(stored?[['harborline.introSeen.v1','1']]:[])
 function element(querySelector){
  return {classList:{add(){},remove(){},toggle(name,active){this[name]=active}},listeners:{},querySelector,contains(){return false},
   addEventListener(type,fn){this.listeners[type]=fn},focus(){},pause(){},load(){},
   play(){playing++;return blockUnmuted&&playing===1?Promise.reject({name:'NotAllowedError'}):Promise.resolve()},getAttribute(){},removeAttribute(){},remove(){this.removed=true},
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
 const mainModule=new Promise(resolve=>{ready=()=>resolve({start:()=>{initializations++;return ()=>{started++;updateLifecycle.push('game')}}})})
 runInNewContext(source.replace(/^import .*?\n/gm,'').replace("import('./main.js')",'mainModule'),{
  document:doc,window:{addEventListener:(type,fn)=>globalEvents.set(type,fn),
   harborPreviewAssets:preview?{}:undefined,
   localStorage:{getItem:key=>record.get(key),setItem:(key,value)=>record.set(key,value)}},
  appUpdates:{start:()=>updateLifecycle.push('monitor'),enterGame:()=>updateLifecycle.push('enter')},
  AbortController,mainModule,requestAnimationFrame(){},
  setTimeout:()=>0,clearTimeout(){},console
 })
 const end=node=>node.querySelector('video').listeners.ended()
 return {ready,game,intro:get('#cinematic-intro'),status:get('#status'),started:()=>started,playing:()=>playing,
  inits:()=>initializations,replay:()=>globalEvents.get('harborline:replay-intro')(),end,updateLifecycle,
  visible(value){doc.hidden=!value;for(const {fn,signal} of visibility)if(!signal.aborted)fn()}}
}

test('the video ends before gameplay starts, and boot runs once',async()=>{
 const app=boot({hidden:false})
 assert.equal(app.playing(),1)
 assert.equal(typeof app.intro.listeners.click,'function')
 app.end(app.intro)
 app.end(app.intro)
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
 assert.deepEqual(app.updateLifecycle,['monitor','enter','game'])
})

test('asset previews use the same intro handoff without starting release monitoring',async()=>{
 const app=boot({hidden:false,preview:true})
 app.ready()
 app.end(app.intro)
 await setImmediate()
 assert.deepEqual(app.updateLifecycle,['enter','game'])
})
test('backgrounding pauses the video and replay does not reset the game',async()=>{
 const app=boot({hidden:false})
 app.visible(false)
 app.ready()
 await setImmediate()
 app.visible(true)
 assert(app.game.inert)
 assert.equal(app.playing(),1)
 app.intro.querySelector('#intro-retry').listeners.click()
 assert.equal(app.playing(),2)
 app.end(app.intro)
 await setImmediate()
 assert.equal(app.started(),1)
 app.visible(false)
 app.visible(true)
 assert.equal(app.playing(),2)
 app.replay()
 assert.equal(app.playing(),3)
 assert(app.game.inert)
 app.replay()
 assert.equal(app.playing(),3)
 app.end(app.game.replay)
 assert.equal(app.game.inert,false)
 assert.equal(app.started(),1)
 assert.equal(app.inits(),1)
})
test('new pages play the video even with the old seen flag or a browser discard',async()=>{
 for(const options of [{stored:true},{discarded:true}]){
  const app=boot({...options,hidden:false})
  app.ready()
  await setImmediate()
  assert.equal(app.playing(),1)
  assert.equal(app.started(),0)
  app.end(app.intro)
  await setImmediate()
  assert.equal(app.started(),1)
 }
})


test('clicking the intro hands off to the game',async()=>{
 const app=boot({stored:true,hidden:false})
 app.ready()
 await setImmediate()
 assert.equal(app.playing(),1)
 assert.equal(app.started(),0)
 assert.equal(typeof app.intro.listeners.click,'function')
 app.intro.listeners.click()
 await setImmediate()
 assert.equal(app.started(),1)
 assert.equal(app.game.inert,false)
})

test('the corner wordmark appears after the preserved opening animation',()=>{
 const app=boot({hidden:false}),video=app.intro.querySelector('video')
 video.currentTime=7
 video.listeners.timeupdate()
 assert.equal(app.intro.classList['corner-logo'],false)
 video.currentTime=8.2
 video.listeners.timeupdate()
 assert.equal(app.intro.classList['corner-logo'],true)
})

test('autoplay requests sound first and the first pointer input unmutes a browser fallback',async()=>{
 const app=boot({hidden:false,blockUnmuted:true}),video=app.intro.querySelector('video')
 assert.equal(video.muted,false)
 await setImmediate()
 assert.equal(video.muted,true)
 app.intro.listeners.pointerdown()
 assert.equal(video.muted,false)
})
