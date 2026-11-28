// World units are metres. Heights are measured from the finished pavement.
export const skylineTowers = [
 {name:'Portside Spire', x:-60.5, z:161.7, width:32, depth:21, height:166.4, floors:42, color:0x77929a},
 {name:'Meridian West', x:-75.2, z:195.2, width:19, depth:18, height:83.2, floors:22, color:0x78969b},
 {name:'Meridian South', x:-51.7, z:195.2, width:17, depth:19, height:81.8, floors:23, color:0x8e9c9d}
]

export const bunker = {
 bounds:[-84,-53,150,175], floor:-6.4, headroom:3.25,
 shelter:[-84,-79.6,169,172.9],
 entry:{x:-81.8,z:174.05},
 arrival:{x:-81.8,z:172.2},
 exit:{x:-81.8,z:173.45}
}

// Bunker colliders are local to this level. The last element is the height
// above its floor, so the normal walking and camera sweeps can use the same plan.
export const bunkerWalls = [
 [-84.28,-84,149.72,175.28],[-53,-52.72,149.72,175.28],
 [-84,-53,149.72,150],[-84,-53,175,175.28],
 [-78,-77.76,161,168.6],[-78,-77.76,171.5,175],
 [-78,-69.3,160.76,161],[-66.1,-59.6,160.76,161],[-56.4,-53,160.76,161],
 [-66,-65.76,150,156.1],[-66,-65.76,158.5,160.76],
 [-72.2,-70.6,152.3,156.2,.96],[-61.5,-58,150.35,151.45,1.65],
 [-57.3,-54,168.9,171.35,1.3]
].map(([west,east,north,south,height=bunker.headroom])=>[west,east,north,south,height])

export function inBunker(x,z,y){
 const [west,east,north,south]=bunker.bounds
 return y>=bunker.floor-.1&&y<=bunker.floor+bunker.headroom&&x>=west&&x<=east&&z>=north&&z<=south
}

export function bunkerAccess(pos){
 const below=inBunker(pos.x,pos.z,pos.y), point=below?bunker.exit:bunker.entry
 if(Math.abs(pos.y-(below?bunker.floor:.083))>.22||Math.hypot(pos.x-point.x,pos.z-point.z)>1.45)return null
 return below?'exit':'enter'
}

export const skylineSights = [
 {x:-68.3,y:.083,z:173.6,tag:'SPR',title:'Portside Spire',name:'포트사이드 스파이어 안내',body:'사우스 베이슨의 새 업무 지구. 166.4m 높이의 주탑과 메리디언 웨스트·사우스가 부두 너머로 보인다.'},
 {x:bunker.entry.x,y:.083,z:bunker.entry.z,tag:'B1',title:'South Basin Shelter',name:'사우스 베이슨 지하 대피소',body:'도로 옆 콘크리트 출입구의 승강기로 내려가면 비상 대피실과 장비실을 둘러볼 수 있다.'}
]
