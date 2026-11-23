// Original low-resolution icons and the lounge's room tile. CSS scales pixels without filtering.
const colors={k:'#303030',w:'#f6f6f6',g:'#a2a2a2',d:'#666666',s:'#818181',y:'#c8c8c8',r:'#868686',b:'#606060',p:'#919191'};
const sprites={
  logo:['    yyyy    ','   ywwwwy   ','  ywwwwwwy  ','  kkggggkk  ','  kgddddgk  ','  kgdyydgk  ','  kgdyydgk  ','  kgddddgk  ','  kggggggk  ','  kyyyyyyk  ','   kkkkkk   '],
  map:[' kk    kk   ',' kggkkkwwkk ',' kgwgkkwywk ',' kgwggkwywk ',' kgwwgkwggk ',' kgywwkwggk ',' kgyggkygwk ',' kggggkywwk ',' kkgggkwkkk ','   kkkkk    '],
  collection:['    kkkk    ','   kyyyyk   ',' kkkwyywkkk ',' kyyyyyyyyk ',' kywwwwwwyk ',' kgkkkkkkgk ',' kgkggggkgk ',' kgkgwwgkgk ',' kggggggggk ',' kkkkkkkkkk '],
  disc:['    kkkk    ','  kkswwwkk  ',' ksswwwpppk ',' ksswwppppk ','kswwwkkppggk','kswwkkkkgggk','kswwkkkkgggk','kssppkkggggk',' kpppggggdk ',' kppgggdddk ','  kkddddkk  ','    kkkk    ']
};
function icon(name){
  const c=document.createElement('canvas');c.width=c.height=12;c.className='pixel-icon';c.setAttribute('aria-hidden','true');const g=c.getContext('2d');
  sprites[name].forEach((row,y)=>[...row].forEach((v,x)=>{if(colors[v]){g.fillStyle=colors[v];g.fillRect(x,y,1,1);}}));return c;
}
for(const el of document.querySelectorAll('[data-pixel]'))el.prepend(icon(el.dataset.pixel));
const tile=document.getElementById('roomTile'),g=tile.getContext('2d');
g.imageSmoothingEnabled=false;
function poly(points,color){g.fillStyle=color;g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(Math.round(x),Math.round(y)):g.moveTo(Math.round(x),Math.round(y)));g.closePath();g.fill();}
const offset=[63,26],iso=(x,y,z)=>[offset[0]+(x-z)*3,offset[1]+(x+z)*1.48-y*3];
function cube(x,z,y,w,d,h,top,left,right){
  const corner=(a,b,c)=>iso(x+a,y+c,z+b);
  poly([corner(0,d,0),corner(w,d,0),corner(w,d,h),corner(0,d,h)],left);
  poly([corner(w,d,0),corner(w,0,0),corner(w,0,h),corner(w,d,h)],right);
  poly([corner(0,0,h),corner(w,0,h),corner(w,d,h),corner(0,d,h)],top);
}
cube(0,0,0,18,16,1,'#afafaf','#646464','#4c4c4c');
cube(0,0,1,.7,16,7,'#dcdcdc','#868686','#a5a5a5');cube(0,0,1,18,.7,7,'#dfdfdf','#aeaeae','#7e7e7e');
cube(2,1,1,9,2,2,'#878787','#585858','#414141');cube(3,1.2,3,5.5,.6,3.8,'#474747','#383838','#2f2f2f');
poly([iso(3.4,3.5,1.86),iso(8.13,3.5,1.86),iso(8.13,6.37,1.86),iso(3.4,6.37,1.86)],'#909090');
cube(9,1,3,1.4,1.2,1,'#535353','#3a3a3a','#2b2b2b');cube(12,.9,1,4.5,1.7,5.2,'#7d7d7d','#494949','#393939');
for(let row=0;row<2;row++)for(let i=0;i<10;i++)cube(12.2+i*.4,2.55,1.37+row*2.15,.31,.23,1.55,['#949494','#e5e5e5','#9b9b9b','#606060'][i%4],'#aeaeae','#6d6d6d');
cube(4.5,5,1,8,7,.09,'#ababab','#909090','#868686');cube(6,6,1.1,4.3,2.5,1.1,'#818181','#575757','#494949');
cube(5.7,10,1.1,6.4,2.9,1.3,'#c5c5c5','#989898','#808080');cube(5.7,12,2.35,6.4,.95,1.8,'#b2b2b2','#939393','#818181');
cube(1.4,7.4,1,1.4,1.4,1.3,'#8b8b8b','#5b5b5b','#494949');[[1,7,2.35],[1.6,7,3.4],[.7,7.6,3.2],[1.8,7.8,2.8]].forEach(([x,z,y])=>cube(x,z,y,1.2,.95,1.35,'#989898','#6f6f6f','#555555'));

