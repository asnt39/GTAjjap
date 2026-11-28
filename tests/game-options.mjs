import assert from 'node:assert/strict'
import {test} from 'node:test'
import {Scene} from 'three'
import {applyHudSettings,CONTROL_DEFAULTS,createFrameLimiter,createGameOptions,GAME_OPTIONS_KEY,isGameOptions,renderOptions} from '../src/game-options.js'
import {readQuality,writeQuality} from '../src/graphics-quality.js'
import {worldEffects} from '../src/world-effects.js'

function storage(){
 const values=new Map()
 return {getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)}
}

test('game options migrate graphics preferences and persist each independent control',()=>{
 const local=storage()
 writeQuality('low',local)
 const options=createGameOptions(local)
 assert.equal(options.values.preset,'low')
 assert.equal(options.values.resolution,80)
 assert.equal(options.set('hudMoveX','42'),true)
 assert.equal(options.set('hudActionY','-10'),true)
 assert.equal(options.set('cameraSensitivity',180),true)
 assert.equal(options.set('aimSensitivity',NaN),false)
 assert.deepEqual(createGameOptions(local).values,options.values)
 assert.equal(isGameOptions(JSON.parse(local.getItem(GAME_OPTIONS_KEY))),true)
 assert.equal(isGameOptions({...options.values,hudSize:999}),false)
 assert.equal(isGameOptions({...options.values,resolution:175}),false)
 const applied=new Map()
 applyHudSettings({style:{setProperty:(name,value)=>applied.set(name,value)}},options.values)
 assert.equal(applied.get('--touch-move-x'),.42)
 assert.equal(applied.get('--touch-action-y'),0)
 options.reset('controls')
 assert.equal(options.values.preset,'low')
 for(const [key,value] of Object.entries(CONTROL_DEFAULTS))assert.equal(options.values[key],value)
})

test('graphics settings drive separate render parameters and reset without affecting input',()=>{
 const local=storage(),options=createGameOptions(local)
 assert.deepEqual(renderOptions(options.values,2,1),{
  pixelRatio:1.75,worldShadows:true,playerShadows:true,reflections:2,far:420,fog:1,lowEffects:false
 })
 options.set('aimSensitivity',140)
 options.set('preset','auto')
 assert.equal(readQuality(local),'auto')
 assert.equal(renderOptions(options.values,2,.85).pixelRatio,.85)
 options.set('resolution','125')
 options.set('fps','60')
 options.set('shadows','off')
 options.set('reflections','off')
 options.set('drawDistance','far')
 options.set('effects','low')
 assert.equal(options.values.preset,'custom')
 assert.deepEqual(renderOptions(options.values,2,1),{
  pixelRatio:1.25,worldShadows:false,playerShadows:false,reflections:0,far:620,fog:.72,lowEffects:true
 })
 assert.equal(createGameOptions(local).values.fps,60)
 options.reset('graphics')
 assert.equal(options.values.preset,'high')
 assert.equal(options.values.aimSensitivity,140)
 assert.equal(readQuality(local),'high')
})

test('the frame cap follows elapsed display time and resumes after backgrounding',()=>{
 for(const [displayRate,target] of [[60,30],[144,60],[144,120],[60,120]]){
  const allow=createFrameLimiter()
  let frames=0
  for(let frame=0;frame<displayRate*10;frame++)if(allow(frame*1000/displayRate,target))frames++
  assert.equal(frames,Math.min(displayRate,target)*10)
  assert.equal(allow(60000,target),true)
  assert.equal(allow(60001,target),false)
  assert.equal(allow(60002,0),true)
  assert.equal(allow(60003,30),true)
 }
})

test('low effect quality reduces visible particles and keeps essential effects',()=>{
 const scene=new Scene(),effects=worldEffects(scene,{capacity:40})
 const points=scene.children.find(child=>child.isPoints)
 effects.emit('dust',0,0,0,40)
 effects.update(0,400)
 assert.equal(points.geometry.drawRange.count,40)
 effects.setLowDetail(true)
 effects.update(0,400)
 assert.equal(points.geometry.drawRange.count,16)
 effects.update(2,400)
 effects.update(0,400)
 effects.emit('exhaust',0,0,0,10)
 effects.update(0,400)
 assert.equal(points.visible,false)
 effects.emit('flash',0,0,0)
 effects.update(0,400)
 assert.equal(points.geometry.drawRange.count,1)
})
