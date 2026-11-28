import {missions,storyContracts} from './episode-data.js'
import {EPISODE_SAVE_KEY,isEpisodeRecord} from './episode.js'
import {GAME_OPTIONS_KEY,isGameOptions} from './game-options.js'
import {PLAY_CHECKPOINT_KEY,isCheckpointPosition} from './play-checkpoint.js'
import {chapterIds} from './chapter-arc.js'
import {wrongDeal} from './prologue.js'
import {isVehicleCheckpointPose} from './vehicle-checkpoint.js'

export const MAX_BACKUP_BYTES=256*1024
const format='harborline-save'
const version=1
const savedAtKey='harborline.saveStatus.v1'
const restoreKey='harborline.pendingRestore.v1'
const equipmentKey='harborline.equipment.v1'
const visitsKey='harborline.visits.v1'
const practiceKey='harborline.firstDrive.v2'
const progressKeys=[EPISODE_SAVE_KEY,PLAY_CHECKPOINT_KEY,equipmentKey,visitsKey,practiceKey]

const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value)
const natural=value=>Number.isSafeInteger(value)&&value>=0
const string=value=>typeof value==='string'
const boolean=value=>typeof value==='boolean'
const member=values=>value=>values.includes(value)
const status=member(['available','active','failed','complete'])
const level=value=>Number.isFinite(value)&&value>=0&&value<=1
const strings=value=>Array.isArray(value)&&value.every(string)
const dictionary=(value,valid)=>object(value)&&Object.values(value).every(valid)
const fields=(value,schema)=>object(value)&&Object.entries(schema).every(([key,valid])=>!Object.hasOwn(value,key)||valid(value[key]))
const date=value=>string(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value
const step=limit=>value=>natural(value)&&value<limit
const read=(storage,key)=>storage.getItem(key)??null

function equipment(value){
 return fields(value,{selected:string})&&dictionary(value.items,item=>fields(item,{mag:natural,reserve:natural,owned:boolean}))
}

function run(value,limit){
 return fields(value,{step:step(limit),status,reason:string})
}

function prologue(value){
 return object(value)&&step(wrongDeal.length)(value.mission)&&run(value,wrongDeal[value.mission].stages.length)
}

function episode(value){
 if(!object(value)||!isEpisodeRecord(value))return false
 const followups=Object.fromEntries(storyContracts.slice(1).map(contract=>[contract.id,saved=>run(saved,contract.steps.length)]))
 return fields(value,{
  step:step(missions[value.index].steps.length),status,money:natural,bank:natural,reason:string,
  remaining:remaining=>remaining===null||Number.isFinite(remaining)&&remaining>=0,
  inventory:inventory=>dictionary(inventory,natural),equipment,discoveries:strings,
  firstJob:saved=>run(saved,storyContracts[0].steps.length),followups:saved=>fields(saved,followups),
  selected:string,wrongDeal:prologue,newBlood:saved=>run(saved,5),
  chapterArc:saved=>run(saved,16)&&step(chapterIds.length)(saved.mission)&&
   (saved.status!=='complete'||saved.mission===chapterIds.length-1)&&
   [null,'intercepted','escaped'].includes(saved.lead)
 })
}

function checkpoint(value){
 return isCheckpointPosition(value)&&fields(value,{vehicles:poses=>dictionary(poses,isVehicleCheckpointPose)})
}

// The game may serialize these records again after loading them. Bound optional
// legacy fields as well as the values checked by each record's schema.
function boundedJson(value,depth=12){
 if(!value||typeof value!=='object')return true
 return depth>0&&Object.values(value).every(entry=>boundedJson(entry,depth-1))
}

const json=valid=>encoded=>{
 const value=JSON.parse(encoded)
 return valid(value)&&boundedJson(value)
}
const validators={
 [EPISODE_SAVE_KEY]:json(episode),
 [PLAY_CHECKPOINT_KEY]:json(checkpoint),
 [equipmentKey]:json(equipment),
 [visitsKey]:json(strings),
 [practiceKey]:member(['complete']),
 'harborline.audio.v1':json(value=>fields(value,{music:level,effects:level,ambient:level,voice:level,enabled:boolean})),
 'harborline.graphicsQuality.v1':member(['auto','high','low']),
 'harborline.runMode.v3':member(['toggle','hold']),
 'harborline.traffic.v1':member(['low','normal','high']),
 [GAME_OPTIONS_KEY]:json(isGameOptions)
}
const keys=Object.keys(validators)
const restoreKeys=[...keys,savedAtKey]
const messages={
 'too-large':'백업 파일이 너무 큽니다.',
 'invalid-file':'Harborline 백업 파일을 읽을 수 없습니다.',
 'unsupported-version':'이 버전의 Harborline 백업 파일은 지원되지 않습니다.',
 'invalid-data':'백업에 올바르지 않은 저장 데이터가 있습니다.',
 'empty':'백업에 포함할 저장 데이터나 설정이 없습니다.',
 'storage-unavailable':'이 브라우저의 저장소를 사용할 수 없습니다.',
 'storage-write':'저장소에 기록하지 못했습니다. 사용 가능한 저장 공간을 확인해 주세요.',
 'recovery-needed':'저장 데이터를 복구하려면 게임을 새로고침해 주세요.'
}
const failure=code=>({ok:false,code,message:messages[code]})
const size=value=>value.length>MAX_BACKUP_BYTES?value.length:new TextEncoder().encode(value).byteLength

function validRecord(key,value){
 if(!Object.hasOwn(validators,key)||!string(value))return false
 try{return validators[key](value)}catch{return false}
}

export function parseSaveBackup(text){
 if(!string(text))return failure('invalid-file')
 if(size(text)>MAX_BACKUP_BYTES)return failure('too-large')
 let backup
 try{backup=JSON.parse(text.replace(/^\uFEFF/,''))}catch{return failure('invalid-file')}
 if(!object(backup)||backup.format!==format)return failure('invalid-file')
 if(backup.version!==version)return failure('unsupported-version')
 if(!date(backup.exportedAt)||!(backup.savedAt===null||date(backup.savedAt))||!object(backup.data))return failure('invalid-file')
 const entries=Object.entries(backup.data)
 if(!entries.length)return failure('empty')
 if(!entries.every(([key,value])=>validRecord(key,value)))return failure('invalid-data')
 return {ok:true,backup}
}

function applySnapshot(storage,values){
 const changes=[]
 for(const [key,value] of Object.entries(values)){
  const current=read(storage,key)
  if(current!==value)changes.push({key,value,delta:(value?.length??0)-(current?.length??0)})
 }
 // Clear deletions and apply smaller values first to free up quota in both directions.
 for(const {key} of changes.filter(change=>change.value===null))storage.removeItem(key)
 for(const {key,value} of changes.filter(change=>change.value!==null).sort((a,b)=>a.delta-b.delta))storage.setItem(key,value)
}

function rollback(storage){
 const encoded=read(storage,restoreKey)
 if(encoded===null)return
 const before=JSON.parse(encoded)
 if(!object(before)||!Object.entries(before).every(([key,value])=>restoreKeys.includes(key)&&(value===null||string(value))))throw Error('Invalid restore journal')
 applySnapshot(storage,before)
 storage.removeItem(restoreKey)
}

export function createSaveData(storage,{now=Date.now}={}){
 let writeError=false
 if(storage)try{rollback(storage)}catch{}
 const available=()=>storage&&['getItem','setItem','removeItem'].every(method=>typeof storage[method]==='function')
 const unavailable=code=>({available:false,hasProgress:false,savedAt:null,code})
 const timestamp=()=>new Date(now()).toISOString()
 const getSavedAt=()=>{
  const value=read(storage,savedAtKey)
  return date(value)?value:null
 }
 return {
  get status(){
   if(!available())return unavailable('storage-unavailable')
   try{
    if(read(storage,restoreKey)!==null)return unavailable('recovery-needed')
    const hasProgress=progressKeys.some(key=>validRecord(key,read(storage,key)))
    return {available:true,hasProgress,savedAt:getSavedAt(),...(writeError?{code:'storage-write'}:{})}
   }catch{return unavailable('storage-unavailable')}
  },
  recordSave(){
   if(!available())return false
   try{
    if(read(storage,restoreKey)!==null)return false
    const savedAt=timestamp()
    if(savedAt!==getSavedAt())storage.setItem(savedAtKey,savedAt)
    writeError=false
    return true
   }catch{writeError=true;return false}
  },
  exportBackup(){
   if(!available())return failure('storage-unavailable')
   try{
    if(read(storage,restoreKey)!==null)return failure('recovery-needed')
    const data=Object.fromEntries(keys.map(key=>[key,read(storage,key)]).filter(([,value])=>value!==null))
    const text=JSON.stringify({format,version,exportedAt:timestamp(),savedAt:getSavedAt(),data})
    const parsed=parseSaveBackup(text)
    return parsed.ok?{ok:true,text}:parsed
   }catch{return failure('storage-unavailable')}
  },
  resetProgress(){return replaceRecords([...progressKeys,savedAtKey],()=>null)},
  restoreBackup(text){
   const parsed=parseSaveBackup(text)
   if(!parsed.ok)return parsed
   const {data,savedAt}=parsed.backup
   return replaceRecords(restoreKeys,key=>key===savedAtKey?savedAt:data[key]??null)
  }
 }

 function replaceRecords(affected,nextValue){
   if(!available())return failure('storage-unavailable')
   const after={},before={}
   try{
    if(read(storage,restoreKey)!==null)return failure('recovery-needed')
    for(const key of affected){
     const current=read(storage,key)
     const next=nextValue(key)
     if(current!==next){before[key]=current;after[key]=next}
    }
   }catch{return failure('storage-unavailable')}
   if(!Object.keys(before).length)return {ok:true}
   // Keep the previous raw values until every changed key has been written.
   try{storage.setItem(restoreKey,JSON.stringify(before))}catch{return failure('storage-write')}
   try{
    applySnapshot(storage,after)
    storage.removeItem(restoreKey)
   }catch{
    try{rollback(storage)}catch{return failure('recovery-needed')}
    return failure('storage-write')
   }
   writeError=false
   return {ok:true}
  }
}
