import * as T from './vendor/three.module.js';
import {batchRack} from './shelf-render.js';
import {categoryById, ITEMS} from './catalog.js';
import {fixtures,rise} from './plan.js';
import {createMediaCase,caseSpec} from './media.js';

function distributeInventory(){
  const placements=fixtures.map(()=>[]);
  for(const category of Object.keys(categoryById)){
    const bays=fixtures.flatMap((fixture,index)=>fixture[1]===category?[index]:[]);
    if(!bays.length)continue;
    const entries=ITEMS.filter(item=>item.category===category);
    if(category==='books'){
      entries.forEach((book,index)=>placements[bays[index % bays.length]].push([book]));
      continue;
    }
    let stack=[], occupied=0, index=0;
    const place=()=>{placements[bays[index++ % bays.length]].push(stack);stack=[];occupied=0;};
    for(const item of entries){
      const depth=caseSpec(item).d+.026;
      if(stack.length && (stack.length===4 || occupied+depth>.43))place();
      stack.push(item);occupied+=depth;
    }
    if(stack.length)place();
  }
  return placements;
}

export function stockRooms(interior,box,label){
  const stacks=new Map(),interactables=[[],[]],destinations=new Map();
  const wood=new T.MeshStandardMaterial({color:'#664a35'});
  const steel=new T.MeshStandardMaterial({color:'#292a27'});
  const led=new T.MeshBasicMaterial({color:'#ffd7a2'});
  const placements=distributeInventory();
  fixtures.forEach(([level,key,x,z,width,angle],bay)=>{
    const category=categoryById[key],group=new T.Group();
    group.position.set(x,0,z);group.rotation.y=angle;interior.floors[level-1].add(group);
    const picks=interactables[level-1],assigned=placements[bay];
    const board=(...args)=>{const m=box(group,...args);picks.push(m);return m;};
    const maxWidth=Math.max(.10,...assigned.flat().map(item=>caseSpec(item).w));
    const maxHeight=Math.max(.10,...assigned.flat().map(item=>caseSpec(item).h));
    const pitch=maxWidth+.042,capacity=Math.max(1,Math.floor((width-.18)/pitch));
    const firstRow=key==='books'?2:0;
    const stockRows=Math.ceil(assigned.length/capacity);
    const rows=key==='books'?Math.max(4,firstRow+stockRows):Math.max(1,stockRows);
    const step=key==='books'?Math.max(.46,maxHeight+.10):maxHeight*1.75+.07;
    const base=key==='books'?.16:rows>2?.64:1.08;
    const height=base+step*rows+.04;
    interior.obstacles.push({level,x,z,w:Math.abs(Math.cos(angle))*width+Math.abs(Math.sin(angle))*.65,d:Math.abs(Math.sin(angle))*width+Math.abs(Math.cos(angle))*.65});
    board(0,base/2,-.035,width,base,.5,wood);
    board(0,height/2,-.26,width,height,.055,steel);
    for(const side of [-1,1])board(side*(width/2-.026),height/2,0,.052,height,.61,steel);
    for(let row=0;row<rows;row++){
      const deck=base+row*step;board(0,deck,0,width,.026,.62,wood);
      if(row<firstRow)continue;
      const start=(row-firstRow)*capacity;
      const rowStacks=assigned.slice(start,start+capacity);
      rowStacks.forEach((items,col)=>{
        const cx=(col-(rowStacks.length-1)/2)*pitch,id=key+'-'+stacks.size;
        stacks.set(id,{category,items});let previousTop=deck,previousDepth=0,zz=.22;
        items.forEach((item,index)=>{
          const {group:model,spec,shell}=createMediaCase(item,true);
          const tilt=-.19,faceHeight=spec.h*Math.cos(tilt);
          const top=index?Math.max(deck+.018+faceHeight,previousTop+.18*faceHeight):deck+.018+faceHeight;
          const yy=top-faceHeight/2;
          if(index)zz-=(previousDepth+spec.d)/2+.026;
          const support=top-faceHeight-deck-.012;
          if(support>.002)board(cx,deck+.011+support/2,zz,spec.w*.86,support,.016,steel);
          model.position.set(cx,yy,zz);model.rotation.x=tilt;group.add(model);
          shell.userData={stackId:id,index,item,spec};picks.push(shell);
          const target=new T.Vector3();shell.getWorldPosition(target);
          const distance=.85;
          destinations.set(item.id,{level,x:target.x+Math.sin(angle)*distance,z:target.z+Math.cos(angle)*distance,yaw:angle,pitch:Math.atan2(target.y-((level-1)*rise+1.62),distance)});
          previousDepth=spec.d;previousTop=top;
        });
      });
    }
    board(0,height,0,width,.035,.62,wood);board(0,height-.025,.235,width-.1,.01,.025,led);
    label(group,category.short,0,height+.12,.12,Math.min(1.55,width*.65),.19,{bg:'#302c26',color:'#efcea5',size:80});
    batchRack(group);
  });
  return {stacks,interactables,destinations};
}
