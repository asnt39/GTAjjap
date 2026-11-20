import {premises} from './market-plan.js'
import {sights} from './navigation.js'
export function drawMap(canvas,player,yaw,overview=false,cars=null,goal=null){
 const d=Math.min(window.devicePixelRatio||1,2),w=canvas.clientWidth,h=canvas.clientHeight
 if(!w||!h)return
 if(canvas.width!==Math.round(w*d)||canvas.height!==Math.round(h*d)){canvas.width=Math.round(w*d);canvas.height=Math.round(h*d)}
 const c=canvas.getContext('2d');c.setTransform(d,0,0,d,0,0);c.clearRect(0,0,w,h)
 const scale=overview? Math.min(w/142,h/180):1.78, cx=overview?-35:player.x,cz=overview?-22:player.z
 c.translate(w*.5,h*.5);c.scale(scale,scale);c.translate(-cx,-cz)
 const rect=(x,z,a,b,fill)=>{c.fillStyle=fill;c.fillRect(x,z,a,b)}
 rect(-400,-400,800,800,'#283534');rect(26,-400,400,800,'#294950')
 for(let j=-4;j<=4;j++){const z=j*44+8;rect(26,z,9,6,'#34403d');rect(26,z+6,9,1,'#6c7468')}
 for(let x=-110;x<-10;x+=17){for(let z=-122;z<90;z+=13){if(z>-47&&z<-29)continue;rect(x,z,13,10,'#374541');c.strokeStyle='#4a554b';c.lineWidth=.4;c.strokeRect(x,z,13,10)}}
 for(let j=0;j<19;j++){const z=-90+j*8;rect(14,z,7.5,3,'#46524a');rect(17,z+3.6,6,2,'#424e46')}
 function road(points,width){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle='#84908a';c.lineWidth=width+1.2;c.stroke();c.strokeStyle='#576662';c.lineWidth=width;c.stroke()}
 road([[-1,-150],[0,-93],[0,58],[-8,97]],9);road([[-120,-37],[23,-37]],7);road([[-27,-130],[-27,-40],[-42,33],[-40,90]],3);road([[-104,50],[-8,50],[0,58]],4)
 c.setLineDash([2.5,4]);c.lineWidth=.5;c.strokeStyle='#abb19a';c.beginPath();c.moveTo(0,-105);c.lineTo(0,67);c.stroke();c.setLineDash([])
 for(const x of [-47,-65,-83])rect(x-5.5,-56,11,10,'#797967')
 for(const building of premises)rect(building.x-5.5,-56,11,10,'#776c5b')
 for(const s of sights){c.save();c.translate(s.x,s.z);c.rotate(Math.PI/4);c.strokeStyle='#f4af77';c.fillStyle='#283937';c.lineWidth=1/scale;c.fillRect(-2.2,-2.2,4.4,4.4);c.strokeRect(-2.2,-2.2,4.4,4.4);c.restore();if(overview){c.fillStyle='#f9d2ad';c.font='5px Barlow';c.fillText(s.tag,s.x+3,s.z-2)}}
 for(const car of (Array.isArray(cars)?cars:cars?[cars]:[]))if(Math.hypot(car.x-player.x,car.z-player.z)>1.5){
  c.save();c.translate(car.x,car.z);c.rotate(car.heading);c.fillStyle='#dbe2cf';c.fillRect(-1.6,-3.3,3.2,6.6);c.fillStyle='#566963';c.fillRect(-1.2,-1.45,2.4,2.5);c.restore()
 }
 if(goal){
  const gx=Math.max(cx-w/(2*scale)+8/scale,Math.min(cx+w/(2*scale)-8/scale,goal.x))
  const gz=Math.max(cz-h/(2*scale)+8/scale,Math.min(cz+h/(2*scale)-8/scale,goal.z))
  c.save();c.translate(gx,gz);c.scale(1/scale,1/scale);c.rotate(Math.PI/4)
  c.fillStyle='#ffcf8d';c.strokeStyle='#2b2520';c.lineWidth=1.4;c.fillRect(-4.5,-4.5,9,9);c.strokeRect(-4.5,-4.5,9,9);c.restore()
 }
 c.translate(player.x,player.z);c.rotate(yaw);c.scale(1/scale,1/scale)
 c.fillStyle='#ecaf7730';c.beginPath();c.moveTo(0,0);c.arc(0,0,27,-Math.PI*.66,-Math.PI*.34);c.fill()
 c.beginPath();c.moveTo(0,-8);c.lineTo(5.6,6);c.lineTo(0,3.8);c.lineTo(-5.6,6);c.closePath();c.strokeStyle='#452e23';c.lineWidth=2.5;c.stroke();c.fillStyle='#ff9b5d';c.fill()
}
