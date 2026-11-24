import {BoxGeometry,Group,Mesh,MeshStandardMaterial,SphereGeometry,TorusGeometry} from 'three'

export function grenadeModel(){
 const model=new Group()
 const shell=new MeshStandardMaterial({color:0x667442,roughness:.85})
 const metal=new MeshStandardMaterial({color:0x454b47,metalness:.55,roughness:.5})
 const mark=new MeshStandardMaterial({color:0xd3b458,roughness:.85})
 const body=new Mesh(new SphereGeometry(.064,10,8),shell)
 body.scale.y=1.28;model.add(body)
 const cap=new Mesh(new BoxGeometry(.072,.039,.062),metal)
 cap.position.y=.082;model.add(cap)
 const lever=new Mesh(new BoxGeometry(.018,.11,.031),metal)
 lever.position.set(.057,.036,0);lever.rotation.z=-.16;model.add(lever)
 const band=new Mesh(new TorusGeometry(.049,.005,5,12),mark)
 band.rotation.x=Math.PI/2;band.position.y=.045;model.add(band)
 return model
}
