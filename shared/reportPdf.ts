import { jsPDF } from 'jspdf';

export interface ReportPdfBlock { kind: 'brand' | 'title' | 'heading' | 'strong' | 'body' | 'small'; text: string }
export interface ReportPdfFonts { regular: string; bold: string }

// Render the already selected report text; this function never infers measurements.
export function createReportPdf(blocks: ReportPdfBlock[], fonts: ReportPdfFonts): ArrayBuffer {
  if (!blocks.some(block => block.kind === 'title' && block.text.trim())) throw new Error('El informe no está disponible para exportar.');
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true, putOnlyUsedFonts: true });
  pdf.addFileToVFS('ReportRegular.ttf', fonts.regular);
  pdf.addFont('ReportRegular.ttf', 'Report', 'normal');
  pdf.addFileToVFS('ReportBold.ttf', fonts.bold);
  pdf.addFont('ReportBold.ttf', 'Report', 'bold');
  pdf.setProperties({ title: 'Informe de visibilidad', author: 'Visibility', creator: 'Visibility' });
  const margin = 18, bottom = 277, width = 174;
  let y = 22;
  const page = () => { pdf.addPage(); y = 22; };
  const styles = {
    brand: { size:9, line:4.5, before:0, after:3, bold:true },
    title: { size:23, line:10, before:0, after:6, bold:true },
    heading: { size:12, line:6, before:7, after:3, bold:true },
    strong: { size:10, line:5, before:3, after:1.5, bold:true },
    body: { size:9.5, line:5, before:0, after:2, bold:false },
    small: { size:8.5, line:4.5, before:0, after:2, bold:false },
  };
  for (let index = 0; index < blocks.length; index++) {
    const block = blocks[index];
    if (!block.text.trim()) continue;
    const style = styles[block.kind];
    pdf.setFont('Report', style.bold ? 'bold' : 'normal'); pdf.setFontSize(style.size);
    const glyphs = (pdf.getFont().metadata as any).cmap?.unicode?.codeMap;
    if (!glyphs || Array.from(block.text).some(char => !/\s/.test(char) && !glyphs[char.codePointAt(0)!])) throw new Error('El informe contiene un carácter que la tipografía del PDF no puede representar. Usá Imprimir para conservar ese contenido.');
    const lines: string[] = pdf.splitTextToSize(block.text.replace(/\r\n?/g, '\n'), width);
    // Headings stay with at least the beginning of the following paragraph.
    let keep = 0;
    const next = blocks[index+1];
    if (next && (block.kind === 'heading' || block.kind === 'strong')) {
      const nextStyle=styles[next.kind];
      pdf.setFont('Report',nextStyle.bold?'bold':'normal');pdf.setFontSize(nextStyle.size);
      keep = nextStyle.before + Math.min(3,pdf.splitTextToSize(next.text,width).length)*nextStyle.line;
      pdf.setFont('Report',style.bold?'bold':'normal');pdf.setFontSize(style.size);
    }
    const height=lines.length*style.line;
    if (y + style.before + (height<=60?height:3*style.line) + style.after + keep > bottom) page();
    y += style.before;
    if (block.kind === 'heading') {
      pdf.setDrawColor(220,225,223); pdf.line(margin, y-4, margin+width, y-4);
    }
    pdf.setTextColor(...(style.bold ? [24,75,66] : block.kind === 'small' ? [89,99,97] : [38,48,46]) as [number,number,number]);
    for (const line of lines) {
      if (y + style.line > bottom) page();
      pdf.text(line, margin, y); y += style.line;
    }
    y += style.after;
  }
  const total = pdf.getNumberOfPages();
  for (let i=1; i<=total; i++) {
    pdf.setPage(i); pdf.setFont('Report','normal'); pdf.setFontSize(8); pdf.setTextColor(89,99,97);
    pdf.text('VISIBILITY · Informe de visibilidad', margin, 288);
    pdf.text(`${i} / ${total}`, 192, 288, { align:'right' });
  }
  return pdf.output('arraybuffer');
}
