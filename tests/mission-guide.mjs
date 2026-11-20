import assert from 'node:assert/strict'
import {guidePosition} from '../src/mission-guide.js'
import {createEpisode} from '../src/episode.js'
import {people} from '../src/resident-profiles.js'

const screen={width:390,height:760},safe={left:45,top:90,right:345,bottom:650}
assert.deepEqual(guidePosition({x:0,y:0},false,screen,safe),{x:195,y:380,angle:0,edge:false})
assert.equal(guidePosition({x:2,y:0},false,screen,safe).x,345)
assert.equal(guidePosition({x:2,y:0},true,screen,safe).x,45)
assert.equal(guidePosition({x:0,y:0},true,screen,safe).y,650)
const story=createEpisode({storage:null}),person=id=>people.find(n=>n.id===id)
assert.equal(story.tracking(),null)
assert(story.interact({resident:person('courier'),choice:'accept'}).message.includes(person('merchant').name))
assert.equal(story.tracking().goal.residentId,'merchant')
assert(story.tracking().objective.includes(person('merchant').name))
assert(story.interact({resident:person('merchant').name,choice:'deliver'}).ok)
assert.equal(story.tracking().goal.residentId,'foreman')
story.abandon()
assert.equal(story.tracking(),null)
