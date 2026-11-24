import {GLTFLoader} from './vendor/GLTFLoader.js';
import {rooms} from './plan.js';
import {roomObstaclesL1,roomDisplayBoundsL1} from './rooms-l1-collisions.js';
import {roomObstaclesL2,roomShelfBoundsL2} from './rooms-l2-collisions.js';
import {roomObstaclesUpper} from './rooms-upper-collisions.js';
import {installPlayStation2} from './retro-showcase.js';
import {hangGallery} from './gallery.js';

const loader=new GLTFLoader();
const venomDisplay={x:11.65,z:5.55,yaw:-2.03,diameter:1.22};
function read(name){return loader.loadAsync(new URL('./models/rooms/'+name+'.glb',import.meta.url).href);}
export function installRoomModels(floors,obstacles,shelfBounds){
  for(const [level,x,z,w,d] of [...roomObstaclesL1.map(a=>[1,...a]),...roomObstaclesL2.map(a=>[2,...a]),...roomObstaclesUpper]){
    obstacles.push({level,x,z,w,d});
  }
  for(const [level,bounds] of [[1,roomDisplayBoundsL1],[2,roomShelfBoundsL2]]){
    for(const [x,z,w,d,bottom,top] of bounds)shelfBounds.push({level,x,z,w,d,bottom,top});
  }
  obstacles.push({level:2,x:venomDisplay.x,z:venomDisplay.z,w:venomDisplay.diameter,d:venomDisplay.diameter});
  let structure,gallery,consoleLoad;
  const displayTargets=floors.map(()=>[]);
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
      const exhibit=room.id==='collect' ? read('venom-display') : null;
      const p=Promise.all([read(room.id),exhibit]).then(([{scene},model])=>{
        if(model){
          const display=model.scene;
          display.name='Venom (2018)';
          display.position.set(venomDisplay.x,0,venomDisplay.z);
          display.rotation.y=venomDisplay.yaw;
          scene.add(display);
        }
        scene.name='Blender room · '+room.id;floors[room.floor-1].add(scene);return scene;
      }).catch(error=>{roomLoads.delete(room.id);throw error;});
      roomLoads.set(room.id,p);
    }
    const base=roomLoads.get(room.id);
    if(room.id!=='retro')return base;
    return consoleLoad??=base.then(scene=>installPlayStation2(scene,loader))
      .then(target=>{displayTargets[room.floor-1].push(target);})
      .catch(error=>{consoleLoad=null;throw error;});
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
  return {loadFloor,displayTargets,tick(now,level){exhibition?.tick(now,level===3);}};
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
