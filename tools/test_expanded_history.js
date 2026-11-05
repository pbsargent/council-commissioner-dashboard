const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');const h=require('../membership-history.js');const v=JSON.parse(fs.readFileSync(process.argv[2]));let count=0;function t(n,f){f();count++;console.log('PASS '+n);}
t('actual schema and all independent sums',()=>h.validate(v));
t('annual periods never mix October or quarter ends',()=>assert.deepEqual(h.selectPeriods(v,'annual').map(p=>p.month),Array.from({length:10},(_,i)=>`${2016+i}12`)));
t('2026 checkpoints exact ordered completed months',()=>assert.deepEqual(h.selectPeriods(v,'checkpoints').map(p=>p.month),['202603','202606','202609','202610']));
t('October comparison remains exact',()=>assert.equal(h.comparison(v,'Council','All unit-based membership').delta,-30));
t('annual endpoint delta and unit scope',()=>{assert.equal(h.comparison(v,'Council','All unit-based membership','annual').delta,-8206);assert.equal(h.comparison(v,'Council','All unit-based membership','annual','units').delta,-240);});
t('checkpoint scope and endpoints',()=>{const c=h.comparison(v,'Council','All unit-based membership','checkpoints');assert.equal(c.a.youth,7914);assert.equal(c.b.youth,9551);});
t('all geography program mode and metric intersections',()=>{for(const r of v.periods[0].rows)for(const mode of ['annual','checkpoints','october'])for(const metric of ['youth','units']){const s=h.series(v,r.geography,r.program,mode),c=h.comparison(v,r.geography,r.program,mode,metric);assert.equal(c.delta,s.at(-1).row[metric]-s[0].row[metric]);}});
t('coverage warnings are scoped to selected program and dates',()=>{assert(h.coverage(v,'Exploring','annual').length>0);assert.equal(h.coverage(v,'Cub Scouts','annual').length,0);assert.equal(h.coverage(v,'Exploring','october').length,0);});
t('missing month refused',()=>{const x=structuredClone(v);x.periods.pop();assert.throws(()=>h.validate(x));});
t('invented residual refused',()=>{const x=structuredClone(v);x.periods[0].district_residuals[0].unrepresented_in_district_rows++;assert.throws(()=>h.validate(x));});
t('non Exploring gap cannot be waived',()=>{const x=structuredClone(v);x.periods[0].district_residuals.push({program:'Cub Scouts',field:'youth',unrepresented_in_district_rows:1});assert.throws(()=>h.validate(x));});
t('missing coverage disclosure refused',()=>{const x=structuredClone(v);x.periods[0].district_residuals=[];assert.throws(()=>h.validate(x));});
t('negative counts refused',()=>{const x=structuredClone(v);x.periods[0].rows[0].youth=-1;assert.throws(()=>h.validate(x));});
t('duplicate summary refused',()=>{const x=structuredClone(v);x.periods[0].rows.push(x.periods[0].rows[0]);assert.throws(()=>h.validate(x));});
t('missing program row refused',()=>{const x=structuredClone(v);x.periods[0].rows.pop();assert.throws(()=>h.validate(x));});
t('missing source hash refused',()=>{const x=structuredClone(v);x.periods[0].sha256='';assert.throws(()=>h.validate(x));});
t('zero baseline stays undefined',()=>assert.equal(h.percent(2,0),null));t('invalid modes and metrics refused',()=>{assert.throws(()=>h.selectPeriods(v,'mixed'));assert.throws(()=>h.comparison(v,'Council','Cub Scouts','annual','names'));});
console.log(count+' expanded history checks passed');
