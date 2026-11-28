import {parking,workshop} from './chapter-sites.js'

export const chapterFive={
 id:'stolen-wheels',title:'빼앗긴 몫',reward:4400,
 contact:{residentId:'courier',label:'Jack',resident:'Jack',x:7.6,z:16.2,radius:2},
 brief:['Jack','클럽이 뒤집어진 틈에 우리 차까지 가져갔어. Victor가 회수를 원해. Maya가 주차타워에서 번호판을 찾았대. 그 친구한테 들으면 돼.'],
 finish:['Maya','네가 확보한 차야. 뒷좌석 밑에서 첫 거래 명세서 사본을 찾았어. 서명한 운송업자는 호텔에 숨어 있어. Jack에게 알려.'],
 stages:[
  {set:'chapter-maya',event:'briefed',goal:workshop.entry,checkpoint:workshop.entry,action:'Maya에게 회수 계획 듣기',
   objective:'Keel Motor Works에서 Maya와 만남',line:['Maya','차 안에 있는 걸 지키는 게 먼저야. 차체를 박살 내면 협상도 끝이야.']},
  {set:'chapter-scan',event:'spotted',goal:parking.lookout,checkpoint:parking.recovery,action:'목표 차량 번호판 확인',
   objective:'Spire Parking 경사로를 따라 옥상으로 올라가 번호판 확인',line:['Maya','서쪽 경사로로 올라가. 가운데 통로 건너편에 두 번째 경사로가 있어.']},
  {set:'chapter-chase',event:'secured',goal:parking.recovery,checkpoint:parking.recovery,
   objective:'Maya의 차량으로 도주 차량 추격 · 직접 운전 또는 Maya에게 운전 요청',
   hint:'남쪽 진입로의 Maya 차량에 탑승하십시오. 가까이 따라가거나 진행을 막아 정차를 유도하십시오.',line:['Maya','시동 걸렸어. 정면으로 밀지 마. 옆에서 따라붙거나 안전하게 길을 막아.']},
  {set:'chapter-delivery',event:'delivered',goal:workshop.bay,checkpoint:workshop.entry,
   objective:'회수한 차량에 탑승해 Keel Motor Works의 정비 구역에 정차',line:['Maya','운전석이 비었어. 그 차를 정비 구역 안쪽에 세워. 내가 살펴볼게.']},
  {set:'chapter-invoice',event:'invoice',goal:workshop.desk,checkpoint:workshop.entry,action:'차량에서 발견한 명세서 확인',
   objective:'차에서 내린 뒤 정비 기록대에서 Maya와 명세서 확인',line:['Maya','빨간 도장 보여? 첫 거래 때 네가 가져온 명세서와 같은 도장이야.']}
 ]
}
