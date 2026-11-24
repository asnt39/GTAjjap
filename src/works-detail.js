import {Box3,Group,Vector3} from 'three'
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'

export const worksProps=[
 ['industrial_storage_cart',-136.37,.083,45.14,1.71,1.05,1.05,0,true],
 ['industrial_wall_sconce',-132.1,2.46,48.66,.43,.56,.34,Math.PI],
 ['industrial_wall_sconce',-124.8,2.46,48.66,.43,.56,.34,Math.PI],
 ['barrel_03',-121.3,.083,47.1,.53,.85,.53,0,true],
 ['painted_wooden_bench',-165.1,.083,51.4,1.64,.81,.62,0,true],
 ['rollershutter_window_03',-205,1.28,12.05,2.60,1.62,.20,0],
 ['rollershutter_window_03',-218,1.28,12.55,2.02,1.60,.20,0]
]

export function loadWorksDetail(){return loadDistrictProps('/assets/works/',worksProps,'West Bank sourced fixtures')}

export async function loadDistrictProps(root,props,title){
 const loader=new GLTFLoader(),group=new Group(),sources=new Map()
 group.name=title
 const files=[...new Set(props.map(([id])=>id))]
 const results=await Promise.allSettled(files.map(id=>loader.loadAsync(root+id+'.glb')))
 for(const [index,result] of results.entries())if(result.status==='fulfilled')sources.set(files[index],result.value.scene)
 const bounds=new Box3(),dimensions=new Vector3(),mid=new Vector3()
 for(const [name,x,y,z,w,h,d,angle,,modelWidth=w,modelDepth=d] of props){
  const asset=sources.get(name)
  if(!asset)continue
  const art=asset.clone(),holder=new Group()
  bounds.setFromObject(art).getSize(dimensions);bounds.getCenter(mid)
  art.position.sub(new Vector3(mid.x,bounds.min.y,mid.z))
  holder.scale.set(modelWidth/dimensions.x,h/dimensions.y,modelDepth/dimensions.z)
  holder.position.set(x,y,z);holder.rotation.y=angle;holder.add(art)
  art.traverse(node=>{if(node.isMesh){node.castShadow=true;node.receiveShadow=true}})
  group.add(holder)
 }
 if(!sources.size)throw new Error(title+' could not be loaded')
 const footprints=[]
 for(const [name,x,y,z,w,h,d,,solid] of props){
  if(solid&&sources.has(name))footprints.push([x-w/2,x+w/2,z-d/2,z+d/2,y+h,false,y>.2?y:undefined])
 }
 return {group,footprints,dispose(){
  const geometry=new Set(),materials=new Set(),textures=new Set()
  for(const model of sources.values())model.traverse(node=>{
   if(!node.isMesh)return
   geometry.add(node.geometry)
   for(const material of [].concat(node.material)){
    materials.add(material)
    for(const value of Object.values(material))if(value?.isTexture)textures.add(value)
   }
  })
  for(const item of [...geometry,...materials,...textures])item.dispose()
  for(const tex of textures)tex.source?.data?.close?.()
 }}
}
