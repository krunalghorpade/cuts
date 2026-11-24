// A room programme uses the chosen edition's own art, credits and description.
export function showProgramme(surface,item,label,caption=''){
  let card=surface.querySelector('.screen-programme');
  if(!card){card=document.createElement('article');card.className='screen-programme';surface.append(card);}
  card.replaceChildren();
  if(item.artwork){
    const image=document.createElement('img');image.src=item.artwork;image.alt='';
    card.append(image);
  }
  const copy=document.createElement('div');
  for(const [tag,value] of [['small',label],['strong',item.title],['span',[item.creator,item.year].filter(Boolean).join(' · ')],['p',caption]]){
    if(!value)continue;
    const node=document.createElement(tag);node.textContent=value;copy.append(node);
  }
  card.append(copy);
}

// Artwork stays in place while longer descriptions advance in readable pages.
export function programmePages(text){
  const pages=[''];
  for(const word of (text||'').split(/\s+/)){
    if(pages.at(-1).length+word.length>155)pages.push('');
    const last=pages.length-1;
    pages[last]+=(pages[last]?' ':'')+word;
  }
  return pages;
}
