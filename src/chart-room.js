// The western shop at Breakwater Ave houses the port chart archive.
export const archive = {
 id:'port-chart-archive', front:-11.25, back:-22.25, south:33.95, north:18.45,
 door:32.04, opening:2.24, ceiling:3.08
}
export function archiveAccess(x,z,r){
 const a=archive
 return x>=a.back+r && x<=-9 && z>=a.north+r && z<=a.south-r &&
  (x<a.front || Math.abs(z-a.door)<=a.opening/2-r)
}
export function buildArchive({cube,rail,panel,addCollider,walls,iron,trim,ledge,lit,lamp,roof,benchModel},height){
 const a=archive, mid=(a.front+a.back)/2, z=(a.north+a.south)/2,depth=a.front-a.back,width=a.south-a.north
 const wall=(x,zz,w,d)=>{
  cube(x,a.ceiling/2,zz,w,a.ceiling,d,walls)
  addCollider(x-w/2,x+w/2,zz-d/2,zz+d/2,a.ceiling)
 }
 wall(a.back+.11,z,.22,width)
 for(const edge of [a.north+.11,a.south-.11])wall(mid,edge,depth,.22)
 for(const [lo,hi] of [[a.north,a.door-a.opening/2],[a.door+a.opening/2,a.south]])wall(a.front-.11,(lo+hi)/2,.22,hi-lo)
 cube(mid,(height+a.ceiling)/2,z,depth,height-a.ceiling,width,walls)
 cube(mid,.032,z,depth,.064,width,roof)
 cube(a.front+.22,.032,a.door,.7,.064,a.opening,roof)
 // Door leaf rests against the inner jamb, leaving the threshold level.
 wall(a.front-.94,a.door+a.opening/2-.09,1.9,.12)
 cube(a.front-.94,1.29,a.door+a.opening/2-.17,1.80,2.46,.08,trim)
 cube(a.front-1.58,1.06,a.door+a.opening/2-.25,.19,.06,.12,ledge)
 const fixture=(x,zz,w,h,d,m)=>{
  cube(x,h/2+.06,zz,w,h,d,m)
  addCollider(x-w/2,x+w/2,zz-d/2,zz+d/2,h+.06)
 }
 // Chart table with raised perimeter, map and brass weights.
 fixture(mid,25.5,2.4,.94,3.1,trim)
 cube(mid,1.04,25.5,2.52,.10,3.22,ledge)
 for(let i=0;i<5;i++)cube(mid-.65+i*.29,1.101,25.3,.024,.012,2.25,trim)
 for(let i=0;i<4;i++)cube(mid,1.113,24.5+i*.48,1.72,.012,.023,trim)
 for(const side of [-1,1])cube(mid+side*.83,1.15,25.5,.11,.10,2.45,iron)
 // Flat-file drawers and sample binders along the west wall.
 for(let k=0;k<3;k++){
  const zz=21.2+4.1*k
  fixture(a.back+.78,zz,1.06,1.55,3.55,iron)
  for(let j=0;j<6;j++){
   cube(a.back+1.33,.24+j*.22,zz,.07,.18,3.34,trim)
   cube(a.back+1.38,.24+j*.22,zz,.08,.04,.48,ledge)
  }
  for(let roll=0;roll<4;roll++){
   const zzRoll=zz-.83+roll*.22
   rail([a.back+.4,1.71,zzRoll],[a.back+1.12,1.71,zzRoll],.087,ledge)
   rail([a.back+.81,1.71,zzRoll],[a.back+.89,1.71,zzRoll],.092,trim)
  }
  panel(a.back+.24,2.29,zz,2.55,1.05,26+k,1,lit)
 }
 // Surveyor's bench along the south wall.
 const benchZ=a.south-.57
 if(!benchModel){
  cube(mid,.56,benchZ,3.4,.12,.66,ledge)
  cube(mid,.98,benchZ+.24,3.4,.34,.10,trim)
  for(const offset of [-1.36,1.36]){
   cube(mid+offset,.32,benchZ,.14,.48,.54,iron)
   cube(mid+offset,.74,benchZ+.25,.10,.68,.08,iron)
  }
 }
 addCollider(mid-1.7,mid+1.7,benchZ-.33,benchZ+.33,1.15)
 for(const zz of [21.4,26,30.6]){
  cube(mid,2.98,zz,2.05,.12,.30,iron)
  cube(mid,2.9,zz,1.92,.045,.22,lamp)
 }
}

// Print the archive's own survey sheet once; reuse it on the table and doorway.
export function archivePrint(){
 const canvas=document.createElement('canvas')
 canvas.width=768;canvas.height=384
 const ctx=canvas.getContext('2d')
 ctx.fillStyle='#e3d9b8';ctx.fillRect(0,0,768,384)
 ctx.fillStyle='#386575';ctx.beginPath();ctx.moveTo(390,89)
 for(let y=89;y<=342;y+=7)ctx.lineTo(389+15*Math.sin(y/21)+7*Math.cos(y/9),y)
 ctx.lineTo(738,343);ctx.lineTo(738,89);ctx.closePath();ctx.fill()
 ctx.strokeStyle='#9aa894';ctx.lineWidth=1
 for(let x=32;x<739;x+=32){ctx.beginPath();ctx.moveTo(x,88);ctx.lineTo(x,344);ctx.stroke()}
 for(let y=88;y<345;y+=32){ctx.beginPath();ctx.moveTo(32,y);ctx.lineTo(738,y);ctx.stroke()}
 ctx.fillStyle='#25383b';ctx.font='bold 47px sans-serif';ctx.fillText('PORTSIDE  /  CHART ROOM',27,65)
 ctx.font='bold 20px monospace';ctx.fillText('QUAY 04',443,191);ctx.fillText('BREAKWATER',83,238)
 ctx.fillText('HYDROGRAPHIC SURVEY     1 : 1250',28,372)
 return canvas
}
