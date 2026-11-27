import * as T from './vendor/three.module.js';
import {rise,rooms} from './plan.js';

// Dolly tracks and points of attention are floor-local, in metres. Each move
// stays within a clear aisle, including when seen through a narrow portrait lens.
const shots=[
  ['cinema',[-1.04,1.70,3.95],[-1.30,1.55,3.18],[-5.10,1.60,-4.16],[-5.36,1.71,-4.78]],
  ['television',[6.89,1.65,4.48],[6.45,1.54,3.80],[2.82,1.22,-1.66],[2.32,1.51,-3.14]],
  ['kitchen',[8.96,1.55,4.15],[9.38,1.49,4.28],[11.80,1.28,7.40],[12.53,1.34,7.92]],
  ['bed',[8.85,1.54,-2.75],[9.18,1.48,-2.40],[11.94,1.15,-6.72],[12.58,1.13,-7.46]],
  ['shop',[-5.22,1.55,7.12],[-5.52,1.49,7.42],[-10.30,1.26,9.68],[-10.67,1.33,8.93]],
  ['music',[-.98,1.54,3.90],[-1.20,1.46,3.33],[-5.48,1.26,-1.80],[-6.88,1.29,-2.45]],
  ['gaming',[1.09,1.59,3.93],[1.35,1.50,3.26],[4.85,1.20,-1.02],[4.05,1.39,-2.10]],
  ['retro',[9.14,1.59,-2.53],[9.38,1.53,-2.82],[13.65,1.05,-4.85],[13.92,1.28,-3.56]],
  ['library',[-6.18,1.57,7.16],[-6.59,1.50,7.35],[-10.44,1.27,9.72],[-11.68,1.54,10.06]],
  ['collect',[9.10,1.61,4.21],[9.51,1.53,4.36],[11.89,1.20,5.75],[11.66,1.44,5.62]],
  ['gallery',[-5.96,2.05,3.92],[-5.54,1.92,3.51],[1.73,2.55,-2.80],[3.72,2.37,-2.33]],
  ['private',[9.30,1.57,-2.29],[9.66,1.49,-2.53],[12.60,1.17,-5.98],[12.08,1.41,-7.15]]
];
const roomById=new Map(rooms.map(room=>[room.id,room]));
const sample=arr=>arr[Math.floor(Math.random()*arr.length)];
const duration=12,fadeTime=.8;

export function createRoomTour(load,veil,preferred){
  const camera=new T.PerspectiveCamera(55,innerWidth/innerHeight,.08,420);
  const target=new T.Vector3(),end=new T.Vector3();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const preferredShot=shots.find(s=>s[0]===preferred);
  let current=preferredShot||sample(shots.filter(s=>roomById.get(s[0]).floor===1));
  let upcoming=null,ready=false,finished=false,elapsed=0,nextAttempt=3,bag=[];
  function queue(){
    if(!bag.length)bag=shots.filter(s=>s!==current);
    const pick=sample(bag.filter(s=>s!==current));if(!pick)return;
    bag.splice(bag.indexOf(pick),1);upcoming=pick;ready=false;
    load(roomById.get(pick[0]).floor).then(()=>{if(!finished&&upcoming===pick)ready=true;})
      .catch(()=>{if(upcoming===pick)upcoming=null;});
  }
  let firstReady=false;
  load(roomById.get(current[0]).floor).then(()=>{firstReady=true;}).catch(()=>{firstReady=true;});
  function update(dt){
    const still=reduced.matches;
    if(firstReady&&!document.hidden)elapsed+=dt;
    if(!still&&elapsed>=nextAttempt&&!upcoming){nextAttempt=elapsed+3;queue();}
    if(!still && elapsed>=duration && ready){
      current=upcoming;upcoming=null;ready=false;elapsed=0;nextAttempt=3;
    }
    const t=still?.46:Math.min(1,elapsed/duration);
    const [id,from,to,look,lookEnd]=current,room=roomById.get(id);
    camera.position.fromArray(from).lerp(end.fromArray(to),t);
    target.fromArray(look).lerp(end.fromArray(lookEnd),t);
    camera.position.y+=(room.floor-1)*rise;target.y+=(room.floor-1)*rise;
    camera.lookAt(target);camera.aspect=innerWidth/innerHeight;
    camera.fov=(camera.aspect<.85?70:56)-4*t;camera.updateProjectionMatrix();camera.updateMatrixWorld();
    const dim=still?0:Math.max(1-elapsed/fadeTime,ready?(elapsed-duration+fadeTime)/fadeTime:0,0);
    veil.style.opacity=String(Math.min(1,dim));
    return room;
  }
  return {camera,update,finish(){finished=true;veil.style.opacity='0';}};
}
