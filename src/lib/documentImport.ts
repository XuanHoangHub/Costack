export interface ImportedApexaDocument {
  title: string;
  icon: string;
  content: Record<string, unknown>;
  sourceLabel: string;
}

type TiptapNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  marks?: Array<{ type: string }>;
  text?: string;
};

const textNode = (text: string, marks?: Array<{ type: string }>): TiptapNode => ({
  type: 'text',
  text,
  ...(marks?.length ? { marks } : {}),
});

const paragraph = (text = ''): TiptapNode => ({
  type: 'paragraph',
  ...(text ? { content: [textNode(text)] } : {}),
});

const documentJson = (content: TiptapNode[]): Record<string, unknown> => ({
  type: 'doc',
  content: content.length ? content : [paragraph()],
});

const fileTitle = (filename: string) => filename.replace(/\.[^.]+$/, '').trim() || 'Tài liệu đã nhập';

const parseDelimited = (source: string, delimiter: string) => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      row.push(cell.trim());
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell.trim());
      if (row.some(value => value.length > 0)) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  row.push(cell.trim());
  if (row.some(value => value.length > 0)) rows.push(row);
  return rows;
};

const rowsToTable = (rows: string[][]): TiptapNode | null => {
  if (!rows.length) return null;
  const columnCount = Math.max(...rows.map(row => row.length), 1);
  return {
    type: 'table',
    content: rows.map((row, rowIndex) => ({
      type: 'tableRow',
      content: Array.from({ length: columnCount }, (_, columnIndex) => ({
        type: rowIndex === 0 ? 'tableHeader' : 'tableCell',
        attrs: { colspan: 1, rowspan: 1, colwidth: null },
        content: [paragraph(String(row[columnIndex] ?? ''))],
      })),
    })),
  };
};

const inlineNodes = (element: Element): TiptapNode[] => {
  const nodes: TiptapNode[] = [];
  element.childNodes.forEach(child => {
    if (child.nodeType === Node.TEXT_NODE) {
      const value = child.textContent || '';
      if (value) nodes.push(textNode(value));
      return;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) return;
    const childElement = child as Element;
    const markName = childElement.tagName.toLowerCase();
    const marks = markName === 'strong' || markName === 'b'
      ? [{ type: 'bold' }]
      : markName === 'em' || markName === 'i'
        ? [{ type: 'italic' }]
        : markName === 's' || markName === 'del'
          ? [{ type: 'strike' }]
          : undefined;
    const text = childElement.textContent || '';
    if (text) nodes.push(textNode(text, marks));
  });
  return nodes;
};

const htmlToTiptap = (html: string): Record<string, unknown> => {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const content: TiptapNode[] = [];
  Array.from(parsed.body.children).forEach((element: Element) => {
    const tag = element.tagName.toLowerCase();
    const inline = inlineNodes(element);
    if (/^h[1-3]$/.test(tag)) {
      content.push({ type: 'heading', attrs: { level: Number(tag[1]) }, ...(inline.length ? { content: inline } : {}) });
    } else if (tag === 'blockquote') {
      content.push({ type: 'blockquote', content: [{ type: 'paragraph', ...(inline.length ? { content: inline } : {}) }] });
    } else if (tag === 'ul' || tag === 'ol') {
      const listItems = Array.from(element.querySelectorAll<HTMLLIElement>(':scope > li')).map(item => ({
        type: 'listItem',
        content: [{ type: 'paragraph', content: inlineNodes(item) }],
      }));
      content.push({ type: tag === 'ul' ? 'bulletList' : 'orderedList', content: listItems });
    } else if (tag === 'table') {
      const rows = Array.from(element.querySelectorAll<HTMLTableRowElement>('tr')).map(row =>
        Array.from(row.querySelectorAll<HTMLTableCellElement>('th,td')).map(cell => cell.textContent?.trim() || '')
      );
      const table = rowsToTable(rows);
      if (table) content.push(table);
    } else if (tag === 'pre') {
      content.push({ type: 'codeBlock', content: [textNode(element.textContent || '')] });
    } else if (inline.length || tag === 'p') {
      content.push({ type: 'paragraph', ...(inline.length ? { content: inline } : {}) });
    }
  });
  return documentJson(content);
};

export async function importDocumentFile(file: File): Promise<ImportedApexaDocument> {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const title = fileTitle(file.name);

  if (extension === 'docx') {
    const mammoth = await import('mammoth');
    const result = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
    return { title, icon: '📘', content: htmlToTiptap(result.value), sourceLabel: 'Microsoft Word' };
  }

  if (extension === 'xlsx') {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());
    const content: TiptapNode[] = [];
    workbook.eachSheet(worksheet => {
      content.push({ type: 'heading', attrs: { level: 2 }, content: [textNode(worksheet.name)] });
      const rows: string[][] = [];
      worksheet.eachRow(row => {
        rows.push(Array.from({ length: Math.max(row.cellCount, worksheet.columnCount) }, (_, index) => {
          const value = row.getCell(index + 1).value;
          if (value && typeof value === 'object' && 'text' in value) return String(value.text);
          if (value && typeof value === 'object' && 'result' in value) return String(value.result ?? '');
          return String(value ?? '');
        }));
      });
      const table = rowsToTable(rows);
      if (table) content.push(table);
    });
    return { title, icon: '📊', content: documentJson(content), sourceLabel: 'Microsoft Excel' };
  }

  const raw = await file.text();
  if (extension === 'csv' || extension === 'tsv') {
    const table = rowsToTable(parseDelimited(raw, extension === 'tsv' ? '\t' : ','));
    return {
      title,
      icon: '📈',
      content: documentJson(table ? [table] : []),
      sourceLabel: extension.toUpperCase(),
    };
  }

  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  const content = lines.map(line => {
    if (extension === 'md') {
      const heading = line.match(/^(#{1,3})\s+(.+)$/);
      if (heading) return { type: 'heading', attrs: { level: heading[1].length }, content: [textNode(heading[2])] } as TiptapNode;
      if (/^[-*]\s+/.test(line)) return paragraph(`• ${line.replace(/^[-*]\s+/, '')}`);
    }
    return paragraph(line);
  });
  return { title, icon: extension === 'md' ? '🧾' : '📄', content: documentJson(content), sourceLabel: extension === 'md' ? 'Markdown' : 'Văn bản' };
}

export function createConnectedDocument(provider: string, url: string): ImportedApexaDocument {
  const providerLabels: Record<string, { label: string; icon: string }> = {
    'google-docs': { label: 'Google Docs', icon: '📘' },
    'google-sheets': { label: 'Google Sheets', icon: '📊' },
    'microsoft-word': { label: 'Microsoft Word', icon: '🟦' },
    'microsoft-excel': { label: 'Microsoft Excel', icon: '🟩' },
  };
  const selected = providerLabels[provider] || { label: 'Tài liệu bên ngoài', icon: '🔗' };
  return {
    title: `${selected.label} được liên kết`,
    icon: selected.icon,
    sourceLabel: selected.label,
    content: documentJson([
      { type: 'heading', attrs: { level: 1 }, content: [textNode(`Tài liệu từ ${selected.label}`)] },
      { type: 'blockquote', content: [paragraph('🔗 Nguồn này được lưu trong Apexa để cả đội truy cập từ một nơi.')] },
      paragraph(url),
      { type: 'heading', attrs: { level: 2 }, content: [textNode('Ghi chú trong Apexa')] },
      paragraph('Bắt đầu thêm tóm tắt, quyết định hoặc công việc liên quan tại đây…'),
    ]),
  };
}
