import {BoxGeometry,CylinderGeometry,Group,Mesh,MeshStandardMaterial,Vector3} from 'three'

// Authored game prop. +Z is the forward axis of the shared equipment socket.
export function sniperModel(){
 const model=new Group()
 const dark=new MeshStandardMaterial({color:0x272b2a,metalness:.44,roughness:.42})
 const alloy=new MeshStandardMaterial({color:0x566064,metalness:.65,roughness:.31})
 const stock=new MeshStandardMaterial({color:0x55604a,roughness:.68})
 const glass=new MeshStandardMaterial({color:0x294d61,metalness:.43,roughness:.16})
 function box(material,x,y,z,w,h,d){
  const mesh=new Mesh(new BoxGeometry(w,h,d),material)
  mesh.position.set(x,y,z);mesh.castShadow=true;model.add(mesh);return mesh
 }
 function tube(material,radius,length,y,z,rim=radius){
  const mesh=new Mesh(new CylinderGeometry(radius,rim,length,14).rotateX(Math.PI/2),material)
  mesh.position.set(0,y,z);mesh.castShadow=true;model.add(mesh)
 }
 box(stock,0,-.045,-.254,.069,.113,.35)
 box(dark,0,-.039,-.432,.076,.129,.022)
 box(alloy,0,.025,-.056,.080,.082,.29)
 box(stock,0,-.048,.157,.090,.063,.295)
 box(dark,0,-.098,.031,.054,.084,.10)
 box(dark,0,-.115,-.097,.055,.14,.09).rotation.x=-.27
 tube(dark,.020,.45,.035,.385)
 tube(alloy,.033,.085,.035,.608)
 tube(dark,.046,.28,.142,-.072)
 tube(alloy,.06,.082,.142,.067)
 tube(glass,.050,.005,.142,.112)
 tube(alloy,.051,.062,.142,-.211)
 tube(glass,.040,.005,.142,-.244)
 for(const z of [-.13,.034])box(dark,0,.09,z,.055,.074,.04)
 const bolt=new Group();bolt.name='Bolt'
 const handle=box(alloy,.062,.069,-.14,.043,.032,.046)
 bolt.add(handle);model.add(bolt)
 box(alloy,0,.198,-.049,.057,.031,.047)
 const end=new Group();end.name='End';end.position.copy(new Vector3(0,.035,.657));model.add(end)
 const lens=new Group();lens.name='ScopeView';lens.position.set(0,.142,.135);model.add(lens)
 return model
}
