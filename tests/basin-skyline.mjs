import assert from 'node:assert/strict'
import {Box3, Scene, Texture} from 'three'
import {basinRoads, basinRoadBounds, insideBasin} from '../src/south-basin-plan.js'
import {canWalk, inDistrict} from '../src/navigation.js'
import {createCheckpoint, resolveCheckpoint} from '../src/play-checkpoint.js'

assert.ok(basinRoads.some(road => road.id === 'spire-street'), 'The new city blocks have a connecting street')
const {bunker, bunkerWalls, bunkerAccess, inBunker, skylineTowers} = await import('../src/basin-skyline-plan.js')
const {buildBasinSkyline} = await import('../src/basin-skyline.js')
const [spire, ...neighbors] = skylineTowers
assert.equal(spire.height, 166.4)
assert.equal(neighbors.length, 2)
assert.ok(neighbors.every(tower => Math.abs(tower.height - spire.height / 2) < 3))
for (const {x, z, width, depth} of skylineTowers) {
 const [west, east, north, south] = [x - width / 2, x + width / 2, z - depth / 2, z + depth / 2]
 assert.ok(inDistrict(west, north, .32) && inDistrict(east, south, .32))
 assert.ok(!basinRoadBounds.some(([a,b,c,d]) => west < b && east > a && north < d && south > c))
}
const paint = {fillRect(){}, fillText(){}}
globalThis.document = {createElement: () => ({getContext: () => paint})}
const scene = new Scene(), colliders = []
const setBunkerVisible = buildBasinSkyline(scene, (...shape) => colliders.push(shape), {street:[null,null,new Texture(),new Texture()]})
for (const {name, x, z, height} of skylineTowers) {
 const model = scene.getObjectByName(name), bounds = new Box3().setFromObject(model)
 assert.ok(Math.abs(bounds.max.y - bounds.min.y - height) < 1e-4, name)
 assert.equal(canWalk(x,z,colliders),false, name+' has a solid footprint')
}
assert.ok(canWalk(bunker.entry.x,bunker.entry.z,colliders))
const interior = scene.getObjectByName('South Basin shelter · B1')
assert.equal(interior.visible, false)
setBunkerVisible(true)
assert.equal(interior.visible, true)
assert.ok(insideBasin(bunker.entry.x, bunker.entry.z))
assert.equal(bunkerAccess({...bunker.entry, y: .083}), 'enter')
assert.equal(bunkerAccess({...bunker.exit, y: bunker.floor}), 'exit')
assert.equal(bunkerAccess({...bunker.exit, y: .083}), 'enter')
assert.equal(bunkerAccess({...bunker.arrival, y: .083}), null)
assert.ok(canWalk(bunker.exit.x, bunker.exit.z, bunkerWalls, .32, bunker.floor))
assert.ok(!canWalk(bunker.bounds[0], bunker.exit.z, bunkerWalls, .32, bunker.floor))

const pose = {x: bunker.exit.x, y: bunker.floor, z: bunker.exit.z, face: 0, yaw: 0, pitch: .13, distance: 4.65}
const data = new Map([['harborline.lastPosition.v1', JSON.stringify(pose)], ['harborline.episode.v1', 'existing-story']])
const storage = {getItem: key => data.get(key), setItem: (key, value) => data.set(key, value)}
const checkpoint = createCheckpoint(storage)
assert.deepEqual(checkpoint.current, pose)
assert.ok(inBunker(pose.x, pose.z, pose.y))
assert.deepEqual(resolveCheckpoint(checkpoint.current, [], (x,z,y) => inBunker(x,z,y) ? bunker.floor : .083,
 (x,z,y) => canWalk(x,z,bunkerWalls,.32,y)), {x:pose.x, y:pose.y, z:pose.z})
checkpoint.flush()
assert.equal(data.get('harborline.episode.v1'), 'existing-story')
console.log('Basin skyline footprints, bunker access and saved position verified')
