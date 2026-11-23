import * as T from './vendor/three.module.js';

const atlas=await (await fetch(new URL('./art/shelves/index.json',import.meta.url))).json();
const slots=new Map(atlas.art.map((path,index)=>[path,index]));
const sheets=new Map();
const loader=new T.TextureLoader();
export function shelfCover(path){
  const index=slots.get(path);
  if(index===undefined)return null;
  const {grid,tile,pad}=atlas, page=Math.floor(index/(grid*grid));
  if(!sheets.has(page)){
    const map=loader.load(new URL('./art/shelves/'+page+'.webp',import.meta.url).href);
    map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;sheets.set(page,map);
  }
  const inset=pad/tile, slot=index%(grid*grid);
  return {map:sheets.get(page),u:(slot%grid+inset)/grid,
    v:1-(Math.floor(slot/grid)+1-inset)/grid,scale:(1-2*inset)/grid};
}

// Draw a rack once per material. Its original cases still provide individual
// hit targets and transforms for hover, selection, and shelf destinations.
export function batchRack(group){
  group.updateWorldMatrix(true,true);
  const inverse=group.matrixWorld.clone().invert(), buckets=new Map();
  const matrix=new T.Matrix4(), normal=new T.Matrix3(), point=new T.Vector3();
  group.traverse(mesh=>{
    if(!mesh.isMesh)return;
    const material=mesh.material;
    if(!buckets.has(material))buckets.set(material,{positions:[],normals:[],uvs:[],indices:[]});
    const b=buckets.get(material), geometry=mesh.geometry;
    const {position,uv,normal:sourceNormal}=geometry.attributes, offset=b.positions.length/3;
    matrix.multiplyMatrices(inverse,mesh.matrixWorld);normal.getNormalMatrix(matrix);
    for(let i=0;i<position.count;i++){
      point.fromBufferAttribute(position,i).applyMatrix4(matrix);b.positions.push(point.x,point.y,point.z);
      point.fromBufferAttribute(sourceNormal,i).applyNormalMatrix(normal);b.normals.push(point.x,point.y,point.z);
      b.uvs.push(uv.getX(i),uv.getY(i));
    }
    for(const i of geometry.index.array)b.indices.push(offset+i);
    mesh.visible=false;
  });
  for(const [material,b] of buckets){
    const geometry=new T.BufferGeometry();
    geometry.setAttribute('position',new T.Float32BufferAttribute(b.positions,3));
    geometry.setAttribute('normal',new T.Float32BufferAttribute(b.normals,3));
    geometry.setAttribute('uv',new T.Float32BufferAttribute(b.uvs,2));
    geometry.setIndex(b.indices);group.add(new T.Mesh(geometry,material));
  }
}
