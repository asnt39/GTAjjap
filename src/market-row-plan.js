export const rowRooms=[
 {id:'chandlery',x:-79.8,z:53,width:7,depth:8.4,turn:1,title:'MARKET ROW CHANDLERY'},
 {id:'lodging',x:-56.9,z:83,width:7.7,depth:7.8,turn:-1,title:'SOUTH ROW LODGING'}
]

export const roomGround=.090,loftFloor=2.623
export const rowStair={left:.86,right:2.60,bottom:2.38,top:-1.49,count:17}

export function rowPoint(room,x,z){return {x:room.x+room.turn*z,z:room.z-room.turn*x}}
export function rowRect(room,x1,x2,z1,z2,top,bottom=0){
 const a=rowPoint(room,x1,z1),b=rowPoint(room,x2,z2)
 return [Math.min(a.x,b.x),Math.max(a.x,b.x),Math.min(a.z,b.z),Math.max(a.z,b.z),top,false,bottom]
}
export function rowRoomAt(x,z){
 return rowRooms.find(room=>Math.abs(x-room.x)<room.depth*.5+.07&&Math.abs(z-room.z)<room.width*.5)??null
}
export function rowCeiling(room,x,feet){
 if(room.id==='chandlery')return 2.93
 const depth=(x-room.x)*room.turn
 return depth<rowStair.top&&feet<loftFloor-.19?loftFloor-.16:5.34
}
export function rowFloor(room,x,z,feet,airborne=false){
 if(room?.id!=='lodging')return roomGround
 const across=(room.z-z)*room.turn,front=(x-room.x)*room.turn
 const step=rowStair
 if(across>=step.left&&across<=step.right&&front<step.bottom&&front>=step.top){
  const grade=(step.bottom-front)/(step.bottom-step.top)
  const floor=roomGround+(loftFloor-roomGround)*grade
  if(!airborne||feet>=floor-.18)return floor
 }
 return front<step.top&&feet>=loftFloor-.17?loftFloor:roomGround
}

export const rowSights=[
 {...rowPoint(rowRooms[0],.65,-1.25),range:1.7,tag:'ROW',name:'선용품점 재고표',title:'Market Row Chandlery',
  body:'돛줄, 랜턴 유리, 윤활유. 오래된 항구에서도 출항 전에 빠뜨릴 수 없는 물건들이야.'},
 {...rowPoint(rowRooms[1],-.85,-2.72),y:loftFloor,range:1.5,tag:'LOFT',name:'숙소의 교대 게시판',title:'South Row Lodging',
  body:'창가 게시판에는 야간 교대가 적혀 있어. 맨 마지막 방은 아침에 들어오는 하역조가 쓰기로 했다.'}
]
