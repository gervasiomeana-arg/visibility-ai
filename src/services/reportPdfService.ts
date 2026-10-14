import type { ReportPdfBlock, ReportPdfFonts } from '../../shared/reportPdf';

const regularUrl = new URL('../assets/pdf-fonts/DejaVuSans-report.ttf',import.meta.url).href;
const boldUrl = new URL('../assets/pdf-fonts/DejaVuSans-report-bold.ttf',import.meta.url).href;

let fonts: Promise<ReportPdfFonts> | undefined;
function loadFonts() {
  if (!fonts) fonts = Promise.all([regularUrl,boldUrl].map(async url => {
    const response = await fetch(url);
    if (!response.ok) throw new Error('No se pudo cargar la tipografía del informe. Volvé a intentar.');
    const bytes = new Uint8Array(await response.arrayBuffer());
    let text = '';
    for (let i=0; i<bytes.length; i+=8192) text += String.fromCharCode(...bytes.subarray(i,i+8192));
    return btoa(text);
  })).then(([regular,bold]) => ({ regular,bold })).catch(error => { fonts=undefined; throw error; });
  return fonts;
}

export function reportPdfBlocks(article: HTMLElement): ReportPdfBlock[] {
  return Array.from(article.querySelectorAll('h2,h3,strong,p')).filter(node => !(node.tagName === 'STRONG' && node.closest('p'))).map(node => ({
    kind: node.tagName === 'H2' ? 'title' : node.tagName === 'H3' ? 'heading' : node === article.querySelector('header p') ? 'brand' : node.tagName === 'STRONG' || node.classList.contains('font-bold') ? 'strong' : node.classList.contains('text-xs') || node.closest('footer') ? 'small' : 'body',
    text: node.textContent?.trim() || '',
    keepTogether: node.closest('[data-pdf-keep]')?.getAttribute('data-pdf-keep') || undefined,
  }));
}

export async function prepareReportPdf(blocks: ReportPdfBlock[]): Promise<Blob> {
  const [{ createReportPdf },loadedFonts] = await Promise.all([import('../../shared/reportPdf'),loadFonts()]);
  return new Blob([createReportPdf(blocks,loadedFonts)], { type:'application/pdf' });
}
