import {hotel} from './chapter-sites.js'

const jack=(point,options={})=>({name:'Jack',point,waypoints:hotel.nav,...options})
const witness=(point,options={})=>({name:'Elliot',point,side:'witness',health:105,waypoints:hotel.nav,...options})
const guard=(id,x,z,variant)=>({id,name:id.endsWith('a')?'Cole':'Reed',point:{x,z,y:.083},
 side:'hostile',armed:true,health:70,variant,waypoints:hotel.nav})
const upstairs={x:-129.6,z:199.6,y:hotel.floor}

export const chapterSix={
 id:'silence-the-witness',title:'입막음',reward:5100,
 contact:{residentId:'courier',label:'Jack',resident:'Jack',x:7.6,z:16.2,radius:2},
 brief:['Jack','Maya가 찾은 서명, Elliot 거야. Brine Hotel에 숨어 있대. 손부터 보이고 들어가자. 요 며칠 우리 얼굴만 봐도 달아날 만하거든.'],
 finish:['Elliot','Adrian입니다. 클럽도, Theo를 데려간 것도 그쪽 일이에요. 내 출항 기록에 다음 배가 있습니다. Theo라면 선석을 찾을 겁니다.'],
 stages:[
  {set:'chapter-hotel-lobby',event:'reception',goal:hotel.lobby,checkpoint:hotel.entry,action:'Jack과 함께 객실 명부 확인',
   objective:'Brine Hotel 로비의 접수대에서 운송업자의 객실 확인',
   actors:[jack(hotel.lobby)],line:['Jack','명부 봐. 이름 옆에 빈 칸 하나만 있지? 그 방으로 가자.']},
  {set:'chapter-hotel-search',event:'found',goal:hotel.room,checkpoint:hotel.entry,action:'205호 문 두드리기',
   objective:'로비 왼쪽 계단으로 2층에 올라가 205호 확인',
   actors:[jack(hotel.lobby,{follow:true}),witness(hotel.witness)],
   line:['Jack','205호야. 복도에서 총은 내리고. 거기 누구든 우릴 보면 좋은 기억은 안 나겠지.']},
  {set:'chapter-witness-run',event:'outside',goal:hotel.alley,checkpoint:upstairs,followActor:'Elliot',
   objective:'Elliot을 쫓아 직원 계단과 골목으로 이동',
   actors:[jack(upstairs,{follow:true}),witness(hotel.witness,{path:hotel.route})],
   line:['Elliot','서류는 없어요! 따라오지 마세요!'],
   hint:'직원 계단은 2층 복도 동쪽 끝에 있습니다. 골목 출구에서 따라잡을 수 있습니다.'},
  {set:'chapter-witness-protect',event:'protected',goal:hotel.alley,checkpoint:hotel.alley,armed:true,
   objective:'Elliot을 엄폐물까지 보호하고 골목의 조직원을 저지',
   actors:[jack({x:-116.45,z:190.75,y:.083},{armed:true,follow:true}),
    witness(hotel.alley,{path:[{x:-115.65,z:196.9},hotel.shelter]}),
    guard('chapter-hotel-guard-a',-111,197.2,4),guard('chapter-hotel-guard-b',-109.3,200.9,6)],
   cover:[{x:-115.5,z:194.6,y:.083},{x:-112.65,z:196.1,y:.083},{x:-113.95,z:200.5,y:.083}],
   line:['Jack','저 사람들 손에 들린 거 보여? Elliot, 우리 뒤로! 지금은 싸울 상대가 달라.']},
  {set:'chapter-witness-interview',event:'testimony',goal:hotel.shelter,checkpoint:hotel.alley,action:'Elliot의 진술 듣기',
   objective:'호텔 뒤편 하역 출입구에서 Elliot과 출항 기록 확인',
   actors:[jack({x:-116.2,z:202.3,y:.083}),witness(hotel.shelter)],
   line:['Elliot','출항 기록은 복사해 뒀습니다. 부두 거래만 했지, 저 사람들이 뭘 실었는지는 몰랐어요.']}
 ]
}
