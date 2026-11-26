import * as T from 'three'

// Close-range displays share the furnishings' single vertex-colour draw.
export function roomDetails(r,add){
 const back=-r.depth/2,half=r.width/2
 const timber=0x684734,bronze=0x786249,cream=0xe4cba3,teal=0x587572
 function block(x,y,z,w,h,d,tint){add(new T.BoxGeometry(w,h,d).translate(x,y,z),tint)}
 function round(x,y,z,w,h,d,tint){add(new T.SphereGeometry(1,9,6).scale(w,h,d).translate(x,y,z),tint)}
 function pot(x,y,z,rad,h,tint){add(new T.CylinderGeometry(rad,rad*.8,h,10).translate(x,y+h/2,z),tint)}
 for(const s of [-1,1])block(s*(half-.222),.25,0,.055,.31,r.depth-.43,timber)
 block(0,.25,back+.22,r.width-.41,.31,.055,timber)
 const lampX=r.use==='home'?0:-half*.47
 block(lampX,2.99,-.1,.035,.36,.035,bronze)
 add(new T.ConeGeometry(.31,.23,12).translate(lampX,2.72,-.1),cream)
 if(r.use==='cafe'){
  const x=half-.85,z=back+.83
  block(x,1.28,z,1.19,.035,.84,bronze)
  if(r.index===0){
   for(let i=0;i<5;i++)round(x+(i%3-1)*.33,1.38,z+Math.floor(i/3)*.31-.15,.17,.092,.125,i%2?0xab763e:0xc99150)
   for(const s of [-1,1])block(x+s*.62,1.47,z-.36,.035,.47,.04,bronze)
   block(x,1.72,z-.20,1.34,.055,.58,timber)
  }else{
   block(x-.17,1.51,z,.60,.41,.43,teal)
   for(const off of [-.13,.12])pot(x+off-.17,1.72,z,.092,.14,cream)
  }
  // A framed chalkboard and open crockery rail above the service counter.
  block(-.24,1.95,back+.235,1.64,1.06,.08,timber)
  block(-.24,1.95,back+.282,1.52,.94,.023,0x314847)
  for(let i=0;i<5;i++)block(-.38+(i%2)*.11,2.22-i*.12,back+.302,.89-(i%3)*.13,.02,.012,cream)
  block(-half+.94,1.56,back+.4,1.30,.08,.38,timber)
  for(let i=0;i<4;i++)pot(-half+.48+i*.3,1.61,back+.42,.095,.16,i%2?cream:teal)
 }else if(r.use==='home'){
  // Recessed picture rail and framed harbour silhouettes inside the sitting room.
  block(0,1.86,back+.24,1.72,.97,.07,timber)
  block(0,1.86,back+.28,1.60,.85,.04,0x96aaa4)
  for(let k=0;k<7;k++)block(-.62+k*.20,1.59+k%3*.04,back+.31,.18,.21+k%3*.09,.02,0x536765)
  round(-half+.87,.90,-.60,.26,.16,.25,0xaa745c)
 }else if(r.use==='office'){
  block(half-1.16,.88,back+1.02,.61,.04,.25,0x384247)
  for(let j=0;j<3;j++)block(half-1.73,.89+j*.022,back+.81,.29,.019,.41,cream)
  block(-.1,1.85,back+.24,1.15,.8,.06,timber);block(-.1,1.85,back+.28,1.06,.72,.035,cream)
 }else if(r.use==='workshop'){
  const x=-half+.87
  block(x+.33,1.91,back+.24,1.95,.84,.08,0x6a7066)
  for(let j=0;j<5;j++){
   const dx=x-.35+j*.28
   block(dx,1.88,back+.30,.048,.39,.06,bronze);block(dx,1.67,back+.31,.081,.14,.08,j%2?teal:timber)
  }
 }else{
  for(const side of [-1,1]){
   block(side*(half-.94),2.12,back+.79,.94,.08,.43,timber)
   for(let k=0;k<3;k++)pot(side*(half-.94)+.24*(k-1),2.18,back+.79,.095,.22,k%2?teal:cream)
  }
 }
}
