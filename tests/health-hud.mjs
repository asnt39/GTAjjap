import assert from 'node:assert/strict'
import {test} from 'node:test'

test('health presentation bounds both meters and builds a stronger vignette as health falls',async()=>{
 const {healthPresentation}=await import('../src/health-hud.js')
 const full=healthPresentation(100,100),hurt=healthPresentation(45,100),critical=healthPresentation(15,100)
 assert.deepEqual([full.fraction,hurt.fraction,critical.fraction],[1,.45,.15])
 assert.deepEqual([full.band,hurt.band,critical.band],['steady','hurt','critical'])
 assert.equal(full.vignette,0)
 assert(critical.vignette>hurt.vignette)
 assert.equal(healthPresentation(-9,100).hp,0)
 assert.equal(healthPresentation(900,100).hp,100)
 assert.equal(healthPresentation(25,75).label,'25/75')
})
