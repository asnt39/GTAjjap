import assert from 'node:assert/strict'
import {test} from 'node:test'
import {nearbyAction,cityAction} from '../src/city-actions.js'
import {createEpisode} from '../src/episode.js'
import {dartPower,dartScore} from '../src/darts-round.js'
import {cityAudio,musicCue,readMixer} from '../src/city-audio.js'
import {basinPlate} from '../src/south-basin-plan.js'

test('interaction selects a visible target in reach and respects approach side and floor',()=>{
 const pos={x:0,y:.083,z:0}
 const front={x:0,z:-1},rear={x:0,z:1},above={x:0,z:-.5,floor:2.5}
 assert.equal(nearbyAction([above,rear,front],pos,0,()=>true),front)
 assert.equal(nearbyAction([front],pos,0,()=>false),null)
 assert.equal(nearbyAction([{...front,fromZ:-1}],pos,0,()=>true),null)
})

test('an interrupted action does not charge and a completed one commits only once',()=>{
 let commits=0
 const state=cityAction(),start=pose=>state.begin({pose},()=>commits++)
 assert(start('drink'));assert(!start('eat'))
 state.update(.50);state.leave();state.update(2);assert.equal(commits,0)
 assert(start('eat'));state.update(2);state.update(2);assert.equal(commits,1)
 assert(start('sit'));state.update(1);assert.equal(state.current.weight,1)
 state.leave();state.update(1);assert.equal(state.current,null)
 assert.equal(commits,1)
})

test('cash, purchases and deposits share the episode transaction and survive reload',()=>{
 const data=new Map(),storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)}
 const play=createEpisode({storage})
 const stale=createEpisode({storage})
 assert(play.transfer(500).ok)
 assert(!stale.spend(320).ok)
 assert(!play.transfer(-1000).ok)
 assert(play.spend(320).ok)
 assert(play.buy('bandage').ok)
 const saved=createEpisode({storage})
 assert.equal(saved.snapshot().money,3280)
 assert.equal(saved.snapshot().bank,500)
 assert.equal(saved.snapshot().items.find(item=>item.id==='bandage').count,1)
 assert(saved.transfer(-500).ok)
 assert.equal(saved.snapshot().money,3780)
 assert.equal(saved.snapshot().bank,0)
})

test('dart scoring rewards stopping near the centre and oscillates every 1.8 seconds',()=>{
 assert.equal(dartScore(.61),50)
 assert.equal(dartScore(.70),25)
 assert.equal(dartScore(0),0)
 assert.equal(dartPower(.9),1)
 assert.equal(dartPower(1.8),0)
})

test('the signal plate reward is saved once without overwriting legacy wallet or equipment',()=>{
 const old={version:1,index:0,money:1420,bank:950,equipment:{items:{pistol:{owned:true}}}}
 let data=JSON.stringify(old)
 const storage={getItem:()=>data,setItem:(_,value)=>{data=value}}
 const play=createEpisode({storage}),stale=createEpisode({storage})
 assert(play.discover(basinPlate.id).ok)
 assert(!play.discover(basinPlate.id).ok)
 assert(!stale.discover(basinPlate.id).ok)
 const restored=createEpisode({storage})
 assert(restored.discovered(basinPlate.id))
 assert.deepEqual(restored.snapshot().found,[basinPlate.title])
 assert.equal(restored.snapshot().money,old.money+basinPlate.reward)
 assert.equal(restored.snapshot().bank,old.bank)
 assert.deepEqual(restored.savedEquipment,old.equipment)
 const unavailable=createEpisode({storage:{getItem:()=>JSON.stringify(old),setItem(){throw new Error('quota')}}})
 assert(!unavailable.discover(basinPlate.id).ok)
 assert.equal(unavailable.snapshot().money,old.money)
 assert(!unavailable.discovered(basinPlate.id))
})

class FakeParam {
 value=0
 setTargetAtTime(value){this.value=value}
 setValueAtTime(value){this.value=value}
 exponentialRampToValueAtTime(value){this.value=value}
}
class FakeNode {
 gain=new FakeParam()
 frequency=new FakeParam()
 playbackRate=new FakeParam()
 threshold=new FakeParam()
 knee=new FakeParam()
 ratio=new FakeParam()
 pan=new FakeParam()
 delayTime=new FakeParam()
 connect(other){return other}
 disconnect(){}
 start(){}
 stop(){}
}
class FakeAudioContext {
 static latest
 state='suspended'
 currentTime=0
 sampleRate=100
 destination=new FakeNode()
 startedBuffers=[]
 startedOscillators=0
 constructor(){FakeAudioContext.latest=this}
 createGain(){return new FakeNode()}
 createDynamicsCompressor(){return new FakeNode()}
 createBiquadFilter(){return new FakeNode()}
 createDelay(){return new FakeNode()}
 createOscillator(){const node=new FakeNode();node.start=()=>this.startedOscillators++;return node}
 createBufferSource(){
  const source=new FakeNode()
  source.start=()=>this.startedBuffers.push(source.buffer)
  return source
 }
 async decodeAudioData(data){return new TextDecoder().decode(data)}
 createStereoPanner(){return new FakeNode()}
 createMediaElementSource(){return new FakeNode()}
 createBuffer(_,size){return {getChannelData:()=>new Float32Array(size)}}
 async resume(){this.state='running'}
 async suspend(){this.state='suspended'}
}
class FakeAudio {
 static files=[]
 duration=48
 currentTime=0
 ended=false
 constructor(src){this.src=src;FakeAudio.files.push(this)}
 async play(){this.playing=true}
 pause(){this.playing=false}
 removeAttribute(){this.src=''}
 load(){}
}

test('mixer loads only after enabling and releases tracks on backgrounding',async()=>{
 FakeAudio.files=[]
 const data=new Map(),localStorage={getItem:key=>data.get(key),setItem:(key,value)=>data.set(key,value)}
 const mixer=cityAudio({AudioContext:FakeAudioContext,Audio:FakeAudio,localStorage})
 const frame={x:0,z:0,yaw:0,t:0,car:{speed:0,accel:0,setup:{}}}
 mixer.update(frame)
 assert.equal(FakeAudio.files.length,0)
 assert(await mixer.toggle())
 FakeAudioContext.latest.currentTime=3
 mixer.update(frame);await Promise.resolve()
 assert.match(FakeAudio.files.at(-1).src,/market-lights/)
 FakeAudioContext.latest.currentTime=5
 mixer.update({...frame,radio:true,driving:true});await Promise.resolve()
 assert.match(FakeAudio.files.at(-1).src,/causeway/)
 assert.equal(FakeAudio.files.filter(f=>f.playing).length,2)
 mixer.sound('doorClose',frame)
 mixer.set('voice',.3)
 assert.equal(readMixer(localStorage).voice,.3)
 mixer.visibility(true)
 assert(FakeAudio.files.every(f=>!f.playing&&!f.src))
 assert.equal(FakeAudioContext.latest.state,'suspended')
 assert.equal(musicCue({wanted:2,driving:true}), 'danger')
 assert.equal(musicCue({wanted:2,radio:true,driving:true}), 'radio')
})

test('death plays one cue and holds the current score until recovery',async()=>{
 FakeAudio.files=[]
 const mixer=cityAudio({AudioContext:FakeAudioContext,Audio:FakeAudio})
 const frame={x:0,z:0,yaw:0,t:0,car:{speed:0,setup:{}}}
 assert(await mixer.toggle())
 const ctx=FakeAudioContext.latest
 ctx.currentTime=3;mixer.update(frame)
 assert.match(FakeAudio.files.at(-1).src,/market-lights/)
 const before=ctx.startedBuffers.length
 mixer.death(true);mixer.death(true)
 assert.equal(ctx.startedBuffers.length,before+1)
 const title=ctx.startedOscillators
 mixer.deathTitle();mixer.deathTitle()
 assert.equal(ctx.startedOscillators,title+1)
 ctx.currentTime=5;mixer.update({...frame,wanted:2})
 assert.equal(FakeAudio.files.length,1)
 mixer.death(false);mixer.update({...frame,wanted:2})
 assert.match(FakeAudio.files.at(-1).src,/blue-beacons/)
 mixer.set('effects',0);mixer.death(true)
 assert.equal(ctx.startedBuffers.length,before+1)
})

test('the brake recording plays once for each firm stop and stays silent when parked or muted',async()=>{
 const mixer=cityAudio({AudioContext:FakeAudioContext,Audio:FakeAudio,fetch:async path=>({
  ok:true,arrayBuffer:async()=>new TextEncoder().encode(path).buffer
 })})
 assert(await mixer.toggle())
 mixer.set('music',0)
 mixer.prepareDrive()
 await new Promise(resolve=>setImmediate(resolve))
 const ctx=FakeAudioContext.latest
 const car={speed:17,accel:-7,setup:{top:18}}
 const frame={x:0,z:0,yaw:0,t:0,car,driving:true}
 const brakes=()=>ctx.startedBuffers.filter(buffer=>typeof buffer==='string'&&buffer.endsWith('/brake.wav')).length
 const update=()=>{ctx.currentTime+=.3;mixer.update(frame)}

 update()
 assert.equal(brakes(),0)
 car.braking=true
 update();update()
 assert.equal(brakes(),1)
 mixer.pause(true);update()
 mixer.pause(false);update()
 assert.equal(brakes(),1)
 car.braking=false;update()
 car.braking=true;car.speed=0;update()
 assert.equal(brakes(),1)
 car.speed=-7;car.accel=7;update()
 assert.equal(brakes(),2)
 car.braking=false;update()
 mixer.set('effects',0)
 car.braking=true;update()
 assert.equal(brakes(),2)
})
