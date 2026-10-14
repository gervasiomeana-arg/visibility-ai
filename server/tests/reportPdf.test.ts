import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
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

const hasPdfText = !spawnSync('pdftotext', ['-v']).error;
test('a complete priority moves to the next page rather than separating its proposal from the finding', { skip: !hasPdfText }, () => {
  const blocks: ReportPdfBlock[] = [{ kind: 'title', text: 'Prueba de paginación' }];
  for (let i = 0; i < 30; i++) blocks.push({ kind: 'body', text: `Línea de relleno de prueba ${i + 1}.` });
  blocks.push(
    { kind: 'strong', text: '3. Largest Contentful Paint (LCP)', keepTogether: 'priority-lcp' },
    { kind: 'small', text: 'La espera antes de solicitar el recurso supera su tiempo de descarga.', keepTogether: 'priority-lcp' },
    { kind: 'small', text: 'Propuesta: Revisar el descubrimiento y la prioridad de la imagen. '.repeat(5), keepTogether: 'priority-lcp' },
    { kind: 'small', text: 'Hallazgo de auditoría · 14 oct. 2026.', keepTogether: 'priority-lcp' },
  );
  const dir = mkdtempSync(join(tmpdir(), 'visibility-pagination-'));
  try {
    const path = join(dir, 'report.pdf'); writeFileSync(path, Buffer.from(createReportPdf(blocks, fonts)));
    const pages = execFileSync('pdftotext', ['-layout', path, '-'], { encoding: 'utf8' }).split('\f').filter(text => text.trim());
    assert.equal(pages.length, 2);
    assert.ok(!pages[0].includes('Largest Contentful Paint'));
    assert.match(pages[1], /Largest Contentful Paint/); assert.match(pages[1], /Propuesta:/); assert.match(pages[1], /Hallazgo de auditoría/);
    assert.match(pages.join(''), /Línea de relleno de prueba 30/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('an oversized priority can span pages without creating blank pages or dropping its ending', { skip: !hasPdfText }, () => {
  const blocks: ReportPdfBlock[] = [
    { kind: 'title', text: 'Prueba extensa' },
    { kind: 'strong', text: 'Prioridad extensa', keepTogether: 'large' },
    { kind: 'body', text: 'Contenido de prueba extenso. '.repeat(1000), keepTogether: 'large' },
    { kind: 'small', text: 'Fin de la prioridad extensa.', keepTogether: 'large' },
  ];
  const dir = mkdtempSync(join(tmpdir(), 'visibility-long-priority-'));
  try {
    const path = join(dir, 'report.pdf'); writeFileSync(path, Buffer.from(createReportPdf(blocks, fonts)));
    const pages = execFileSync('pdftotext', ['-layout', path, '-'], { encoding: 'utf8' }).split('\f').filter(text => text.trim());
    assert.ok(pages.length > 2);
    assert.ok(pages.every(text => text.includes('Contenido') || text.includes('Fin de la prioridad')));
    assert.match(pages.at(-1)!, /Fin de la prioridad extensa/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
