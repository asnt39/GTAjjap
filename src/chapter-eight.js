import {factory,hideout} from './chapter-sites.js'

const npc=(name,point,options={})=>({name,point,waypoints:factory.nav,...options})
const ally=(name,point,options={})=>npc(name,point,{armed:true,follow:true,...options})
const foe=(name,x,z,variant,y=.083)=>npc(name,{x,y,z},{side:'hostile',armed:true,health:86,variant})
const cover=[{x:-180.5,z:157.7,y:.083},{x:-176.4,z:166.13,y:.083},{x:-173.1,z:161.9,y:.083},
 {x:-164.2,z:166.2,y:.083},{x:-151.1,z:170.9,y:3.283},{x:-157.45,z:160.8,y:3.283},{x:-152.6,z:156.5,y:3.283}]
const northHall={x:-167.2,z:156.1,y:.083},catwalk={x:-153.95,z:170.6,y:3.283},southYard={x:-158.8,z:177.5,y:.083}
export const chapterEight={
 id:'declaration-of-war',title:'선전포고',reward:9600,
 contact:{residentId:'courier',label:'Jack',resident:'Jack',x:7.6,z:16.2,radius:2},
 brief:['Victor','Rivet Foundry가 그쪽 배차 거점이야. 배차 기록을 가져오고, Dobson 부두에 더는 손 못 대게 해. Jack과 Leon은 현장에 있다.'],
 finish:['Victor','부두 동쪽 작업실은 네가 써. 네 차와 장비를 둘 자리가 생겼으니, 이제 누굴 데리고 갈지는 네가 정해. Adrian도 다음 수를 두겠지.'],
 epilogue:{courier:'명의는 넘겨받았고 열쇠도 있지? Breakwater Yard에서 쉬어. 다음 일은 우리가 고를 차례야.'},
 stages:[
  {set:'chapter-factory-rally',event:'briefedFoundry',goal:factory.rally,checkpoint:factory.rally,action:'Jack과 Leon에게서 진입 계획 확인',
   objective:'Rivet Foundry 북측 하역장에서 Jack과 Leon과 집결하고 장비 준비',armed:true,
   actors:[ally('Jack',{x:-171.15,z:149.6,y:.083}),ally('Leon',{x:-168.35,z:149.8,y:.083})],
   line:['Leon','Jack은 시선 끌고, 난 네가 고른 쪽으로 간다. 정문, 자재문, 뒤 하역문 다 열려 있어.']},
  {set:'chapter-factory-entry',event:'enteredFoundry',goal:factory.front,checkpoint:factory.rally,armed:true,commands:true,
   entries:[factory.front,factory.flank,factory.rear],objective:'북측 하역문, 서쪽 자재문, 남쪽 하역문 중 하나로 공장 진입',
   actors:[ally('Jack',factory.rally),ally('Leon',{x:-168.6,z:150,y:.083}),
    foe('Otis',-165.1,155.5,2),foe('Miles',-180.3,154.7,3)],cover,
   line:['Jack','북문은 빠른 대신 바로 보여. 서쪽엔 자재 더미가 있어. 뭘 고르든 내가 반대편 시선은 잡아 볼게.'],
   hint:'서쪽 자재문은 건물 끝을 돌아가면 보입니다. 남쪽 하역문은 도로에서 바로 접근할 수 있습니다.'},
  {set:'chapter-factory-floor',event:'poweredOffice',goal:factory.panel,checkpoint:northHall,armed:true,commands:true,
   objective:'동료와 함께 생산 구역을 돌파하고 작업장 배전반의 전원 차단',action:'배차 설비 전원 차단',
   actors:[ally('Jack',northHall),ally('Leon',{x:-171.05,z:165.25,y:.083}),
    foe('Drew',-175.4,158.58,6),foe('Finn',-162.4,154.2,4),foe('Nolan',-167.1,168.5,5)],cover,
   line:['Leon','저 배전반부터 끊어. 불이 꺼지면 배차실에서 기록을 못 지워. Jack이 옆문 쪽을 봐 줘.']},
  {set:'chapter-factory-upper',event:'accessedOffice',goal:factory.upper,checkpoint:catwalk,armed:true,commands:true,
   objective:'작업장 동쪽 계단을 올라 배차실에 접근하고 Leon을 지원',action:'배차실 비상 통신선 연결',
   actors:[ally('Jack',{x:-154.4,z:171.35,y:3.283}),ally('Leon',{x:-157.4,z:167.65,y:3.283},{follow:false}),
    foe('Grant',-153.2,159.8,6,3.283),foe('Carter',-156.1,154.4,4,3.283)],cover,
   line:['Jack','Leon이 상층에서 발이 묶였어. 같이 붙자. 문 옆에 유선 통신기가 있어.']},
  {set:'chapter-adrian',event:'confronted',goal:factory.dispatch,checkpoint:catwalk,action:'철망 너머 Adrian과 대치',
   objective:'상층 배차실의 안전창 너머에 있는 Adrian과 대화',
   actors:[npc('Adrian',{x:-152.3,z:153.17,y:3.283},{side:'witness'}),npc('Jack',factory.upper)],
   line:['Adrian','Victor가 자네에게 얼마를 약속했지? 그가 감춘 짐을 본 뒤에도, 그 돈이면 충분한가?']},
  {set:'chapter-adrian-chase',event:'adrianLead',goal:southYard,checkpoint:southYard,
   objective:'공장 남쪽 도로에서 도주 차량 추격 · 정차시키거나 이동 경로 확인',
   line:['Jack','남쪽 차가 움직였어. 붙으면 운행장부를 잡을 수 있어. 차를 놓치면 마지막 합류 지점을 기억해.'],
   hint:'남쪽 하역장에 Leon의 차량이 있습니다. 도주 차량의 바깥쪽에서 접근하십시오.',
   actors:[npc('Leon',southYard),npc('Adrian',factory.getaway[0],{side:'witness'})]},
  {set:'chapter-factory-report',event:'reported',goal:hideout.meeting,checkpoint:hideout.entry,action:'Victor에게 공장과 도주 경로 보고',
   objective:'Breakwater Yard에서 Victor에게 보고하고 작업실 인수',
   actors:[npc('Victor',hideout.meeting),npc('Jack',hideout.desk)],
   line:['Victor','Rivet은 우리가 맡는다. 장부든 경로든 알려 줘. 이번으로 끝난다고 생각하진 마.']}
 ]
}
export const freeCrew={
 set:'chapter-free',commands:true,actors:[npc('Maya',hideout.maya),npc('Leon',hideout.leon),npc('Jack',hideout.meeting)]
}
