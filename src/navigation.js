export const spawn = { x:-3.4, z:25 }
export const sights = [
 {x:8.1,z:18.5,tag:'01',title:'Harbor Gate',name:'부두 출입 안내',body:'브레이크워터 대로와 하역장 사이에 있는 정문이야. 북쪽으로 걸으면 갠트리 크레인 아래로 컨테이너 야드가 이어져.'},
 {x:14,z:-16,tag:'02',title:'West Quay',name:'서부 부두 안내',body:'이곳에선 선박과 육상 야드를 잇는 주황색 갠트리 크레인을 가까이 볼 수 있어. 강 건너편으로는 항구의 오래된 산업 지대가 보여.'},
 {x:-8.6,z:-38,tag:'03',title:'Market Crossing',name:'시장 교차로 안내',body:'수산물 상점과 창고가 모이는 교차로야. 대로를 따라 남쪽으로 돌아가면 다시 부두 정문에 닿아.'}
]
export function inDistrict(x,z,r=0){
 if(z < -101+r || z>58-r || x>25.3-r) return false
 if(x < -10.5+r && (z < -42.7+r || z > -31.3-r || x < -36+r))return false
 if(x>10.7-r && (z< -63+r || z>35-r))return false
 return true
}
export function canWalk(x,z,boxes,r=.32) {
 if(!inDistrict(x,z,r))return false
 return !boxes.some(b=>{
  const dx=x-Math.max(b[0],Math.min(b[1],x)), dz=z-Math.max(b[2],Math.min(b[3],z))
  return dx*dx+dz*dz < r*r
 })
}
export function movePlayer(pos,dx,dz,boxes){
 const n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.19))
 for(let i=0;i<n;i++){
  if(canWalk(pos.x+dx/n,pos.z,boxes))pos.x+=dx/n
  if(canWalk(pos.x,pos.z+dz/n,boxes))pos.z+=dz/n
 }
}
export function cameraFraction(from,to,boxes){
 let nearest=1
 for(const [x1,x2,z1,z2,h] of boxes){
  let lo=0,hi=nearest, intersects=true
  for(const [a,d,min,max] of [[from.x,to.x-from.x,x1-.13,x2+.13],[from.y,to.y-from.y,-.3,h+.12],[from.z,to.z-from.z,z1-.13,z2+.13]]){
   if(Math.abs(d)<1e-7){if(a<min||a>max){intersects=false;break}}else{
    const q=(min-a)/d,w=(max-a)/d;lo=Math.max(lo,Math.min(q,w));hi=Math.min(hi,Math.max(q,w))
    if(lo>hi){intersects=false;break}
   }
  }
  if(intersects && hi>=0 && lo<=1)nearest=Math.min(nearest,Math.max(.02,lo-.025))
 }
 return nearest
}
