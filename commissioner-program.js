((root)=>{
'use strict';
const programs=[['Council','Council'],['Packs','Cub Scouts'],['Troops','Scouts BSA'],['Crews','Venturing'],['Ships','Sea Scouts'],['Posts','Exploring']];
const normalize=x=>programs.some(p=>p[0]===x)?x:'Council';
const districtKey=x=>String(x||'').replace(/\s+\d+$/,'').trim();
const label=x=>programs.find(p=>p[0]===normalize(x))[1];
const type=x=>({Packs:'Pack',Troops:'Troop',Crews:'Crew',Ships:'Ship',Posts:'Post'})[x]||'';
const history=x=>({Council:'All unit-based membership',Packs:'Cub Scouts',Troops:'Scouts BSA',Crews:'Venturing',Ships:'Sea Scouts',Posts:'Exploring'})[normalize(x)];
if(typeof module!=='undefined')module.exports={programs,normalize,label,type,history,districtKey};if(!root.document)return;
const d=root.document;let selected=normalize(new URL(root.location.href).searchParams.get('program'));
const main=d.querySelector('main'),header=main.querySelector('header');
const bar=d.createElement('section');bar.className='commissioner-program-bar';bar.setAttribute('aria-label','Program view');bar.innerHTML='<span class="program-eyebrow">PROGRAM VIEW</span><div role="group" aria-label="Membership program">'+programs.map(([id,text])=>`<button type="button" data-program="${id}" aria-pressed="false">${text}</button>`).join('')+'</div><p id="commissionerProgramScope" role="status"></p>';
header.after(bar);
function syncLinks(){for(const a of d.querySelectorAll('a[href]')){const u=new URL(a.getAttribute('href'),d.baseURI);if(u.origin!==root.location.origin||!u.pathname.includes('/council-')&&root.location.protocol!=='http:')continue;if(!/\.html$|\/$/.test(u.pathname)||u.hash&&u.pathname===root.location.pathname)continue;u.searchParams.set('program',selected);const district=new URL(root.location.href).searchParams.get('district');if(district)u.searchParams.set('district',district);else u.searchParams.delete('district');a.href=u.href;}}
function url(values){const u=new URL(root.location.href);for(const [k,raw]of Object.entries(values)){const v=k==='district'?districtKey(raw):raw;v?u.searchParams.set(k,v):u.searchParams.delete(k);}root.history.replaceState(null,'',u);syncLinks();}
function paint(){for(const b of bar.querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.program===selected));bar.querySelector('p').textContent=label(selected)+(selected==='Council'?' · All available programs; each measure keeps its stated population.':' · Program view; unavailable measures are explicitly identified.');syncLinks();}
function set(value){selected=normalize(value);url({program:selected});paint();root.dispatchEvent(new Event('commissioner-program-change'));}
function bindDistrict(select,councilValue='Council'){const wanted=new URL(root.location.href).searchParams.get('district');if(wanted){const match=[...select.options].find(x=>districtKey(x.value)===districtKey(wanted));if(match)select.value=match.value;else{const option=d.createElement('option');option.value=wanted;option.textContent=wanted+' (not in this source)';select.append(option);select.value=wanted;}}select.addEventListener('input',()=>url({district:select.value===councilValue?'':select.value}));}
root.CommissionerProgram={get:()=>selected,label:()=>label(selected),type:()=>type(selected),history:()=>history(selected),set,bindDistrict,save:url};
bar.addEventListener('click',e=>{const b=e.target.closest('button[data-program]');if(b)set(b.dataset.program);});
root.addEventListener('popstate',()=>{selected=normalize(new URL(root.location.href).searchParams.get('program'));paint();root.dispatchEvent(new Event('commissioner-program-change'));});paint();
const path=root.location.pathname;
if(path.endsWith('/index.html')||path.endsWith('/')){
 const content=d.createElement('div');content.id='councilOnlyContent';for(const child of [...main.children])if(child!==header&&child!==bar)content.append(child);main.append(content);
 const note=d.createElement('section');note.className='panel program-unavailable';note.setAttribute('role','status');note.innerHTML='<h2>Program breakdown unavailable for this overview</h2><p>Commissioner assignments, training and coverage in this extract are council-wide. Council totals are not shown as program results. Use Unit Review or Historical Trends for the selected program.</p><a href="unit-support.html">Open Unit Review</a> · <a href="membership-history.html">Open Historical Trends</a>';content.before(note);
 const view=()=>{content.hidden=selected!=='Council';note.hidden=selected==='Council';syncLinks();};root.addEventListener('commissioner-program-change',view);view();
}
if(path.endsWith('/measures.html')){bar.querySelector('p').textContent=label(selected)+' selected · Definitions below describe all measures; numerical views apply the program filter where supported.';root.addEventListener('commissioner-program-change',()=>bar.querySelector('p').textContent=label(selected)+' selected · Definitions below describe all measures; numerical views apply the program filter where supported.');}
})(typeof window==='undefined'?globalThis:window);
