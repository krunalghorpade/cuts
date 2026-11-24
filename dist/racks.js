import * as T from './vendor/three.module.js';
import {cinemaShelfFinishes,dressCinemaCabinet} from './cinema.js';
import {fitBoxSetRack} from './room-models.js';
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
    // Keep large film collections below the cinema ceiling. Each five-tier
    // cabinet can show up to six staggered cases in a front-to-back stack.
    let stackLimit=category==='vinyl'?10:4;
    if(category==='movies'||category==='anime-movies'){
      const pitch=Math.max(.10,...entries.map(item=>caseSpec(item).w))+.042;
      const columns=Math.min(...bays.map(bay=>Math.max(1,Math.floor((fixtures[bay][4]-.18)/pitch))));
      stackLimit=Math.min(6,Math.max(2,Math.ceil(entries.length/(bays.length*columns*5))));
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
      if(stack.length && (stack.length===stackLimit || occupied+depth>(category==='vinyl'?.25:.43)))place();
      stack.push(item);occupied+=depth;
    }
    if(stack.length)place();
  }
  return placements;
}

export function stockRooms(interior,box,label,seed=0){
  const stacks=new Map(),interactables=interior.floors.map(()=>[]),destinations=new Map(),roomStock=new Map();
  const usualWood=new T.MeshStandardMaterial({color:'#664a35'});
  const usualSteel=new T.MeshStandardMaterial({color:'#292a27'});
  const led=new T.MeshBasicMaterial({color:'#ffd7a2'});
  const placements=distributeInventory(seed);
  fixtures.forEach(([level,key,x,z,width,angle],bay)=>{
    const category=categoryById[key],group=new T.Group();
    group.position.set(x,0,z);group.rotation.y=angle;interior.floors[level-1].add(group);
    const picks=interactables[level-1],assigned=placements[bay];
    const room=roomAt(level,x,z).id;
    const cinema=room==='cinema';
    const wood=cinema?cinemaShelfFinishes.walnut:usualWood,steel=cinema?cinemaShelfFinishes.edge:usualSteel;
    if(!roomStock.has(room))roomStock.set(room,[]);
    roomStock.get(room).push(...assigned.flat());
    const isBoxRack=key==='shows'||key==='anime';
    const board=(...args)=>{const m=box(group,...args);picks.push(m);return m;};
    const maxWidth=Math.max(.10,...assigned.flat().map(item=>caseSpec(item).w));
    const maxHeight=Math.max(.10,...assigned.flat().map(item=>caseSpec(item).h));
    const pitch=maxWidth+.042,capacity=Math.max(1,Math.floor((width-.18)/pitch));
    const printRack=key==='books'||key==='manga',recordBin=key==='vinyl';
    const firstRow=key==='books'?2:key==='manga'?1:0;
    const stockRows=Math.ceil(assigned.length/capacity);
    const rows=isBoxRack?Math.max(4,stockRows):cinema?Math.max(5,stockRows):printRack?Math.max(4,firstRow+stockRows):Math.max(1,stockRows);
    const step=cinema?Math.max(.389,maxHeight*1.41+.045):recordBin?maxHeight*2.03+.06:printRack?Math.max(.46,maxHeight+.10):maxHeight*1.75+.07;
    const base=isBoxRack?.45:cinema?.43:recordBin?.74:printRack?.16:rows>2?.64:1.08;
    const height=cinema?Math.max(2.89,base+step*rows+.57):base+step*rows+.04;
    // Extend the display toward the aisle if a set outgrows the regular shelf.
    const deepest=isBoxRack?Math.max(0,...assigned.flat().map(item=>caseSpec(item).d)):0;
    const extension=Math.max(0,deepest-.46);
    const shelfZ=extension/2,depth=recordBin?.32:.65+extension;
    const footprint={level,x:x+Math.sin(angle)*shelfZ,z:z+Math.cos(angle)*shelfZ,
      w:Math.abs(Math.cos(angle))*width+Math.abs(Math.sin(angle))*depth,
      d:Math.abs(Math.sin(angle))*width+Math.abs(Math.cos(angle))*depth};
    interior.obstacles.push(footprint);
    interior.shelfBounds.push({...footprint,bottom:0,top:height+.22});
    if(isBoxRack){
      group.name=key==='shows'?'Series box sets':'Anime box sets';
      // Cabinet backing and gables also stop ray selection through the fixture.
      for(const side of [-1,1])board(side*(width/2-.026),height/2,shelfZ,.052,height,depth,steel).visible=false;
      board(0,height/2,-.26,width,height,.055,steel).visible=false;
    }else if(recordBin){
      board(0,base/2,0,width,base,.31,wood);
      board(0,base+.018,.152,width,.095,.025,steel);
      for(const side of [-1,1])board(side*(width/2-.016),base+.045,0,.032,.14,.31,wood);
      label(group,category.short,0,base-.14,.166, .72,.13,{bg:'#302c26',color:'#efcea5',size:72});
    }else{
      if(cinema){
        group.name='L01_CINEMA_'+key.toUpperCase()+'_'+bay;
        board(0,.062,0,width-.09,.124,.43,steel);
        board(0,(base+.12)/2,-.035,width-.05,base-.12,.48,wood);
        for(const sign of [-1,1]){
          const leafWidth=(width-.055)/2;
          board(sign*leafWidth/2,(base+.16)/2,.218,leafWidth-.015,base-.18,.026,wood);
          board(sign*.095,base-.12,.241,.13,.015,.022,steel);
        }
      }else board(0,base/2,-.035+shelfZ,width,base,.5+extension,wood);
      board(0,height/2,-.26,width,height,.055,steel);
      for(const side of [-1,1])board(side*(width/2-.026),height/2,shelfZ,.052,height,.61+extension,steel);
    }
    for(let row=0;row<rows;row++){
      const deck=base+row*step;
      const ledge=board(0,deck,shelfZ,width,.026,recordBin?.31:.62+extension,wood);
      if(isBoxRack)ledge.visible=false;
      if(cinema){
        board(0,deck-.019,.267,width-.075,.016,.025,steel);
        board(0,deck-.020,.255,width-.098,.009,.010,led);
      }
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
        // Face-out displays browse neighbors on the same shelf and platform.
        const shelfRow=printRack?rowStacks.flat():key==='retro-games'?rowStacks.flat().filter(game=>game.platform===items[0].platform):null;
        stacks.set(id,{category,items,browseItems:shelfRow||items,
          label:shelfRow?(items[0].platform||category.label)+' shelf':category.label+' · Stack'});let previousTop=deck,previousDepth=0,zz=recordBin?.105:.22;
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
    if(isBoxRack){
      const signY=height*2.465/2.4,signZ=shelfZ+.300*(.62+extension)/.62;
      label(group,group.name,0,signY,signZ,Math.min(1.22,width-.12),.12,{bg:'#252923',color:'#efe7d3',size:69});
    }else if(!recordBin){
      board(0,height,shelfZ,width,.035,.62+extension,wood);board(0,height-.025,.235+extension,width-.1,.01,.025,led);
      if(cinema){
        const displayDeck=base+step*rows;
        board(0,displayDeck,0,width,.035,.61,wood);
        if(key==='anime-movies')dressCinemaCabinet(group,displayDeck+.018);
        const lintel=height-.104;
        board(0,lintel,.244,width,.18,.117,steel);
        board(0,lintel-.097,.235,width-.075,.010,.023,led);
        label(group,category.label,0,lintel,.305,Math.min(.82,width-.14),.084,{bg:'#22221e',color:'#ddcbb0',size:69});
      }else label(group,category.short,0,height+.12,.12,Math.min(1.55,width*.65),.19,{bg:'#302c26',color:'#efcea5',size:80});
    }
    batchRack(group);
    if(isBoxRack)fitBoxSetRack(group,width,height,extension,Array.from({length:rows},(_,i)=>base+i*step))
      .catch(error=>console.error('Box-set cabinet unavailable',error));
  });
  return {stacks,interactables,destinations,roomStock};
}
