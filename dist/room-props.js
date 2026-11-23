import * as T from './vendor/three.module.js';
import {shelfCover} from './shelf-render.js';

export function dressRooms({part,box,group,label,walnut,items,editorial,featureStock}){
  const byId=new Map(items.map(i=>[i.id,i]));
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
  // Geometry for these souvenirs, picture frames and toiletries is in the Blender rooms.
  const kitchen=['tt0099685','tt0110912','tt0264464','tt0075314','tt0068646','tt0496424','tt0098936','tt0080684'];
  kitchen.forEach((id,i)=>display('kitchen',id,13.09+(i%4)*.172,1.89-Math.floor(i/4)*.209-(i%2)*.038,7.485,.118,.16,Math.PI,Math.sin(i)*.11));
  const bedroom=['tt0212720','tt0062622','tt0133093','tt0245429','tt0098904','tt4550098','tt0332280'];
  bedroom.forEach((id,i)=>display('bed',id,10.61+i*.49,.989,-1.705,.158,.208,Math.PI));
  text('07 30',9.998,.756,-6.877,.179,.067,0,'#172325','#e1a56d');
  quote('bed','tt0098904',11.65,1.36,-7.46,1.04,.138,0,'#624f3e','#eee0c4');
  const bathIds=['tt0075314','tt0081505','tt0386676','tt0057012','tt0487831'];
  bathIds.forEach((id,i)=>display('bath',id,10.09+i*.18,1.53,-.671,.083,.109,0));
  quote('bath','tt0075314',9.49,1.55,-.824,1.03,.12,0,'#75827c','#f2efdb');
  const shop=['tt1211837','tt3315342','tt0245429','tt0133093','tt0080684','tt4154756','tt0241527','tt2911666'];
  shop.forEach((id,i)=>display('shop',id,-12.315,.30+Math.floor(i/4)*.55,8.54+(i%4)*.49,.125,.15,Math.PI/2));
  const ticketIds=items.filter(i=>['movies','anime-movies','shows','anime'].includes(i.category)&&shelfCover(i.artwork)).slice(0,23);
  box(-10,2.77,-8.85,3.00,.42,.053,walnut);
  ticketIds.forEach((item,i)=>{display('stairs',item.id,-11.32+(i%12)*.239,2.852-Math.floor(i/12)*.177,-8.81,.119,.145,0);});
  for(const [key,value] of used)featureStock.set(key,[...value.values()]);
}
