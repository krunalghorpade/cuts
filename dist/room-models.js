import {GLTFLoader} from './vendor/GLTFLoader.js';
import {rooms} from './plan.js';
import {roomObstaclesL1,roomDisplayBoundsL1} from './rooms-l1-collisions.js';
import {roomObstaclesL2,roomShelfBoundsL2} from './rooms-l2-collisions.js';
import {roomObstaclesUpper} from './rooms-upper-collisions.js';
import {hangGallery} from './gallery.js';

const loader=new GLTFLoader();
function read(name){return loader.loadAsync(new URL('./models/rooms/'+name+'.glb',import.meta.url).href);}
export function installRoomModels(floors,obstacles,shelfBounds){
  for(const [level,x,z,w,d] of [...roomObstaclesL1.map(a=>[1,...a]),...roomObstaclesL2.map(a=>[2,...a]),...roomObstaclesUpper]){
    obstacles.push({level,x,z,w,d});
  }
  for(const [level,bounds] of [[1,roomDisplayBoundsL1],[2,roomShelfBoundsL2]]){
    for(const [x,z,w,d,bottom,top] of bounds)shelfBounds.push({level,x,z,w,d,bottom,top});
  }
  let structure,gallery;
  const roomLoads=new Map(),ready=new Map();
  function envelope(){
    return structure??=read('architecture').then(({scene})=>{
      const shells=floors.map((_,i)=>scene.getObjectByName('FloorShell_'+(i+1)));
      if(shells.some(model=>!model))throw Error('Missing floor in architectural model');
      shells.forEach((model,i)=>{
        model.position.y=0;floors[i].add(model);
        const fallback=floors[i].getObjectByName('Loading shell');
        if(fallback){fallback.removeFromParent();fallback.traverse(m=>m.geometry?.dispose());}
      });
    }).catch(error=>{structure=null;throw error;});
  }
  function furniture(room){
    if(!roomLoads.has(room.id)){
      const p=read(room.id).then(({scene})=>{
        scene.name='Blender room · '+room.id;floors[room.floor-1].add(scene);
      }).catch(error=>{roomLoads.delete(room.id);throw error;});
      roomLoads.set(room.id,p);
    }
    return roomLoads.get(room.id);
  }
  function loadFloor(level){
    if(ready.has(level))return ready.get(level);
    const list=rooms.filter(r=>r.floor===level&&r.id!=='cinema');
    const load=Promise.all([envelope(),...list.map(furniture),level===3?(gallery??=hangGallery(floors[2]).catch(e=>{gallery=null;throw e;})):null])
      .then(values=>{if(level===3)exhibition=values.at(-1);})
      .catch(error=>{ready.delete(level);throw error;});
    ready.set(level,load);return load;
  }
  let exhibition=null;
  return {loadFloor,tick(now,level){exhibition?.tick(now,level===3);}};
}

const casework=read('box-set-casework');
export async function fitBoxSetRack(group,width,height,extension,shelfLevels){
  const {scene}=await casework,depth=.62+extension;
  function part(name,y,scaleY){
    const model=scene.getObjectByName(name).clone();
    model.position.set(0,y,extension/2);model.scale.set(width/1.72,scaleY,depth/.62);group.add(model);
  }
  part('Carcass',0,height/2.40);part('Plinth',0,shelfLevels[0]/.42);
  for(const y of shelfLevels)part('Deck',y,1);
}
