import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createEpisode} from '../src/episode.js'
import {createLoadout} from '../src/equipment.js'

const episodeKey='harborline.episode.v1',equipmentKey='harborline.equipment.v1'
function profile(initial={}){
 const records=new Map(Object.entries(initial).map(([key,value])=>[key,JSON.stringify(value)]))
 const writes=[]
 const storage={getItem:key=>records.get(key),setItem(key,value){
  if(storage.blocked)throw Error('quota')
  records.set(key,value);writes.push(key)
 }}
 const open=()=>{
  const episode=createEpisode({storage})
  return {episode,loadout:createLoadout(storage,episode)}
 }
 return {open,storage,records,writes}
}
test('ownership comes from a paid purchase and new guns need paid ammunition',()=>{
 const p=profile(),{episode,loadout}=p.open()
 assert.equal(loadout.select('pistol'),false)
 assert.equal(loadout.buy('pistol','ammo').ok,false)
 assert.equal(loadout.buy('pistol','weapon').ok,true)
 assert.deepEqual(loadout.items.pistol,{mag:0,reserve:0})
 assert.equal(episode.snapshot().money,3200)
 assert.deepEqual(p.writes,[episodeKey])
 assert.equal(loadout.buy('pistol','weapon').ok,false)
 assert.equal(loadout.buy('sniper','weapon').ok,false)
 assert.equal(loadout.buy('__proto__','weapon').ok,false)
 assert.equal(loadout.buy('pistol','ammo').ok,true)
 assert.equal(episode.snapshot().money,2720)
 assert.equal(loadout.select('pistol'),true)
 assert.equal(loadout.reload(),true)
 loadout.tick(2)
 assert.equal(loadout.use(),true)
 const reopened=p.open()
 assert.deepEqual(reopened.loadout.items.pistol,{mag:7,reserve:0})
 assert.equal(reopened.episode.snapshot().money,2720)
})
test('legacy ammo, missing weapons and mission money survive a failed transaction',()=>{
 const legacy={selected:'shotgun',items:{shotgun:{mag:2,reserve:15}}}
 const p=profile({[equipmentKey]:legacy,[episodeKey]:{version:1,index:1,status:'available',money:7200,inventory:{bandage:2}}})
 const {episode,loadout}=p.open()
 assert.equal(loadout.selected,'shotgun')
 const before=episode.snapshot()
 p.storage.blocked=true
 assert.equal(loadout.buy('shotgun','ammo').ok,false)
 assert.equal(loadout.buy('pistol','weapon').ok,false)
 assert.deepEqual(loadout.items.shotgun,legacy.items.shotgun)
 assert(!loadout.items.pistol)
 assert.deepEqual(episode.snapshot(),before)
 p.storage.blocked=false
 assert.equal(loadout.buy('shotgun','ammo').ok,true)
 assert.equal(loadout.buy('shotgun','ammo').ok,false)
 const loaded=p.open()
 assert.equal(loaded.episode.snapshot().money,7000)
 assert.deepEqual(loaded.loadout.items.shotgun,{mag:2,reserve:16})
 assert.equal(loaded.episode.snapshot().missionId,before.missionId)
 assert.equal(loaded.episode.snapshot().items.find(i=>i.id==='bandage').count,2)
 assert.deepEqual(JSON.parse(p.records.get(equipmentKey)),legacy)
})

const {weaponShop,weaponVendor,insideWeaponShop,weaponShopCollision}=await import('../src/weapon-shop-plan.js')
const {movePlayer,canWalk,sights}=await import('../src/navigation.js')
test('the shop entrance, point of sale and exit are reachable from the Tide Market road',()=>{
 const boxes=[]
 weaponShopCollision((...box)=>boxes.push(box))
 const player={x:-56,z:-37}
 movePlayer(player,0,-15,boxes)
 assert(insideWeaponShop(player.x,player.z))
 assert(Math.abs(player.z+52)<1e-6)
 assert.equal(sights.find(s=>s.tag==='ARM'),weaponShop)
 assert(canWalk(weaponVendor.x,weaponVendor.z,boxes))
 movePlayer(player,0,-4,boxes)
 assert(player.z>-53,'counter must prevent walking straight through the vendor')
 movePlayer(player,0,20,boxes)
 assert(player.z>-34)
})

test('a stale tab does not overwrite a purchase made in another tab',()=>{
 const p=profile()
 const first=p.open(),second=p.open()
 assert(first.loadout.buy('pistol','weapon').ok)
 assert.equal(second.loadout.buy('shotgun','weapon').ok,false)
 assert.equal(second.episode.snapshot().money,5000)
 assert(!second.loadout.items.shotgun)
 const updated=p.open()
 assert(updated.loadout.items.pistol)
 assert.equal(updated.episode.snapshot().money,3200)
})

test('grenades come in counted purchases and can never exceed the stock cap',()=>{
 const p=profile(),{loadout}=p.open()
 assert(!loadout.select('grenade'))
 assert(loadout.buy('grenade','weapon').ok)
 for(let i=1;i<4;i++)assert(loadout.buy('grenade','ammo').ok)
 assert(!loadout.buy('grenade','ammo').ok)
 assert(loadout.select('grenade'))
 assert(loadout.use())
 assert(!loadout.use())
 assert.equal(p.open().loadout.items.grenade.reserve,3)
})
