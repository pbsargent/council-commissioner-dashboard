"""Build aggregate-only historical MMR data; never read roster/person rows."""
import argparse,csv,hashlib,io,json,re
from pathlib import Path
MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December']
GROUPS={'Total Unit-Based Membership':'All unit-based membership','Total Cub Scouts':'Cub Scouts','Total Scouts BSA':'Scouts BSA','Total Venturing':'Venturing / Sea Scouts','Total Exploring':'Exploring'}
def number(v):
 if not re.fullmatch(r'\d{1,3}(?:,\d{3})*|\d+',v): raise ValueError('Invalid nonnegative integer')
 return int(v.replace(',',''))
def parse(path,month,allow_historical_exploring=False):
 b=path.read_bytes(); text=b.decode('utf-8-sig'); rows=list(csv.DictReader(io.StringIO(text)))
 if not rows or any(None in r or None in r.values() for r in rows): raise ValueError('Incomplete CSV width')
 title=f'Monthly Membership Report\\nCapitol Area Council 564 (Austin, TX)\\n{MONTHS[int(month[4:])-1]} {month[:4]}'
 out={}
 for r in rows:
  if r['DistrictName3'].replace('\r\n','\n').replace('\n','\\n')!=title: raise ValueError('Council or month mismatch')
  geo=r['DistrictName4'].lstrip('\\').strip()
  if not geo: raise ValueError('Missing geography')
  geo='Council' if geo=='Capitol Area Council 564 (Austin, TX)' else geo
  choices=[(r['txtDisplayProgram2'],'Textbox102','Textbox174','Textbox191','Textbox192'),(r['txtProgramCategory3'],'Textbox270','Textbox271','Textbox275','Textbox276')]
  for label,py,cy,pu,cu in choices:
   if label not in GROUPS: continue
   row={'geography':geo,'program':GROUPS[label],'youth':number(r[cy]),'prior_youth':number(r[py]),'units':number(r[cu]),'prior_units':number(r[pu])}
   key=(geo,label)
   if key in out and out[key]!=row: raise ValueError('Conflicting repeated report summary')
   out[key]=row
 geos={k[0] for k in out}
 if 'Council' not in geos or len(geos)<2: raise ValueError('Missing council/district coverage')
 residuals=[]
 for label in GROUPS:
  if {geo for geo,l in out if l==label}!=geos: raise ValueError('Incomplete program/geography grid')
  for field in ['youth','prior_youth','units','prior_units']:
   delta=out[('Council',label)][field]-sum(out[(g,label)][field] for g in geos if g!='Council')
   if delta:
    if not allow_historical_exploring or label not in ['Total Exploring','Total Unit-Based Membership'] or delta<0: raise ValueError('Council/district reconciliation failed')
    residuals.append({'program':GROUPS[label],'field':field,'unrepresented_in_district_rows':delta})
 for field in ['youth','prior_youth','units','prior_units']:
  gaps={x['program']:x['unrepresented_in_district_rows'] for x in residuals if x['field']==field}
  if gaps.get('Exploring',0)!=gaps.get('All unit-based membership',0): raise ValueError('Historical Exploring residual does not reconcile')
 for geo in geos:
  for field in ['youth','prior_youth','units','prior_units']:
   if out[(geo,'Total Unit-Based Membership')][field]!=sum(out[(geo,l)][field] for l in GROUPS if l!='Total Unit-Based Membership'): raise ValueError('Program reconciliation failed')
 return {'month':month,'label':f'{MONTHS[int(month[4:])-1]} {month[:4]}','source_name':path.name,'sha256':hashlib.sha256(b).hexdigest(),'rows':sorted(out.values(),key=lambda x:(x['geography'],x['program'])),'raw_rows':len(rows),'district_residuals':residuals}
def persistence(path):
 v=json.loads(path.read_text())
 if set(v)!={'schema_version','baseline_programs','rows','movement_people','ambiguous_movement_people','analysis_sha256'} or v['schema_version']!=1: raise ValueError('Unexpected cohort schema')
 if v['baseline_programs']!=['Cub Scouting','Scouts BSA'] or not re.fullmatch('[0-9a-f]{64}',v['analysis_sha256']): raise ValueError('Cohort source mismatch')
 seen=set()
 for r in v['rows']:
  if set(r)!={'district','baselinePeople','observedInCouncil','notObserved','start','end','days'}: raise ValueError('Unexpected cohort fields')
  if r['district'] in seen or not isinstance(r['district'],str): raise ValueError('Duplicate cohort')
  seen.add(r['district'])
  if (r['start'],r['end'],r['days'])!=('2026-09-09','2026-11-05',57): raise ValueError('Cohort dates changed')
  for k in ['baselinePeople','observedInCouncil','notObserved']:
   if type(r[k]) is not int or r[k]<0: raise ValueError('Invalid cohort count')
  if r['observedInCouncil']+r['notObserved']!=r['baselinePeople']: raise ValueError('Cohort partition failed')
 if 'Council' not in seen: raise ValueError('Council cohort missing')
 for k in ['movement_people','ambiguous_movement_people']:
  if type(v[k]) is not int or v[k]<0: raise ValueError('Invalid movement aggregate')
 return v
def build(folder):
 manifest=json.loads((folder/'history-sources.json').read_text())
 if set(manifest)!={'schema_version','sources'} or manifest['schema_version']!=1: raise ValueError('Invalid history source manifest')
 expected=[str(y)+'12' for y in range(2016,2026)]+['202510','202603','202606','202609','202610']
 sources=manifest['sources']
 if len(sources)!=len(expected) or sorted(x['month'] for x in sources)!=sorted(expected): raise ValueError('Historical period coverage mismatch')
 periods=[]
 for x in sorted(sources,key=lambda x:x['month']):
  if set(x)!={'month','filename','sha256'} or x['filename']!='MonthlyMembership_'+x['month']+'.csv': raise ValueError('Historical source identity mismatch')
  path=folder/x['filename']
  if path.is_symlink() or hashlib.sha256(path.read_bytes()).hexdigest()!=x['sha256']: raise ValueError('Historical source hash mismatch')
  periods.append(parse(path,x['month'],allow_historical_exploring=True))
 by={p['month']:p for p in periods}
 for later in periods:
  earlier=by.get(str(int(later['month'][:4])-1)+later['month'][4:])
  if earlier is None: continue
  first={(r['geography'],r['program']):r for r in earlier['rows']}
  second={(r['geography'],r['program']):r for r in later['rows']}
  if first.keys()!=second.keys(): raise ValueError('Historical coverage differs; review before comparing')
  for key in first:
   for field in ['youth','units']:
    if first[key][field]!=second[key]['prior_'+field]: raise ValueError('Prior-year continuity failed')
 return {'schema_version':2,'council':'Capitol Area Council 564','periods':periods,'definitions':{'grain':'Source-reported unit-based membership registrations, not distinct council people.','comparison':'Membership growth or decline, not individual retention.','history':'Ten December year-ends, three completed 2026 quarter-ends and October 2025/2026 references. No interpolation or complete monthly archive claim.','coverage':'Historical Exploring council totals can exceed exported district rows. Exact residuals are retained; never allocated to districts or hidden. District labels remain those exported, not a reconstruction of current boundaries.','guidebook':'Registration Guidebook, August 24 2026, printed pages 4, 5 and 44.'}}
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--source-dir',type=Path,required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--persistence-source',type=Path);p.add_argument('--persistence-output',type=Path);a=p.parse_args()
 if bool(a.persistence_source)!=bool(a.persistence_output): p.error('Both cohort paths required')
 v=build(a.source_dir); cohort=persistence(a.persistence_source) if a.persistence_source else None
 a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(json.dumps(v,indent=2)+'\n')
 if cohort is not None:
  a.persistence_output.parent.mkdir(parents=True,exist_ok=True);a.persistence_output.write_text(json.dumps(cohort,indent=2)+'\n')
 print(json.dumps({'periods':len(v['periods']),'aggregate_rows':sum(len(x['rows']) for x in v['periods']),'cohort_rows':len(cohort['rows']) if cohort else 0}))
