import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createCheckpoint,resolveCheckpoint} from '../src/play-checkpoint.js'
import {loftFloor,rowFloor,rowRooms,rowPoint} from '../src/market-row-plan.js'

const position={x:-55,y:loftFloor,z:83,face:1,yaw:2,pitch:.15,distance:4.8}
test('reopening reads the latest safe offline record and preserves legacy saves',()=>{
 const values=new Map([['harborline.episode.v1','legacy'],['harborline.runMode.v3','hold']])
 const storage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)}
 const active=createCheckpoint(storage)
 active.sample(position,{offline:true,grounded:true,safe:true})
 active.sample({...position,x:15},{offline:false,grounded:true,safe:true})
 active.sample({...position,y:10},{offline:true,grounded:false,safe:true})
 active.sample({...position,x:99},{offline:true,grounded:true,safe:false})
 active.flush()
 const reopened=createCheckpoint(storage)
 assert.deepEqual(reopened.current,position)
 assert.equal(values.get('harborline.episode.v1'),'legacy')
 assert.equal(values.get('harborline.runMode.v3'),'hold')
})

test('loft and stairs stay on supported floors while invalid points resolve nearby',()=>{
 const room=rowRooms[1],stairs=rowPoint(room,1.6,.6),loft=rowPoint(room,0,-2.7)
 const floor=(x,z,y)=>rowFloor(room,x,z,y)
 for(const point of [stairs,loft]){
  const y=floor(point.x,point.z,loftFloor)
  const save={...point,y}
  assert.deepEqual(resolveCheckpoint(save,[],floor,()=>true),{x:save.x,y,z:save.z})
  const moved=resolveCheckpoint(save,[],floor,(x,z)=>Math.hypot(x-save.x,z-save.z)>.7)
  assert(Math.hypot(moved.x-save.x,moved.z-save.z)<1.21)
  assert(Math.abs(moved.y-y)<=.35)
 }
 assert.deepEqual(resolveCheckpoint({...position,y:27},[{x:0,z:0}],()=>.09,
  (x,z)=>x===0&&z===0),{x:0,y:.09,z:0})
})

test('malformed saves and unavailable storage do not prevent boot',()=>{
 assert.equal(createCheckpoint({getItem:()=>'{'}).current,undefined)
 assert.equal(createCheckpoint({getItem(){throw Error('disabled')}}).current,undefined)
})
