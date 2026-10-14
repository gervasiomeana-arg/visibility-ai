import React from 'react';

// A deliberately small presentation format. HTML is always rendered as text;
// generated responses cannot insert elements, scripts or active links.
function inline(text: string): React.ReactNode[] {
  return text.split(/(`[^`\n]+`|\*\*[^*\n]+\*\*)/g).map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`')) return <code key={index} className="bg-slate-200 rounded px-1 break-words">{part.slice(1, -1)}</code>;
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
    return part;
  });
}

export function AssistantMessage({ content }: { content: string }) {
  const lines = content.replace(/\r\n?/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    if (/^\s*```/.test(line)) {
      const code: string[] = [];
      while (++i < lines.length && !/^\s*```/.test(lines[i])) code.push(lines[i]);
      blocks.push(<pre key={i} className="overflow-x-auto rounded-lg bg-slate-900 text-slate-100 p-3 text-xs whitespace-pre"><code>{code.join('\n')}</code></pre>);
    } else if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
      blocks.push(<hr key={i} className="border-slate-300" />);
    } else if (/^#{1,6}\s+/.test(line)) {
      blocks.push(<p key={i} className="font-semibold">{inline(line.replace(/^#{1,6}\s+/, ''))}</p>);
    } else if (/^\s*(?:[-*]|\d+[.)])\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]\s+/.test(line);
      const pattern = ordered ? /^\s*\d+[.)]\s+/ : /^\s*[-*]\s+/;
      const start = ordered ? Number(line.trim().match(/^\d+/)![0]) : undefined;
      const entries: React.ReactNode[] = [];
      do { entries.push(<li key={i}>{inline(lines[i].replace(pattern, ''))}</li>); i++; } while (i < lines.length && pattern.test(lines[i]));
      i--;
      blocks.push(ordered ? <ol key={i} start={start} className="list-decimal pl-5 space-y-1">{entries}</ol> : <ul key={i} className="list-disc pl-5 space-y-1">{entries}</ul>);
    } else {
      blocks.push(<p key={i} className="whitespace-pre-wrap break-words">{inline(line)}</p>);
    }
  }
  return <div className="space-y-3 min-w-0">{blocks}</div>;
}
