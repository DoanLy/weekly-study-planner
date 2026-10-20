import { useMemo, useState } from 'react';
import { BarChart3, Printer, Sparkles } from 'lucide-react';
import GUIDE_MD from './writing-task1.md?raw';

// Nội dung tài liệu nằm nguyên văn trong writing-task1.md (Markdown). File này
// chỉ là bộ đọc Markdown tối giản (đủ cho đúng các cú pháp tài liệu dùng:
// tiêu đề, bảng, khối code, trích dẫn, danh sách lồng, **đậm**, *nghiêng*,
// `code`) + giao diện chia tab theo từng "PHẦN".

// Tên ngắn cho thanh tab, theo thứ tự PHẦN 1..5 trong tài liệu.
const SECTION_TAB_LABELS = [
  'Tổng quan',
  'Paraphrase',
  'Từ vựng & mẫu câu',
  '5 dạng biểu đồ & bài mẫu',
  'Công thức tổng',
];

// PHẦN chứa các mục "### ... DẠNG N: ..." (PHẦN 4) được tách thành 1 tab cho
// mỗi loại biểu đồ (Line / Bar / Pie) thay vì 1 tab chung.
const CHART_TAB_LABELS = {
  1: { label: 'Line graph', emoji: '📈' },
  2: { label: 'Bar chart', emoji: '📊' },
  3: { label: 'Pie chart', emoji: '🥧' },
};

function splitCharts(lines) {
  const intro = [];
  const charts = [];
  for (const line of lines) {
    const match = line.match(/^### .*DẠNG (\d+):\s*(.*)$/);
    if (match) {
      charts.push({ number: match[1], heading: match[2].trim(), lines: [] });
    } else if (charts.length) {
      charts[charts.length - 1].lines.push(line);
    } else {
      intro.push(line);
    }
  }
  return { intro, charts };
}

function parseGuide(markdown) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const titleLine = lines.find((line) => line.startsWith('# '));
  const rawSections = [];
  let current = null;
  for (const line of lines) {
    if (line.startsWith('## ')) {
      current = { title: line.slice(3).trim(), lines: [] };
      rawSections.push(current);
    } else if (current) {
      current.lines.push(line);
    }
  }

  const sections = [];
  const pages = [];
  rawSections.forEach((section, index) => {
    const match = section.title.match(/^PHẦN\s+(\d+)\.\s*(.*)$/);
    const number = match ? match[1] : String(index + 1);
    const heading = match ? match[2] : section.title;
    const full = {
      id: `part-${index + 1}`,
      badge: number,
      kicker: `Phần ${number}`,
      heading,
      tabLabel: SECTION_TAB_LABELS[index] || section.title,
      blocks: parseBlocks(section.lines),
    };
    sections.push(full);

    const { intro, charts } = splitCharts(section.lines);
    if (!charts.length) {
      pages.push(full);
      return;
    }
    // Mẹo "Cách dùng công thức" ở đầu PHẦN được lặp lại trên đầu mỗi tab biểu đồ.
    const tips = parseBlocks(intro).filter((block) => block.type === 'quote');
    charts.forEach((chart) => {
      const tab = CHART_TAB_LABELS[chart.number] || { label: chart.heading, emoji: chart.number };
      pages.push({
        id: `chart-${chart.number}`,
        badge: tab.emoji,
        kicker: `Phần ${number} · Dạng ${chart.number}`,
        heading: chart.heading,
        tabLabel: tab.label,
        blocks: [...tips, ...parseBlocks(chart.lines)],
      });
    });
  });

  return {
    title: titleLine ? titleLine.slice(2).trim() : 'IELTS Writing Task 1',
    sections,
    pages,
  };
}

const isTableLine = (line) => line.trim().startsWith('|');
const isListLine = (line) => /^\s*- /.test(line);
const isBlockStart = (line) =>
  /^#{1,6} /.test(line) ||
  line.startsWith('```') ||
  line.startsWith('>') ||
  isTableLine(line) ||
  isListLine(line) ||
  line.trim() === '---';

function splitRow(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function parseList(lines) {
  // Dựng cây theo độ thụt lề (2 dấu cách = 1 cấp).
  const root = { children: [] };
  const stack = [{ indent: -1, node: root }];
  for (const line of lines) {
    const indent = line.match(/^\s*/)[0].length;
    const item = { text: line.trim().slice(2), children: [] };
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();
    stack[stack.length - 1].node.children.push(item);
    stack.push({ indent, node: item });
  }
  return root.children;
}

function parseBlocks(lines) {
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') {
      i += 1;
    } else if (line.startsWith('```')) {
      const code = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith('```')) code.push(lines[i++]);
      i += 1;
      blocks.push({ type: 'code', text: code.join('\n') });
    } else if (/^#{3,6} /.test(line)) {
      const level = line.match(/^#+/)[0].length;
      blocks.push({ type: 'heading', level, text: line.slice(level + 1).trim() });
      i += 1;
    } else if (line.trim() === '---') {
      blocks.push({ type: 'hr' });
      i += 1;
    } else if (line.startsWith('>')) {
      const inner = [];
      while (i < lines.length && lines[i].startsWith('>')) {
        inner.push(lines[i].replace(/^> ?/, ''));
        i += 1;
      }
      blocks.push({ type: 'quote', blocks: parseBlocks(inner) });
    } else if (isTableLine(line)) {
      const rows = [];
      while (i < lines.length && isTableLine(lines[i])) rows.push(splitRow(lines[i++]));
      const body = rows.slice(1).filter((row) => !row.every((cell) => /^:?-+:?$/.test(cell)));
      blocks.push({ type: 'table', head: rows[0], rows: body });
    } else if (isListLine(line)) {
      const items = [];
      while (i < lines.length && isListLine(lines[i])) items.push(lines[i++]);
      blocks.push({ type: 'list', items: parseList(items) });
    } else {
      const para = [];
      while (i < lines.length && lines[i].trim() !== '' && !isBlockStart(lines[i])) {
        para.push(lines[i].trim());
        i += 1;
      }
      blocks.push({ type: 'paragraph', text: para.join(' ') });
    }
  }
  // Đường kẻ "---" ở cuối mỗi PHẦN chỉ là vách ngăn giữa các phần trong file gốc.
  while (blocks.length && blocks[blocks.length - 1].type === 'hr') blocks.pop();
  return blocks;
}

// Tìm dấu * đóng cho đoạn nghiêng mở ở vị trí start, bỏ qua các cặp ** bên trong.
function findItalicEnd(text, start) {
  let j = start + 1;
  while (j < text.length) {
    if (text.startsWith('**', j)) {
      const close = text.indexOf('**', j + 2);
      if (close === -1) return -1;
      j = close + 2;
    } else if (text[j] === '*') {
      return j;
    } else {
      j += 1;
    }
  }
  return -1;
}

function renderInline(text, keyPrefix = 'i') {
  const out = [];
  let buffer = '';
  let i = 0;
  const flush = () => {
    if (buffer) out.push(buffer);
    buffer = '';
  };
  while (i < text.length) {
    const key = `${keyPrefix}-${i}`;
    if (text[i] === '`') {
      const close = text.indexOf('`', i + 1);
      if (close !== -1) {
        flush();
        out.push(
          <code
            key={key}
            className="rounded-md border border-ink-800/15 bg-ink-50 px-1 py-px font-mono text-[0.85em] text-ink-800"
          >
            {text.slice(i + 1, close)}
          </code>,
        );
        i = close + 1;
        continue;
      }
    } else if (text.startsWith('**', i) && !text.startsWith('***', i)) {
      const close = text.indexOf('**', i + 2);
      if (close !== -1) {
        flush();
        out.push(
          <strong key={key} className="font-extrabold">
            {renderInline(text.slice(i + 2, close), key)}
          </strong>,
        );
        i = close + 2;
        continue;
      }
    } else if (text[i] === '*') {
      const close = findItalicEnd(text, i);
      if (close !== -1) {
        flush();
        out.push(<em key={key}>{renderInline(text.slice(i + 1, close), key)}</em>);
        i = close + 1;
        continue;
      }
    }
    buffer += text[i];
    i += 1;
  }
  flush();
  return out;
}

// Khối công thức: tô vàng chỗ cần điền [ ... ], tô xanh nhãn INTRO/OVERVIEW/BODY.
function renderFormulaLine(line, lineIndex) {
  const label = line.match(/^(INTRO:|OVERVIEW:|BODY:|BODY \d|Đoạn \d[^:]*:)/);
  const rest = label ? line.slice(label[0].length) : line;
  return (
    <>
      {label && <span className="font-extrabold text-teal-300">{label[0]}</span>}
      {rest.split(/(\[[^\]]*\])/).map((part, index) =>
        part.startsWith('[') ? (
          <span key={`${lineIndex}-${index}`} className="rounded bg-sun-300 px-0.5 text-ink-900">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}

function ListItems({ items, depth = 0 }) {
  return (
    <ul
      className={`flex flex-col gap-1.5 pl-5 ${
        depth === 0 ? 'list-disc' : 'mt-1.5 list-[circle]'
      } marker:text-teal-500`}
    >
      {items.map((item, index) => (
        <li key={index} className="pl-1">
          {renderInline(item.text, `li${depth}-${index}`)}
          {item.children.length > 0 && <ListItems items={item.children} depth={depth + 1} />}
        </li>
      ))}
    </ul>
  );
}

function Blocks({ blocks, inQuote = false }) {
  return blocks.map((block, index) => {
    switch (block.type) {
      case 'heading': {
        if (block.level === 3) {
          return (
            <h3
              key={index}
              className="mt-4 border-b-[1.5px] border-dashed border-ink-800/20 pb-2 font-display text-xl font-bold text-ink-900 first:mt-0"
            >
              {renderInline(block.text, `h${index}`)}
            </h3>
          );
        }
        if (block.level === 4) {
          return (
            <h4 key={index} className="mt-3 font-display text-lg font-bold text-teal-700">
              {renderInline(block.text, `h${index}`)}
            </h4>
          );
        }
        return (
          <h5 key={index} className="mt-2 font-display text-base font-bold text-ink-800">
            {renderInline(block.text, `h${index}`)}
          </h5>
        );
      }
      case 'hr':
        return <hr key={index} className="my-2 border-t-[1.5px] border-dashed border-ink-800/20" />;
      case 'code':
        return (
          <pre
            key={index}
            className="overflow-x-auto rounded-2xl border-[1.5px] border-ink-800 bg-ink-800 p-4 font-mono text-[12.5px] leading-relaxed text-ink-50"
          >
            <code>
              {block.text.split('\n').map((line, lineIndex) => (
                <span key={lineIndex} className="block min-h-[1.2em]">
                  {renderFormulaLine(line, lineIndex)}
                </span>
              ))}
            </code>
          </pre>
        );
      case 'quote':
        return (
          <blockquote
            key={index}
            className="flex flex-col gap-2.5 rounded-2xl border-[1.5px] border-l-[6px] border-ink-800 border-l-teal-500 bg-teal-50 p-4 text-[14px] leading-relaxed text-ink-800 [&_strong]:text-teal-800"
          >
            <Blocks blocks={block.blocks} inQuote />
          </blockquote>
        );
      case 'table':
        return (
          <div
            key={index}
            className="overflow-x-auto rounded-2xl border-[1.5px] border-ink-800 bg-white"
          >
            <table className="w-full border-collapse text-left text-[13px]">
              <thead>
                <tr className="bg-sun-100">
                  {block.head.map((cell, cellIndex) => (
                    <th
                      key={cellIndex}
                      className="whitespace-nowrap border-b-[1.5px] border-ink-800 px-3 py-2 font-extrabold text-ink-900"
                    >
                      {renderInline(cell, `th${index}-${cellIndex}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-t border-ink-800/10 odd:bg-white even:bg-cream/60">
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        className={`px-3 py-2 align-top text-ink-700 ${
                          cellIndex === 0 ? 'font-bold text-ink-900' : ''
                        }`}
                      >
                        {renderInline(cell, `td${index}-${rowIndex}-${cellIndex}`)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'list':
        return (
          <div key={index} className="text-[14px] leading-relaxed text-ink-700">
            <ListItems items={block.items} />
          </div>
        );
      default:
        return (
          <p
            key={index}
            className={`text-[14px] leading-relaxed ${inQuote ? 'text-ink-800' : 'text-ink-700'}`}
          >
            {renderInline(block.text, `p${index}`)}
          </p>
        );
    }
  });
}

export default function WritingTask1View() {
  const guide = useMemo(() => parseGuide(GUIDE_MD), []);
  const [activeTab, setActiveTab] = useState('all');

  const visibleSections =
    activeTab === 'all'
      ? guide.sections
      : guide.pages.filter((page) => page.id === activeTab);

  const selectTab = (id) => {
    setActiveTab(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <span className="pill border-ink-800 bg-sun-200 text-ink-900">
            <Sparkles size={11} /> IELTS · Band 5.0
          </span>
          <h2 className="mt-2 font-display text-3xl font-medium text-ink-900">
            Writing <span className="marker font-bold">Task 1</span>
          </h2>
          <p className="mt-1 max-w-2xl text-xs font-semibold text-ink-400">{guide.title}</p>
        </div>
        <button type="button" onClick={() => window.print()} className="btn btn-sm btn-soft">
          <Printer size={14} /> In / Xuất PDF
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => selectTab('all')}
          className={`btn btn-sm ${activeTab === 'all' ? 'btn-primary' : 'btn-soft'}`}
        >
          <BarChart3 size={14} /> Tất cả
        </button>
        {guide.pages.map((section) => {
          const active = activeTab === section.id;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => selectTab(section.id)}
              className={`btn btn-sm ${active ? 'btn-primary' : 'btn-soft'}`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full border-[1.5px] border-ink-800 text-[10px] font-extrabold ${
                  active ? 'bg-sun-300 text-ink-900' : 'bg-teal-100 text-ink-900'
                }`}
              >
                {section.badge}
              </span>
              {section.tabLabel}
            </button>
          );
        })}
      </div>

      {visibleSections.map((section) => (
        <article key={section.id} className="card flex min-w-0 flex-col gap-4 p-5 md:p-7">
          <header className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-[1.5px] border-ink-800 bg-sun-300 font-display text-lg font-bold text-ink-900 shadow-chip">
              {section.badge}
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink-400">
                {section.kicker}
              </p>
              <h3 className="font-display text-2xl font-bold leading-tight text-ink-900">
                {section.heading}
              </h3>
            </div>
          </header>
          <Blocks blocks={section.blocks} />
        </article>
      ))}
    </section>
  );
}
