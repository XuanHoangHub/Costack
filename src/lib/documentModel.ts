import type { JSONContent } from '@tiptap/core';

export function normalizeDocumentContent(value: unknown): JSONContent {
  if (typeof value === 'string') {
    try { return normalizeDocumentContent(JSON.parse(value)); } catch { /* Plain text is preserved as paragraphs. */ }
    return { type: 'doc', content: value.split(/\n\s*\n/).map(text => ({ type: 'paragraph', content: text ? [{ type: 'text', text }] : [] })) };
  }
  if (value && typeof value === 'object' && (value as JSONContent).type === 'doc') return value as JSONContent;
  return { type: 'doc', content: [{ type: 'paragraph' }] };
}

export const escapeDocumentHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
export function safeDocumentUrl(value: string): string | null {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : null; } catch { return null; }
}

export function documentToMarkdown(node: JSONContent): string {
  const children = () => (node.content || []).map(documentToMarkdown).join('');
  if (node.type === 'text') {
    let text = (node.text || '').replace(/([\\`*_[\]])/g, '\\$1');
    for (const mark of node.marks || []) {
      if (mark.type === 'bold') text = `**${text}**`;
      if (mark.type === 'italic') text = `*${text}*`;
      if (mark.type === 'strike') text = `~~${text}~~`;
      if (mark.type === 'code') text = '`` ' + (node.text || '') + ' ``';
      if (mark.type === 'link' && safeDocumentUrl(mark.attrs?.href || '')) text = `[${text}](${mark.attrs!.href.replace(/\)/g, '%29')})`;
    }
    return text;
  }
  if (node.type === 'hardBreak') return '  \n';
  if (node.type === 'heading') return `${'#'.repeat(node.attrs?.level || 1)} ${children()}\n\n`;
  if (node.type === 'paragraph') return `${children()}\n\n`;
  if (node.type === 'horizontalRule') return '---\n\n';
  if (node.type === 'codeBlock') return `\`\`\`\`${node.attrs?.language || ''}\n${(node.content || []).map(item => item.text || '').join('')}\n\`\`\`\`\n\n`;
  if (node.type === 'blockquote' || node.type === 'docCallout') return children().trim().split('\n').map(line => `> ${line}`).join('\n') + '\n\n';
  if (['bulletList', 'orderedList', 'taskList'].includes(node.type || '')) {
    return (node.content || []).map((item, index) => {
      const marker = node.type === 'orderedList' ? `${(node.attrs?.start || 1) + index}. ` : node.type === 'taskList' ? `- [${item.attrs?.checked ? 'x' : ' '}] ` : '- ';
      return marker + documentToMarkdown(item).trim().replace(/\n/g, '\n' + ' '.repeat(marker.length));
    }).join('\n') + '\n\n';
  }
  if (node.type === 'table') {
    const rows = (node.content || []).map(row => (row.content || []).map(cell => documentToMarkdown(cell).trim().replace(/\|/g, '\\|').replace(/\n+/g, '<br>')));
    if (!rows.length) return '';
    return [rows[0], rows[0].map(() => '---'), ...rows.slice(1)].map(row => `| ${row.join(' | ')} |`).join('\n') + '\n\n';
  }
  if (node.type === 'docImage') return `![${(node.attrs?.alt || '').replace(/\]/g, '\\]')}](${safeDocumentUrl(node.attrs?.src || '') || ''})\n\n`;
  if (node.type === 'docTask') return `[${node.attrs?.title || 'Công việc'}](?task=${encodeURIComponent(node.attrs?.taskId || '')})\n\n`;
  return children();
}

export function findDocumentMatches(blocks: { text: string; from: number }[], query: string, matchCase = false) {
  if (!query) return [];
  const expression = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), matchCase ? 'g' : 'gi');
  return blocks.flatMap(block => Array.from(block.text.matchAll(expression), match => ({ from: block.from + match.index!, to: block.from + match.index! + match[0].length })));
}

export function documentDescendants(id: string, documents: { id: string; parent_document_id?: string | null }[]): Set<string> {
  const result = new Set([id]);
  const pending = [id];
  while (pending.length) {
    const parent = pending.pop();
    for (const doc of documents) if (doc.parent_document_id === parent && !result.has(doc.id)) { result.add(doc.id); pending.push(doc.id); }
  }
  return result;
}
