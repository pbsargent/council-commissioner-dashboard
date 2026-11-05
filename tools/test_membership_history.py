import unittest, tempfile, shutil, csv,io,json
from pathlib import Path
from build_membership_history import parse,build,persistence
class HistoricalTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.src=Path(__file__).resolve().parents[2]/'commissioner-history-portal-evidence-20261105'
 def mutation(self,fn):
  with tempfile.TemporaryDirectory(prefix='commissioner-history-') as td:
   p=Path(td)/'x.csv';rows=list(csv.reader(io.StringIO((self.src/'Historical Data/MonthlyMembership_202610.csv').read_text())))
   fn(rows);f=io.StringIO();csv.writer(f).writerows(rows);p.write_text(f.getvalue());return parse(p,'202610')
 def test_actual_complete_council_and_program_reconciliation(self):
  v=build(self.src/'Historical Data');self.assertEqual(len(v['periods']),15)
 def test_wrong_month(self):
  with self.assertRaises(ValueError):parse(self.src/'Historical Data/MonthlyMembership_202610.csv','202510')
 def test_wrong_council(self):
  def change(r):r[1][0]=r[1][0].replace('564','999')
  with self.assertRaises(ValueError):self.mutation(change)
 def test_short_row(self):
  with self.assertRaises(ValueError):self.mutation(lambda r:r[1].pop())
 def test_repeat_summary_conflict(self):
  def change(r):r[2][r[0].index('Textbox271')]='99999'
  with self.assertRaises(ValueError):self.mutation(change)
 def test_negative_measure(self):
  def change(r):r[1][r[0].index('Textbox271')]='-1'
  with self.assertRaises(ValueError):self.mutation(change)
 def test_actual_cohort(self):
  v=persistence(self.src/'member-persistence.json');self.assertTrue(any(r['district']=='Council' for r in v['rows']))
 def test_private_cohort_field_refused(self):
  v=json.loads((self.src/'member-persistence.json').read_text());v['rows'][0]['member_id']='forbidden'
  with tempfile.TemporaryDirectory(prefix='commissioner-cohort-') as td:
   p=Path(td)/'bad.json';p.write_text(json.dumps(v))
   with self.assertRaises(ValueError):persistence(p)
 def test_cohort_partition_refused(self):
  v=json.loads((self.src/'member-persistence.json').read_text());v['rows'][0]['notObserved']+=1
  with tempfile.TemporaryDirectory(prefix='commissioner-cohort-') as td:
   p=Path(td)/'bad.json';p.write_text(json.dumps(v))
   with self.assertRaises(ValueError):persistence(p)
 def test_strict_parser_still_refuses_older_district_gap(self):
  with self.assertRaises(ValueError):parse(self.src/'Historical Data/MonthlyMembership_202012.csv','202012')
 def test_exact_exploring_residuals_disclosed(self):
  p=parse(self.src/'Historical Data/MonthlyMembership_202012.csv','202012',allow_historical_exploring=True)
  self.assertEqual(next(x['unrepresented_in_district_rows'] for x in p['district_residuals'] if x['program']=='Exploring' and x['field']=='youth'),160)
 def test_extra_or_diagnostic_period_refused(self):
  with tempfile.TemporaryDirectory(prefix='history-manifest-') as td:
   p=Path(td);v=json.loads((self.src/'Historical Data/history-sources.json').read_text());v['sources'][0]['month']='201512';(p/'history-sources.json').write_text(json.dumps(v))
   with self.assertRaises(ValueError):build(p)
 def test_manifest_hash_drift_refused(self):
  with tempfile.TemporaryDirectory(prefix='history-manifest-') as td:
   p=Path(td);shutil.copytree(self.src/'Historical Data',p/'sources');v=json.loads((p/'sources/history-sources.json').read_text());v['sources'][0]['sha256']='0'*64;(p/'sources/history-sources.json').write_text(json.dumps(v))
   with self.assertRaises(ValueError):build(p/'sources')
 def test_missing_period_refused(self):
  with tempfile.TemporaryDirectory(prefix='history-manifest-') as td:
   p=Path(td);v=json.loads((self.src/'Historical Data/history-sources.json').read_text());v['sources'].pop();(p/'history-sources.json').write_text(json.dumps(v))
   with self.assertRaises(ValueError):build(p)
 def test_actual_year_end_and_quarter_coverage(self):
  v=build(self.src/'Historical Data');months=[p['month'] for p in v['periods']];self.assertEqual(len([m for m in months if m.endswith('12')]),10);self.assertTrue(all(m in months for m in ['202603','202606','202609']));self.assertNotIn('201512',months)
if __name__=='__main__':unittest.main()
