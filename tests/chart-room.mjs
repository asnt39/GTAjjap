import assert from 'node:assert/strict'
import {archive,buildArchive} from '../src/chart-room.js'
import {canWalk,movePlayer,cameraFraction} from '../src/navigation.js'

const boxes=[]
buildArchive({cube(){},rail(){},panel(){},addCollider:(...b)=>boxes.push(b)},9)
const p={x:-9,z:archive.door}
movePlayer(p,-10,0,boxes)
assert.ok(p.x< -18,'doorway connects the sidewalk to the room')
movePlayer(p,10,0,boxes)
assert.ok(Math.abs(p.x+9)<1e-8,'exit remains clear')
assert.equal(canWalk(archive.front,25,boxes),false)
assert.equal(canWalk(-16.75,25.5,boxes),false)
assert.equal(canWalk(archive.back-.2,25,boxes),false)
assert.ok(cameraFraction({x:-19,y:2,z:23},{x:-25,y:2,z:23},boxes)<.6)
console.log('Archive entrance, exit, facade, chart table and camera obstruction passed.')
