import * as T from './vendor/three.module.js';

const atlas=await (await fetch(new URL('./art/shelves/index.json',import.meta.url))).json();
const slots=new Map(atlas.art.map((path,index)=>[path,index]));
const sheets=new Map();
const loader=new T.TextureLoader();
export function shelfCover(path){
  const index=slots.get(path);
  if(index===undefined)return null;
  const {grid,tile,pad}=atlas,page=Math.floor(index/(grid*grid));
  if(!sheets.has(page)){
    let complete;
    const ready=new Promise(resolve=>{complete=resolve;});
    const map=loader.load(new URL('./art/shelves/'+page+'.webp',import.meta.url).href,
      loaded=>complete(loaded),undefined,()=>complete(map));
    map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;sheets.set(page,{map,ready});
  }
  const inset=pad/tile,slot=index%(grid*grid),scale=(1-2*inset)/grid;
  return {...sheets.get(page),u:(slot%grid+inset)/grid,
    v:1-(Math.floor(slot/grid)+1-inset)/grid,scale,sx:scale,sy:scale};
}

// Case hardware uses instances of the same Blender geometry. Individual covers and
// the shop fittings are merged by material; all original selection volumes survive.
export function batchRack(group){
  group.updateWorldMatrix(true,true);
  const inverse=group.matrixWorld.clone().invert(),buckets=new Map(),instances=new Map();
  const matrix=new T.Matrix4(),normal=new T.Matrix3(),point=new T.Vector3(),visuals=[];
  group.traverse(mesh=>{
    if(mesh.userData.shelfPackageVisual)visuals.push(mesh);
    if(!mesh.isMesh||!mesh.visible)return;
    const {material,geometry}=mesh;
    matrix.multiplyMatrices(inverse,mesh.matrixWorld);
    if(mesh.userData.packageHardware){
      if(!instances.has(geometry))instances.set(geometry,new Map());
      const byMaterial=instances.get(geometry);
      if(!byMaterial.has(material))byMaterial.set(material,[]);
      byMaterial.get(material).push(matrix.clone());
    }else{
      if(!buckets.has(material))buckets.set(material,{positions:[],normals:[],uvs:[],indices:[]});
      const b=buckets.get(material),{position,uv,normal:sourceNormal}=geometry.attributes;
      const offset=b.positions.length/3,tile=mesh.userData.printTile;
      normal.getNormalMatrix(matrix);
      for(let i=0;i<position.count;i++){
        point.fromBufferAttribute(position,i).applyMatrix4(matrix);b.positions.push(point.x,point.y,point.z);
        point.fromBufferAttribute(sourceNormal,i).applyNormalMatrix(normal);b.normals.push(point.x,point.y,point.z);
        const u=uv?.getX(i)??0,v=uv?.getY(i)??0;
        if(tile)b.uvs.push(tile.u+u*tile.sx,tile.v+v*tile.sy);else b.uvs.push(u,v);
      }
      if(geometry.index){for(const i of geometry.index.array)b.indices.push(offset+i);}
      else{for(let i=0;i<position.count;i++)b.indices.push(offset+i);}
    }
    mesh.visible=false;
  });
  visuals.forEach(visual=>visual.removeFromParent());
  for(const [geometry,byMaterial] of instances)for(const [material,matrices] of byMaterial){
    const mesh=new T.InstancedMesh(geometry,material,matrices.length);
    mesh.name='Shelf case hardware';matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));
    mesh.computeBoundingSphere();group.add(mesh);
  }
  for(const [material,b] of buckets){
    const geometry=new T.BufferGeometry();
    geometry.setAttribute('position',new T.Float32BufferAttribute(b.positions,3));
    geometry.setAttribute('normal',new T.Float32BufferAttribute(b.normals,3));
    geometry.setAttribute('uv',new T.Float32BufferAttribute(b.uvs,2));
    geometry.setIndex(b.indices);group.add(new T.Mesh(geometry,material));
  }
}
