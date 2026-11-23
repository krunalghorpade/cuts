import * as T from './vendor/three.module.js';
import {rise, levels} from './plan.js';

const centre = -3.475, width = 1.51;
// One travelling car serves three sets of landing doors.
export function installElevator(scene,floors,box,label){
  const walnut=new T.MeshStandardMaterial({color:'#735442',roughness:.45});
  const metal=new T.MeshStandardMaterial({color:'#b7b6aa',roughness:.35,metalness:.43});
  const charcoal=new T.MeshStandardMaterial({color:'#252b29',roughness:.53});
  const light=new T.MeshBasicMaterial({color:'#fff4cd'});
  const car=new T.Group();scene.add(car);
  const pair=(group,z)=>{
    return [-1,1].map(side=>box(group,centre+side*width/4,1.15,z,width/2,2.30,.046,metal));
  };
  box(car,centre,-.046,-10.18,2.27,.10,2.32,charcoal);
  box(car,centre,2.50,-10.18,2.27,.13,2.32,charcoal);
  box(car,centre,2.422,-10.19,1.41,.025,1.34,light);
  box(car,centre,1.22,-11.26,2.25,2.45,.07,walnut);
  for(const side of [-1,1]){
    box(car,centre+side*1.10,1.22,-10.18,.07,2.45,2.18,walnut);
    box(car,centre+side*1.05,.92,-10.24,.046,.047,1.74,metal);
    for(let j=0;j<6;j++)box(car,centre+side*1.061,1.75,-10.93+j*.28,.012,1.31,.014,charcoal);
  }
  box(car,centre,.92,-11.19,1.96,.046,.046,metal);
  const rear=label(car,'ELEVATOR',centre,1.70,-11.219,.83,.20,{bg:'#322f29',color:'#f5ddaf',size:57});
  rear.name='Elevator car sign';
  const carDoors=pair(car,-9.12);
  const landingDoors=floors.map((group,index)=>{
    const doors=pair(group,-9.01);
    for(const side of [-1,1])box(group,centre+side*(width/2+.046),1.17,-8.97,.085,2.35,.12,charcoal);
    box(group,centre,2.35,-8.97,width+.17,.09,.12,charcoal);
    label(group,'ELEVATOR   /   0'+(index+1),centre,2.53,-8.885,1.28,.20,{bg:'#292e2c',color:'#ecdbbb',size:54});
    box(group,centre+.99,1.24,-8.87,.14,.26,.045,metal);
    box(group,centre+.99,1.26,-8.839,.046,.046,.012,light);
    return doors;
  });
  let floor=1,destination=1,progress=1,trip=null,rider=false;
  function positionDoors(panels,open){
    panels.forEach((panel,i)=>{panel.position.x=centre+(i?1:-1)*(width/4+open*width/2);});
  }
  function update(dt,playerLevel,x,z){
    const near=Math.abs(x-centre)<1.19&&z>=-11.38&&z<-7.42;
    if(near&&!trip&&!rider&&destination===floor&&playerLevel!==floor)destination=playerLevel;
    if(!trip){
      const shouldOpen=destination===floor&&(near&&playerLevel===floor);
      progress=T.MathUtils.damp(progress,shouldOpen?1:0,8,dt);
      if(destination!==floor&&progress<.018){
        progress=0;
        trip={from:car.position.y,to:(destination-1)*rise,elapsed:0,duration:.8+.62*Math.abs(destination-floor)};
      }
    }
    if(trip){
      trip.elapsed+=dt;
      const t=Math.min(1,trip.elapsed/trip.duration),s=t*t*(3-2*t);
      car.position.y=T.MathUtils.lerp(trip.from,trip.to,s);
      if(t===1){floor=destination;trip=null;}
    }
    positionDoors(carDoors,progress);
    landingDoors.forEach((pair,i)=>positionDoors(pair,!trip&&i===floor-1?progress:0));
    const arrived=rider&&!trip&&destination===floor&&progress>.90;
    if(arrived)rider=false;
    return {height:car.position.y,arrived};
  }
  function enclosed(x,z){return Math.abs(x-centre)<.94&&z< -9.43&&z> -11.10;}
  return {
    update,enclosed,
    get riding(){return rider;},
    available(level){return !trip&&level===floor&&destination===floor&&progress>.90;},
    request(target,level,x,z){
      if(!levels.includes(target)||target===level||!this.available(level)||!enclosed(x,z))return false;
      rider=true;destination=target;return true;
    },
    blocks(x,z,level){
      if(x< -4.7||x> -2.25||z< -11.4||z> -8.80)return false;
      if(z < -9.10 && (Math.abs(x-centre)> .89||z< -11.01))return true;
      if(z< -8.82&&z> -9.37)return !this.available(level)||Math.abs(x-centre)>width/2-.19;
      return level!==floor||!!trip;
    }
  };
}
