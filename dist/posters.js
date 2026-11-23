import * as T from './vendor/three.module.js';
import {rooms,openingsFor,groundAt,rise} from './plan.js';

const quarter=Math.PI/2, aspect=320/224;
const counts={cinema:14,television:13,music:9,gaming:10,retro:11,library:5,kitchen:5,bed:7,bath:3,collect:4,shop:4};
const rows={
  cinema:[['E',[-4.7,-3.55,-2.40,-1.25,-.10,1.05]],['W',[-5.12,-1.59,1.64,5.04]],['S',[-2.45,-1.44,-.48]],['E',[5.32]]],
  television:[['W',[-4.6,-3.45,-2.30,-1.15,.00,1.15]],['S',[.58,3.51,4.49,7.45]],['N',[1.04,6.99]],['E',[-4.72,2.74]]],
  music:[['E',[-4.76,-3.66,-2.62,1.92,4.94]],['S',[-4.28,-3.28,-2.28,-1.28],2.57],['W',[-5.10,1.70,5.40]],['N',[-6.48,-5.45,-2.77,-1.69],2.42]],
  gaming:[['E',[-5.00,-4.12,-.78,.28,2.72]],['W',[-4.88,-3.83,1.18,2.20]],['S',[2.40,3.42,4.44]]],
  retro:[['N',[9.47,10.53,11.59,12.65,13.71],2.86],['E',[-7.90,-6.79,-5.57,-4.35]],['S',[8.92,9.91,10.86,13.95,14.55],1.83,.60]],
  library:[['N',[-11.86,-10.92,-9.96,-9.00,-4.83]],['W',[7.45]],['S',[-11.73,-10.68,-9.61],2.73]],
  kitchen:[['E',[4.24,5.27,6.30]],['N',[9.01,10.07,11.13,12.19]]],
  bed:[['W',[-7.7,-6.65,-5.60,-4.55]],['N',[10.15,11.22,12.29]],['S',[10.42,11.55,12.71]]],
  bath:[['S',[8.74,9.56,10.38],2.03,.49],['N',[11.44,12.35],2.12,.52]],
  collect:[['N',[10.06,11.16,12.26],2.58],['W',[6.48,7.65]],['E',[4.24]]],
  shop:[['N',[-11.65,-10.57,-9.47]],['S',[-11.63,-10.58,-9.53]]]
};
function clearMount([level,x,y,z,angle,width],shelves){
  const nx=Math.sin(angle),nz=Math.cos(angle),hw=width/2+.09,hh=width*aspect/2+.08;
  return !shelves.some(s=>{
    if(s.level!==level||y-hh>s.top||y+hh<s.bottom)return false;
    const dx=s.x-x,dz=s.z-z,front=dx*nx+dz*nz,side=dx*nz-dz*nx;
    const depth=(Math.abs(nx)*s.w+Math.abs(nz)*s.d)/2,span=(Math.abs(nz)*s.w+Math.abs(nx)*s.d)/2;
    return front+depth>=-.02&&front-depth<.88&&Math.abs(side)<span+hw;
  });
}
function mounts(room,shelves){
  const [x0,z0,x1,z1]=room.bounds,out=[];
  const walls={W:['x',x0,quarter],E:['x',x1,-quarter],N:['z',z0,0],S:['z',z1,Math.PI]};
  function add(side,pos,y,w){
    if(out.length>=counts[room.id])return;
    const [axis,k,angle]=walls[side],hw=w/2+.06;
    if(openingsFor(room.floor).some(([a,v,lo,hi])=>a===axis&&v===k&&pos+hw>lo-.06&&pos-hw<hi+.06))return;
    const slot=[room.floor,(axis==='x'?k:pos)+.125*Math.sin(angle),y,(axis==='z'?k:pos)+.125*Math.cos(angle),angle,w,room.id];
    if(out.some(other=>Math.hypot(other[1]-slot[1],other[3]-slot[3])<(w+other[5])/2+.15))return;
    if(clearMount(slot,shelves))out.push(slot);
  }
  for(const [s,positions,y=2.20,w=.66] of rows[room.id])for(const p of positions)add(s,p,y,w);
  for(const side of ['W','S','E','N']){
    const [lo,hi]='WE'.includes(side)?[z0,z1]:[x0,x1];
    for(let t=lo+.62;t<hi-.50;t+=.96)add(side,t,2.30,.62);
  }
  return out;
}
function stairFrames(){
  const slots=[];
  for(const [x,a] of [[-11.875,quarter],[-8.125,-quarter]])for(const z of [-4.55,-5.57,-6.59,-7.61]){
    const y=groundAt(x,z,0)+1.55,l=y>=rise?2:1;slots.push([l,x,y-(l-1)*rise,z,a,.58,'stairs']);
  }
  for(const x of [-11.15,-10,-8.85])slots.push([1,x,rise/2+1.55,-8.875,0,.68,'stairs']);
  return slots;
}
function decks(items,room,content){
  const unique=[...new Map(items.filter(i=>i.artwork).map(i=>[i.albumUri||i.id,i])).values()];
  const cover=unique.map(item=>({item,image:item.artwork,kind:'cover'})),byId=new Map(unique.map(i=>[i.id,i]));
  if(room==='cinema'||room==='television'){
    const type=room==='cinema'?'theatre':'tv';
    return [cover,content.quotes.filter(q=>q.rooms.includes(type)&&byId.has(q.id)).map(q=>({item:byId.get(q.id),image:byId.get(q.id).artwork,kind:'quote',words:q.text,credit:q.author}))];
  }
  if(room==='retro'||room==='gaming')return [cover,content.memes.filter(m=>m.rooms.includes(room)&&byId.has(m.id)).map(m=>({item:byId.get(m.id),image:byId.get(m.id).artwork,kind:'meme',words:m.caption}))];
  if(room==='music')return [cover,content.artists.flatMap(a=>{const group=unique.filter(i=>i.creator===a.creator);if(!group.length)return [];const item=group[Math.floor(Math.random()*group.length)];return [{item,image:a.photo,kind:'artist',words:a.creator}];})];
  return [cover,[]];
}
function fit(g,image,x,y,w,h){
  if(!image)return;
  const factor=Math.max(w/image.width,h/image.height),sw=w/factor,sh=h/factor;
  g.drawImage(image,(image.width-sw)/2,(image.height-sh)/2,sw,sh,x,y,w,h);
}
function lines(g,text,w){
  const out=[];let line='';
  for(const word of text.split(/\s+/)){const next=line?line+' '+word:word;if(line&&g.measureText(next).width>w){out.push(line);line=word;}else line=next;}if(line)out.push(line);return out;
}
function paint(g,pic,img,x,y){
  const w=224,h=320;
  g.save();g.translate(x,y);g.beginPath();g.rect(0,0,w,h);g.clip();
  g.fillStyle='#232629';g.fillRect(0,0,w,h);g.textAlign='left';
  if(pic.kind==='quote'){
    g.fillStyle='#eae3d1';g.fillRect(0,0,w,h);fit(g,img,14,14,68,88);
    g.fillStyle='#795c40';g.font='bold 10px Arial';g.fillText(pic.item.year||'',91,95);
    const message='“'+pic.words+'”';let fs=24,ls;
    do{g.font='italic '+fs+'px Georgia';ls=lines(g,message,w-28);fs--;}while(ls.length*(fs+4)>128&&fs>14);
    g.fillStyle='#202524';ls.forEach((l,i)=>g.fillText(l,14,140+i*(fs+5)));
    g.font='bold 13px Arial';g.fillText(pic.credit||'',14,270,w-28);g.font='13px Georgia';lines(g,pic.item.title,195).slice(0,2).forEach((l,i)=>g.fillText(l,14,292+i*15));
  }else if(pic.kind==='meme'){
    fit(g,img,0,0,w,198);g.fillStyle='#efe9db';g.fillRect(0,198,w,122);g.fillStyle='#18191c';
    let fs=23,ls;do{g.font='bold '+fs+'px Arial';ls=lines(g,pic.words,w-24);fs--;}while(ls.length*(fs+4)>84&&fs>13);
    ls.forEach((l,i)=>g.fillText(l,12,222+i*(fs+4)));g.font='10px monospace';g.fillText(pic.item.title.toUpperCase(),12,309,w-24);
  }else if(pic.kind==='artist'){
    fit(g,img,0,0,w,236);g.fillStyle='#e8e4d6';g.fillRect(0,236,w,84);g.fillStyle='#222321';
    g.font='bold 22px Arial';lines(g,pic.words,202).slice(0,2).forEach((l,i)=>g.fillText(l,11,262+i*23));
    g.font='12px Georgia';g.fillText(pic.item.title,11,307,202);
  }else if(img){
    const ar=img.width/img.height;
    if(ar>.86){const hh=Math.min(w/ar,260);fit(g,img,0,(h-hh)/2,w,hh);g.fillStyle='#f5e8d3';g.font='bold 12px Arial';g.fillText(pic.item.title,9,306,w-18);}
    else fit(g,img,0,0,w,h);
  }else{g.fillStyle='#f4ecd9';g.font='22px Georgia';lines(g,pic.item.title,190).forEach((l,i)=>g.fillText(l,14,130+28*i));}
  g.restore();
}
export function installPosters(interior,roomStock,targets,content){
  const stock=new Map([...interior.featureStock,...roomStock]);
  const slots=[...rooms.flatMap(r=>mounts(r,interior.shelfBounds)),...stairFrames()].filter(s=>stock.get(s[6])?.length);
  if(!slots.length)return ()=>{};
  const decksByRoom=new Map([...stock].map(([r,i])=>[r,decks(i,r,content)])),counts=new Map();
  const w=224,h=320,cols=12,atlas=document.createElement('canvas');atlas.width=cols*w;atlas.height=Math.ceil(slots.length/cols)*h;
  const ctx=atlas.getContext('2d',{alpha:false}),texture=new T.CanvasTexture(atlas);texture.colorSpace=T.SRGBColorSpace;
  const material=new T.MeshBasicMaterial({map:texture,toneMapped:false}),rim=new T.MeshStandardMaterial({color:'#282823',roughness:.45});
  const panels=slots.map(([level,x,y,z,angle,width,room],index)=>{
    const mount=new T.Group(),height=width*aspect;mount.position.set(x,y,z);mount.rotation.y=angle;interior.floors[level-1].add(mount);
    mount.add(new T.Mesh(new T.BoxGeometry(width+.039,height+.039,.037),rim));
    const geo=new T.PlaneGeometry(width,height),uv=geo.attributes.uv,sx=(index%cols)*w,sy=Math.floor(index/cols)*h;
    for(let i=0;i<4;i++)uv.setXY(i,(sx+.5+uv.getX(i)*(w-1))/atlas.width,1-(sy+.5+(1-uv.getY(i))*(h-1))/atlas.height);
    const panel=new T.Mesh(geo,material);panel.position.z=.021;mount.add(panel);panel.userData={display:'poster',level,width,height,room};targets[level-1].push(panel);
    const n=counts.get(room)||0;counts.set(room,n+1);
    const [a,b]=decksByRoom.get(room);return {panel,sx,sy,pool:b.length&&(room==='music'?n%2===0:n%3===1)?b:a,previous:null};
  });
  let busy=false,due=0;
  async function rotate(){
    busy=true;const used=new Map(),images=new Map();
    try{await Promise.all(panels.map(async p=>{
      const room=p.panel.userData.room;if(!used.has(room))used.set(room,new Set());const seen=used.get(room);
      const fresh=p.pool.filter(e=>e!==p.previous&&!seen.has(e.item.albumUri||e.item.id));
      const unused=p.pool.filter(e=>!seen.has(e.item.albumUri||e.item.id));
      const pool=fresh.length?fresh:unused.length?unused:p.pool.filter(e=>e!==p.previous);
      const pick=pool[Math.floor(Math.random()*pool.length)]||p.pool[0];if(!pick)return;
      seen.add(pick.item.albumUri||pick.item.id);
      if(!images.has(pick.image)){const img=new Image();img.src=pick.image;images.set(pick.image,img.decode().then(()=>img,()=>null));}
      const image=await images.get(pick.image);paint(ctx,pick,image,p.sx,p.sy);p.previous=pick;Object.assign(p.panel.userData,{item:pick.item,kind:pick.kind});
    }));texture.needsUpdate=true;}finally{busy=false;}
  }
  return now=>{if(!busy&&now>=due){due=now+60000;void rotate();}};
}
