import {terracePoint,terraceRooms} from './terrace-plan.js'
import {clockCourt} from './old-town-plan.js'

const indoors=(index,x,z)=>terracePoint(terraceRooms.find(room=>room.index===index),x,z)
export const citySpots=[
 {id:'meal',...indoors(15,1.9,-1.55),title:'South Row Kitchen',label:'따뜻한 식사 주문',price:480,pose:'eat',heal:25},
 {id:'coffee',...indoors(0,1.9,-2),title:'Gull Street Bakery',label:'커피 주문',price:320,pose:'drink',energy:24},
 {id:'cafe',...indoors(29,2.35,-1.42),title:'Pump House Café',label:'커피 주문',price:350,pose:'drink',energy:24},
 {id:'grocer',...indoors(23,0,-.25),title:'West Bank Grocer',label:'응급 붕대 구매',goods:'bandage'},
 {id:'vending',x:-48.35,z:57.6,fromZ:1,title:'Clock Court',label:'자판기 · 생수 구매',price:120,heal:8,pose:'drink'},
 {id:'atm',x:-46.1,z:54.15,fromZ:1,title:'Clock Court ATM',label:'ATM 이용',type:'atm'},
 {id:'square-seat',x:-52.8,z:54.70,seatZ:55.44,seatY:.52,fromZ:-1,title:'Clock Court',label:'벤치에 앉기',pose:'sit'},
 {id:'park-seat',x:-169,z:52.25,seatZ:52.94,seatY:.63,fromZ:-1,title:'Foundry Garden',label:'벤치에 앉기',pose:'sit'},
 {id:'light',...indoors(0,2.6,3.63),targetY:1.25,title:'Gull Street Bakery',label:'조명 스위치',type:'light'},
 {id:'rest',...indoors(34,-3.52,.15),title:'Coopers’ Rooms',label:'침대 옆에서 휴식',pose:'rest',heal:100},
 {id:'recreation',...indoors(8,1.55,-1.95),title:'South Row Social Club',label:'다트 한 라운드',type:'darts'},
 {id:'repair',x:-125,z:52.9,range:4.6,title:'West Bank Works',label:'정차 차량 수리',price:650,type:'repair'},
 {id:'directions',x:clockCourt.x+2.15,z:clockCourt.z-1.8,title:'Clock Court',label:'동네 안내도 보기',type:'map'}
]
