import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createPedestrianImpacts} from '../src/vehicle-pedestrians.js'

test('a rejected pedestrian contact neither slows the car nor latches a hit',()=>{
 const sweep=createPedestrianImpacts()
 const before={x:0,z:5,heading:0,width:2,length:4,speed:15}
 const after={...before,z:4}
 const resident={pos:{x:0,z:2.4},f:{hp:100,action:'hit'}}
 assert.equal(sweep(.07,before,after,[resident],()=>false),0)
 assert.equal(sweep(.07,before,after,[resident],()=>true),1)
 resident.f.action='knockdown'
 assert.equal(sweep(1,before,after,[resident],()=>{assert.fail('a downed pedestrian should not brake the car')}),0)
})
