import * as T from './vendor/three.module.js';
import {batchRack} from './shelf-render.js';
import {categoryById, ITEMS} from './catalog.js';
import {fixtures,rise,roomAt} from './plan.js';
import {createMediaCase,caseSpec} from './media.js';

function distributeInventory(seed){
  let state=seed;
  function random(){
    state=(Math.imul(state,1664525)+1013904223)>>>0;
    return state/4294967296;
  }
  const placements=fixtures.map(()=>[]);
  for(const category of Object.keys(categoryById)){
    const bays=fixtures.flatMap((fixture,index)=>fixture[1]===category?[index]:[]);
    if(!bays.length)continue;
    const entries=ITEMS.filter(item=>item.category===category);
    if(seed)for(let i=entries.length-1;i>0;i--){
      const j=Math.floor(random()*(i+1));[entries[i],entries[j]]=[entries[j],entries[i]];
    }
    if(category==='retro-games'){
      const systems=new Map();
      for(const item of entries){
        if(!systems.has(item.platform))systems.set(item.platform,[]);
        systems.get(item.platform).push(item);
      }
      for(const games of systems.values())for(const game of games)placements[bays[0]].push([game]);
      continue;
    }
    if(category==='books'||category==='manga'){
      entries.forEach((book,index)=>placements[bays[index % bays.length]].push([book]));
      continue;
    }
    let stack=[], occupied=0, index=0;
    const place=()=>{placements[bays[index++ % bays.length]].push(stack);stack=[];occupied=0;};
    for(const item of entries){
      const spec=caseSpec(item);
      if(spec.kind==='boxset' && spec.d>=spec.w/2){
        if(stack.length)place();
        stack.push(item);
        place();
        continue;
      }
      const depth=spec.d+(category==='vinyl'?.016:.026);
      if(stack.length && (stack.length===(category==='vinyl'?10:4) || occupied+depth>(category==='vinyl'?.25:.43)))place();
      stack.push(item);occupied+=depth;
    }
    if(stack.length)place();
  }
  return placements;
}

export function stockRooms(interior,box,label,seed=0){
  const stacks=new Map(),interactables=interior.floors.map(()=>[]),destinations=new Map(),roomStock=new Map();
  const wood=new T.MeshStandardMaterial({color:'#664a35'});
  const steel=new T.MeshStandardMaterial({color:'#292a27'});
  const led=new T.MeshBasicMaterial({color:'#ffd7a2'});
  const placements=distributeInventory(seed);
  fixtures.forEach(([level,key,x,z,width,angle],bay)=>{
    const category=categoryById[key],group=new T.Group();
    group.position.set(x,0,z);group.rotation.y=angle;interior.floors[level-1].add(group);
    const picks=interactables[level-1],assigned=placements[bay];
    const room=roomAt(level,x,z).id;
    if(!roomStock.has(room))roomStock.set(room,[]);
    roomStock.get(room).push(...assigned.flat());
    const board=(...args)=>{const m=box(group,...args);picks.push(m);return m;};
    const maxWidth=Math.max(.10,...assigned.flat().map(item=>caseSpec(item).w));
    const maxHeight=Math.max(.10,...assigned.flat().map(item=>caseSpec(item).h));
    const pitch=maxWidth+.042,capacity=Math.max(1,Math.floor((width-.18)/pitch));
    const printRack=key==='books'||key==='manga',recordBin=key==='vinyl';
    const firstRow=key==='books'?2:key==='manga'?1:0;
    const stockRows=Math.ceil(assigned.length/capacity);
    const rows=printRack?Math.max(4,firstRow+stockRows):Math.max(1,stockRows);
    const step=recordBin?maxHeight*2.03+.06:printRack?Math.max(.46,maxHeight+.10):maxHeight*1.75+.07;
    const base=recordBin?.74:printRack?.16:rows>2?.64:1.08;
    const height=base+step*rows+.04;
    // Extend the display toward the aisle if a set outgrows the regular shelf.
    const isBoxRack=key==='shows'||key==='anime';
    const deepest=isBoxRack?Math.max(0,...assigned.flat().map(item=>caseSpec(item).d)):0;
    const extension=Math.max(0,deepest-.46);
    const shelfZ=extension/2,depth=recordBin?.32:.65+extension;
    const footprint={level,x:x+Math.sin(angle)*shelfZ,z:z+Math.cos(angle)*shelfZ,
      w:Math.abs(Math.cos(angle))*width+Math.abs(Math.sin(angle))*depth,
      d:Math.abs(Math.sin(angle))*width+Math.abs(Math.cos(angle))*depth};
    interior.obstacles.push(footprint);
    interior.shelfBounds.push({...footprint,bottom:0,top:height+.22});
    if(recordBin){
      board(0,base/2,0,width,base,.31,wood);
      board(0,base+.018,.152,width,.095,.025,steel);
      for(const side of [-1,1])board(side*(width/2-.016),base+.045,0,.032,.14,.31,wood);
      label(group,category.short,0,base-.14,.166, .72,.13,{bg:'#302c26',color:'#efcea5',size:72});
    }else{
      board(0,base/2,-.035+shelfZ,width,base,.5+extension,wood);
      board(0,height/2,-.26,width,height,.055,steel);
      for(const side of [-1,1])board(side*(width/2-.026),height/2,shelfZ,.052,height,.61+extension,steel);
    }
    for(let row=0;row<rows;row++){
      const deck=base+row*step;
      board(0,deck,shelfZ,width,.026,recordBin?.31:.62+extension,wood);
      if(row<firstRow)continue;
      const start=(row-firstRow)*capacity;
      const rowStacks=assigned.slice(start,start+capacity);
      rowStacks.forEach((items,col)=>{
        const cx=(col-(rowStacks.length-1)/2)*pitch,id=key+'-'+stacks.size;
        if(key==='retro-games'&&(col===0||rowStacks[col-1][0].platform!==items[0].platform)){
          const platform=items[0].platform.replace('Super Nintendo Entertainment System','Super NES').replace('Nintendo Entertainment System','NES').replace('PlayStation Portable','PSP');
          board(cx,deck-.019,.314,pitch-.016,.041,.008,steel);
          label(group,platform,cx,deck-.019,.319,pitch-.019,.037,{bg:'#292b2b',color:'#ebe5d5',width:768,height:118,size:66});
        }
        stacks.set(id,{category,items});let previousTop=deck,previousDepth=0,zz=recordBin?.105:.22;
        items.forEach((item,index)=>{
          const {group:model,spec,shell}=createMediaCase(item,true);
          if(isBoxRack && index===0)zz=.255+extension-spec.d/2;
          const upright=isBoxRack && items.length===1;
          const tilt=upright?0:-.19,faceHeight=spec.h*Math.cos(tilt);
          const top=index?Math.max(deck+.018+faceHeight,previousTop+(recordBin?.106:.18)*faceHeight):deck+.018+faceHeight;
          const yy=top-faceHeight/2;
          if(index)zz-=(previousDepth+spec.d)/2+(recordBin?.016:.026);
          const support=top-faceHeight-deck-.012;
          if(support>.002)board(cx,deck+.011+support/2,zz,spec.w*.86,support,.016,steel);
          model.position.set(cx,yy,zz);model.rotation.x=tilt;group.add(model);
          shell.userData={stackId:id,index,item,spec};picks.push(shell);
          const target=new T.Vector3();shell.getWorldPosition(target);
          const distance=.85+(isBoxRack?spec.d/2:0);
          destinations.set(item.id,{level,x:target.x+Math.sin(angle)*distance,z:target.z+Math.cos(angle)*distance,yaw:angle,pitch:Math.atan2(target.y-((level-1)*rise+1.62),distance)});
          previousDepth=spec.d;previousTop=top;
        });
      });
    }
    if(!recordBin){
      board(0,height,shelfZ,width,.035,.62+extension,wood);board(0,height-.025,.235+extension,width-.1,.01,.025,led);
      label(group,category.short,0,height+.12,.12,Math.min(1.55,width*.65),.19,{bg:'#302c26',color:'#efcea5',size:80});
    }
    batchRack(group);
  });
  return {stacks,interactables,destinations,roomStock};
}
