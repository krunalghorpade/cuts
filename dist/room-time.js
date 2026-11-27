import * as T from './vendor/three.module.js';
import {rooms} from './plan.js';

const istMinutes = 330;
const degree = Math.PI / 180;
const latitude = 19.08 * degree, longitude = 72.88;
let lastMinute, sunlight;

// The site has no physical address. Mumbai sets a seasonal solar path in IST.
export function solarAt(stamp = Date.now()) {
  const minute = Math.floor(stamp / 60000);
  if (minute === lastMinute) return sunlight;
  lastMinute = minute;
  const local = new Date(minute * 60000 + istMinutes * 60000);
  const year = local.getUTCFullYear();
  const yearStart = Date.UTC(year, 0, 1);
  const days = (Date.UTC(year + 1, 0, 1) - yearStart) / 86400000;
  const gamma = 2 * Math.PI * ((local - yearStart) / 86400000 - .5) / days;
  const c = Math.cos, s = Math.sin;
  const equation = 229.18 * (.000075 + .001868*c(gamma) - .032077*s(gamma) - .014615*c(2*gamma) - .040849*s(2*gamma));
  const declination = .006918 - .399912*c(gamma) + .070257*s(gamma) - .006758*c(2*gamma) + .000907*s(2*gamma) - .002697*c(3*gamma) + .00148*s(3*gamma);
  const localMinutes = local.getUTCHours() * 60 + local.getUTCMinutes();
  const hour = ((localMinutes + equation + 4 * longitude - istMinutes) / 4 - 180) * degree;
  const direction = new T.Vector3(-c(declination)*s(hour),
    s(latitude)*s(declination) + c(latitude)*c(declination)*c(hour),
    s(latitude)*c(declination)*c(hour) - c(latitude)*s(declination)).normalize();
  const elevation = Math.asin(direction.y);
  const ramp = (a,b) => T.MathUtils.smoothstep(elevation/degree,a,b);
  sunlight = {direction, elevation, daylight:ramp(-6,13), direct:ramp(-.6,17),
    warmth:1-ramp(4,39), twilight:ramp(-13,-5)*(1-ramp(2,14))};
  return sunlight;
}

// Finished wall faces were measured in the room GLBs. Outward from the dial is +Z.
const mounts = {
  lobby:[5.04,3.15,-6.092,Math.PI], cinema:[-1.91,3.04,-5.908,0],
  television:[5.04,3.15,-5.908,0], shop:[-6.62,3.02,6.092,0],
  bed:[8.092,3,-2.44,Math.PI/2], bath:[8.092,3.03,.88,Math.PI/2],
  kitchen:[8.092,3.03,4.4,Math.PI/2], landing:[-3.48,3.15,-8.908,0],
  music:[-2.16,3.19,-5.908,0], library:[-8.65,2.70,6.092,0],
  gaming:[3.90,3.04,-5.919,0], retro:[8.092,3.02,-2.22,Math.PI/2],
  collect:[8.092,3.02,4.4,Math.PI/2], foyer:[-3.37,3.36,-6.092,Math.PI],
  gallery:[-3.37,3.36,-5.908,0], private:[8.092,3,-7.8,Math.PI/2]
};

function clockFace() {
  const surface = document.createElement('canvas');
  surface.width = surface.height = 384;
  const face = surface.getContext('2d');
  const center = surface.width/2;
  face.translate(center,center);
  face.fillStyle = '#ede7d9'; face.fillRect(-center,-center,384,384);
  face.strokeStyle = face.fillStyle = '#242923';
  for(let tick=0;tick<60;tick++) {
    face.save(); face.rotate(tick*Math.PI/30);
    face.lineWidth = tick%5===0 ? 4 : 1.4;
    face.beginPath(); face.moveTo(0,-176); face.lineTo(0,tick%5===0?-161:-170);
    face.stroke(); face.restore();
  }
  face.textAlign='center'; face.textBaseline='middle';
  face.font='500 27px "Helvetica Neue", Helvetica, Arial, sans-serif';
  for(let hour=1;hour<=12;hour++) {
    const angle=hour*Math.PI/6;
    face.fillText(String(hour),Math.sin(angle)*141,-Math.cos(angle)*141+1);
  }
  face.fillStyle='#505950'; face.font='15px Helvetica, Arial, sans-serif';
  face.fillText('IST',0,62);
  return surface;
}

export function installClocks(interior) {
  const face = clockFace(), canvas = document.createElement('canvas');
  canvas.width = canvas.height = face.width;
  const g = canvas.getContext('2d'), texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  texture.anisotropy = 2;
  const enamel = new T.MeshStandardMaterial({name:'Enamel clock dial',map:texture,roughness:.69,
    emissiveMap:texture,emissive:'#ffffff',emissiveIntensity:.13});
  const brass = new T.MeshStandardMaterial({name:'Patinated clock bezel',color:'#625b4c',metalness:.55,roughness:.37});
  const bezel = new T.LatheGeometry([[.218,0],[.227,.005],[.230,.010],[.230,.034],
    [.226,.042],[.217,.043],[.211,.036]].map(([r,z])=>new T.Vector2(r,z)),64);
  bezel.rotateX(Math.PI/2);
  const dial = new T.CircleGeometry(.217,64);
  for(const room of rooms) {
    const [x,y,z,yaw]=mounts[room.id], frame=new T.Group();
    frame.name='IST wall clock · '+room.name; frame.userData.clockRoom=room.id;
    frame.position.set(x,y,z); frame.rotation.y=yaw;
    const front=new T.Mesh(dial,enamel);front.position.z=.035;
    frame.add(new T.Mesh(bezel,brass),front);interior.floors[room.floor-1].add(frame);
    const nx=Math.abs(Math.sin(yaw)),nz=Math.abs(Math.cos(yaw));
    interior.shelfBounds.push({level:room.floor,x:x+Math.sin(yaw)*.025,z:z+Math.cos(yaw)*.025,
      w:.46*nz+.06*nx,d:.46*nx+.06*nz,bottom:y-.23,top:y+.23});
  }
  let lastSecond;
  function hand(angle,length,tail,width,color) {
    g.save();g.rotate(angle);g.strokeStyle=color;g.lineWidth=width;g.lineCap='round';
    g.beginPath();g.moveTo(0,tail);g.lineTo(0,-length);g.stroke();g.restore();
  }
  function update(stamp=Date.now()) {
    const second=Math.floor(stamp/1000);
    if(lastSecond===second)return;
    lastSecond=second;
    const t=new Date(second*1000+istMinutes*60000);
    const seconds=t.getUTCSeconds(),minutes=t.getUTCMinutes()+seconds/60,hours=t.getUTCHours()%12+minutes/60;
    g.drawImage(face,0,0);g.save();g.translate(192,192);
    hand(hours*Math.PI/6,97,14,12,'#252824'); hand(minutes*Math.PI/30,141,19,7,'#252824');
    hand(seconds*Math.PI/30,152,28,2.3,'#a54c32');
    g.fillStyle='#a54c32';g.beginPath();g.arc(0,0,5,0,2*Math.PI);g.fill();g.restore();
    texture.needsUpdate=true;
  }
  update();
  return {update};
}
