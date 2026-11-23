import * as T from './vendor/three.module.js';

const unitBox = new T.BoxGeometry();
const hardware = new T.MeshStandardMaterial({color:'#977c55',metalness:.64,roughness:.38});
const trim = new T.MeshStandardMaterial({color:'#33332e',roughness:.68});
const entryGlass=new T.MeshStandardMaterial({color:'#b9d4c7',transparent:true,opacity:.17,roughness:.23,depthWrite:false});
const leafHeight = 2.23;
const openingAngle = Math.PI / 2;
const playerRadius = .19;

export function makeDoor(parent, level, opening, roomName, wood, label, keepOpen = false) {
  const [axis,wall,low,high] = opening;
  const span = high-low, middle = (low+high)/2;
  const x = axis==='x' ? wall : middle;
  const z = axis==='x' ? middle : wall;
  const frame = new T.Group();
  frame.position.set(x,0,z);
  frame.rotation.y = axis==='x' ? -Math.PI/2 : 0;
  parent.add(frame);

  const faces=[], leaves=[];
  function part(owner,px,py,pz,w,h,d,material) {
    const mesh=new T.Mesh(unitBox,material);
    mesh.position.set(px,py,pz);mesh.scale.set(w,h,d);owner.add(mesh);
    return mesh;
  }

  // Doors open into the destination room. The west stair doors swing onto the landing.
  let swing = axis==='z'||wall<0 ? 1 : -1;
  const privateRoom = opening[5]==='single';
  const jambSpan=span-.16;
  const clearWidth=jambSpan;
  part(frame,0,2.41,0,jambSpan,.34,.115,wood);
  part(frame,0,2.247,0,jambSpan,.025,.13,trim);
  if(roomName!=='Stairwell'){
    const plaque=label(frame,roomName,0,2.42,-swing*.061,Math.min(jambSpan-.12,1.45),.185,
      {width:768,height:96,bg:'#302c26',color:'#efcea5',size:48});
    plaque.rotation.y=swing>0 ? Math.PI : 0;
  }

  for(const direction of privateRoom?[1]:[1,-1]){
    const hinge=-direction*(clearWidth/2-.006);
    const width=(privateRoom?clearWidth:clearWidth/2)-.012;
    const pivot=new T.Group();
    pivot.position.x=hinge;frame.add(pivot);
    const center=direction*width/2;
    const glazed=roomName==='Entrance';
    faces.push(part(pivot,center,leafHeight/2+.007,0,width,leafHeight,.046,glazed?entryGlass:wood));
    if(glazed){
      for(const dx of [-1,1])part(pivot,center+dx*(width-.05)/2,leafHeight/2,0,.05,leafHeight,.064,trim);
      for(const cy of [.035,1.04,leafHeight-.032])part(pivot,center,cy,0,width,.064,.064,trim);
    }
    for(const side of [-1,1]){
      if(!glazed){
        part(pivot,center,1.45,side*.024,width-.14,1.19,.007,trim);
        part(pivot,center,1.45,side*.029,width-.165,1.165,.006,wood);
      }
      const latch=direction*(width-.10);
      part(pivot,latch,1.04,side*.031,.05,.15,.013,hardware);
      part(pivot,latch,1.055,side*.056,.029,.03,.048,hardware);
      part(pivot,latch-direction*.051,1.055,side*.08,.13,.029,.022,hardware);
    }
    if(keepOpen)pivot.rotation.y=-direction*swing*openingAngle;
    leaves.push({pivot,hinge,width,direction});
  }

  let progress=keepOpen?1:0, openingRequested=false;
  function leafTouches(u,v,amount) {
    for(const {hinge,width,direction} of leaves){
      const angle=-direction*swing*amount*openingAngle;
      const tx=direction*Math.cos(angle), tz=-direction*Math.sin(angle);
      const along=Math.max(0,Math.min(width,(u-hinge)*tx+v*tz));
      const du=u-hinge-along*tx, dv=v-along*tz;
      if(du*du+dv*dv < (playerRadius+.025)**2)return true;
    }
    return false;
  }
  function blocks(px,pz) {
    const u=axis==='x'?pz-z:px-x, v=axis==='x'?x-px:pz-z;
    if(Math.abs(u)>span/2+playerRadius || Math.abs(v)>1.35)return false;
    return leafTouches(u,v,progress);
  }
  function update(dt,playerLevel,px,pz) {
    if(keepOpen)return;
    const u=axis==='x'?pz-z:px-x, v=axis==='x'?x-px:pz-z;
    const sameFloor=level===playerLevel;
    if(sameFloor && Math.abs(u)<clearWidth/2+.25 && Math.abs(v)<1.9){
      if(privateRoom && !openingRequested && progress===0 && v!==0)swing=-Math.sign(v);
      openingRequested=true;
    }
    else if(!sameFloor || Math.abs(u)>clearWidth/2+.7 || Math.abs(v)>2.45)openingRequested=false;
    const target=openingRequested?1:0;
    if(progress===target)return;
    const delta=Math.sign(target-progress)*Math.min(Math.abs(target-progress),dt*2.2);
    // Check the swept path even on a long frame so a leaf cannot pass through the player.
    const steps=Math.ceil(Math.abs(delta)/.045);
    for(let i=0;i<steps;i++){
      const next=progress+delta/steps;
      if(sameFloor && leafTouches(u,v,next))break;
      progress=next;
    }
    if(Math.abs(progress-target)<.00001)progress=target;
    for(const {pivot,direction} of leaves)pivot.rotation.y=-direction*swing*progress*openingAngle;
    frame.updateWorldMatrix(true,true);
  }
  return {level,faces,blocks,update};
}
