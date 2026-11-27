// Local coordinates in metres. Sections meet at their shared quay level.
export const basinLand=[
 [-20,26,90,126],[-49,29,126,174],[-43,26,174,209]
]
export const basinRoads=[
 {id:'bridge-approach',axis:'z',mid:0,from:89.5,to:201,width:11,class:'avenue'},
 {id:'mariner-street',axis:'z',mid:18,from:110,to:185,width:9,class:'collector'},
 {id:'switchyard-road',axis:'z',mid:-32,from:140,to:201,width:9,class:'local'},
 {id:'station-crossing',axis:'x',mid:115,from:-5.5,to:22.5,width:10,class:'collector'},
 {id:'basin-crossing',axis:'x',mid:144.5,from:-36.5,to:22.5,width:9,class:'collector'},
 {id:'garden-crossing',axis:'x',mid:180.5,from:-36.5,to:22.5,width:9,class:'collector'},
 {id:'south-turn',axis:'x',mid:197,from:-36.5,to:5.5,width:8,class:'local'}
]
export const roadRect=({axis,mid,from,to,width})=>axis==='z'
 ? [mid-width/2,mid+width/2,from,to]
 : [from,to,mid-width/2,mid+width/2]
export const basinRoadBounds=basinRoads.map(roadRect)

export const basinParcels=[
 {id:'ferry-cafe',title:'Tidelight Café',type:'cafe',door:'pair',row:[-12.3,100,8,8.4,7.5,0,Math.PI/2]},
 {id:'registry',title:'South Basin Registry',type:'office',door:'auto',tower:{floors:5,rise:3.1,shape:'office'},row:[9.6,101.5,9.5,13.9,5.6,2,-Math.PI/2]},
 {id:'station-flats',title:'Meridian Flats',type:'home',door:'hinge',row:[-13,117,9,10.4,8.8,1,Math.PI/2]},
 {id:'clockmaker',title:'Mariner Supply',type:'shop',door:'pair',tower:{floors:4,rise:2.85,shape:'mixed'},row:[9.6,128.5,8,8.9,5.6,0,Math.PI/2]},
 {id:'customs',title:'Customs House',type:'office',door:'slide',row:[-14.2,133,12,15.4,10,1,Math.PI/2]},
 {id:'cooper',title:'Cooper House',type:'home',door:'hinge',loft:true,row:[-21.2,157,9,7.9,8.4,0,-Math.PI/2]},
 {id:'staff-flats',title:'Basin Court Apartments',type:'home',tower:{floors:7,rise:2.9,shape:'housing'},row:[-20.2,170,10.2,11.4,9.6,2,-Math.PI/2]},
 {id:'stores',title:'Pilothouse Stores',type:'workshop',door:'slide',row:[-42.4,158,9.6,8.8,7.05,0,Math.PI/2]},
 {id:'repair',title:'Switchyard Service Shed',type:'workshop',row:[-42.4,169,9,8.2,7.05,1,Math.PI/2]},
 {id:'post',title:'Mariner Post Office',type:'office',row:[9.5,162,12,10.4,5.5,2,Math.PI/2]},
 {id:'terrace',title:'Quarry Row',type:'home',row:[-20.4,188.6,12.5,8.5,6.6,0,0]},
 {id:'inn',title:'Seawall Rooms',type:'home',door:'hinge',row:[-11.7,203.5,9,7.5,3.85,1,Math.PI]}
]
export const basinGreen=[
 {bounds:[7.2,22.4,187.2,205.3],kind:'garden'},
 {bounds:[-26.8,-9.2,151.1,173.5],kind:'residential'},
 {bounds:[-47.8,-38,128.3,138.1],kind:'grove'}
]
export const basinLots=[
 [6.1,13.1,151.2,154.9],[-13.2,-6.1,186.3,191.1]
]
export const basinSights=[
 {x:24.65,z:170.7,tag:'BAS',title:'South Basin Promenade',name:'옛 조수 눈금 읽기',body:'부두를 남쪽으로 옮길 때 이 눈금만 남겼어. 대조기에는 석축 아래 세 번째 금속 고리까지 물이 차올라.'},
 {x:14.9,z:199.9,tag:'VUE',title:'Pilothouse Garden',name:'전망대 안내판',body:'방파제 안으로 들어오는 배를 가장 먼저 보던 곳이야. 지금도 정원 끝에서 창고와 크레인이 한눈에 보여.'}
]
export const basinPlate={id:'pilot-plate',x:21.8,z:203.8,title:'도선 신호판',reward:650}
export const insideBasin=(x,z)=>basinLand.some(([w,e,n,s])=>x>=w&&x<=e&&z>=n&&z<=s)
export function distanceToBasin(x,z){
 return Math.min(...basinLand.map(([w,e,n,s])=>Math.hypot(Math.max(w-x,x-e,0),Math.max(n-z,z-s,0))))
}

export const basinPromenade=[[23.2,25.9,94,209],[23.5,28,129,171]]
export const basinCrossings=[
 {axis:'z',mid:0,at:106,span:11},{axis:'z',mid:0,at:137.2,span:11},
 {axis:'z',mid:0,at:173.4,span:11},{axis:'z',mid:18,at:152.2,span:9},
 {axis:'x',mid:180.5,at:8.9,span:9},{axis:'z',mid:-32,at:151.2,span:9}
]
