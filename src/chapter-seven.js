import {marina} from './chapter-sites.js'

const maya=(point,extra={})=>({name:'Maya',point,...extra})
export const chapterSeven={
 id:'black-waters',title:'검은 바다',reward:6600,
 contact:{residentId:'courier',label:'Jack',resident:'Jack',x:7.6,z:16.2,radius:2},
 brief:['Theo','Jack 옆에 있어. Elliot이 준 출항 기록을 봤어. 그 배는 Meridian 앞에서 속도를 줄여. Maya가 부두에 먼저 갔어.'],
 finish:['Maya','이건 기계 부품이 아니야. 봉인 안에 항만 출입 증표랑 사람 이름이 있어. Victor가 설명한 것하고 달라. 사본은 우리가 갖자.'],
 stages:[
  {set:'chapter-marina',event:'metMaya',goal:marina.meetup,checkpoint:marina.meetup,action:'Maya와 Theo의 출항 정보 확인',
   objective:'Meridian Marina 끝 부두에서 Maya와 만남',
   line:['Theo','파란 선체에 흰 줄 하나야. 기록에는 Salt Quay로 되어 있어. 그 부두 서쪽에서 내릴 수 있어.'],
   actors:[maya(marina.meetup)]},
  {set:'chapter-sea-track',event:'spottedBoat',goal:marina.meetup,checkpoint:marina.meetup,
   objective:'부두에서 보트에 탑승하여 화물 운반선 가까이 접근',
   line:['Maya','내 자리 비워 둬. 운반선이 우리를 못 봤을 때 어디로 가는지 확인해.'],
   actors:[maya(marina.meetup)],hint:'부두 끝 양쪽에 탈 수 있는 보트가 있습니다. 운반선은 미니맵 표식을 확인하십시오.'},
  {set:'chapter-sea-pursuit',event:'madeLandfall',goal:marina.berth,checkpoint:marina.meetup,
   objective:'운반선을 따라 Salt Quay로 이동하고 하역 부두에 하선',
   line:['Maya','우릴 봤어. 바로 뒤로 붙진 마. 반대편으로 돌면 암초를 피할 수 있어.'],
   actors:[maya(marina.meetup)],hint:'보관소 서쪽 부두가 선착장입니다. 가까이에서 정차한 뒤 하선하십시오.'},
  {set:'chapter-sea-cargo',event:'tookCargo',goal:marina.storage,checkpoint:marina.berth,armed:true,commands:true,
   objective:'Salt Quay 보관소에서 위협을 저지하고 표시된 봉인 상자 회수',action:'표시된 화물 상자 회수',
   line:['Maya','상자 옆 깃발이 Theo가 말한 표식이야. 내가 부두 쪽을 막을게.'],
   cover:[{x:125.5,z:191.5,y:.12},{x:127,z:196.9,y:.12},{x:134.7,z:192,y:.12}],
   actors:[maya(marina.berth,{armed:true,follow:true}),
    {name:'Hugh',point:{x:135.1,z:196.5,y:.12},side:'hostile',armed:true,health:70,variant:8},
    {name:'Ira',point:{x:126.4,z:196.4,y:.12},side:'hostile',armed:true,health:74,variant:1}]},
  {set:'chapter-sea-return',event:'deliveredCargo',goal:marina.meetup,checkpoint:marina.berth,
   objective:'Maya와 함께 보트로 Meridian Marina에 돌아와 부두에 하선',
   line:['Maya','봉인은 우리 쪽 부두에서 확인하자. 물에 빠지면 노란 사다리를 찾아.'],
   actors:[maya(marina.berth)],hint:'Salt Quay와 Meridian Marina 양쪽에 물에서 올라오는 사다리가 있습니다.'},
  {set:'chapter-sea-check',event:'openedCargo',goal:marina.check,checkpoint:marina.meetup,action:'Theo와 봉인 화물 확인',
   objective:'Meridian Marina 화물 확인대에서 Theo와 봉인 내용 확인',
   actors:[{name:'Theo',point:marina.check},maya({x:101.1,z:146.4,y:.12})],
   line:['Theo','서류에 내 이름이 적혀 있어. 그날 내가 본 건 컨테이너 번호 하나뿐이었는데.']}
 ]
}
