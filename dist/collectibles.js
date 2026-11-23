import * as T from './vendor/three.module.js';

// Two floating display shelves on the gaming-room side of the central wall.
export function collectibleShelves({group,box,cyl,walnut,block,shelfBounds,label}){
  const iron='#373938',felt='#5d5a53';
  const wall=.117,depth=.38,front=wall+depth;
  const figures=[
    {id:'goku',name:'SON GOKU',z:-.15,h:.56,aspect:255/600},
    {id:'naruto',name:'NARUTO UZUMAKI',z:-.90,h:.51,aspect:260/600},
    {id:'gundam',name:'RX-78-2 GUNDAM',z:-1.93,h:.78,aspect:258/600}
  ];
  const loader=new T.TextureLoader();
  for(const [z,w,top] of [[-.51,1.57,1.17],[-1.93,.94,1.40]]){
    box(wall+.019,top+.31,z,.038,.86,w-.055,felt);
    box(wall+depth/2,top-.032,z,depth,.064,w,walnut);
    for(const side of [-1,1]){
      const p=z+side*(w/2-.14);
      box(wall+.04,top-.16,p,.045,.29,.033,iron);
      box(wall+.175,top-.073,p,.30,.032,.033,iron);
      box(wall+.15,top-.165,p,.34,.028,.027,iron,0,0,.59);
    }
    box(front-.047,top-.067,z,.022,.005,w-.13,new T.MeshBasicMaterial({color:'#eecb9f'}));
    block(wall+depth/2,z,depth,w);
    shelfBounds.push({level:2,x:wall+depth/2,z,w:depth,d:w,bottom:top-.32,top:top+.87});
  }
  for(const {id,name,z,h,aspect} of figures){
    const top=id==='gundam'?1.40:1.17,x=wall+.229,support=top+.033;
    cyl(x,top+.014,z,.173,.028,.276,'#282b2c');
    box(x,support,z,.032,.017,.17,'#777b79');
    const map=loader.load('./art/collectibles/'+id+'.webp');map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;
    const figure=new T.Mesh(new T.PlaneGeometry(h*aspect,h),new T.MeshStandardMaterial({
      map,alphaTest:.4,side:T.DoubleSide,roughness:.69,emissive:'#ffffff',emissiveMap:map,emissiveIntensity:.18
    }));
    figure.name=name;figure.position.set(x,support+h/2,z);figure.rotation.y=Math.PI/2;group.add(figure);
    const plaque=label(group,name,front+.001,top-.029,z,.25,.046,{height:100,width:580,bg:'#32302d',color:'#e9ddc9',size:56});
    plaque.rotation.y=Math.PI/2;
  }
}
