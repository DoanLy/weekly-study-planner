import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, FileUp, Search, Upload, Video, X } from 'lucide-react';
import { loadIpaDictionary, toIpaTokens } from './ipa.js';
import { SpeakButton, useSpeech } from './speech.jsx';

const VIETNAMESE_LETTERS =
  /[ăâđêôơưàáạảãằắặẳẵầấậẩẫèéẹẻẽềếệểễìíịỉĩòóọỏõồốộổỗờớợởỡùúụủũừứựửữỳýỵỷỹ]/gi;
const HEADER_CELL = /^(tiếng việt|vietnamese|việt|vi|english|tiếng anh|anh|en)$/i;
const NUMBERED_HEADING = /^\d+[.)]\s+\S/;

function countVietnameseLetters(text) {
  return (text.match(VIETNAMESE_LETTERS) || []).length;
}

function splitCells(line) {
  if (line.includes('\t')) return line.split('\t').map((cell) => cell.trim());
  if (line.includes('|')) {
    return line
      .replace(/^\s*\|/, '')
      .replace(/\|\s*$/, '')
      .split('|')
      .map((cell) => cell.trim());
  }
  return [line.trim()];
}

function cleanMarkdown(text) {
  return text
    .replace(/^#+\s*/, '')
    .replace(/\*\*/g, '')
    .replace(/^\*(.+)\*$/, '$1')
    .trim();
}

/* Nhận 3 kiểu: bảng copy từ Word/Docs (cách nhau bằng Tab), bảng Markdown (dấu |),
   hoặc 2 dòng liền nhau (1 dòng Việt + 1 dòng Anh). Tự nhận ra cột nào là tiếng Việt
   theo dấu tiếng Việt, nên thứ tự cột nào trước cũng được. */
export function parseBilingualText(text) {
  const rows = [];
  const skipped = [];
  let section = '';
  let pending = null;

  function flushPending() {
    if (!pending) return;
    if (pending.length <= 80 && pending.isVietnamese) section = pending.text;
    else skipped.push(pending.text);
    pending = null;
  }

  function addRow(first, second) {
    const swap = countVietnameseLetters(second) > countVietnameseLetters(first);
    rows.push({ section, vi: swap ? second : first, en: swap ? first : second });
  }

  text.split(/\r?\n/).forEach((rawLine) => {
    if (!rawLine.trim()) return;
    let cells = splitCells(rawLine).filter(Boolean);
    if (cells.length > 2 && /^\d+$/.test(cells[0])) cells = cells.slice(1); // Cột số thứ tự.
    if (cells.every((cell) => /^:?-{2,}:?$/.test(cell))) return; // Dòng |---|---|.
    if (cells.every((cell) => HEADER_CELL.test(cleanMarkdown(cell)))) return;

    if (cells.length >= 2) {
      flushPending();
      addRow(cleanMarkdown(cells[0]), cleanMarkdown(cells[1]));
      return;
    }

    const line = cleanMarkdown(cells[0] || '');
    if (!line) return;
    if (NUMBERED_HEADING.test(line) || /^#/.test(rawLine.trim())) {
      flushPending();
      section = line;
      return;
    }

    const isVietnamese = countVietnameseLetters(line) > 0;
    if (pending && pending.isVietnamese !== isVietnamese) {
      addRow(pending.text, line);
      pending = null;
      return;
    }
    flushPending();
    pending = { text: line, length: line.length, isVietnamese };
  });

  if (pending) skipped.push(pending.text);
  return { rows, skipped };
}

function vlogToText(vlog) {
  const output = [];
  let section = null;
  vlog.lines.forEach((line) => {
    if (line.section !== section) {
      section = line.section;
      if (section) output.push(section);
    }
    output.push(`${line.vi}\t${line.en}`);
  });
  return output.join('\n');
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function progressOf(vlog) {
  const total = vlog.lines.length;
  const done = vlog.lines.filter((line) => line.done).length;
  return { total, done, percent: total ? Math.round((done / total) * 100) : 0 };
}

function groupBySection(lines) {
  const groups = [];
  lines.forEach((line) => {
    const last = groups.at(-1);
    if (last && last.title === line.section) last.lines.push(line);
    else groups.push({ title: line.section, lines: [line] });
  });
  return groups;
}

export default function DailyVlogView({ vlogs, setVlogs, showToast }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [importDraft, setImportDraft] = useState(null);
  const [viewingId, setViewingId] = useState(null);

  const query = searchQuery.trim().toLowerCase();
  const filtered = useMemo(
    () => (query ? vlogs.filter((v) => v.title.toLowerCase().includes(query)) : vlogs),
    [vlogs, query],
  );
  const viewing = vlogs.find((v) => v.id === viewingId);

  function saveImport({ id, title, rows }) {
    const now = new Date().toISOString();
    setVlogs((current) => {
      const existing = current.find((v) => v.id === id);
      // Khi sửa, dòng nào giữ nguyên nội dung thì giữ luôn dấu tích đã hoàn thành.
      const previous = new Map(existing?.lines.map((l) => [`${l.vi}\n${l.en}`, l]));
      const lines = rows.map((row) => {
        const match = previous.get(`${row.vi}\n${row.en}`);
        return { ...row, id: match?.id || createId('line'), done: Boolean(match?.done) };
      });
      if (existing) {
        return current.map((v) => (v.id === id ? { ...v, title, lines, updatedAt: now } : v));
      }
      return [{ id: createId('vlog'), title, lines, createdAt: now, updatedAt: now }, ...current];
    });
    showToast(id ? 'Đã cập nhật bài vlog.' : `Đã import ${rows.length} dòng song ngữ.`);
    setImportDraft(null);
  }

  function deleteVlog(id) {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bài vlog này?')) return;
    setVlogs((current) => current.filter((v) => v.id !== id));
    if (viewingId === id) setViewingId(null);
    showToast('Đã xóa bài vlog.');
  }

  function toggleLine(vlogId, lineId) {
    setVlogs((current) =>
      current.map((v) =>
        v.id === vlogId
          ? {
              ...v,
              lines: v.lines.map((l) => (l.id === lineId ? { ...l, done: !l.done } : l)),
            }
          : v,
      ),
    );
  }

  function openEdit(vlog) {
    setViewingId(null);
    setImportDraft({ id: vlog.id, title: vlog.title, text: vlogToText(vlog) });
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-3xl font-medium text-ink-900">
            <span className="marker font-bold">Daily Vlog</span>
          </h2>
          <p className="mt-1 text-xs font-semibold text-ink-400">
            Import kịch bản song ngữ Việt – Anh, nghe cách đọc, xem phiên âm và tích từng dòng đã
            luyện xong.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tiêu đề..."
              className="field-input rounded-full pr-10"
            />
            <Search
              size={16}
              className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-400"
            />
          </div>
          <button
            type="button"
            onClick={() => setImportDraft({ id: null, title: '', text: '' })}
            className="btn btn-primary"
          >
            <Upload size={16} /> Import song ngữ
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-[1.5px] border-ink-800 bg-teal-100 text-ink-800">
            {vlogs.length === 0 ? <Video size={30} /> : <Search size={30} />}
          </span>
          <h4 className="font-display text-lg font-bold text-ink-900">
            {vlogs.length === 0 ? 'Chưa có bài vlog nào' : 'Không tìm thấy bài vlog nào'}
          </h4>
          <p className="mt-1 text-xs font-semibold text-ink-400">
            {vlogs.length === 0
              ? 'Bấm "Import song ngữ" rồi dán bảng Việt – Anh vào để bắt đầu.'
              : 'Thử tìm với từ khóa khác trong tiêu đề.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filtered.map((vlog) => {
            const { total, done, percent } = progressOf(vlog);
            return (
              <div
                key={vlog.id}
                className="card flex flex-col justify-between p-5 transition-transform hover:-translate-y-0.5"
              >
                <div>
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <h3 className="truncate font-display text-base font-bold text-ink-900">
                      {vlog.title}
                    </h3>
                    <span className="shrink-0 rounded-full border-[1.5px] border-ink-800 bg-sky-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-ink-900">
                      {new Date(vlog.updatedAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  <div className="border-t-[1.5px] border-dashed border-ink-800/20 pt-3">
                    <p className="truncate text-sm font-semibold text-ink-700">
                      {vlog.lines[0]?.en}
                    </p>
                    <p className="mt-0.5 truncate text-xs font-semibold text-ink-400">
                      {vlog.lines[0]?.vi}
                    </p>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${percent}%` }} />
                      </div>
                      <span className="shrink-0 text-xs font-extrabold text-ink-600">
                        {done}/{total} dòng
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex justify-end gap-2 border-t-[1.5px] border-dashed border-ink-800/20 pt-3">
                  <button
                    type="button"
                    onClick={() => deleteVlog(vlog.id)}
                    className="btn btn-sm btn-coral"
                  >
                    Xóa
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(vlog)}
                    className="btn btn-sm btn-outline"
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewingId(vlog.id)}
                    className="btn btn-sm btn-primary"
                  >
                    Luyện
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {importDraft && (
        <VlogImportModal
          draft={importDraft}
          close={() => setImportDraft(null)}
          save={saveImport}
        />
      )}

      {viewing && (
        <VlogReadModal
          vlog={viewing}
          close={() => setViewingId(null)}
          edit={() => openEdit(viewing)}
          toggleLine={(lineId) => toggleLine(viewing.id, lineId)}
        />
      )}
    </section>
  );
}

function VlogImportModal({ draft, close, save }) {
  const [title, setTitle] = useState(draft.title);
  const [text, setText] = useState(draft.text);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const { rows, skipped } = useMemo(() => parseBilingualText(text), [text]);

  async function handleFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      setText(await file.text());
      setError('');
      if (!title.trim()) setTitle(file.name.replace(/\.[^.]+$/, ''));
    } catch {
      setError('Không đọc được file này.');
    }
  }

  function submit() {
    if (!title.trim()) {
      setError('Vui lòng nhập tiêu đề.');
      return;
    }
    if (rows.length === 0) {
      setError('Chưa nhận ra dòng song ngữ nào. Xem lại định dạng bên dưới ô dán.');
      return;
    }
    save({ id: draft.id, title: title.trim(), rows });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-2 backdrop-blur-sm sm:p-4">
      <div className="flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-card border-[1.5px] border-ink-800 bg-paper shadow-pop">
        <div className="flex items-center justify-between gap-3 border-b-[1.5px] border-ink-800/20 bg-teal-50 p-4">
          <h3 className="font-display text-xl font-bold text-ink-900">
            {draft.id ? 'Sửa bài vlog' : 'Import song ngữ'}
          </h3>
          <button type="button" onClick={close} className="icon-btn icon-btn-coral h-9 w-9">
            <X size={18} />
          </button>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-5 overflow-y-auto p-5 md:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-3">
            <label className="flex flex-col gap-1.5 text-xs font-extrabold text-ink-600">
              Tiêu đề
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ví dụ: Một ngày ở nhà"
                className="field-input"
              />
            </label>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-extrabold text-ink-600">Nội dung song ngữ</span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-sm btn-soft"
              >
                <FileUp size={14} /> Chọn file .txt
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.tsv,text/plain"
                onChange={handleFile}
                className="hidden"
              />
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={12}
              placeholder={
                '1. Mở đầu\nHello mọi người.\tHi everyone.\nHôm nay mình dọn nhà xong sớm.\tI finished cleaning the house early today.'
              }
              className="field-input min-h-56 flex-1 resize-y whitespace-pre font-mono text-xs leading-relaxed"
            />
            <p className="text-[11px] font-semibold leading-relaxed text-ink-400">
              Dán thẳng bảng 2 cột từ Word, Google Docs hoặc trang Documents. Cũng nhận bảng
              Markdown (dấu |), hoặc 2 dòng liền nhau (1 dòng Việt, 1 dòng Anh). Dòng bắt đầu bằng
              số như &quot;1. Mở đầu&quot; sẽ thành tiêu đề mục.
            </p>
          </div>

          <div className="flex min-w-0 flex-col gap-2">
            <span className="text-xs font-extrabold text-ink-600">
              Xem trước: {rows.length} dòng song ngữ
            </span>
            {skipped.length > 0 && (
              <div className="rounded-xl border-[1.5px] border-coral-300 bg-coral-50 p-3 text-xs font-semibold text-coral-700">
                <p className="font-extrabold">{skipped.length} dòng chưa ghép được cặp, sẽ bị bỏ qua:</p>
                <ul className="mt-1 list-disc pl-4">
                  {skipped.slice(0, 5).map((line) => (
                    <li key={line} className="truncate">
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="max-h-96 flex-1 overflow-y-auto rounded-xl border-[1.5px] border-dashed border-ink-800/25 p-3 md:max-h-none">
              {rows.length === 0 ? (
                <p className="py-10 text-center text-xs font-semibold text-ink-400">
                  Dán nội dung vào ô bên trái để xem trước.
                </p>
              ) : (
                groupBySection(rows).map((group, index) => (
                  <div key={index} className="mb-3 last:mb-0">
                    {group.title && (
                      <p className="mb-1 text-xs font-extrabold text-teal-700">{group.title}</p>
                    )}
                    {group.lines.map((row, rowIndex) => (
                      <div
                        key={rowIndex}
                        className="border-b border-ink-800/10 py-1.5 text-xs last:border-b-0"
                      >
                        <p className="font-semibold text-ink-500">{row.vi}</p>
                        <p className="font-bold text-ink-800">{row.en}</p>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t-[1.5px] border-dashed border-ink-800/25 p-4">
          {error && <p className="mr-auto text-xs font-bold text-coral-600">{error}</p>}
          <button type="button" onClick={close} className="btn btn-sm btn-outline">
            Hủy
          </button>
          <button type="button" onClick={submit} className="btn btn-sm btn-primary">
            {draft.id ? 'Lưu thay đổi' : 'Tạo bài vlog'}
          </button>
        </div>
      </div>
    </div>
  );
}

function VlogReadModal({ vlog, close, edit, toggleLine }) {
  const speech = useSpeech();
  const [dictionary, setDictionary] = useState(null);
  const [dictionaryFailed, setDictionaryFailed] = useState(false);
  const { total, done, percent } = progressOf(vlog);

  useEffect(() => {
    let cancelled = false;
    loadIpaDictionary()
      .then((loaded) => {
        if (!cancelled) setDictionary(loaded);
      })
      .catch(() => {
        if (!cancelled) setDictionaryFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-2 backdrop-blur-sm sm:p-4">
      <div className="flex h-[95vh] w-[96vw] max-w-[100rem] flex-col overflow-hidden rounded-card border-[1.5px] border-ink-800 bg-paper shadow-pop">
        <div className="border-b-[1.5px] border-ink-800/20 bg-teal-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="truncate font-display text-xl font-bold text-ink-900">{vlog.title}</h3>
            <button type="button" onClick={close} className="icon-btn icon-btn-coral h-9 w-9">
              <X size={18} />
            </button>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${percent}%` }} />
            </div>
            <span className="shrink-0 text-xs font-extrabold text-ink-600">
              {done}/{total} dòng
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {dictionaryFailed && (
            <p className="mb-4 rounded-xl border-[1.5px] border-coral-300 bg-coral-50 p-3 text-xs font-bold text-coral-700">
              Không tải được từ điển phiên âm. Kiểm tra mạng rồi mở lại bài này.
            </p>
          )}
          {groupBySection(vlog.lines).map((group, index) => (
            <div key={index} className="mb-7 last:mb-0">
              {group.title && (
                <h4 className="mb-2 font-display text-base font-bold text-ink-900">
                  {group.title}
                </h4>
              )}
              <div className="overflow-hidden rounded-xl border-[1.5px] border-ink-800/30">
                <div className="hidden grid-cols-[3.25rem_1fr_1fr] bg-teal-50 text-sm font-extrabold text-teal-800 md:grid">
                  <span className="border-r border-ink-800/20 px-3 py-2.5 text-center">Xong</span>
                  <span className="border-r border-ink-800/20 px-4 py-2.5">Tiếng Việt</span>
                  <span className="px-4 py-2.5">English</span>
                </div>
                {group.lines.map((line) => (
                  <VlogLine
                    key={line.id}
                    line={line}
                    dictionary={dictionary}
                    speech={speech}
                    toggle={() => toggleLine(line.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 border-t-[1.5px] border-dashed border-ink-800/25 p-4">
          <button type="button" onClick={close} className="btn btn-sm btn-outline">
            Đóng
          </button>
          <button type="button" onClick={edit} className="btn btn-sm btn-primary">
            Sửa
          </button>
        </div>
      </div>
    </div>
  );
}

function VlogLine({ line, dictionary, speech, toggle }) {
  const tokens = useMemo(() => toIpaTokens(line.en, dictionary), [line.en, dictionary]);
  const isStageDirection = /^\(.*\)$/.test(line.en);

  return (
    <div
      className={`grid grid-cols-[3.25rem_1fr] border-t border-ink-800/20 first:border-t-0 md:grid-cols-[3.25rem_1fr_1fr] md:first:border-t ${
        line.done ? 'bg-teal-50/70' : 'bg-white'
      }`}
    >
      <div className="row-span-2 flex justify-center border-r border-ink-800/20 px-2 py-3 md:row-span-1">
        <button
          type="button"
          role="checkbox"
          aria-checked={line.done}
          aria-label={`Đánh dấu hoàn thành: ${line.en}`}
          title={line.done ? 'Bỏ đánh dấu hoàn thành' : 'Đánh dấu đã hoàn thành'}
          onClick={toggle}
          className={`flex h-7 w-7 items-center justify-center rounded-full border-[1.5px] transition-all ${
            line.done
              ? 'border-ink-800 bg-teal-500 text-white shadow-chip'
              : 'border-ink-800/30 bg-white text-transparent hover:border-ink-800 hover:text-ink-300'
          }`}
        >
          <Check size={15} strokeWidth={3} />
        </button>
      </div>
      <div
        className={`px-4 pb-1 pt-3 text-sm leading-relaxed text-ink-600 md:border-r md:border-ink-800/20 md:py-3 ${
          isStageDirection ? 'italic' : ''
        }`}
      >
        {line.vi}
      </div>
      <div className="flex items-start gap-2.5 px-4 pb-3 pt-1 md:py-3">
        <SpeakButton
          speech={speech}
          speechKey={line.id}
          getText={() => line.en}
          label="Nghe tiếng Anh"
          className="mt-0.5 h-7 w-7"
        />
        <div
          className={`flex min-w-0 flex-1 flex-wrap items-start gap-x-1.5 gap-y-1.5 ${
            isStageDirection ? 'italic' : ''
          }`}
        >
          {tokens.map((token, index) => (
            <span key={index} className="inline-flex flex-col">
              <span className="text-sm font-bold leading-snug text-ink-800">{token.text}</span>
              <span
                className="min-h-4 text-xs font-normal not-italic leading-4 text-teal-700"
                style={{ fontFamily: "'Segoe UI', Arial, sans-serif" }}
              >
                {token.isWord && dictionary ? token.ipa || '—' : ' '}
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
