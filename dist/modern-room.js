import * as T from './vendor/three.module.js';

const steel='#4a5459',black='#262b31',white='#d9d8ce',rubber='#27292a';
const light=new T.MeshBasicMaterial({color:'#add8e1'});
function graphic(draw,w=768,h=384,alpha=false){
  const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);
  const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;
  return new T.MeshStandardMaterial({map,roughness:.86,alphaTest:alpha?.30:0});
}
function psMat({part}){
  const material=graphic((g,w,h)=>{
    g.fillStyle='#222932';g.fillRect(0,0,w,h);
    for(let y=0;y<h;y+=3){g.fillStyle=y%2?'#29313a':'#2b333d';g.fillRect(0,y,w,1);}
    g.strokeStyle='#48515e';g.lineWidth=4;g.strokeRect(10,10,w-20,h-20);
    const colors=['#79ada0','#b67886','#7e9bb5','#ab8eaf'];
    function symbol(i,x,y,r){g.save();g.translate(x,y);g.lineWidth=Math.max(2,r*.11);g.strokeStyle=colors[i];g.beginPath();
      if(i===0){g.moveTo(0,-r);g.lineTo(.96*r,.72*r);g.lineTo(-.96*r,.72*r);g.closePath();}
      if(i===1)g.arc(0,0,r*.84,0,Math.PI*2);
      if(i===2){g.moveTo(-r*.69,-r*.69);g.lineTo(r*.69,r*.69);g.moveTo(r*.69,-r*.69);g.lineTo(-r*.69,r*.69);}
      if(i===3)g.rect(-r*.72,-r*.72,r*1.44,r*1.44);g.stroke();g.restore();}
    for(let i=0;i<4;i++)symbol(i,w*(.22+.185*i),h*.70,44);
    for(let i=0;i<24;i++){symbol(i%4,32+31*i,27,6);symbol(i%4,32+31*i,h-27,6);}
  },768,578);
  part(new T.PlaneGeometry(),4,.037,.32,5.53,4.46,1,material,-Math.PI/2);
}
function cabinet({part,box,cyl,oval,label,group}){
  const lo=1.13,hi=4.96,cx=(lo+hi)/2,z=5.60;
  function tag(name,x,y){const m=label(group,name,x,y,z-.244,.49,.068,{width:620,height:88,size:54,bg:'#333634',color:'#e9e0cb'});m.rotation.y=Math.PI;}
  const y=.905;
  // Disc-drive family. Stepped wedges and vented faces read differently in profile.
  const xs=[1.61,2.53,3.47,4.40];
  xs.forEach((x,i)=>tag(['PlayStation 5','PlayStation 4','PlayStation 3','Nintendo Switch'][i],x,.878));
  box(xs[0],y+.19,z,.09,.37,.232,black);
  for(const s of [-1,1])box(xs[0]+s*.059,y+.20,z,.022,.405,.25,white,0,0,-s*.073);
  box(xs[0]-.052,y+.106,z-.131,.010,.105,.007,black);
  for(let i=0;i<3;i++)box(xs[1]+i*.006,y+.016+i*.033,z,.286,.026,.236,i===1?rubber:'#42464b');
  part('cushion',xs[2],y+.050,z,.321,.103,.265,'#343538');box(xs[2],y+.038,z-.135,.246,.004,.007,black);
  box(xs[3],y+.09,z,.205,.117,.015,black);box(xs[3],y+.048,z-.027,.184,.086,.050,'#35383a');
  for(const [dx,color] of [[-.11,'#5798a7'],[.11,'#b85e54']])part('cushion',xs[3]+dx,y+.089,z,.029,.112,.018,color);
  const low=.345;
  for(const [i,x] of [1.93,3.04,4.16].entries()){
    tag(['Xbox One','Xbox One X','Xbox One S'][i],x,.315);
    const w=[.344,.30,.295][i],h=[.080,.06,.064][i];
    box(x,low+h/2,z,w,h,.245,i===2?'#d4d3cb':black);box(x,low+h*.36,z-.124,w*.35,.004,.004,'#101315');
    for(let k=0;k<9;k++)box(x+.016+k*.012,low+h+.0008,z,.006,.0016,.203,i===2?'#94978f':'#494d50');
    cyl(x-w*.36,low+h*.67,z-.125,.011,.003,.011,light,Math.PI/2);
  }
  for(let i=0;i<8;i++){
    const x=lo+.29+.46*i,y=1.557,zp=z-.037,a=i%2?.09:-.09;
    const colors=['#a6a7a4','#bb7148','#627f9c','#7a718d','#719682','#e0cc91','#935f72','#8daeb5'];
    const tone=colors[i],accent=colors[(i+3)%8];
    part('cushion',x,y,zp,.158,.079,.057,tone,-.28,a);
    for(const s of [-1,1]){oval(x+s*.059,y-.025,zp,.052,.091,.059,tone,-.27,0,s*-.33);cyl(x+s*.024,y-.004,zp-.033,.023,.008,.023,black,Math.PI/2);}
    const shellArt=graphic((g,w,h)=>{
      g.fillStyle=tone;g.fillRect(0,0,w,h);g.strokeStyle=accent;g.fillStyle=accent;g.lineWidth=7;
      switch(i%4){
        case 0:
          for(let a=-60;a<w;a+=78){g.beginPath();g.moveTo(a,0);g.lineTo(a+49,h);g.lineTo(a+61,h);g.lineTo(a+12,0);g.fill();}
          break;
        case 1:
          for(let row=0;row<6;row++){g.beginPath();for(let t=0;t<=w;t+=3){const v=row*12+Math.sin(t/24+row*.62)*8;t?g.lineTo(t,v):g.moveTo(t,v);}g.stroke();}
          break;
        case 2:
          for(let a=0;a<18;a++)g.fillRect((a*61)%w,(a*29)%h,11+(a%3)*5,7);
          break;
        default:
          for(let a=0;a<9;a++){g.beginPath();g.moveTo(w*.69,h);g.lineTo(a*w/5-w*.60,0);g.lineTo((a+.35)*w/5-w*.60,0);g.fill();}
      }
    },240,76);
    part(new T.PlaneGeometry(),x,y+.002,zp-.030,.135,.046,1,shellArt,.13,Math.PI+a);
    box(x-.044,y+.019,zp-.035,.025,.007,.006,black);box(x-.044,y+.019,zp-.032,.007,.025,.006,black);
    for(const [dx,dy] of [[.045,.027],[.055,.017],[.045,.007],[.035,.017]])cyl(x+dx,y+dy,zp-.033,.006,.006,.006,accent,Math.PI/2);
    box(x,1.495,z,.068,.044,.10,steel);
  }
  tag('Custom controllers',cx,1.451);
}
export function dressGamingRoom(api){
  psMat(api);
  cabinet(api);
}
