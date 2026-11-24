// The collection's display convention is four episodes per disc unless the
// selected physical edition has a documented disc count.
export function boxSetLayout(item,record,editions={},fanart){
  const known=record?.seasons?.length;
  const cases=known?record.seasons:[{label:'Series case',episodes:item.episodeCount??null}];
  return cases.map(season=>{
    const edition=season.number!=null?editions?.[season.number]:null;
    const labels=new Map((edition?.discs||[]).map(d=>[d.number,d]));
    const verified=Number.isInteger(edition?.discCount)&&edition.discCount>0;
    const count=verified?edition.discCount:Math.max(1,Math.ceil((season.episodes||0)/4),...labels.keys());
    const print=fanart?.seasons?.[season.number];
    return {...season,artwork:print?.artwork||season.artwork||fanart?.front?.artwork||item.artwork,
      artworkPage:print?.imageSource||season.artworkPage,seasonArt:!!(print||season.artwork),
      label:season.label||'Season '+season.number,count,labels,verified,
      unknownCount:!verified&&!season.episodes&&!labels.size,source:season.source||record?.source,
      editionSource:edition?.source,format:edition?.format||'dvd'};
  });
}
export function discSpread(season,page){
  const first=page*2+1,nums=[first];
  if(first<season.count)nums.push(first+1);
  return nums;
}
export function spreadName(season,page){
  const nums=discSpread(season,page);
  if(season.unknownCount)return 'Disc';
  return nums.length===1?'Disc '+nums[0]:'Discs '+nums.join('–');
}

// Minimum spine thickness in millimetres for a slim keep case or a hinged
// two-sided disc tray. Extra leaves each hold another pair of discs.
export function seasonThickness(season){
  return season.count===1?9:13+Math.ceil((season.count-2)/2)*2.2;
}
export function minimumBoxDepth(seasons){
  return Math.ceil(2.5+(seasons.length+1)*.8+seasons.reduce((mm,s)=>mm+seasonThickness(s),0));
}
