import * as T from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {retroPackage} from './game-packages.js';
import {shelfInserts,shelfJCard,detailInserts} from './package-prints.js';

// Native Blender dimensions in millimetres. Individual editions are scaled to caseSpec.
const dimensions={dvd:[135,190,14],bluray:[135,171,12],game:[135,171,14],
  boxset:[135,190,25],vinyl:[315,315,3],cd:[142,125,10.4],cassette:[109,69.6,16.8],
  carton:[127,127,25],clamshell:[145,195,27],handheld:[135,122,15],book:[145,220,20]};
const printSlots=new Set(['MAT_FRONT','MAT_BACK','MAT_SPINE','MAT_BAND']);
const modelLoader=new GLTFLoader();

function modelId(item,spec){
  if(spec.kind==='retail'){
    const system=retroPackage(item.platform)?.[0];
    if(system==='PlayStation')return 'cd';
    if(system==='Sega Genesis')return 'clamshell';
    if(item.category==='switch'||system==='Nintendo DS'||system==='Nintendo 3DS')return 'handheld';
    if(['Nintendo GameCube','PlayStation 2','PlayStation Portable','Xbox'].includes(system))return 'dvd';
    return 'carton';
  }
  if(spec.kind==='game'&&item.platform==='PlayStation')return 'cd';
  return spec.kind;
}
function bake(parts){
  const byMaterial=new Map();
  parts.traverse(node=>{
    if(!node.isMesh)return;
    const material=node.material,graphic=printSlots.has(material.name);
    const geometry=node.geometry.clone().applyMatrix4(node.matrixWorld);
    // Blender glTF uses top-left texture UVs. Our CanvasTextures and shelf atlas use bottom-left.
    if(graphic){
      const uv=geometry.attributes.uv;
      for(let i=0;i<uv.count;i++)uv.setY(i,1-uv.getY(i));
    }
    if(!byMaterial.has(material))byMaterial.set(material,[]);
    byMaterial.get(material).push(geometry);
  });
  return [...byMaterial].map(([material,geometries])=>{
    const geometry=geometries.length===1?geometries[0]:mergeGeometries(geometries);
    if(geometries.length>1)geometries.forEach(g=>g.dispose());
    return {geometry,material,slot:material.name};
  });
}
function fallback(id){
  const [w,h,d]=dimensions[id].map(mm=>mm/1000);
  const shell=new T.MeshStandardMaterial({color:'#37383a',roughness:.55});
  const body={geometry:new T.BoxGeometry(w,h,d),material:shell,slot:'MAT_SHELL'};
  const face=(name,geom)=>({slot:name,geometry:geom,material:null});
  const sections=[body,face('MAT_FRONT',new T.PlaneGeometry(w*.97,h*.97).translate(0,0,d/2+.00008)),
    face('MAT_BACK',new T.PlaneGeometry(w*.97,h*.97).rotateY(Math.PI).translate(0,0,-d/2-.00008)),
    face('MAT_SPINE',new T.PlaneGeometry(d*.94,h*.97).rotateY(-Math.PI/2).translate(-w/2-.00008,0,0))];
  return {shelf:sections,detail:sections};
}
async function loadModel(id){
  try{
    const {scene}=await modelLoader.loadAsync(new URL('./models/packaging/'+id+'.glb',import.meta.url).href);
    scene.updateMatrixWorld(true);
    const level=prefix=>{
      const root=scene.getObjectByProperty('name',prefix+'_'+id);
      if(!root)throw Error('Missing '+prefix+' geometry');
      return bake(root);
    };
    return [id,{shelf:level('Shelf'),detail:level('Detail')}];
  }catch(e){
    console.warn('Could not load the '+id+' package',e);
    return [id,fallback(id)];
  }
}
const models=new Map(await Promise.all(Object.keys(dimensions).map(loadModel)));
const tints=new Map(),paper=new WeakMap(),jacketStock=new WeakMap();
function printed(map,vinyl){
  const cache=vinyl?jacketStock:paper;
  if(!cache.has(map))cache.set(map,new T.MeshStandardMaterial({map,roughness:vinyl ? .83 : .57,metalness:0}));
  return cache.get(map);
}
function tinted(part,color){
  const key=part.material.uuid+color;
  if(!tints.has(key)){
    const m=part.material.clone();m.color.set(color);tints.set(key,m);
  }
  return tints.get(key);
}
function withUVs(base,tile){
  const geometry=base.clone(),uv=geometry.attributes.uv;
  for(let i=0;i<uv.count;i++)uv.setXY(i,tile.u+uv.getX(i)*tile.sx,tile.v+uv.getY(i)*tile.sy);
  return geometry;
}
const hitGeometry=new T.BoxGeometry(1,1,1);
const hitMaterial=new T.MeshBasicMaterial();
export function makePackage(item,spec,onShelf,cover,band){
  const id=modelId(item,spec), model=models.get(id), group=new T.Group(),visual=new T.Group();
  group.name=item.title;group.userData.itemId=item.id;
  visual.name=(onShelf?'Shelf_':'Detail_')+id;
  visual.userData.shelfPackageVisual=onShelf;
  const [w,h,d]=dimensions[id];
  visual.scale.set(spec.w*1000/w,spec.h*1000/h,spec.d*1000/d);
  group.add(visual);
  const inserts=onShelf?shelfInserts(item,spec):detailInserts(item,spec);
  const front=onShelf&&id==='cassette'&&cover.ready?shelfJCard(item,cover):cover;
  const prints={MAT_FRONT:front,MAT_BACK:inserts.back,MAT_SPINE:inserts.spine,MAT_BAND:{map:band}};
  const generatedGeometry=[];
  const detailPaper=onShelf?null:new T.MeshStandardMaterial({map:inserts.map,roughness:id==='vinyl' ? .83 : .66});
  for(const part of onShelf?model.shelf:model.detail){
    const tile=prints[part.slot];
    let geometry=part.geometry,material=part.material;
    if(tile?.map){
      material=tile.map===inserts.map&&detailPaper?detailPaper:printed(tile.map,id==='vinyl');
      if(!onShelf&&tile.sx){
        geometry=withUVs(geometry,tile);
        generatedGeometry.push(geometry);
      }
    }else if(part.slot==='MAT_SHELL' && (spec.kind==='game'||spec.kind==='bluray'||spec.kind==='retail'&&(id==='dvd'||id==='handheld'||id==='clamshell'))){
      material=tinted(part,spec.shell);
    }
    const mesh=new T.Mesh(geometry,material);
    mesh.name=part.slot;
    if(onShelf){
      if(tile?.sx)mesh.userData.printTile=tile;
      else mesh.userData.packageHardware=true;
    }
    visual.add(mesh);
  }
  // Remains in the original case group after the visible meshes have been batched.
  // The separate pick volume gives an exact world-sized outline and one target per item.
  let shell=null;
  if(onShelf){
    shell=new T.Mesh(hitGeometry,hitMaterial);shell.name='Case pick volume';
    shell.scale.set(spec.w,spec.h,spec.d);shell.visible=false;group.add(shell);
  }
  return {group,spec,shell,dispose:onShelf?null:()=>{
    for(const geometry of generatedGeometry)geometry.dispose();
    detailPaper.dispose();inserts.map.dispose();
  }};
}
