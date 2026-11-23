import {BoxGeometry,Group,InstancedMesh,Mesh,MeshStandardMaterial,Object3D} from 'three'

export function firstWorkRoadblock(scene,boxes){
  // The full paved width at this point is eighteen metres. Keep the
  // visible wall and its collision footprint derived from the same box.
  const bounds=[-9,9,73.6,74.4,.94]
  const [west,east,north,south,height]=bounds
  const center=(north+south)*.5, width=east-west
  const barrier=new Group()
  barrier.name='Breakwater temporary road closure'
  barrier.position.z=center
  const concrete=new MeshStandardMaterial({color:0x787c7b,roughness:.86})
  const orange=new MeshStandardMaterial({color:0xff863c,roughness:.64})
  const pale=new MeshStandardMaterial({color:0xf1e2bd,roughness:.69})
  function box(geometry,material,x,y,z){
    const part=new Mesh(geometry,material)
    part.position.set(x,y,z);barrier.add(part)
    return part
  }
  const wall=box(new BoxGeometry(width,height,south-north),concrete,0,height*.5,0)
  wall.castShadow=wall.receiveShadow=true
  const stripeCount=Math.floor((width-.7)/.76)+1
  const reflectors=new InstancedMesh(new BoxGeometry(.22,.342,.012),pale,2*stripeCount)
  const stamp=new Object3D()
  stamp.rotation.z=-.45
  let stripe=0
  for(const side of [-1,1]){
    box(new BoxGeometry(width-.12,.35,.012),orange,0,.57,side*.405)
    for(let i=0;i<stripeCount;i++){
      stamp.position.set(west+.45+i*.76,.57,side*.413)
      stamp.updateMatrix()
      reflectors.setMatrixAt(stripe++,stamp.matrix)
    }
  }
  barrier.add(reflectors)
  barrier.visible=false;scene.add(barrier)
  return closed=>{
    if(closed===barrier.visible)return false
    barrier.visible=closed
    if(closed)boxes.push(bounds)
    else{
      const index=boxes.indexOf(bounds)
      if(index!==-1)boxes.splice(index,1)
    }
    return true
  }
}
