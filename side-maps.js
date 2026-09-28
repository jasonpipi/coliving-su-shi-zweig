(()=>{'use strict';
const NS='http://www.w3.org/2000/svg',themes=new Map(ROOM_DATA.themes.map(t=>[t.id,t])),panels=[];
const maxCount=Math.max(...ROOM_DATA.themes.flatMap(t=>t.counts));
function el(tag,attrs={},text){const n=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));if(text)n.textContent=text;return n}
function request(id,side,inspect=false){window.dispatchEvent(new CustomEvent('corpus-hover',{detail:{id,side,inspect}}))}
function renderMap(map,root){
 const side=map.side,svg=root.querySelector('.cloud'),edges=el('g',{'aria-hidden':'true'}),nodes=el('g',{}),labels=[],entries=new Map();svg.append(edges,nodes);
 // Common rigid translation of both maps; never alter relative point coordinates.
 const points=new Map(map.nodes.map(n=>[n.id,[n.point[0],n.point[1]+86]]));
 // Place larger labels first. Label leaders preserve the exact semantic anchor.
 const sorted=map.nodes.slice().sort((a,b)=>themes.get(b.id).counts[side]-themes.get(a.id).counts[side]);
 for(const node of sorted){
  const theme=themes.get(node.id),count=theme.counts[side],size=10+11*Math.log1p(count)/Math.log1p(maxCount),meaning=side===0?theme.words[1]:'';
  const [x,y]=points.get(node.id),text=node.word,tw=Math.max(side===0?text.length*size:text.length*size*.52,meaning.length*5.8),th=size+(side===0?14:0);let best;
  for(const radius of [5,14,26,40,58,78,100])for(const sign of [1,-1])for(const dy of [-radius,radius,0]){
   const tx=Math.max(5,Math.min(255-tw,x+(sign>0?radius:-tw-radius))),ty=Math.max(th+8,Math.min(399,y+dy));
   const b=[tx-3,ty-size-3,tx+tw+3,ty+(side===0?16:3)];let cost=Math.hypot(tx+tw/2-x,ty-size/2-y)*.13;
   for(const q of labels)cost+=Math.max(0,Math.min(b[2],q[2])-Math.max(b[0],q[0]))*Math.max(0,Math.min(b[3],q[3])-Math.max(b[1],q[1]))*35;
   if(!best||cost<best.cost)best={tx,ty,b,cost};
  }
  labels.push(best.b);
  const g=el('g',{class:'map-node'+(side===0?' zh':''),tabindex:0,role:'button','aria-label':text+(meaning?' / '+meaning:'')+', '+count+' occurrences','data-theme':node.id,'data-count':count,'data-x':x,'data-y':y});
  g.append(el('line',{class:'leader',x1:x,y1:y,x2:best.tx+tw/2,y2:best.ty-size/2}),el('circle',{cx:x,cy:y,r:1.5}),el('rect',{class:'node-hit',x:best.tx-3,y:best.ty-size-3,width:tw+6,height:th+8}),el('text',{class:'term',x:best.tx,y:best.ty,'font-size':size},text));
  if(meaning)g.append(el('text',{class:'meaning',x:best.tx,y:best.ty+13,'font-size':9.5},meaning));
  g.append(el('text',{class:'frequency',x:best.tx,y:best.ty+(side===0?26:14)},'×'+count));
  g.addEventListener('pointerenter',()=>request(node.id,side));g.addEventListener('pointerleave',()=>request(null,side));g.addEventListener('focus',()=>request(node.id,side));g.addEventListener('blur',()=>request(null,side));g.addEventListener('click',()=>request(node.id,side,true));g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();request(node.id,side,true)}});nodes.append(g);entries.set(node.id,{node,g,point:[x,y]});
 }
 // Keep vocabulary order matched between the two corpora.
 for(const node of map.nodes){
  const t=themes.get(node.id),row=document.createElement('button');row.type='button';row.className='word-row';row.dataset.theme=node.id;
  const name=document.createElement('span');name.className=side===0?'list-term zh':'list-term';name.textContent=node.word;row.append(name);
  if(side===0){const gloss=document.createElement('span');gloss.className='list-gloss';gloss.textContent=t.words[1];row.append(gloss)}
  const count=document.createElement('span');count.className='list-count';count.textContent='×'+t.counts[side];row.append(count);
  row.setAttribute('aria-label',node.word+(side===0?' / '+t.words[1]:'')+', '+t.counts[side]+' occurrences');
  row.addEventListener('pointerenter',()=>request(node.id,side));row.addEventListener('pointerleave',()=>request(null,side));row.addEventListener('focus',()=>request(node.id,side));row.addEventListener('blur',()=>request(null,side));row.addEventListener('click',()=>request(node.id,side,true));root.querySelector('.word-list').append(row);entries.get(node.id).row=row;
 }
 return {side,map,root,entries,edges};
}
for(const map of SIDE_MAPS.maps)panels.push(renderMap(map,document.querySelector(map.side===0?'#corpus-su':'#corpus-zweig')));
window.addEventListener('room-theme-change',e=>{
 const id=e.detail.id,t=themes.get(id);
 for(const p of panels){
  p.edges.replaceChildren();const near=t?[...themes.keys()].filter(k=>k!==id).sort((a,b)=>t.cosines[b][p.side]-t.cosines[a][p.side]).slice(0,3):[];
  for(const [key,v]of p.entries){v.g.classList.toggle('active',key===id);v.row.classList.toggle('active',key===id);v.row.classList.toggle('related',near.includes(key));v.g.classList.toggle('faded',!!id&&key!==id&&!near.includes(key));v.g.classList.toggle('related',near.includes(key));}
  if(t){const a=p.entries.get(id).point;for(const key of near){const b=p.entries.get(key).point;p.edges.append(el('path',{class:'edge',d:`M${a[0]} ${a[1]}L${b[0]} ${b[1]}`}));}}
 }
});
})();



