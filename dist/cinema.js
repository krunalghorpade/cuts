import * as T from './vendor/three.module.js';
import {addTelevision} from './displays.js';
import {cinemaSteps} from './plan.js';

const loader=new T.TextureLoader();
function finish(name,file,tile,roughness,color){
  const map=loader.load(new URL('./art/'+file+'.webp',import.meta.url).href);
  map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=4;
  const material=new T.MeshStandardMaterial({name,map,roughness,color});
  material.userData.metresPerTile=tile;return material;
}
const slate=finish('Honed slate','cinema-slate',2.85,.71,'#b2ab9d');
const walnut=finish('Smoked walnut','cinema-walnut',1.4,.52,'#a18f7f');
const edge=new T.MeshStandardMaterial({name:'Ebonised frames',color:'#21211c',roughness:.52,metalness:.14});
const velvet=new T.MeshStandardMaterial({name:'Screen masking',color:'#111210',roughness:1});
const aisle=new T.MeshBasicMaterial({name:'Aisle guidance',color:'#efba7a'});
export const cinemaShelfFinishes={walnut,edge};

async function placeModels(parent,stem,positions){
  const {GLTFLoader}=await import('./vendor/GLTFLoader.js');
  const {scene}=await new GLTFLoader().loadAsync(new URL('./models/'+stem+'.glb',import.meta.url).href);
  scene.updateMatrixWorld(true);
  const family=new T.Group();family.name='L01_CINEMA_'+stem.toUpperCase();
  scene.traverse(part=>{
    if(!part.isMesh)return;
    const mesh=new T.InstancedMesh(part.geometry,part.material,positions.length);
    if(stem==='cinema-architecture'&&part.material.name.startsWith('Walnut')){
      part.material.roughness=.73;
    }
    if(stem==='cinema-lounge-seat'&&part.material.map&&part.material.normalMap){
      part.material.map.repeat.multiplyScalar(1.6);
      part.material.normalMap.repeat.copy(part.material.map.repeat);
      part.material.normalScale.multiplyScalar(.60);
    }
    mesh.name=part.name;
    positions.forEach(([x,y,z],i)=>{
      mesh.setMatrixAt(i,new T.Matrix4().makeTranslation(x,y,z).multiply(part.matrixWorld));
    });
    mesh.computeBoundingSphere();family.add(mesh);
  });
  parent.add(family);return family;
}

// Cabinet objects live in the reserved upper display niche, above the final inventory row.
export function dressCinemaCabinet(parent,surface){
  return placeModels(parent,'cinema-shelf-objects',[[0,surface,0]])
    .catch(error=>console.error('Cinema cabinet objects could not be loaded',error));
}

export function buildCinema({group,box,block,shadow,screens}){
  const modelRoot=new T.Group();modelRoot.name='L01_PRIVATE_MOVIE_THEATRE';group.add(modelRoot);
  const practicals=[];
  function lamp(x,y,z,power,reach,color){
    const light=new T.PointLight(color,power,reach,2);
    light.position.set(x,y,z);modelRoot.add(light);practicals.push([light,power]);
  }
  box(-4,-.10,0,8,.20,12,slate);
  // The front left bay carries a masked 16:9 screen. The lobby door is on its right.
  const screenX=-4.95,screenW=4.28,screenH=screenW*9/16;
  box(screenX,2.08,-5.606,screenW+.15,screenH+.15,.105,edge);
  box(screenX,2.08,-5.538,screenW+.089,screenH+.089,.064,velvet);
  const projection=addTelevision(group,'cinema',screenX,2.08,-5.50,screenW,screenH,false,false);
  projection.screen.name='L01_CINEMA_Projection_surface';screens.push(projection);
  const towers=[[-7.35,0,-5.39],[-2.79,0,-5.39]];
  for(const [x,,z] of towers){block(x,z,.30,.36);shadow(x,z,.57,.59);}

  // Two bevel-edged slate treads lift the rear row; thin amber reveals light the nosings.
  for(const {bounds:[x,z,X,Z],height} of cinemaSteps){
    box((x+X)/2,(height-.036)/2,(z+Z)/2,X-x-.035,height-.036,Z-z-.035,edge);
    box((x+X)/2,height-.018,(z+Z)/2,X-x,.036,Z-z,slate);
    box((x+X)/2,height-.044,z+.012,X-x-.12,.009,.012,aisle);
    for(const xx of [x+.012,X-.012])box(xx,height-.044,(z+Z)/2,.012,.009,Z-z-.12,aisle);
  }
  const seats=[];
  for(const [z,y] of [[-.10,.004],[2.22,.203]]){
    for(const x of [-5.43,-4.14,-2.85]){
      seats.push([x,y,z]);block(x,z,1.01,1.06);shadow(x,z,1.39,1.38,y+.009);
    }
  }
  // The cinema-facing rear bay sits east of the clothing-shop doorway.
  block(-2.95,5.57,5.30,.67);
  const ready=Promise.all([
    placeModels(modelRoot,'cinema-lounge-seat',seats),
    placeModels(modelRoot,'cinema-speaker',towers),
    placeModels(modelRoot,'cinema-projector',[[screenX,4.074,2.45]]),
    placeModels(modelRoot,'cinema-architecture',[[0,0,0]]),
    placeModels(modelRoot,'cinema-garden-wall',[[-2.95,0,5.83]])
  ]);
  ready.catch(error=>console.error('Theatre model could not be loaded',error));
  lamp(-5.04,2.30,-4.95,5.6,5.1,'#ced4da');
  lamp(-6.43,2.81,.37,6.4,4.4,'#ffd4a0');
  lamp(-2.2,2.68,4.49,8.2,5.4,'#f8e8bf');
  let bright=false;
  function setHouseLights(on){
    bright=on;
    for(const [light,power] of practicals)light.intensity=power*(bright?1.95:.64);
    aisle.color.set(bright?'#ffddb4':'#e3ad76');
  }
  setHouseLights(false);
  return {ready,setHouseLights,get bright(){return bright;}};
}
