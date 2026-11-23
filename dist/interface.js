// Original low-resolution icons and the lounge's room tile. CSS scales pixels without filtering.
const colors={k:'#263144',w:'#fff6de',g:'#39bfb2',d:'#23777f',s:'#7381ab',y:'#f9c465',r:'#e36d6c',b:'#4c6383',p:'#ac84be'};
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
cube(0,0,0,18,16,1,'#bcae8e','#5b6572','#414d61');
cube(0,0,1,.7,16,7,'#d5dfd0','#748b86','#95aaa1');cube(0,0,1,18,.7,7,'#f0debd','#b8ad95','#817e70');
cube(2,1,1,9,2,2,'#ad8060','#76523f','#533d39');cube(3,1.2,3,5.5,.6,3.8,'#3e4855','#333846','#29303c');
poly([iso(3.4,3.5,1.86),iso(8.13,3.5,1.86),iso(8.13,6.37,1.86),iso(3.4,6.37,1.86)],'#6a9aa4');
cube(9,1,3,1.4,1.2,1,'#4d5361','#333b48','#252c32');cube(12,.9,1,4.5,1.7,5.2,'#9d7759','#574640','#41373a');
for(let row=0;row<2;row++)for(let i=0;i<10;i++)cube(12.2+i*.4,2.55,1.37+row*2.15,.31,.23,1.55,['#c88969','#eee4ce','#83a29b','#596079'][i%4],'#b8ad9d','#766b65');
cube(4.5,5,1,8,7,.09,'#c3a785','#9d8f74','#918573');cube(6,6,1.1,4.3,2.5,1.1,'#a77a50','#71523d','#58463b');
cube(5.7,10,1.1,6.4,2.9,1.3,'#c3c6bc','#8d9b96','#71847e');cube(5.7,12,2.35,6.4,.95,1.8,'#a9b5a9','#83988f','#74857d');
cube(1.4,7.4,1,1.4,1.4,1.3,'#a58765','#675950','#51464b');[[1,7,2.35],[1.6,7,3.4],[.7,7.6,3.2],[1.8,7.8,2.8]].forEach(([x,z,y])=>cube(x,z,y,1.2,.95,1.35,'#7fa468','#55795d','#395e51'));

