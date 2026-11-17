fetch('results/catalogue.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error(r.status);return r.json()}).then(({scenes})=>{
const lookup=Object.fromEntries(scenes.map(x=>[x.id,x]));
const $=id=>document.getElementById(id);const esc=s=>String(s??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const fmt=(v,n=6)=>v==null?'—':Number(v).toFixed(n);
function selected(){return $('scene').value}function mode(){return $('mode').value}
function filter(){const id=selected(),m=mode();$('matrix').classList.toggle('knownmode',m==='known');$('matrix').classList.toggle('unknownmode',m==='unknown');let n=0;for(const r of document.querySelectorAll('#matrix tbody tr')){r.hidden=id!=='all'&&r.dataset.id!==id;if(!r.hidden)n++}$('count').textContent=n+'개 / '+scenes.length+'개';renderGallery()}
function renderGallery(){
const list=scenes.filter(x=>selected()==='all'||x.id===selected()), g=$('gallery');g.replaceChildren();
let n=0,total=0;
for(const x of list){
  const fs=x.figures.filter(f=>f.mode===mode());n+=Number(fs.length>0);total+=fs.length;
  const card=document.createElement('article');card.className='result-card';
  const b=document.createElement('button');b.className='result-input';b.dataset.open=x.id;
  b.innerHTML=`<img src="${x.thumb}" alt="${esc(x.name)} 입력 이미지" decoding="async"><span><b>${esc(x.name)}</b><small>입력 이미지 · 상세 보기</small></span>`;
  card.appendChild(b);
  if(fs.length){
    const results=document.createElement('div');results.className='result-figures';
    const visible=selected()==='all'?fs.slice(0,1):fs;
    for(const f of visible){const btn=document.createElement('button');btn.className='gal';btn.dataset.open=x.id;btn.innerHTML=`<img loading="lazy" decoding="async" src="${f.src}" alt="${esc(f.title)}"><span class="cap"><b>${esc(f.title)}</b>${selected()==='all'&&fs.length>1?`<small> · 전체 ${fs.length}개 결과</small>`:''}</span>`;results.appendChild(btn)}
    card.appendChild(results);
  }else{const note=document.createElement('p');note.className='empty-result';note.textContent=(mode()==='known'?x.empty_message:'Blind 최종 복원 결과 없음 · Known 결과와 별도');card.appendChild(note)}
  g.appendChild(card);
}
g.classList.toggle('single-scene',selected()!=='all');$('figurenote').textContent=`입력 ${list.length}개 · 실제 복원 그림 ${total}개 (${n}개 대상)`;
}
function kt(ks,fs=[]){if(!ks.length)return '<p class="muted">확인된 전체 격자 Known 수치 없음.</p>';return `<div class="tablewrap detailtable"><table><thead><tr><th>파장 nm</th><th>잡음 %</th><th>알고리즘</th><th>RMSE rad</th><th>ROI / 그룹</th><th>Sensor L2 %</th><th>판정 / 조건</th></tr></thead><tbody>${ks.map((k,i)=>`<tr><td>${esc(k.w)}</td><td>${esc(k.noise)}</td><td>${esc(k.method)}</td><td>${fmt(k.r)}${k.aligned_r!=null?`<br><small>최적 piston 정렬 ${fmt(k.aligned_r)} rad</small>`:''}</td><td>${fmt(k.roi)}${k.groups?`<br><small>${esc(k.groups)}</small>`:''}</td><td>${fmt(k.s,4)}</td><td>${esc(k.verdict)}<br><small>${esc(k.detail||'')}${k.protocol?' · '+esc(k.protocol):''}</small>${fs.some(f=>f.record===i)?`<br><button class="figjump" data-figure-index="${fs.findIndex(f=>f.record===i)}">피겨 보기 ↗</button>`:''}</td></tr>`).join('')}</tbody></table></div>`}
function openDetail(id){
 const x=lookup[id];if(!x)return;const known=mode()==='known',k=known?x.latest:null,fs=x.figures.filter(f=>f.mode===mode());
 $('detailtitle').textContent=x.name+' · '+(known?'Known':'Blind');
 const plots=fs.length?fs.map(f=>`<figure class="detailfig"><img class="figure" src="${esc(f.src)}" alt="${esc(f.title)}"><figcaption>${esc(f.title)}</figcaption></figure>`).join(''):`<p class="muted">${esc(known?x.empty_message:'Blind 최종 결과 없음')}</p>`;
 const metrics=k?`<p><b>${fmt(k.r)} rad</b> · Sensor L2 ${fmt(k.s,4)}% · ${esc(k.w)} nm</p><p>${esc(x.display_note||'')}</p>`:'';
 $('detailbody').innerHTML=metrics+plots;$('detail').showModal();$('detail').scrollTop=0;
 for(const img of $('detailbody').querySelectorAll('.detailfig img'))img.onclick=()=>img.classList.toggle('zoomed');
}
$('scene').addEventListener('change',filter);$('mode').addEventListener('change',filter);$('reset').onclick=()=>{$('scene').value='all';$('mode').value='known';filter()};document.addEventListener('click',e=>{let t=e.target.closest('[data-open]');if(t)openDetail(t.dataset.open)});document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches('img[data-open]'))openDetail(e.target.dataset.open)});$('close').onclick=()=>$('detail').close();$('detail').addEventListener('click',e=>{if(e.target===$('detail'))$('detail').close()});filter();

}).catch(e=>{document.getElementById('count').textContent='결과 로드 실패: '+e.message});