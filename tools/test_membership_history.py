import unittest, tempfile, shutil, csv,io,json
from pathlib import Path
from build_membership_history import parse,build,persistence
class HistoricalTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.src=Path(__file__).resolve().parents[2]/'commissioner-portal-update-evidence-20261105'
 def mutation(self,fn):
  with tempfile.TemporaryDirectory(prefix='commissioner-history-') as td:
   p=Path(td)/'x.csv';rows=list(csv.reader(io.StringIO((self.src/'Historical Data/MonthlyMembership_202610.csv').read_text())))
   fn(rows);f=io.StringIO();csv.writer(f).writerows(rows);p.write_text(f.getvalue());return parse(p,'202610')
 def test_actual_complete_council_and_program_reconciliation(self):
  v=build(self.src/'Historical Data');self.assertEqual(len(v['periods']),2)
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
if __name__=='__main__':unittest.main()
