import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createReportPdf, type ReportPdfBlock } from '../../shared/reportPdf';
import { reportPdfName } from '../../shared/reportPdfName';

const font = (name: string) => readFileSync(new URL(`../../src/assets/pdf-fonts/${name}`,import.meta.url)).toString('base64');
const fonts={regular:font('DejaVuSans-report.ttf'),bold:font('DejaVuSans-report-bold.ttf')};

test('direct PDF export generates a paginated A4 document without print dialogs or active scripts', () => {
  const blocks:ReportPdfBlock[]=[{kind:'brand',text:'VISIBILITY · PARCIAL REAL'},{kind:'title',text:'Empresa de prueba: diagnóstico'}];
  for(let i=0;i<40;i++)blocks.push({kind:'heading',text:`Sección ${i+1}`},{kind:'body',text:'Información medida de prueba. No constituye una medición de un cliente. '.repeat(8)});
  const result=Buffer.from(createReportPdf(blocks,fonts));
  assert.ok(result.subarray(0,5).toString()==='%PDF-');
  const raw=result.toString('latin1');
  const pages=(raw.match(/\/Type \/Page\b/g)||[]).length;
  assert.ok(pages>1);
  const box=raw.match(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/);
  assert.ok(box);
  assert.ok(Math.abs(Number(box[1])-595.28)<0.1 && Math.abs(Number(box[2])-841.89)<0.1);
  assert.ok(!raw.includes('/JavaScript'));
  assert.ok(!raw.includes('/S /Launch'));
  assert.ok(!raw.includes('/Subtype /Image'));
});

test('export refuses an unavailable report and safely names a selected business document',()=>{
  assert.throws(()=>createReportPdf([{kind:'body',text:'Sin informe'}],fonts),/no está disponible/);
  assert.equal(reportPdfName('Hotel São João / Uruguay','2026-10-14'),'Visibility-Hotel-Sao-Joao-Uruguay-2026-10-14.pdf');
  assert.ok(!reportPdfName('../../other','2026-10-14').includes('/'));
  assert.throws(()=>createReportPdf([{kind:'title',text:'Nombre con 🏐'}],fonts),/no puede representar/);
});
