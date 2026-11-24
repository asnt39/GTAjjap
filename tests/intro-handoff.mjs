import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {runInNewContext} from 'node:vm'
import {setImmediate} from 'node:timers/promises'
import {test} from 'node:test'

const source=await readFile(new URL('../src/cinematic-intro.js',import.meta.url),'utf8')
function boot(){
 const elements=new Map()
 const get=id=>{
  if(!elements.has(id))elements.set(id,{
   classList:{add(){},remove(){},toggle(){}},listeners:{},querySelector:get,
   addEventListener(type,fn){this.listeners[type]=fn},focus(){},pause(){},load(){},
   getAttribute(){},removeAttribute(){},remove(){this.removed=true}
  })
  return elements.get(id)
 }
 let ready,started=0
 const game=get('#game')
 game.inert=true
 const mainModule=new Promise(resolve=>{ready=()=>resolve({start:()=>()=>{started++}})})
 runInNewContext(source.replace("import('./main.js')",'mainModule'),{
  document:{hidden:true,querySelector:get,addEventListener(){}},window:{addEventListener(){}},
  AbortController,mainModule,requestAnimationFrame(){},matchMedia:()=>({matches:false}),
  setTimeout:()=>0,clearTimeout(){},console
 })
 return {ready,game,intro:get('#cinematic-intro'),status:get('#status'),started:()=>started,
  skip:()=>get('#cinematic-intro').listeners.click({target:{closest:selector=>selector==='#intro-skip'}})}
}

test('a skipped intro starts immediately on the first ready frame',async()=>{
 const app=boot()
 app.skip()
 await setImmediate()
 assert(app.game.inert)
 assert.equal(app.started(),0)
 app.ready()
 await setImmediate()
 assert.equal(app.started(),1)
 assert.equal(app.game.inert,false)
 assert.equal(app.status.hidden,true)
 assert.equal(app.intro.removed,true)
})
