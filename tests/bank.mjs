import assert from 'node:assert/strict'
import {test} from 'node:test'
import {Scene,Texture} from 'three'
import {buildBank} from '../src/bank.js'
import {bank,bankDoors} from '../src/bank-plan.js'
import {canWalk} from '../src/navigation.js'
import {createTerraceDoors} from '../src/terrace-doors.js'

test('the bank fits the district and has real door collisions and clear room destinations',()=>{
 globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},fillText(){}})})}
 const scene=new Scene(),boxes=[]
 const texture=new Texture()
 buildBank(scene,(...bounds)=>boxes.push(bounds),{architecture:[texture,texture],street:[texture,texture,texture]})
 for(const point of [bank.entry,bank.lobby,bank.tellers,bank.consultation,bank.office,bank.vault])
  assert(canWalk(point.x,point.z,boxes,.32,point.y))
 createTerraceDoors(scene,boxes,undefined,bankDoors)
 for(const door of bankDoors)assert(!canWalk(door.x,door.z,boxes,.32,.083))
 let x=bank.entry.x,z=bank.entry.z
 // Follow the public approach into the lobby, then check clear travel to the vault gate.
 for(;z<202.14;z+=.1)assert(canWalk(x,z,boxes.filter(b=>!b.moving),.32,.083))
})
