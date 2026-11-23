import * as T from './vendor/three.module.js';

// The projector shows the current candidate while its trailer buffers. Once playback
// starts, the channel uses the live video surface in exactly the same frame.
export function cinemaProgramme(){
  const canvas=document.createElement('canvas');canvas.width=960;canvas.height=540;
  const g=canvas.getContext('2d');
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;
  const material=new T.MeshBasicMaterial({map,toneMapped:false});
  let current=null,sequence=0;
  function draw(item,image=null){
    const gradient=g.createLinearGradient(0,0,960,540);
    gradient.addColorStop(0,'#272c2c');gradient.addColorStop(1,'#0d1414');
    g.fillStyle=gradient;g.fillRect(0,0,960,540);
    if(item){
      if(image){
        g.save();g.beginPath();g.rect(0,0,960,540);g.clip();
        g.globalAlpha=.22;g.filter='blur(28px)';g.drawImage(image,-35,-270,1030,1200);g.restore();
        const maxW=258,maxH=376,scale=Math.min(maxW/image.width,maxH/image.height);
        const w=image.width*scale,h=image.height*scale;
        g.drawImage(image,72+(maxW-w)/2,84+(maxH-h)/2,w,h);
      }
      const x=image?375:83,available=960-x-58;
      g.fillStyle='#d0b995';g.font='500 18px Helvetica, Arial';g.fillText('UP NEXT',x,166);
      let lines=[],fontSize=54;
      while(fontSize>=22){
        g.font='500 '+fontSize+'px Helvetica Neue, Helvetica, Arial';lines=[''];
        for(const word of item.title.split(/\s+/)){
          const last=lines.length-1,line=(lines[last]+' '+word).trim();
          if(lines[last]&&g.measureText(line).width>available)lines.push(word);else lines[last]=line;
        }
        if(lines.length<=3)break;fontSize-=3;
      }
      g.fillStyle='#f6f2e9';
      lines.slice(0,3).forEach((line,i)=>g.fillText(line,x,244+i*(fontSize+4),available));
      g.fillStyle='#c0c3bb';g.font='23px Helvetica,Arial';g.fillText([item.year,'Trailer'].filter(Boolean).join('   ·   '),x,259+Math.min(lines.length,3)*(fontSize+4));
    }else{
      g.textAlign='center';g.font='500 53px Helvetica Neue, Helvetica, Arial';g.fillStyle='#e7e3d9';
      g.fillText('Private cinema',480,280);g.textAlign='start';
    }
    map.needsUpdate=true;
  }
  draw(null);
  material.userData.cue=item=>{
    if(current===item?.id)return;current=item?.id||null;
    const ticket=++sequence;draw(item);
    if(!item?.artwork)return;
    const img=new Image();img.crossOrigin='anonymous';
    img.onload=()=>{if(ticket===sequence)draw(item,img);};img.src=item.artwork;
  };
  return material;
}
