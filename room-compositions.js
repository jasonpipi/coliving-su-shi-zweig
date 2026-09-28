(()=>{'use strict';
const svg=document.querySelector('#room'),layer=document.querySelector('#objects'),word=document.querySelector('#word'),links=document.querySelector('#links'),subs=document.querySelector('#subtitles'),NS='http://www.w3.org/2000/svg';
const themes=new Map(ROOM_DATA.themes.map(t=>[t.id,t]));let active=null,selected=null,raf=0;const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
// Reconstructed looser model-distance / room-composition layout; overlap allowed.
// Coordinates come from room-constrained-layout.py, with no subsequent nudges.
const groups=ROOM_DATA.objects.map(o=>({...o,x:o.position[0],y:o.position[1],w:o.box[2],h:o.box[3],b:o.box.slice()}));
const order={window:-10,landscape:-9,desk:0,bed:1,shelf:2};groups.sort((a,b)=>(order[a.id]??10)-(order[b.id]??10));
const left=Math.min(...groups.map(g=>g.b[0]))-65,right=Math.max(...groups.map(g=>g.b[0]+g.w))+65,top=Math.min(...groups.map(g=>g.b[1]))-50,bottom=Math.max(...groups.map(g=>g.b[1]+g.h))+100;
const home=[left,top,right-left,bottom-top];let view=home.slice();svg.setAttribute('viewBox',view.join(' '));svg.dataset.layoutMode='loose-model-room';
const cap=t=>t.replace(/^./,c=>c.toUpperCase());
function words(g){const t=themes.get(g.theme);return g.owners.map(s=>({text:s===0?t.words[0]:cap(t.words[1]),side:s}))}
function elem(tag,attrs,text){const e=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);if(text)e.textContent=text;return e}
function screen(x,y){const m=svg.getScreenCTM(),r=svg.getBoundingClientRect(),p=new DOMPoint(x,y).matrixTransform(m);return{x:p.x-r.left,y:p.y-r.top}}
function label(g){word.replaceChildren();if(!g)return;words(g).forEach((v,i)=>{if(i)word.append(document.createTextNode(' / '));const span=document.createElement('span');span.textContent=v.text;span.lang=v.side===0?'zh-CN':'en';span.className=v.side===0?'zh':'';word.append(span)})}
const windowObject=groups.find(g=>g.id==='window'),landscapeObject=groups.find(g=>g.id==='landscape');
const [wx,wy,ww,wh]=windowObject.b;
// Trace the actual inner pane in the original 456 x 303 illustration.
// The curved right boundary follows the curtain; no rectangular crop crosses it.
const panePath='M69 33H221C223 73 229 112 241 150C246 165 250 181 252 192V238H69Z';
const paneTransform=`translate(${wx} ${wy}) scale(${ww/456} ${wh/303})`;
const defs=elem('defs',{}),frameClip=elem('clipPath',{id:'window-frame-region',clipPathUnits:'userSpaceOnUse'}),viewClip=elem('clipPath',{id:'window-view-region',clipPathUnits:'userSpaceOnUse'});
frameClip.append(elem('path',{'clip-rule':'evenodd',d:'M0 0H456V303H0Z '+panePath,transform:paneTransform}));
viewClip.append(elem('path',{d:panePath,transform:paneTransform}));defs.append(frameClip,viewClip);svg.prepend(defs);
// Illustration bounds / inspection framing change, never the model-related anchor.
landscapeObject.b=[wx+69/456*ww,wy+33/303*wh,183/456*ww,205/303*wh];
landscapeObject.w=landscapeObject.b[2];landscapeObject.h=landscapeObject.b[3];
for(const g of groups){const[x,y,w,h]=g.b,el=elem('g',{class:'item',role:'button',tabindex:0,'data-id':g.id,'data-theme':g.theme,'data-owners':g.owners.join(','),'data-layout-x':g.x,'data-layout-y':g.y,'data-source-x':g.position[0],'data-source-y':g.position[1],'aria-label':words(g).map(v=>v.text).join(' / ')+' — '+g.id,'aria-pressed':'false'});
 if(g.id==='landscape'){el.append(elem('image',{href:windowObject.asset,x:wx,y:wy,width:ww,height:wh,preserveAspectRatio:'none','clip-path':'url(#window-view-region)'}));}
 else el.append(elem('image',{href:g.asset,x,y,width:w,height:h,preserveAspectRatio:'none'}));
 if(g.id==='window')el.setAttribute('clip-path','url(#window-frame-region)');
 // Hit shapes follow the alpha silhouette; the landscape is an intentional inner region.
 if(g.invisible)el.append(elem('path',{class:'hit',d:panePath,transform:paneTransform}));else el.append(elem('path',{class:'hit',d:g.hitPath,transform:`translate(${x} ${y}) scale(${w} ${h})`}));
 el.append(elem('rect',{class:'focus-ring',x:x-3,y:y-3,width:w+6,height:h+6,rx:2}));g.el=el;layer.append(el);
 el.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch'&&!selected)activate(g)});el.addEventListener('pointerleave',()=>{if(!selected)activate(null)});el.addEventListener('focus',()=>{if(!selected)activate(g)});el.addEventListener('blur',()=>{if(!selected)activate(null)});
 el.addEventListener('click',e=>{e.stopPropagation();selected===g?reset():select(g)});el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selected===g?reset():select(g)}})}
function nearby(g){const t=themes.get(g.theme);return groups.filter(h=>h!==g&&h.theme!==g.theme&&h.owners.some(s=>g.owners.includes(s))).map(h=>{const owners=g.owners.filter(s=>h.owners.includes(s)),scores=owners.map(s=>t.cosines[h.theme][s]);return{g:h,owners,scores,rank:scores.reduce((a,b)=>a+b,0)/scores.length}}).sort((a,b)=>b.rank-a.rank).filter((v,i,a)=>a.findIndex(x=>x.g.theme===v.g.theme)===i).slice(0,3)}
function activate(g){active=g;window.dispatchEvent(new CustomEvent("room-theme-change",{detail:{id:g?.theme||null}}));const near=g?nearby(g):[];for(const h of groups)h.el.style.opacity=!g?'1':h===g||h.theme===g.theme?'1':near.some(v=>v.g===h)?'.38':'.10';word.classList.toggle('visible',!!g);subs.classList.toggle('visible',!!g);label(g);if(!g){subs.querySelector('.zh').textContent='';subs.querySelector('.en').textContent='';links.replaceChildren();return}const t=themes.get(g.theme);subs.querySelector('.zh').textContent=t.quotes[0].text;subs.querySelector('.en').textContent=t.quotes[1].text;overlays(near)}
function overlays(near=active?nearby(active):[]){links.replaceChildren();if(!active)return;const a=screen(active.b[0]+active.w/2,active.b[1]);word.style.left=Math.max(90,Math.min(svg.clientWidth-90,a.x))+'px';word.style.top=Math.max(32,a.y-16)+'px';if(selected)return;const start=screen(active.x,active.y);links.append(elem('circle',{cx:start.x,cy:start.y,r:2.2}));const occupied=[{x:a.x,y:a.y-26}];
 near.forEach(({g,owners,scores},i)=>{const end=screen(g.x,g.y),top=screen(g.b[0]+g.w/2,g.b[1]);let tx=Math.max(95,Math.min(svg.clientWidth-95,top.x)),ty=Math.max(38,Math.min(svg.clientHeight-145,top.y-25)),attempts=0;while(occupied.some(p=>Math.abs(p.x-tx)<160&&Math.abs(p.y-ty)<45)&&attempts++<7)ty-=40;ty=Math.max(27,ty);occupied.push({x:tx,y:ty});const mx=start.x+(end.x-start.x)*(.35+i*.15);links.append(elem('path',{d:`M${start.x} ${start.y}H${mx}V${end.y}H${end.x}`}));links.append(elem('circle',{cx:end.x,cy:end.y,r:2}));const title=elem('text',{x:tx,y:ty,'text-anchor':'middle',class:'relation-label'});words(g).forEach((v,i)=>{if(i)title.append(elem('tspan',{},' / '));title.append(elem('tspan',{class:v.side===0?'zh':''},v.text))});links.append(title);links.append(elem('text',{x:tx,y:ty+18,'text-anchor':'middle',class:'relation-score'},scores.map((v,i)=>(owners[i]===0?'中 ':'EN ')+v.toFixed(2)).join(' / ')))})}
function camera(to){cancelAnimationFrame(raf);const from=view.slice(),start=performance.now();function frame(now){const p=reduced?1:Math.min(1,(now-start)/500),k=1-(1-p)**3;view=from.map((v,i)=>v+(to[i]-v)*k);svg.setAttribute('viewBox',view.join(' '));overlays();if(p<1)raf=requestAnimationFrame(frame)}raf=requestAnimationFrame(frame)}
function select(g){selected=g;groups.forEach(h=>h.el.setAttribute('aria-pressed',String(h===g)));activate(g);const ratio=svg.clientWidth/svg.clientHeight,h=Math.max(g.h*1.9,g.w*1.65/ratio),w=h*ratio;camera([g.b[0]+g.w/2-w/2,g.b[1]+g.h/2-h*.42,w,h])}
function reset(){selected=null;groups.forEach(g=>g.el.setAttribute('aria-pressed','false'));activate(null);camera(home)}
window.addEventListener('corpus-hover',e=>{const {id,side,inspect}=e.detail;
 if(!id){if(!selected)activate(null);return}
 const candidates=groups.filter(g=>g.theme===id),g=candidates.find(g=>g.owners.includes(side))||candidates[0];
 if(!g)return;
 if(inspect){selected===g?reset():select(g)}else if(!selected)activate(g);
});
svg.addEventListener('click',reset);window.addEventListener('keydown',e=>{if(e.key==='Escape')reset()});window.addEventListener('resize',()=>{if(selected)select(selected);else overlays()});svg.addEventListener('wheel',e=>{e.preventDefault();cancelAnimationFrame(raf);const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM().inverse()),k=Math.exp(Math.sign(e.deltaY)*.13),w=Math.max(home[2]/12,Math.min(home[2]*1.25,view[2]*k)),ratio=w/view[2];view=[p.x-(p.x-view[0])*ratio,p.y-(p.y-view[1])*ratio,w,view[3]*ratio];svg.setAttribute('viewBox',view.join(' '));overlays()},{passive:false});
})();








