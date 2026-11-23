import * as T from './vendor/three.module.js';
import {shelfCover} from './shelf-render.js';

export function dressRooms({part,box,cyl,oval,group,label,walnut,items,editorial,featureStock}){
  const byId=new Map(items.map(i=>[i.id,i]));
  const metal='#8b9390',porcelain='#e1d9c6',ink='#252e30',copper='#ae714a';
  const materials=new Map(),used=new Map();
  function display(room,id,x,y,z,w,h,angle,tilt=0){
    const item=byId.get(id),tile=item&&shelfCover(item.artwork);
    if(!tile)return;
    if(!used.has(room))used.set(room,new Map());
    used.get(room).set(id,item);
    if(!materials.has(tile.map))materials.set(tile.map,new T.MeshBasicMaterial({map:tile.map}));
    const plane=new T.PlaneGeometry(),uv=plane.attributes.uv;
    for(let j=0;j<uv.count;j++)uv.setXY(j,tile.u+uv.getX(j)*tile.scale,tile.v+uv.getY(j)*tile.scale);
    box(x,y,z,w+.007,h+.007,.012,'#544c42',0,angle,tilt);
    part(plane,x+Math.sin(angle)*.007,y,z+Math.cos(angle)*.007,w,h,1,materials.get(tile.map),0,angle,tilt);
  }
  function text(line,x,y,z,w,h,angle,bg,color){
    const m=label(group,line,x,y,z,w,h,{width:1024,height:144,bg,color,size:56});m.rotation.y=angle;
  }
  // Attach the line to the object featuring its source, such as a mirror decal or alarm clock.
  function quote(room,id,x,y,z,w,h,angle,bg,color){
    const item=byId.get(id),line=editorial.quotes.find(q=>q.id===id&&q.rooms.includes(room==='bed'?'bedroom':'bathroom'));
    if(!item||!line)return;
    if(!used.has(room))used.set(room,new Map());used.get(room).set(id,item);
    text(line.text,x,y,z,w,h,angle,bg,color);
  }
  const kitchen=['tt0099685','tt0110912','tt0264464','tt0075314','tt0068646','tt0496424','tt0098936','tt0080684'];
  kitchen.forEach((id,i)=>display('kitchen',id,13.09+(i%4)*.172,1.89-Math.floor(i/4)*.209-(i%2)*.038,7.502,.118,.16,Math.PI,Math.sin(i)*.11));
  for(const y of [.97,1.50])box(13.70,y,7.472,.029,.29,.041,ink);
  box(11.01,.955,8.41,.78,.024,.52,ink);
  for(const x of [10.80,11.22])for(const z of [8.29,8.53]){
    cyl(x,.972,z,.20,.006,.20,metal);cyl(x,.977,z,.175,.006,.175,ink);
  }
  cyl(10.8,1.052,8.46,.263,.15,.263,copper);cyl(10.8,1.136,8.46,.27,.015,.27,metal);oval(10.8,1.16,8.46,.061,.039,.061,ink);
  for(const dx of [-.15,.15])box(10.80+dx,1.075,8.46,.075,.022,.048,ink);
  cyl(11.23,.997,8.29,.228,.04,.228,'#484443');box(11.39,1.00,8.29,.16,.022,.033,ink);
  box(11.78,.954,8.39,.43,.022,.26,walnut);
  for(let i=0;i<3;i++)oval(11.68+.094*i,.999,8.38+Math.sin(i)*.045,.078,.075,.079,i===2?'#ad8448':'#a74a3c');
  for(let i=0;i<4;i++){const x=8.99+i*.133;cyl(x,1.042,8.53,.10,.20,.10,['#b19974','#c0ae90','#a57553','#d1b896'][i]);cyl(x,1.147,8.53,.106,.018,.106,metal);}
  cyl(9.52,1.057,8.44,.14,.225,.14,porcelain);
  for(let i=0;i<4;i++){box(9.48+i*.025,1.22,8.42+.018*(i%2),.012,.20,.013,walnut,0,0,(i-1.5)*.09);oval(9.47+i*.033,1.316,8.42,.033,.062,.017,walnut);}
  box(11.06,1.85,8.75,2.05,.045,.26,walnut);
  for(let i=0;i<5;i++)cyl(10.52,1.894+i*.014,8.72,.30,.012,.30,porcelain);
  function mug(x,y,z,color){cyl(x,y+.05,z,.086,.10,.086,color);cyl(x,y+.103,z,.071,.006,.071,'#483c31');part(new T.TorusGeometry(.5,.11,6,14),x+.053,y+.054,z,.057,.066,.06,color);}
  for(let i=0;i<4;i++)mug(10.98+i*.18,1.874,8.73,i%2?porcelain:'#668078');
  mug(10.51,1.035,6.58,'#54796f');mug(11.75,1.035,6.61,porcelain);
  box(11.12,1.043,6.63,.49,.016,.32,'#9b745b');oval(11.12,1.10,6.63,.28,.11,.24,porcelain);
  // Bedroom dressing table, souvenirs, alarm and slippers.
  const bedroom=['tt0212720','tt0062622','tt0133093','tt0245429','tt0098904','tt4550098','tt0332280'];
  bedroom.forEach((id,i)=>{const x=10.61+i*.49;box(x,.88,-1.50,.22,.084,.17,walnut);display('bed',id,x,1.05,-1.512,.18,.255,Math.PI);});
  box(9.94,.813,-6.97,.27,.127,.092,ink);text('07 30',9.94,.819,-6.916,.221,.078,0,'#172325','#e1a56d');
  quote('bed','tt0098904',11.65,1.36,-7.48,1.04,.138,0,'#624f3e','#eee0c4');
  box(13.34,.775,-6.96,.21,.036,.137,'#5b6873');box(13.3,.804,-6.96,.18,.021,.12,'#a28461');
  for(let i=0;i<2;i++){oval(12.68+i*.15,.061,-4.10,.119,.096,.28,'#9e8a72');oval(12.68+i*.15,.106,-4.14,.10,.023,.10,'#64594c');}
  // Porcelain, terrycloth and film-labelled toiletries.
  const bathIds=['tt0075314','tt0081505','tt0386676','tt0057012','tt0487831'];
  box(10.45,1.41,-.739,.96,.038,.25,walnut);
  bathIds.forEach((id,i)=>{const x=10.09+i*.18;box(x,1.53,-.72,.115,.207,.082,['#9c987e','#a78b69','#647d79'][i%3]);cyl(x,1.65,-.72,.052,.043,.052,ink);display('bath',id,x,1.53,-.671,.083,.109,0);});
  quote('bath','tt0075314',9.53,1.55,-.829,1.03,.12,0,'#75827c','#f2efdb');
  for(let i=0;i<2;i++){cyl(9.02+i*.12,.941,-.48,.093,.20,.093,i?porcelain:'#7a6855');}
  box(9.02,1.06,-.48,.062,.021,.024,metal);
  for(const dx of [-.02,.015]){box(9.14+dx,1.095,-.48,.013,.13,.015,'#688585',0,0,dx*3);box(9.14+dx,1.16,-.48,.02,.03,.017,porcelain);}
  box(10.66,.029,1.26,1.01,.045,.62,'#82958c');
  box(12.82,1.24,.46,.08,.046,.72,metal);box(12.76,1.05,.46,.045,.40,.46,'#c7c3b2');
  for(let i=0;i<3;i++){cyl(12.83,.96+i*.25,1.82,.13,.20,.13,['#507572','#ac8f75','#c8bdab'][i]);}
  cyl(12.63,.77,-.52,.139,.151,.139,porcelain,Math.PI/2);
  // Actual artwork on the folded graphic tops in the clothing shop.
  const shop=['tt1211837','tt3315342','tt0245429','tt0133093','tt0080684','tt4154756','tt0241527','tt2911666'];
  shop.forEach((id,i)=>{const z=8.54+(i%4)*.49,y=.30+Math.floor(i/4)*.55;box(-12.48,y,z,.31,.21,.36,i%2?'#7b7465':'#4d6163');display('shop',id,-12.315,y,z,.125,.167,Math.PI/2);});
  const ticketIds=items.filter(i=>['movies','anime-movies','shows','anime'].includes(i.category)&&shelfCover(i.artwork)).slice(0,23);
  box(-10,2.77,-8.85,3.00,.42,.053,walnut);
  ticketIds.forEach((item,i)=>{display('stairs',item.id,-11.32+(i%12)*.239,2.852-Math.floor(i/12)*.177,-8.81,.119,.145,0);});
  for(const [key,value] of used)featureStock.set(key,[...value.values()]);
}
