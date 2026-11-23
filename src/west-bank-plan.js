// Rectangles use [west, east, north, south] in world metres.
export const westBankLand=[
 [-225,-86,14,113],[-191,-99,-21,21],[-201,-118,108,144],
 [-225,-202,34,111]
]
export const westBankRoads=[
 [-194,-68,18.5,27.5], [-192,-68,96,105],
 [-116,-105,-13,105], [-151,-141,-13,111],
 [-188,-142,-13,-3], [-192,-182,-13,134],
 [-219,-142,59,70], [-221,-211,39,97],
 [-221,-183,39,49], [-221,-183,83,94],
 [-192,-144,124,134], [-154,-144,98,134],
 [-132.9,-125.1,25,45.6]
]
export const westBankSights=[
 {x:-165.6,z:49,tag:'PARK',title:'Foundry Garden',name:'정원 분수 스위치',body:'예전 제철소에서 쓰던 물탱크를 작은 정원의 분수로 바꿔 놓았다.'},
 {x:-214,z:103,tag:'WEST',title:'West Ferry Yard',name:'선착장 신호등 시험',body:'서편 여객선은 운항을 멈췄다. 신호등은 작업자가 직접 시험할 수 있다.'}
]
export const inWestBank=(x,z,r=0)=>westBankLand.some(([a,b,c,d])=>x>=a+r&&x<=b-r&&z>=c+r&&z<=d-r)

// Mixed terraced shops and former worker housing. Large sheds and civic
// landmarks are deliberately kept out of this frontage set.
export const westBankFrontages=[
 [-119,-5,8,8.7,6,1,Math.PI/2],[-121,7,8,7.8,7,2,Math.PI/2],
 [-155,4,7,9.3,4.8,2,Math.PI/2],[-169,6,11,10,8,1,0],[-179,8,8,8.3,5,0,Math.PI/2],
 [-122,15,8,9.6,5,0,0],[-133,14.8,9,7.9,5,1,0],[-157,15.5,9.8,11,5,2,0],
 [-172,16,10,9.4,4.9,0,0],[-176,32,9,7.5,5,2,-Math.PI/2],
 [-154,39,9,10.3,5,1,Math.PI/2],[-154,54,9.5,8.7,5,0,Math.PI/2],
 [-120,61,10,7.6,6,2,Math.PI/2],[-120,77,11,10.3,6,1,Math.PI/2],
 [-135,61,10,8.8,7,0,-Math.PI/2],[-134,83,11,9,8,2,-Math.PI/2],
 [-158,75,11,8.7,6,1,Math.PI],[-172,76,11,10.4,8,0,Math.PI],
 [-172,107.5,10,9.2,4.6,1,Math.PI],[-158,116,10,10.2,5,2,Math.PI/2],
 [-127,112,10,9.9,6,2,Math.PI],[-118,127,9,8.1,7,0,Math.PI],
 [-196,113,8.7,9.5,6.5,0,Math.PI/2],[-175,137.5,11,8,6,1,Math.PI]
]
