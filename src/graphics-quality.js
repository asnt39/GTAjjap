const key='harborline.graphicsQuality.v1'
const next={auto:'high',high:'low',low:'auto'}

export function readQuality(){
 try{
  const saved=localStorage.getItem(key)
  if(Object.hasOwn(next,saved))return saved
 }catch{}
 return 'high'
}
export function writeQuality(quality){
 if(Object.hasOwn(next,quality))try{localStorage.setItem(key,quality)}catch{}
}
export const nextQuality=quality=>next[quality]
export function graphicsProfile(quality,dpr,autoDpr){
 return {
  pixelRatio:quality==='low'?.8:quality==='high'?Math.min(dpr,1.75):autoDpr,
  worldShadows:quality!=='low',
  playerShadows:quality==='high'
 }
}
