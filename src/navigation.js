import {onQuay} from './quay-plan.js'
import {weaponShop,shopAccess} from './weapon-shop-plan.js'
import {marketAccess,marketSights} from './market-plan.js'
import {inOldTown} from './old-town-plan.js'
import {westBankSights} from './west-bank-plan.js'
import {garageAccess,garageSight} from './garage.js'
import {archiveAccess} from './chart-room.js'
import {rowSights} from './market-row-plan.js'
export const spawn = { x:-3.4, z:25 }
export const sights = [
 {x:8.1,z:18.5,tag:'01',title:'Harbor Gate',name:'부두 출입 안내',body:'브레이크워터 대로와 하역장 사이에 있는 정문이야. 북쪽으로 걸으면 갠트리 크레인 아래로 컨테이너 야드가 이어져.'},
 {x:14,z:-16,tag:'02',title:'West Quay',name:'서부 부두 안내',body:'이곳에선 선박과 육상 야드를 잇는 주황색 갠트리 크레인을 가까이 볼 수 있어. 강 건너편으로는 항구의 오래된 산업 지대가 보여.'},
 {x:-8.6,z:-38,tag:'03',title:'Market Crossing',name:'시장 교차로 안내',body:'수산물 상점과 창고가 모이는 교차로야. 대로를 따라 남쪽으로 돌아가면 다시 부두 정문에 닿아.'}
].concat(marketSights,westBankSights,garageSight,rowSights,weaponShop)
export function inDocklands(x,z,r=0){
 if(shopAccess(x,z,r))return true
 if(onQuay(x,z,r))return true
 if(marketAccess(x,z,r))return true
 if(z < -101+r || z>58-r || x>25.3-r) return false
 if(x < -10.5+r && !archiveAccess(x,z,r) && (z < -42.7+r || z > -31.3-r || x < -36+r))return false
 if(x>10.7-r && (z< -63+r || z>35-r))return false
 return true
}
export const inDistrict=(x,z,r=0)=>inDocklands(x,z,r)||garageAccess(x,z,r)||inOldTown(x,z,r)
export function canWalk(x,z,boxes,r=.32,feet=-Infinity) {
 if(!inDistrict(x,z,r))return false
 for(const b of boxes.near?.(x,z,r)??boxes){
  if(x+r<=b[0]||x-r>=b[1]||z+r<=b[2]||z-r>=b[3])continue
  if(b[6]>0&&(Number.isFinite(feet)?feet:0)+1.8<b[6]-.01)continue
  if(b[5]&&feet>=b[4]-(b[6]>0?.23:.002))continue
  if(b[6]>0&&feet>=b[4]-.002)continue
  const dx=x-Math.max(b[0],Math.min(b[1],x)), dz=z-Math.max(b[2],Math.min(b[3],z))
  if(dx*dx+dz*dz < r*r)return false
 }
 return true
}
export function movePlayer(pos,dx,dz,boxes,occupied,feet=-Infinity){
 if(!dx&&!dz)return
 const n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.19))
 const stepX=dx/n,stepZ=dz/n
 const clear=(x,z)=>canWalk(x,z,boxes,.32,feet)&&!occupied?.(x,z)
 for(let i=0;i<n;i++){
  if(clear(pos.x+stepX,pos.z+stepZ)){pos.x+=stepX;pos.z+=stepZ;continue}
  if(stepX&&stepZ){
   if(clear(pos.x+stepX,pos.z))pos.x+=stepX
   if(clear(pos.x,pos.z+stepZ))pos.z+=stepZ
  }
 }
}
// A shallow footprint lets a foot remain supported until it steps away from an edge.
export function supportHeight(x,z,feet,floor,surfaces){
 for(const [left,right,north,south,top] of surfaces){
  if(top>floor&&top<=feet+.002&&Math.hypot(x-Math.max(left,Math.min(right,x)),z-Math.max(north,Math.min(south,z)))<.32)floor=top
 }
 return floor
}
export function cameraFraction(from,to,boxes){
 let nearest=1
 const dx=to.x-from.x,dy=to.y-from.y,dz=to.z-from.z
 const left=Math.min(from.x,to.x)-.13,right=Math.max(from.x,to.x)+.13
 const north=Math.min(from.z,to.z)-.13,south=Math.max(from.z,to.z)+.13
 for(const b of boxes){
  if(b[1]<left||b[0]>right||b[3]<north||b[2]>south)continue
  let lo=0,hi=nearest
  for(let axis=0;axis<3;axis++){
   const a=axis===0?from.x:axis===1?from.y:from.z
   const d=axis===0?dx:axis===1?dy:dz
   const min=axis===0?b[0]-.13:axis===1?(b[6]>0?b[6]-.12:-.3):b[2]-.13
   const max=axis===0?b[1]+.13:axis===1?b[4]+.12:b[3]+.13
   if(Math.abs(d)<1e-7){if(a<min||a>max){hi=-1;break}}
   else{
    const q=(min-a)/d,w=(max-a)/d
    lo=Math.max(lo,Math.min(q,w));hi=Math.min(hi,Math.max(q,w))
    if(lo>hi)break
   }
  }
  if(lo<=hi)nearest=Math.min(nearest,Math.max(.02,lo-.025))
 }
 return nearest
}
