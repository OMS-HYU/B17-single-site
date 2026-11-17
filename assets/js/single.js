'use strict';
fetch('results/catalogue.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error(r.status);return r.json()}).then(({scenes})=>{
const lookup=Object.fromEntries(scenes.map(x=>[x.id,x]));
const $=id=>document.getElementById(id);
const esc=s=>String(s??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(v,n=6)=>v==null?'—':Number(v).toFixed(n);
let activeMode='known';
function mode(){return activeMode}
function protocol(x){const d=String(x.latest?.detail||x.known?.[0]?.detail||'');if(d.includes('zero-exterior-v2'))return 'v2';if(d.includes('fixed-background-v1'))return 'v1';return 'unverified'}
function statusOf(x){
  if(activeMode==='unknown')return x.blind?'blind':'unverified';
  const raw=String(x.latest?.verdict||x.status||'');
  if(raw==='passed')return 'passed';
  if(raw==='failed'||raw==='failed_gate')return 'failed';
  if(raw==='verified_metrics_only')return 'history';
  return 'unverified';
}
function niceMethod(s){
 const a=String(s||'미검증');
 if(/float32 zero-start GD up to 150 \+ float64 refinement up to 150/i.test(a))return 'GD≤150 + float64 L-BFGS≤150';
 if(/float32 zero-start GD150 \+ float64 propagation L60/i.test(a))return 'GD150 + float64 L-BFGS60';
 if(/float64 propagation recovery from GD150/i.test(a))return 'GD150 + float64 L-BFGS60';
 if(/GD150 \+ circular L-BFGS60/i.test(a))return 'GD150 + Circular L-BFGS60';
 if(/GD \/ float64 refinement/.test(a))return 'GD / float64 정밀화';
 return a.length>65?a.slice(0,62)+'…':a;
}
function render(){
 const filter=$('experiment').value;
 const list=scenes.filter(x=>filter==='all'||(filter==='rbc'?x.group?.includes('적혈구'):filter==='unverified'?protocol(x)==='unverified':protocol(x)===filter));
 $('mode-known').classList.toggle('active',activeMode==='known');
 $('mode-unknown').classList.toggle('active',activeMode==='unknown');
 $('mode-known').setAttribute('aria-pressed',String(activeMode==='known'));
 $('mode-unknown').setAttribute('aria-pressed',String(activeMode==='unknown'));
 $('mode-note').textContent=activeMode==='known'?'파장을 알고 위상을 복원한 실험 · Blind 파장 추정 기록과 분리':'관측에서 파장을 추정한 Blind 기록 · Known 결과는 별도';
 $('count').textContent=list.length+'건 / '+scenes.length+'건';
 $('rows').innerHTML=list.map(x=>{
   const st=statusOf(x),p=protocol(x),kn=x.latest||x.known?.[0]||null,bl=x.blind||null;
   const modeName=activeMode==='known';
   const hasValue=modeName?kn?.r!=null:bl?.rmse!=null;
   const rmse=modeName?kn?.r:bl?.rmse;
   const dispW=modeName?(kn?.w!=null?fmt(kn.w,2)+' nm':'미검증'):(bl?fmt(bl.true,2)+' → '+fmt(bl.est,2)+' nm':'미검증');
   const verdict=st==='passed'?'통과 · 위상 검증':st==='failed'?'위상 미달':st==='history'?'과거 수치 기록':st==='blind'?'Blind 추정 기록':'미검증';
   const tone=st==='passed'?'pass':st==='failed'?'fail':st==='history'?'warn':'neutral';
   const label=p==='v2'?'v2 · 외부 진폭 0':p==='v1'?'v1 · 외부 진폭 1':'현재 조건 미검증';
   const method=modeName?niceMethod(x.method):(bl?(bl.stage==='verified_gd200'?'Blind · 전체 격자 GD200':'Blind · 파장 추정 기록'):'Blind 최종 복원 미검증');
   const aligned=modeName?String(kn?.detail||'').match(/piston-aligned RMSE\s*([0-9.]+)/i):null;
   return `<tr data-id="${esc(x.id)}">
     <td><button type="button" class="scene-btn" data-open="${esc(x.id)}">
       <img class="scene-thumb" src="${esc(x.thumb)}" alt="" loading="lazy" decoding="async">
       <span class="scene-label"><strong class="scene-name">${esc(x.name)}</strong><small class="scene-sub">${esc(x.group)} · 단일 입력</small></span>
     </button></td>
     <td><div class="method-name">${esc(method)}</div><span class="pill ${tone}">${verdict}</span></td>
     <td><span class="wave-lines">${esc(dispW)}<small>${esc(label)}</small></span></td>
     <td><span class="metric ${hasValue?(st==='failed'?'fail':'pass'):'na'}">${hasValue?fmt(rmse,4)+' rad':'미측정'}</span>${aligned?`<span class="metric-note">사후 정렬: ${esc(aligned[1])} rad</span>`:''}</td>
     <td><button type="button" class="result-link" data-open="${esc(x.id)}">결과 보기</button></td>
   </tr>`;
 }).join('')||'<tr><td colspan="5">이 조건에 해당하는 실험 기록이 없습니다.</td></tr>';
}
function kt(ks,fs=[]){if(!ks.length)return '<p class="muted">확인된 전체 격자 Known 수치 없음.</p>';return `<div class="tablewrap detailtable"><table><thead><tr><th>파장 nm</th><th>잡음 %</th><th>알고리즘</th><th>RMSE rad</th><th>ROI / 그룹</th><th>Sensor L2 %</th><th>판정 / 조건</th></tr></thead><tbody>${ks.map((k,i)=>`<tr><td>${esc(k.w)}</td><td>${esc(k.noise)}</td><td>${esc(k.method)}</td><td>${fmt(k.r)}</td><td>${fmt(k.roi)}${k.groups?`<br><small>${esc(k.groups)}</small>`:''}</td><td>${fmt(k.s,4)}</td><td>${esc(k.verdict)}<br><small>${esc(k.detail||'')}${k.protocol?' · '+esc(k.protocol):''}</small>${fs.some(f=>f.record===i)?`<br><button class="figjump" data-figure-index="${fs.findIndex(f=>f.record===i)}">피겨 보기 ↗</button>`:''}</td></tr>`).join('')}</tbody></table></div>`}
function openDetail(id){let x=lookup[id];if(!x)return;let m=mode();$('detailtitle').textContent=x.name+' · '+(m==='known'?'Known':'Unknown');let b=x.blind;let blind=b?`<p><b>${b.stage==='verified_gd200'?'전체 격자 Blind · GD200 (독립 검증)':b.stage==='historical_gd10'?'전체 격자 Blind · GD10':b.stage==='partial'?'연속 파장 보정 · 중간 결과':'10 nm coarse 탐색'}</b> · 실제 ${esc(b.true)} nm → 추정 ${fmt(b.est,b.stage==='partial'?6:0)} nm (오차 ${fmt(b.err,6)} nm)</p><p>Sensor L2 ${fmt(b.sensor,4)}%${b.rmse!=null?' · Phase RMSE '+fmt(b.rmse)+' rad':''}. ${esc(b.detail)}</p>`:'<p class="muted">전체 격자 Unknown 최종 결과 미확인. 실패로 확정된 것은 아님.</p>';let hist=x.blind_history?.length?'<h3>이전 Blind 기록</h3>'+x.blind_history.map(h=>`<p>GD10 · ${h.true} → ${h.est} nm · RMSE ${fmt(h.rmse)} rad · L2 ${fmt(h.sensor,4)}% · ${esc(h.detail)}</p>`).join(''):'';let rr=x.reduced.length?`<h3>과거 축소 격자 Blind (${x.reduced.length}건)</h3><div class="tablewrap detailtable"><table><thead><tr><th>Scene</th><th>실제 / 추정 nm</th><th>위상 강도</th><th>RMSE rad</th><th>Audit χ²</th></tr></thead><tbody>${x.reduced.map(r=>`<tr><td>${r.scene}</td><td>${r.w} / ${r.w}</td><td>${r.amp}</td><td>${fmt(r.r,4)}</td><td>${fmt(r.chi,3)}</td></tr>`).join('')}</tbody></table></div><p class="muted">16² 물체의 별도 축소 실험.</p>`:'';let fs=x.figures.filter(f=>f.mode===m);let plots=fs.length?`<h3 class="detailtitlebar">실제 복원 결과</h3>${fs.map((f,i)=>`<figure class="detailfig" id="plot-${i}"><img class="figure" src="${f.src}" alt="${esc(f.title)}" title="클릭하여 원본 확대"><figcaption>${esc(f.title)}${f.source?` · <a href="${esc(f.source)}" target="_blank" rel="noopener">공개 평가 JSON</a>`:''}</figcaption></figure>`).join('')}`:`<p class="muted">${esc(m==='known'?x.empty_message:'Blind 최종 복원 결과 없음 · Known 결과와 별도')}</p>`;let known=`<h3>Known 전체 기록</h3>${kt(x.known,fs)}${x.legacy?'<h3>과거 별도 GS 실험 (B17 아님)</h3>'+kt(x.legacy):''}${x.reduced_known?`<p class="muted">축소 Known: ${x.reduced_known.passed}/10 통과 · 평균 ${fmt(x.reduced_known.mean_rmse,5)} rad (16² 물체)</p>`:''}${x.latest?'<h3>최신 Known 결과</h3>'+kt([x.latest]):''}${x.rec_note?'<p class="muted">'+esc(x.rec_note)+'</p>':''}`;$('detailbody').innerHTML=`<div class="detailmeta">${x.thumb?`<img src="${x.thumb}" alt="${esc(x.name)}">`:''}<div><p><b>${esc(x.group)}${m==='known'?' · '+esc(x.status):''}</b></p><p>추천: ${esc(x.method)}</p><small>${esc(x.thumbnote||'')} · ${esc(x.src)}</small>${x.inputurl?`<p><a href="${esc(x.inputurl)}" target="_blank" rel="noopener">입력 원본 출처 ↗</a></p>`:''}</div></div>${plots}${m==='known'?known:'<h3>Unknown wavelength</h3>'+blind+hist+rr}`;$('detail').showModal();$('detail').scrollTop=0;$('detailbody').scrollTop=0;for(const btn of $('detailbody').querySelectorAll('.figjump'))btn.onclick=()=>$("plot-"+btn.dataset.figureIndex)?.scrollIntoView({behavior:'smooth',block:'start'});for(const img of $('detailbody').querySelectorAll('.detailfig img'))img.onclick=()=>{img.classList.toggle('zoomed');img.title=img.classList.contains('zoomed')?'클릭하여 축소':'클릭하여 확대'}}

$('mode-known').addEventListener('click',()=>{activeMode='known';render()});
$('mode-unknown').addEventListener('click',()=>{activeMode='unknown';render()});
$('experiment').addEventListener('change',render);
document.addEventListener('click',e=>{const t=e.target.closest('[data-open]');if(t)openDetail(t.dataset.open)});
$('close').onclick=()=>$('detail').close();
$('detail').addEventListener('click',e=>{if(e.target===$('detail'))$('detail').close()});
render();
}).catch(e=>{document.getElementById('count').textContent='결과 로드 실패: '+e.message;});
