import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createEpisode,EPISODE_SAVE_KEY} from '../src/episode.js'
import {createCheckpoint,PLAY_CHECKPOINT_KEY} from '../src/play-checkpoint.js'
import {GAME_OPTIONS_KEY,normalizeGameOptions} from '../src/game-options.js'
import {createSaveData,MAX_BACKUP_BYTES,parseSaveBackup} from '../src/save-data.js'

const time=Date.parse('2026-11-28T18:01:00.000Z')
const position={x:-55,y:2.7,z:83,face:1,yaw:2,pitch:.15,distance:4.8}
const location=JSON.stringify(position)
const oldStory=JSON.stringify({version:1,index:2,status:'available',money:6200,inventory:{coffee:2}})
const equipmentKey='harborline.equipment.v1'
const graphicsKey='harborline.graphicsQuality.v1'
const soundKey='harborline.audio.v1'
const unrelatedKey='unrelated.site.preference'
const sound=JSON.stringify({music:.45,effects:.65,ambient:.65,voice:.9,enabled:true})
const legacyEquipment=JSON.stringify({items:{pistol:{owned:true}},selected:'pistol'})

function memory(entries=[],beforeWrite=()=>{}){
 const values=new Map(entries)
 const storage={
  getItem:key=>values.get(key)??null,
  setItem(key,value){beforeWrite('set',key,value);values.set(key,value)},
  removeItem(key){beforeWrite('remove',key);values.delete(key)}
 }
 return {storage,values}
}

test('a portable backup restores old progress and settings without touching unrelated storage',()=>{
 const entries=[[PLAY_CHECKPOINT_KEY,location],[EPISODE_SAVE_KEY,oldStory],[equipmentKey,legacyEquipment],
  [graphicsKey,'low'],[soundKey,sound],[GAME_OPTIONS_KEY,JSON.stringify(normalizeGameOptions({}))]]
 const source=memory([...entries,[unrelatedKey,'source']])
 const manager=createSaveData(source.storage,{now:()=>time})
 assert.deepEqual(manager.status,{available:true,hasProgress:true,savedAt:null})
 const file=manager.exportBackup()
 assert(file.ok)
 const parsed=parseSaveBackup(file.text)
 assert(parsed.ok)
 assert.deepEqual(parsed.backup.data,Object.fromEntries(entries))
 assert.equal(parsed.backup.savedAt,null)

 const destination=memory([[unrelatedKey,'destination'],['harborline.firstDrive.v2','complete']])
 const target=createSaveData(destination.storage)
 assert(target.restoreBackup(file.text).ok)
 for(const [key,value] of entries)assert.equal(destination.storage.getItem(key),value)
 assert.equal(destination.storage.getItem('harborline.firstDrive.v2'),null)
 assert.equal(destination.storage.getItem(unrelatedKey),'destination')
 assert.deepEqual(createCheckpoint(destination.storage).current,position)
 assert.equal(createEpisode({storage:destination.storage}).snapshot().money,6200)
})

test('malformed, oversized, unsupported and unrecognized backup records cause no writes',()=>{
 const original=[[EPISODE_SAVE_KEY,oldStory]]
 const {storage,values}=memory(original,()=>assert.fail('invalid input should never write'))
 const manager=createSaveData(storage)
 const backup=JSON.parse(manager.exportBackup().text)
 const change=data=>JSON.stringify({...backup,data})
 const invalid=['{','[]',JSON.stringify({...backup,version:2}),
  change({}),change({[unrelatedKey]:'ignore'}),change({[EPISODE_SAVE_KEY]:{version:1,index:1}}),
  change({[EPISODE_SAVE_KEY]:JSON.stringify({version:1,index:999})}),
  change({[EPISODE_SAVE_KEY]:JSON.stringify({version:1,index:1,money:-1})}),
  change({[equipmentKey]:'{"items":{},"legacy":'+ '['.repeat(20)+'0'+']'.repeat(20)+'}'}),
  change({[PLAY_CHECKPOINT_KEY]:JSON.stringify({...position,distance:20})}),
  change({[PLAY_CHECKPOINT_KEY]:JSON.stringify({...position,vehicles:{touring:{x:0,z:0,heading:9}}})}),
  change({[soundKey]:'[.1,.2]'}),change({[GAME_OPTIONS_KEY]:'[]'}),
  JSON.stringify({...backup,padding:'가'.repeat(Math.ceil(MAX_BACKUP_BYTES/3))})]
 for(const text of invalid)assert(!manager.restoreBackup(text).ok)
 assert.deepEqual([...values],original)
})

test('restore rolls back all changed keys when one storage write fails',()=>{
 const source=memory([[EPISODE_SAVE_KEY,oldStory],[graphicsKey,'low']])
 const file=createSaveData(source.storage).exportBackup().text
 let failed=false
 const original=[[graphicsKey,'high'],[PLAY_CHECKPOINT_KEY,location],[unrelatedKey,'keep']]
 const {storage,values}=memory(original,(_,key)=>{
  if(key===EPISODE_SAVE_KEY&&!failed){failed=true;throw Error('quota')}
 })
 const manager=createSaveData(storage)
 assert.equal(manager.restoreBackup(file).code,'storage-write')
 assert.deepEqual(Object.fromEntries(values),Object.fromEntries(original))
 assert(manager.status.available)
})

test('a later session completes rollback after storage interrupts restore and recovery',()=>{
 const source=memory([[EPISODE_SAVE_KEY,oldStory],[graphicsKey,'low']])
 const file=createSaveData(source.storage).exportBackup().text
 let interrupted=false,closed=false
 const original=[[graphicsKey,'high'],[PLAY_CHECKPOINT_KEY,location],[unrelatedKey,'keep']]
 const {storage,values}=memory(original,(_,key)=>{
  if(!closed&&key===EPISODE_SAVE_KEY)interrupted=true
  if(!closed&&interrupted)throw Error('storage interrupted')
 })
 const manager=createSaveData(storage)
 assert.equal(manager.restoreBackup(file).code,'recovery-needed')
 assert.equal(manager.status.code,'recovery-needed')
 closed=true
 assert(createSaveData(storage).status.available)
 assert.deepEqual(Object.fromEntries(values),Object.fromEntries(original))
})

test('timestamps follow successful writes and stale sessions cannot overwrite a restored checkpoint',()=>{
 const {storage}=memory()
 let currentTime=time
 const manager=createSaveData(storage,{now:()=>currentTime})
 const checkpoint=createCheckpoint(storage,{onSave:manager.recordSave})
 assert(!checkpoint.sample(position,{offline:true,grounded:false,safe:true}))
 assert(!checkpoint.flush())
 assert.equal(manager.status.savedAt,null)
 assert(checkpoint.sample(position,{offline:true,grounded:true,safe:true}))
 assert(checkpoint.flush())
 const first=new Date(time).toISOString()
 assert.equal(manager.status.savedAt,first)
 currentTime+=1000
 assert(checkpoint.flush())
 assert.equal(manager.status.savedAt,first)
 assert(createEpisode({storage,onSave:manager.recordSave}).save().ok)
 assert.equal(manager.status.savedAt,new Date(currentTime).toISOString())
 assert.equal(createSaveData(storage).status.savedAt,manager.status.savedAt)

 const source=memory([[PLAY_CHECKPOINT_KEY,JSON.stringify({...position,x:10})]])
 assert(manager.restoreBackup(createSaveData(source.storage).exportBackup().text).ok)
 assert(!checkpoint.flush())
 assert.equal(createCheckpoint(storage).current.x,10)
})
