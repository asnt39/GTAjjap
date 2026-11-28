import {graphicsProfile,readQuality,writeQuality} from './graphics-quality.js'

export const GAME_OPTIONS_KEY='harborline.gameOptions.v1'
export const CONTROL_DEFAULTS=Object.freeze({
 hudMoveX:0,hudMoveY:100,hudActionX:100,hudActionY:100,
 hudSize:100,hudOpacity:100,cameraSensitivity:100,aimSensitivity:100
})
const range=(min,max)=>Object.freeze({min,max,step:1})
export const OPTION_RANGES=Object.freeze({
 hudMoveX:range(0,100),hudMoveY:range(0,100),hudActionX:range(0,100),hudActionY:range(0,100),
 hudSize:range(75,150),hudOpacity:range(35,100),cameraSensitivity:range(25,200),aimSensitivity:range(25,200)
})
export const GRAPHICS_PRESETS=Object.freeze({
 auto:Object.freeze({resolution:'auto',fps:0,shadows:'world',reflections:'high',drawDistance:'normal',effects:'high'}),
 high:Object.freeze({resolution:'device',fps:0,shadows:'full',reflections:'high',drawDistance:'normal',effects:'high'}),
 low:Object.freeze({resolution:80,fps:30,shadows:'off',reflections:'low',drawDistance:'near',effects:'low'})
})
const DEFAULT_PRESET='high'
export const GRAPHICS_CHOICES=Object.freeze({
 preset:Object.freeze(['auto','high','low','custom']),
 resolution:Object.freeze(['auto','device',65,80,100,125,150,175]),
 fps:Object.freeze([0,30,60,120]),
 shadows:Object.freeze(['off','world','full']),
 reflections:Object.freeze(['off','low','high']),
 drawDistance:Object.freeze(['near','normal','far']),
 effects:Object.freeze(['low','high'])
})

function numberValue(value){
 if(typeof value==='number')return value
 if(typeof value==='string'&&value.trim())return Number(value)
 return NaN
}

function cleanValue(name,value){
 if(Object.hasOwn(OPTION_RANGES,name)){
  const n=numberValue(value),{min,max}=OPTION_RANGES[name]
  if(Number.isFinite(n))return Math.min(max,Math.max(min,Math.round(n)))
 }
 if(Object.hasOwn(GRAPHICS_CHOICES,name)){
  const choices=GRAPHICS_CHOICES[name]
  if(choices.includes(value))return value
  const numeric=numberValue(value)
  if(choices.includes(numeric))return numeric
 }
}

export function normalizeGameOptions(raw,legacyPreset=DEFAULT_PRESET){
 const fallback=Object.hasOwn(GRAPHICS_PRESETS,legacyPreset)?legacyPreset:DEFAULT_PRESET
 const preset=cleanValue('preset',raw?.preset)??fallback
 const source=GRAPHICS_PRESETS[preset==='custom'?fallback:preset]
 const options={...CONTROL_DEFAULTS,...source,preset}
 for(const name of Object.keys(CONTROL_DEFAULTS))options[name]=cleanValue(name,raw?.[name])??options[name]
 if(preset==='custom')for(const name of Object.keys(source))options[name]=cleanValue(name,raw?.[name])??options[name]
 return options
}

export function isGameOptions(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return false
 const normalized=normalizeGameOptions(raw)
 return Object.keys(raw).length===Object.keys(normalized).length&&
  Object.entries(normalized).every(([name,value])=>Object.hasOwn(raw,name)&&raw[name]===value)
}

export function createGameOptions(storage,onChange=()=>{}){
 if(storage===undefined)try{storage=globalThis.localStorage}catch{}
 let saved
 try{saved=JSON.parse(storage?.getItem(GAME_OPTIONS_KEY))}catch{}
 let values=Object.freeze(normalizeGameOptions(saved,readQuality(storage)))
 function apply(next){
  if(Object.entries(next).every(([name,value])=>value===values[name]))return false
  const previous=values
  values=Object.freeze(next)
  try{storage?.setItem(GAME_OPTIONS_KEY,JSON.stringify(values))}catch{}
  if(values.preset!==previous.preset&&values.preset!=='custom')writeQuality(values.preset,storage)
  onChange(values,previous)
  return true
 }
 return {
  get values(){return values},
  set(name,input){
   const value=cleanValue(name,input)
   if(value===undefined||value===values[name])return false
   if(name==='preset')return apply({...values,...GRAPHICS_PRESETS[value],preset:value})
   if(Object.hasOwn(GRAPHICS_CHOICES,name))return apply({...values,[name]:value,preset:'custom'})
   return apply({...values,[name]:value})
  },
  reset(section){
   if(section==='controls')return apply({...values,...CONTROL_DEFAULTS})
   if(section==='graphics')return apply({...values,...GRAPHICS_PRESETS[DEFAULT_PRESET],preset:DEFAULT_PRESET})
   return false
  }
 }
}

export function applyHudSettings(element,values){
 const css={
  'move-x':values.hudMoveX,'move-y':values.hudMoveY,'action-x':values.hudActionX,'action-y':values.hudActionY,
  scale:values.hudSize,opacity:values.hudOpacity
 }
 for(const [key,value] of Object.entries(css))element.style.setProperty(`--touch-${key}`,value/100)
}

const drawDistances={near:{far:210,fog:1.45},normal:{far:420,fog:1},far:{far:620,fog:.72}}
const reflectionLevels={off:0,low:1,high:2}
export function renderOptions(values,dpr,autoDpr){
 const {resolution,shadows,reflections,drawDistance,effects}=values
 const distance=drawDistances[drawDistance]
 let pixelRatio=resolution/100
 if(resolution==='auto')pixelRatio=autoDpr
 if(resolution==='device')pixelRatio=graphicsProfile('high',dpr,autoDpr).pixelRatio
 return {
  pixelRatio,worldShadows:shadows!=='off',playerShadows:shadows==='full',reflections:reflectionLevels[reflections],
  far:distance.far,fog:distance.fog,lowEffects:effects==='low'
 }
}

export function createFrameLimiter(){
 let lastRate=0,next=0
 return (now,fps)=>{
  if(!fps){lastRate=0;return true}
  const interval=1000/fps
  if(fps!==lastRate||now>next+interval||now<next-interval*2){
   lastRate=fps;next=now+interval;return true
  }
  // Leave room for rAF timestamps that round down at an interval boundary.
  if(now+.25<next)return false
  next+=interval
  return true
 }
}
