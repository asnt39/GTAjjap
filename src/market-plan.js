// Coordinates in metres. Entries face the south pavement of the market road.
export const market = {west:-97, east:-36, north:-58, south:-27, street:-37}
export const premises = [
 {id:'tide-office',title:'Tide Office',name:'조위 관측소',x:-47,skin:'blue_plaster_weathered',color:0x697e83,light:0xffe0b2,
  furnishings:[[2,-2,3,.9,1.1],[-3,-4,1.2,1.8,.6]],tag:'04',action:'야간 관측표 열람',report:'다음 만조는 21시 40분. 관측원 Morgan이 남긴 연필 자국이 마지막 눈금에 걸쳐 있다.'},
 {id:'provisions',title:'Chandlery',name:'선용품점',x:-65,skin:'factory_brick',color:0x866147,light:0xffcc90,
  furnishings:[[-3,0,1.2,1,4],[3,-3,1.2,1.7,3.4]],tag:'05',action:'선용품 주문',report:'야간 작업자를 위한 물품을 구입할 수 있다.'},
 {id:'signal-works',title:'Signal Works',name:'항로등 정비소',x:-83,skin:'worn_corrugated_iron',color:0x527063,light:0xc1e6dd,
  furnishings:[[2,-3,4,1,1.4],[-3,1,1.4,.85,1.4]],tag:'06',action:'등명기 점검표 확인',report:'녹색 등명기 점검 완료. 렌즈 번호 06과 출고 대장의 번호가 일치한다.'}
]
export const front=-46, back=-56
export function marketAccess(x,z,r=0){
 return x<=market.east+r && x>=market.west+r && z>=market.north+r && z<=market.south-r
}
export function insidePremises(x,z){
 return premises.find(p=>Math.abs(x-p.x)<5.4&&z<front&&z>back)
}
export const marketSights=premises.map(p=>({x:p.x+1,z:-51,tag:p.tag,title:p.title,name:p.action,body:p.report}))
export function roomParts(p){
 const x=p.x
 return [
  [x-3.25,1.75,front,4.5,3.5,.24],[x+3.25,1.75,front,4.5,3.5,.24],
  [x,1.75,back,11,3.5,.24],[x-5.5,1.75,-51,.24,3.5,10],[x+5.5,1.75,-51,.24,3.5,10]
 ]
}
export function marketCollision(add){
 for(const p of premises){
  const parts=roomParts(p).concat(p.furnishings.map(([dx,dz,w,h,d])=>[p.x+dx,h/2,-51+dz,w,h,d]))
  for(const [x,,z,w,h,d] of parts)add(x-w/2,x+w/2,z-d/2,z+d/2,h)
 }
}
