import {Mesh,MeshStandardMaterial,CanvasTexture,PlaneGeometry,SRGBColorSpace} from 'three'
import {loftFloor,roomGround,rowRect,rowStair} from './market-row-plan.js'

function lettering(text){
 const card=document.createElement('canvas');card.width=768;card.height=112
 const c=card.getContext('2d');c.fillStyle='#253c36';c.fillRect(0,0,768,112)
 c.strokeStyle='#b99c72';c.lineWidth=3;c.strokeRect(10,9,748,94)
 c.fillStyle='#efdfba';c.font='bold 51px Georgia, serif';c.textAlign='center';c.fillText(text,384,73,690)
 const map=new CanvasTexture(card);map.colorSpace=SRGBColorSpace
 return new MeshStandardMaterial({map,roughness:.82,emissive:0xa67943,emissiveIntensity:.13,emissiveMap:map})
}

export function buildRowShell(room,height,draw,decorate,collide,roomGroup,{facade,trim,iron,wood,lamp,stone,lining,boards,storeFloor,glass}){
 const wing=room.width/2,face=room.depth/2,landing=room.id==='lodging'
 const ceiling=landing?5.34:2.93,door=.88,wall=.23
 const block=(a,b,n,s,bottom,top,material,target,texture=false,standable=false)=>{
  draw((a+b)/2,(bottom+top)/2,(n+s)/2,b-a,top-bottom,s-n,material,texture,0,target)
  const bounds=rowRect(room,a,b,n,s,top,bottom);bounds[5]=standable;collide(...bounds)
 }
 for(const side of [-1,1]){
  const [left,right]=side<0?[-wing,-wing+wall]:[wing-wall,wing]
  block(left,right,-face,face,0,ceiling,facade,undefined,true)
 }
 if(landing){
  const left=.48,right=2.79,sill=3.14,head=4.75
  block(-wing,left,-face,-face+wall,0,ceiling,facade,undefined,true)
  block(right,wing,-face,-face+wall,0,ceiling,facade,undefined,true)
  block(left,right,-face,-face+wall,0,sill,facade,undefined,true)
  block(left,right,-face,-face+wall,head,ceiling,facade,undefined,true)
  block(left,right,-face+.12,-face+.15,sill,head,glass)
  for(const x of [left+.03,(left+right)/2,right-.03])draw(x,(sill+head)/2,-face+.10,.073,head-sill,.18,trim)
  for(const y of [sill,head])draw((left+right)/2,y,-face+.055,right-left+.16,.082,.32,trim)
 }else block(-wing,wing,-face,-face+wall,0,ceiling,facade,undefined,true)
 for(const side of [-1,1]){
  const [left,right]=side<0?[-wing,-door]:[door,wing]
  if(landing)block(left,right,face-wall,face,0,ceiling,facade,undefined,true)
  else{
   block(left,right,face-wall,face,0,.95,facade,undefined,true)
   block(left,right,face-wall,face,2.34,ceiling,facade,undefined,true)
   block(left,right,face-.102,face-.078,.95,2.34,glass)
   for(const x of [left+.11,(left+right)/2,right-.1])draw(x,1.63,face+.021,.047,1.42,.09,trim)
   draw((left+right)/2,1.47,face+.03,right-left,.041,.082,iron)
  }
 }
 block(-door,door,face-wall,face,2.36,ceiling,facade,undefined,true)
 block(-wing,wing,-face,face,ceiling,height+.07,facade,undefined,true)
 for(const side of [-1,1])draw(side*.87,1.18,face+.025,.14,2.36,.18,trim)
 draw(0,2.32,face+.025,1.86,.14,.19,trim)
 block(-.89,-.81,face-1.41,face-.02,roomGround,2.22,wood,roomGroup)
 draw(-.799,1.08,face-1.26,.05,.043,.14,iron,false,0,roomGroup)
 draw(0,.045,face-.12,1.62,.08,.41,stone)
 draw(0,roomGround-.024,0,room.width-.26,.047,room.depth-.22,landing?boards:storeFloor,true,0,roomGroup)
 for(const x of [-wing+.28,wing-.28])draw(x,1.45,-.02,.076,2.73,room.depth-.49,lining,true,0,roomGroup)
 decorate(new Mesh(new PlaneGeometry(Math.min(5.42,room.width-.6),.77),lettering(room.title)),0,landing?2.78:2.73,face+.124)

 if(!landing){
  block(1.31,2.97,-2.96,-.23,roomGround,1.045,wood,roomGroup)
  draw(2.14,1.04,-1.60,1.76,.095,2.84,trim,false,0,roomGroup)
  // Timber bays, glass bottles and painted tins are visible from the doorway.
  block(-3.13,-2.39,-2.85,1.09,roomGround,.92,wood,roomGroup)
  for(let j=0;j<3;j++){
   const y=1.08+j*.43
   draw(-2.77,y,-.90,.69,.075,3.90,wood,false,0,roomGroup)
   for(let k=0;k<7;k++){
    const depth=-2.51+k*.50
    draw(-2.67,y+.128,depth,.19,.19,.17,k%3===0?lamp:k%3===1?iron:trim,false,0,roomGroup)
   }
  }
  draw(.20,2.82,0,2.5,.075,.17,lamp,false,0,roomGroup)
  draw(.04,.096,2.68,1.47,.019,.70,iron,false,0,roomGroup)
  return
 }

 const stair=rowStair,run=(stair.bottom-stair.top)/stair.count
 for(let i=0;i<stair.count;i++){
  const tread=roomGround+(loftFloor-roomGround)*(i+1)/stair.count
  const depth=stair.bottom-(i+.5)*run
  draw((stair.left+stair.right)/2,(tread+roomGround)/2,depth,stair.right-stair.left,tread-roomGround,run+.001,boards,true,0,roomGroup)
  draw((stair.left+stair.right)/2,tread-.011,depth+run*.47,stair.right-stair.left,.020,.026,trim,false,0,roomGroup)
 }
 block(-wing+.16,wing-.16,-face+.18,stair.top,loftFloor-.16,loftFloor,boards,roomGroup,true,true)
 for(const x of [stair.left-.086,stair.right+.086]){
  const runLength=stair.bottom-stair.top,rise=loftFloor-roomGround
  for(let j=0;j<=8;j++)draw(x,roomGround+rise*j/8+.43,stair.bottom-runLength*j/8,.052,.86,.052,iron,false,0,roomGroup)
  draw(x,roomGround+rise/2+.86,(stair.bottom+stair.top)/2,.084,.095,Math.hypot(runLength,rise),wood,false,Math.atan2(rise,runLength),roomGroup)
  // The side panels support the stringers and prevent stepping sideways onto a tread.
  for(let i=0;i<stair.count;i++){
   const z=stair.bottom-i*run,top=roomGround+rise*(i+1)/stair.count+.86
   collide(...rowRect(room,x-.041,x+.041,z-run,z,top))
  }
 }
 for(const [a,b] of [[-wing+.24,stair.left-.02],[stair.right+.02,wing-.24]]){
  for(let x=a+.05;x<b;x+=.35)draw(x,loftFloor+.46,stair.top+.034,.052,.92,.057,iron,false,0,roomGroup)
  draw((a+b)/2,loftFloor+.94,stair.top+.034,b-a,.10,.104,wood,false,0,roomGroup)
  collide(...rowRect(room,a,b,stair.top-.04,stair.top+.11,loftFloor+1.0,loftFloor-.01))
 }
 draw(-1.98,3.84,-face+.29,1.56,.81,.07,wood,false,0,roomGroup)
 for(let i=0;i<4;i++)draw(-2.52+i*.31,3.84+(i%2)*.10,-face+.333,.20,.30,.015,trim,false,0,roomGroup)
 draw(-1.1,4.88,-2.62,1.55,.095,.13,lamp,false,0,roomGroup)
 draw(-1.0,2.29,.51,1.34,.073,.16,lamp,false,0,roomGroup)
}
