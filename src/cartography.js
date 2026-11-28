import {basinGreen,basinLots} from './south-basin-plan.js'
import {shopSite,oldShopWorkshop} from './weapon-shop-plan.js'
import {citySpots} from './city-life-plan.js'
import {crossings,loadingCourt,pocketGarden} from './street-plan.js'
import {terraceRooms,terracePoint} from './terrace-plan.js'
import {clockCourt,townRoadSurface,townPavement} from './old-town-plan.js'
import {premises} from './market-plan.js'
import {sights} from './navigation.js'
import {beachGate,coastalBoats,coastalRocks,dock,shoreNorth,shoreSouth,shoreX,shoal} from './coast-plan.js'
export function drawMap(canvas,player,yaw,overview=false,cars=null,goal=null,hostiles=[]){
 const d=Math.min(window.devicePixelRatio||1,2),w=canvas.clientWidth,h=canvas.clientHeight
 if(!w||!h)return
 if(canvas.width!==Math.round(w*d)||canvas.height!==Math.round(h*d)){canvas.width=Math.round(w*d);canvas.height=Math.round(h*d)}
 const c=canvas.getContext('2d');c.setTransform(d,0,0,d,0,0);c.clearRect(0,0,w,h)
 const scale=overview? Math.min(w/448,h/386):1.78*Math.min(1,w/116), cx=overview?-12:player.x,cz=overview?84:player.z
 c.translate(w*.5,h*.5);c.scale(scale,scale);c.translate(-cx,-cz)
 const rect=(x,z,a,b,fill)=>{c.fillStyle=fill;c.fillRect(x,z,a,b)}
 rect(-400,-400,800,800,'#283534');rect(26,-400,400,800,'#294950')
 c.beginPath();c.moveTo(26,shoreNorth)
 for(let z=shoreNorth;z<=shoreSouth;z+=2)c.lineTo(shoreX(z),z)
 c.lineTo(26,shoreSouth);c.closePath();c.fillStyle='#a49472';c.fill()
 c.beginPath();c.ellipse(shoal.x,shoal.z,shoal.rx,shoal.rz,0,0,Math.PI*2);c.fill()
 rect(24,beachGate.z-2.1,24,4.2,'#91816a')
 rect(dock.west,dock.z-dock.half,dock.east-dock.west,dock.half*2,'#b09b78')
 c.fillStyle='#615e54'
 for(const rock of coastalRocks){
  c.beginPath();c.ellipse(rock.x,rock.z,rock.rx*.82,rock.rz*.80,0,0,Math.PI*2);c.fill()
 }
 for(const boat of coastalBoats)rect(boat.x-1.15,boat.z-1.15,2.3,2.3,'#abd5cb')
 for(let j=-4;j<=4;j++){const z=j*44+8;rect(26,z,9,6,'#34403d');rect(26,z+6,9,1,'#6c7468')}
 for(let j=0;j<19;j++){const z=-90+j*8;rect(14,z,7.5,3,'#46524a');rect(17,z+3.6,6,2,'#424e46')}
 function road(points,width){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle='#84908a';c.lineWidth=width+1.2;c.stroke();c.strokeStyle='#576662';c.lineWidth=width;c.stroke()}
 road([[0,-101],[0,63]],12);road([[-97,-37],[25.3,-37]],12)
 c.setLineDash([2.5,4]);c.lineWidth=.5;c.strokeStyle='#abb19a';c.beginPath();c.moveTo(0,-101);c.lineTo(0,63);c.stroke();c.setLineDash([])
 for(const [a,b,n,s] of townPavement)rect(a,n,b-a,s-n,'#6c6352')
 for(const [a,b,n,s] of townRoadSurface)rect(a,n,b-a,s-n,'#57534b')
 for(const [bounds,color] of [[loadingCourt,'#45575a'],[pocketGarden,'#475943']]){
  const [a,b,n,s]=bounds;rect(a,n,b-a,s-n,color)
 }
 for(const {bounds:[a,b,n,s]} of basinGreen)rect(a,n,b-a,s-n,'#52674e')
 for(const [a,b,n,s] of basinLots)rect(a,n,b-a,s-n,'#5d6158')
 for(const crossing of crossings){
  const along=crossing.axis==='z'
  rect(crossing.x-(along?crossing.span:crossing.width)*.5,crossing.z-(along?crossing.width:crossing.span)*.5,
   along?crossing.span:crossing.width,along?crossing.width:crossing.span,'#858780')
 }
 for(const spot of citySpots){
  if(overview&&!['atm','recreation','repair'].includes(spot.type))continue
  if(!overview&&Math.hypot(spot.x-player.x,spot.z-player.z)>70)continue
  rect(spot.x-1,spot.z-1,2,2,'#b4dbbe')
 }
 rect(oldShopWorkshop.left,oldShopWorkshop.back,oldShopWorkshop.right-oldShopWorkshop.left,oldShopWorkshop.front-oldShopWorkshop.back,'#5d6256')
 rect(shopSite.x-5,shopSite.z-2.9,10,5.8,'#a78d66')
 for(const r of terraceRooms){
  const w=r.cos?r.width:r.depth,d=r.cos?r.depth:r.width
  rect(r.x-w/2,r.z-d/2,w,d,'#8f816b')
  const p=terracePoint(r,0,r.depth/2);rect(p.x-.75,p.z-.75,1.5,1.5,'#efcf8c')
 }
 rect(clockCourt.x-1.7,clockCourt.z-1.5,3.4,3,'#e1c18c')
 for(const x of [-47,-65,-83])rect(x-5.5,-56,11,10,'#797967')
 for(const building of premises)rect(building.x-5.5,-56,11,10,'#776c5b')
 for(const s of sights){c.save();c.translate(s.x,s.z);c.rotate(Math.PI/4);c.strokeStyle=s.tag==='ARM'?'#ffe2a0':'#f4af77';c.fillStyle=s.tag==='ARM'?'#5b4627':'#283937';c.lineWidth=1/scale;c.fillRect(-2.2,-2.2,4.4,4.4);c.strokeRect(-2.2,-2.2,4.4,4.4);c.restore();if(overview){c.fillStyle='#f9d2ad';c.font='600 5px "Noto Sans KR", sans-serif';c.fillText(s.tag,s.x+3,s.z-2)}}
 for(const car of (Array.isArray(cars)?cars:cars?[cars]:[]))if(Math.hypot(car.x-player.x,car.z-player.z)>1.5){
  c.save();c.translate(car.x,car.z);c.rotate(car.heading);c.fillStyle='#dbe2cf';c.fillRect(-1.6,-3.3,3.2,6.6);c.fillStyle='#566963';c.fillRect(-1.2,-1.45,2.4,2.5);c.restore()
 }
 if(goal){
  const limitX=(w*.5-9)/scale,limitZ=(h*.5-9)/scale
  const dx=goal.x-cx,dz=goal.z-cz
  const radial=Math.min(1,(Math.min(w,h)*.5-10)/(scale*Math.hypot(dx,dz)))
  const gx=cx+(overview?Math.max(-limitX,Math.min(limitX,dx)):dx*radial)
  const gz=cz+(overview?Math.max(-limitZ,Math.min(limitZ,dz)):dz*radial)
  c.save();c.translate(gx,gz);c.scale(1/scale,1/scale);c.rotate(Math.PI/4)
  c.fillStyle='#ffcf8d';c.strokeStyle='#2b2520';c.lineWidth=1.4;c.fillRect(-4.5,-4.5,9,9);c.strokeRect(-4.5,-4.5,9,9);c.restore()
 }
 for(const {x,z} of hostiles){
  c.beginPath();c.arc(x,z,3.8/scale,0,Math.PI*2);c.fillStyle='#ff4a51';c.fill()
  c.strokeStyle='#351013';c.lineWidth=1.3/scale;c.stroke()
 }
 c.translate(player.x,player.z);c.rotate(yaw);c.scale(1/scale,1/scale)
 c.fillStyle='#ecaf7730';c.beginPath();c.moveTo(0,0);c.arc(0,0,27,-Math.PI*.66,-Math.PI*.34);c.fill()
 c.beginPath();c.moveTo(0,-8);c.lineTo(5.6,6);c.lineTo(0,3.8);c.lineTo(-5.6,6);c.closePath();c.strokeStyle='#452e23';c.lineWidth=2.5;c.stroke();c.fillStyle='#ff9b5d';c.fill()
}
