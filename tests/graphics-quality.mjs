import assert from 'node:assert/strict'
import {test} from 'node:test'
import {graphicsProfile,nextQuality,readQuality,writeQuality} from '../src/graphics-quality.js'

test('first launch actually selects high resolution and both shadows',()=>{
 const values=new Map()
 globalThis.localStorage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)}
 assert.equal(readQuality(),'high')
 assert.deepEqual(graphicsProfile(readQuality(),2,1),{pixelRatio:1.75,worldShadows:true,playerShadows:true})
 const low=nextQuality('high')
 writeQuality(low)
 assert.deepEqual(graphicsProfile(readQuality(),2,1),{pixelRatio:.8,worldShadows:false,playerShadows:false})
 writeQuality(nextQuality(low))
 assert.deepEqual(graphicsProfile(readQuality(),2,1),{pixelRatio:1,worldShadows:true,playerShadows:false})
 writeQuality('bad')
 assert.equal(readQuality(),'auto')
})
