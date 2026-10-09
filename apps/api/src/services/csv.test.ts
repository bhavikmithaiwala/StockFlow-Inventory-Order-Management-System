import { expect, it } from 'vitest';
import { csvCell, csv } from './csv.js';
it('neutralizes formulas including whitespace/control prefixes and escapes quotes/newlines', () => {
  for (const formula of ['=1+1', '+SUM(A1)', '-1', '@SUM(A1)', '  =HYPERLINK("bad")', '\t=1+1'])
    expect(csvCell(formula)).toContain('"\'');
  expect(csvCell('a,"quoted"\nline')).toBe('"a,""quoted""\nline"');
  expect(csv(['Name', 'Quantity'], [['Notebook', 3]])).toBe(
    '\uFEFF"Name","Quantity"\r\n"Notebook","3"\r\n',
  );
});
