export function installArcade(onClose){
  const dialog=document.getElementById('arcadeGame'),canvas=document.getElementById('arcadeCanvas'),g=canvas.getContext('2d');
  const scores=document.getElementById('arcadeScore'),held=new Set();
  let key,score,ship,ball,blocks,stars,running,frame,previous,spawn,drag=null;
  const W=canvas.width,H=canvas.height;
  function paint(){
    g.fillStyle='#101722';g.fillRect(0,0,W,H);
    for(let i=0;i<52;i++){g.fillStyle=i%4?'#364255':'#667284';g.fillRect(i*71%W,(i*i*17)%H,1.5,1.5);}
    if(key==='bricks'){
      for(const b of blocks){g.fillStyle=['#ce7966','#e5b777','#8bbba6','#6d98b9'][b.row];g.fillRect(b.x,b.y,b.w,b.h);}
      g.fillStyle='#f7e4bb';g.fillRect(ship-32,H-27,64,8);g.beginPath();g.arc(ball.x,ball.y,5,0,Math.PI*2);g.fill();
    }else{
      for(const s of stars){g.fillStyle=s.good?'#eed198':'#ad759c';g.beginPath();g.arc(s.x,s.y,s.r,0,Math.PI*2);g.fill();}
      g.fillStyle='#b1d0cc';g.beginPath();g.moveTo(ship,H-50);g.lineTo(ship-14,H-22);g.lineTo(ship,H-28);g.lineTo(ship+14,H-22);g.closePath();g.fill();
    }
    if(!running){g.fillStyle='#111a';g.fillRect(0,0,W,H);g.fillStyle='#fafafa';g.font='22px Helvetica, sans-serif';g.textAlign='center';g.fillText(key==='bricks'&&!blocks.length?'Board cleared':'Game over',W/2,H/2);}
  }
  function finish(){running=false;document.getElementById('arcadeAgain').classList.remove('hidden');}
  function tick(t){
    if(!dialog.open)return;
    const dt=Math.min((t-previous)/1000,.032);previous=t;
    if(running){
      const step=(Number(held.has('ArrowRight')||held.has('KeyD'))-Number(held.has('ArrowLeft')||held.has('KeyA')))*340*dt;
      ship=Math.max(32,Math.min(W-32,ship+step));
      if(key==='bricks'){
        ball.x+=dt*ball.vx;ball.y+=dt*ball.vy;
        if(ball.x<=5||ball.x>=W-5){ball.x=Math.max(5,Math.min(W-5,ball.x));ball.vx*=-1;}
        if(ball.y<=5){ball.y=5;ball.vy=Math.abs(ball.vy);}
        const hit=blocks.findIndex(b=>ball.x>b.x-4&&ball.x<b.x+b.w+4&&ball.y>b.y-4&&ball.y<b.y+b.h+4);
        if(hit>=0){blocks.splice(hit,1);ball.vy*=-1;score+=10;if(!blocks.length)finish();}
        if(ball.vy>0&&ball.y>=H-32&&ball.y<H-18&&Math.abs(ball.x-ship)<36){ball.vx=(ball.x-ship)*4.5;ball.vy=-215;}
        if(ball.y>H+5)finish();
      }else{
        spawn-=dt;
        if(spawn<=0){const good=Math.random()<.36;stars.push({x:15+Math.random()*(W-30),y:-12,r:good?5:10,good});spawn=.41;}
        for(const s of stars){s.y+=dt*(145+score*.42);if(Math.hypot(s.x-ship,s.y-(H-33))<s.r+10){if(s.good){score+=10;s.y=H+20;}else finish();}}
        stars=stars.filter(s=>s.y<H+10);
      }
      scores.textContent='Score '+score;
    }
    paint();if(running)frame=requestAnimationFrame(tick);
  }
  function reset(){
    cancelAnimationFrame(frame);score=0;ship=W/2;spawn=.4;stars=[];blocks=[];held.clear();
    for(let j=0;j<4;j++)for(let i=0;i<8;i++)blocks.push({x:11+i*57,y:25+j*20,w:52,h:14,row:j});
    ball={x:W/2,y:H*.62,vx:115,vy:-195};running=true;previous=performance.now();
    document.getElementById('arcadeAgain').classList.add('hidden');frame=requestAnimationFrame(tick);
  }
  dialog.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','KeyA','KeyD'].includes(e.code)){e.preventDefault();held.add(e.code);}});
  window.addEventListener('keyup',e=>held.delete(e.code));window.addEventListener('blur',()=>held.clear());
  function move(e){const b=canvas.getBoundingClientRect();ship=Math.max(32,Math.min(W-32,(e.clientX-b.left)*W/b.width));}
  canvas.onpointerdown=e=>{drag=e.pointerId;canvas.setPointerCapture(drag);move(e);};
  canvas.onpointermove=e=>{if(drag===e.pointerId)move(e);};canvas.onpointerup=canvas.onpointercancel=()=>{drag=null;};
  document.getElementById('arcadeAgain').onclick=reset;document.getElementById('leaveArcade').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>{cancelAnimationFrame(frame);running=false;held.clear();onClose();});
  return (id,name)=>{key=id;document.getElementById('arcadeName').textContent=name;
    document.getElementById('arcadeGuide').textContent=id==='bricks'?'Move the paddle with ← → or drag. Clear the bricks.':'Steer with ← → or drag. Collect gold stars and dodge purple asteroids.';
    dialog.showModal();canvas.focus();reset();};
}
