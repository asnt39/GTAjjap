import assert from 'node:assert/strict'
import {createWanted} from '../src/wanted.js'
import {atStation,createCustody,station,stationColliders} from '../src/custody.js'
import {canWalk,movePlayer} from '../src/navigation.js'
import {marketCollision} from '../src/market-plan.js'
import {createEpisode} from '../src/episode.js'
import {firstDrive} from '../src/first-drive.js'

const law=createWanted(), player={x:-7,z:20}
law.report(player,2)
assert.equal(law.tick(.99,player,true,'one'),undefined)
assert.equal(law.tick(.01,player,true,false),undefined)
assert.equal(law.tick(.55,player,true,'one'),undefined)
assert.equal(law.tick(.55,player,false,'one'),undefined)
assert.equal(law.tick(.6,player,true,'one'),undefined)
assert.equal(law.tick(.6,player,true,'two'),undefined)
assert.equal(law.tick(.4,player,true,'two'),'arrest')
law.report(player,1)
assert.equal(law.tick(1.01,player,true,'one'),undefined)
assert.equal(law.tick(.79,player,true,'one'),'warning')
law.report(player,2)
assert.equal(law.tick(1.1,player,true,'one',true),undefined)
assert.equal(law.tick(.7,player,true,'one',true),'arrest')

const memory=new Map()
const episode=createEpisode({storage:{getItem:key=>memory.get(key),setItem:(key,data)=>memory.set(key,data)}})
episode.interact({resident:{id:'courier'},choice:'accept'});episode.buy('coffee')
const drive=firstDrive({x:0,z:0}),events=[]
drive.start(false)
const hold=createCustody({
 admit(){events.push('admit');episode.fail('체포로 의뢰 중단');drive.cancel()},
 release(){events.push('release')}
})
assert(hold.begin('one'));assert(!hold.begin('two'))
for(let i=0;i<60;i++)hold.update(.04)
assert.equal(hold.stage,'transfer');assert.equal(hold.progress,1);assert(hold.locked)
while(hold.locked)hold.update(.04)
assert.equal(hold.stage,'sentence');assert.equal(hold.remaining,5);assert(hold.canPunch)
hold.update(4.99)
assert.equal(hold.stage,'sentence');assert.equal(hold.remaining,1)
assert.deepEqual(events,['admit'])
hold.update(.02)
assert.equal(hold.stage,'discharge');assert(!hold.canPunch)
while(hold.active)hold.update(.04)
assert.deepEqual(events,['admit','release'])
assert.equal(episode.snapshot().status,'failed')
assert.equal(episode.snapshot().items.find(item=>item.id==='coffee').count,1)
assert(episode.retry().ok)
assert.equal(drive.goal(false),null)

const boxes=[]
const add=(...box)=>boxes.push(box)
marketCollision(add);stationColliders(add)
const visitor={...station.release}
movePlayer(visitor,0,-8,boxes)
assert(atStation(visitor.x,visitor.z))
assert(visitor.z>-51.3&&visitor.z<-50)
const inmate={...station.cell}
movePlayer(inmate,0,6,boxes)
assert(atStation(inmate.x,inmate.z));assert(inmate.z<-52.08)
assert(canWalk(station.release.x,station.release.z,boxes))
