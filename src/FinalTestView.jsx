import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  GraduationCap,
  Headphones,
  Languages,
  Lightbulb,
  PenLine,
  Quote,
  XCircle,
} from 'lucide-react';
import ChartFigure from './ChartFigure';

// Lời giải các đề Final Test Pre-Foundation. Mỗi đề là 1 file JSON trong
// src/final-test/ (cấu trúc: sections → passage / groups → questions / tasks).
// Thêm đề mới: thả file JSON vào thư mục đó và thêm id vào TEST_ORDER.
const TEST_FILES = import.meta.glob('./final-test/*.json', { eager: true, import: 'default' });

const TEST_ORDER = ['md01', 'md01b', 'pf-a', 'pf-b', 'dc-1', 'dc-2', 'fd-md02', 'fd-final'];

const SKILLS = {
  listening: { label: 'Listening', icon: Headphones, chip: 'bg-sky-100' },
  reading: { label: 'Reading', icon: BookOpen, chip: 'bg-teal-100' },
  writing: { label: 'Writing', icon: PenLine, chip: 'bg-sun-200' },
};

const CONFIDENCE = {
  high: { label: 'Đáp án chuẩn', className: 'bg-teal-100' },
  medium: { label: 'Khá chắc', className: 'bg-sun-200' },
  low: { label: 'Suy luận', className: 'bg-coral-200' },
};

const UNKNOWN_ANSWER = /cần (nghe )?audio|không xác định/i;

function loadTests() {
  const tests = Object.values(TEST_FILES).filter((test) => test && test.id);
  const rank = (id) => {
    const index = TEST_ORDER.indexOf(id);
    return index === -1 ? TEST_ORDER.length : index;
  };
  return tests.sort((a, b) => rank(a.id) - rank(b.id));
}

function countQuestions(sections) {
  return sections.reduce(
    (sum, section) =>
      sum +
      (section.groups || []).reduce((acc, group) => acc + (group.questions || []).length, 0) +
      (section.tasks || []).length,
    0,
  );
}

// **đậm** + xuống dòng \n trong chuỗi dữ liệu.
function Rich({ text, className = '' }) {
  if (!text) return null;
  const lines = String(text).split('\n');
  return (
    <span className={className}>
      {lines.map((line, lineIndex) => (
        <span key={lineIndex}>
          {lineIndex > 0 && <br />}
          {line.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
            part.startsWith('**') && part.endsWith('**') ? (
              <strong key={index} className="font-extrabold text-ink-900">
                {part.slice(2, -2)}
              </strong>
            ) : (
              part
            ),
          )}
        </span>
      ))}
    </span>
  );
}

function Paragraphs({ text, className }) {
  if (!text) return null;
  return String(text)
    .split(/\n\s*\n/)
    .map((para, index) => (
      <p key={index} className={className}>
        <Rich text={para} />
      </p>
    ));
}

function isCorrectOption(option, answer) {
  const letter = option.trim().match(/^([A-Za-z]|[ivxIVX]+)[.)]\s/);
  if (!letter || !answer) return false;
  const answers = String(answer)
    .toUpperCase()
    .split(/[^A-Z]+/)
    .filter(Boolean);
  return answers.includes(letter[1].toUpperCase());
}

function PassageCard({ passage, showVi }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card-soft overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-3 bg-teal-50 px-4 py-3 text-left"
      >
        <span className="min-w-0">
          <span className="block text-[11px] font-extrabold uppercase tracking-wider text-teal-700">
            Bài đọc
          </span>
          <span className="block font-display text-lg font-bold text-ink-900">{passage.title}</span>
          {passage.title_vi && (
            <span className="block text-xs font-semibold text-ink-500">{passage.title_vi}</span>
          )}
        </span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-ink-600 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="flex flex-col gap-4 p-4">
          {passage.paragraphs.map((para, index) => (
            <div
              key={index}
              className={`grid gap-3 ${showVi && para.vi ? 'md:grid-cols-2' : ''}`}
            >
              <p className="text-[14px] leading-relaxed text-ink-800">
                {para.label && (
                  <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full border-[1.5px] border-ink-800 bg-sun-300 text-[11px] font-extrabold">
                    {para.label}
                  </span>
                )}
                <Rich text={para.en} />
              </p>
              {showVi && para.vi && (
                <p className="rounded-xl bg-ink-50 px-3 py-2 text-[13px] leading-relaxed text-ink-600">
                  <Rich text={para.vi} />
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QuestionCard({ question, practice, showVi, isListening }) {
  const [revealed, setRevealed] = useState(false);
  useEffect(() => setRevealed(false), [practice]);
  const visible = !practice || revealed;
  // Listening không có audio: câu không suy ra được đáp án thì không tô như đáp án đúng.
  const unknown = UNKNOWN_ANSWER.test(String(question.answer || ''));
  const confidence =
    isListening && question.confidence && !unknown ? CONFIDENCE[question.confidence] : null;

  return (
    <div className="rounded-2xl border-[1.5px] border-ink-800/15 bg-white p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full border-[1.5px] border-ink-800 bg-sun-300 px-2 text-[12px] font-extrabold text-ink-900">
          {question.no}
        </span>
        <div className="min-w-0 flex-1">
          {question.prompt && (
            <p className="text-[14px] font-bold leading-relaxed text-ink-900">
              <Rich text={question.prompt} />
            </p>
          )}
          {showVi && question.prompt_vi && (
            <p className="mt-0.5 text-[13px] italic leading-relaxed text-ink-500">
              <Rich text={question.prompt_vi} />
            </p>
          )}
          {question.options && (
            <ul className="mt-2 flex flex-col gap-1">
              {question.options.map((option, index) => {
                const correct = visible && isCorrectOption(option, question.answer);
                return (
                  <li
                    key={index}
                    className={`rounded-lg px-2.5 py-1 text-[13px] ${
                      correct
                        ? 'border-[1.5px] border-teal-600 bg-teal-50 font-bold text-ink-900'
                        : 'text-ink-600'
                    }`}
                  >
                    <Rich text={option} />
                  </li>
                );
              })}
            </ul>
          )}

          {!visible ? (
            <button
              type="button"
              onClick={() => setRevealed(true)}
              className="btn btn-sm btn-outline mt-3"
            >
              <Eye size={13} /> Xem đáp án
            </button>
          ) : (
            <div className="mt-3 flex flex-col gap-2.5">
              <div className="flex flex-wrap items-center gap-2">
                {unknown ? (
                  <span className="inline-flex max-w-full items-center gap-1.5 rounded-2xl border-[1.5px] border-dashed border-ink-800/50 bg-ink-50 px-3 py-1 text-[13px] font-bold text-ink-600">
                    <Headphones size={14} className="shrink-0" /> {question.answer}
                  </span>
                ) : (
                  <span className="inline-flex max-w-full items-center gap-1.5 rounded-2xl border-[1.5px] border-ink-800 bg-teal-500 px-3 py-1 text-[13px] font-extrabold text-white shadow-chip">
                    <CheckCircle2 size={14} className="shrink-0" /> {question.answer}
                  </span>
                )}
                {confidence && (
                  <span className={`pill ${confidence.className} text-ink-900`}>{confidence.label}</span>
                )}
                {question.student && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-coral-100 px-2.5 py-1 text-[12px] font-bold text-coral-700">
                    <XCircle size={13} /> Bài làm: <span className="line-through">{question.student}</span>
                  </span>
                )}
              </div>
              {question.evidence && (
                <blockquote className="rounded-xl border-l-4 border-teal-500 bg-teal-50 px-3 py-2">
                  <p className="text-[13px] leading-relaxed text-ink-800">
                    <Quote size={12} className="mr-1 inline text-teal-600" />
                    <Rich text={question.evidence} />
                  </p>
                  {showVi && question.evidence_vi && (
                    <p className="mt-1 text-[12.5px] italic leading-relaxed text-ink-500">
                      <Rich text={question.evidence_vi} />
                    </p>
                  )}
                </blockquote>
              )}
              {question.explanation && (
                <div className="flex gap-2 rounded-xl bg-sun-50 px-3 py-2">
                  <Lightbulb size={15} className="mt-0.5 shrink-0 text-sun-600" />
                  <p className="text-[13.5px] leading-relaxed text-ink-700">
                    <Rich text={question.explanation} />
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function WritingTask({ task, practice, showVi }) {
  const [revealed, setRevealed] = useState(false);
  useEffect(() => setRevealed(false), [practice]);
  const visible = !practice || revealed;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border-[1.5px] border-ink-800/15 bg-white p-4 md:p-5">
      <h4 className="font-display text-xl font-bold text-ink-900">{task.title}</h4>
      {task.prompt && (
        <div className="rounded-xl border-[1.5px] border-dashed border-ink-800/30 bg-cream px-4 py-3">
          <p className="text-[14px] font-semibold leading-relaxed text-ink-800">
            <Rich text={task.prompt} />
          </p>
          {showVi && task.prompt_vi && (
            <p className="mt-1 text-[13px] italic leading-relaxed text-ink-500">
              <Rich text={task.prompt_vi} />
            </p>
          )}
        </div>
      )}
      {task.chart && <ChartFigure spec={task.chart} />}

      {!visible ? (
        <button type="button" onClick={() => setRevealed(true)} className="btn btn-sm btn-outline self-start">
          <Eye size={13} /> Xem bài mẫu
        </button>
      ) : (
        <>
          {task.answer && (
            <div className="rounded-xl border-[1.5px] border-teal-600 bg-teal-50 px-4 py-3">
              <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-teal-700">
                Bài mẫu · Band 5.0
              </p>
              <div className="flex flex-col gap-2.5">
                <Paragraphs text={task.answer} className="text-[14px] leading-relaxed text-ink-900" />
              </div>
            </div>
          )}
          {showVi && task.answer_vi && (
            <div className="rounded-xl bg-ink-50 px-4 py-3">
              <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-ink-500">
                Bản dịch
              </p>
              <div className="flex flex-col gap-2">
                <Paragraphs text={task.answer_vi} className="text-[13px] leading-relaxed text-ink-600" />
              </div>
            </div>
          )}
          {task.notes && task.notes.length > 0 && (
            <div className="flex gap-2 rounded-xl bg-sun-50 px-3 py-2">
              <Lightbulb size={15} className="mt-0.5 shrink-0 text-sun-600" />
              <ul className="flex list-disc flex-col gap-1 pl-4 text-[13.5px] leading-relaxed text-ink-700">
                {task.notes.map((note, index) => (
                  <li key={index}>
                    <Rich text={note} />
                  </li>
                ))}
              </ul>
            </div>
          )}
          {task.vocab && task.vocab.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[320px] border-collapse text-[13px]">
                <thead>
                  <tr className="bg-ink-800 text-left text-white">
                    <th className="px-3 py-1.5 font-extrabold">Từ vựng</th>
                    <th className="px-3 py-1.5 font-extrabold">Nghĩa</th>
                  </tr>
                </thead>
                <tbody>
                  {task.vocab.map((item, index) => (
                    <tr key={index} className="border-b border-ink-800/10 odd:bg-white even:bg-ink-50">
                      <td className="px-3 py-1.5 font-bold text-ink-900">{item.en}</td>
                      <td className="px-3 py-1.5 text-ink-600">{item.vi}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SectionCard({ section, practice, showVi }) {
  const skill = SKILLS[section.skill] || SKILLS.reading;
  const Icon = skill.icon;
  const isListening = section.skill === 'listening';

  return (
    <article className="card flex min-w-0 flex-col gap-4 p-4 md:p-6">
      <header className="flex items-start gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-[1.5px] border-ink-800 ${skill.chip} text-ink-900 shadow-chip`}
        >
          <Icon size={18} />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink-400">{skill.label}</p>
          <h3 className="font-display text-2xl font-bold leading-tight text-ink-900">{section.title}</h3>
        </div>
      </header>
      {section.note && (
        <p className="rounded-xl border-[1.5px] border-dashed border-ink-800/30 bg-white/70 px-3 py-2 text-[13px] leading-relaxed text-ink-600">
          <Rich text={section.note} />
        </p>
      )}
      {section.passage && <PassageCard passage={section.passage} showVi={showVi} />}

      {(section.groups || []).map((group, groupIndex) => (
        <div key={groupIndex} className="flex flex-col gap-3">
          <div className="rounded-xl bg-ink-800 px-4 py-3 text-white">
            {group.range && (
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-sun-300">{group.range}</p>
            )}
            {group.instruction && (
              <p className="text-[13.5px] font-semibold leading-relaxed">
                <Rich text={group.instruction} className="[&_strong]:text-sun-200" />
              </p>
            )}
            {showVi && group.instruction_vi && (
              <p className="mt-0.5 text-[12.5px] italic leading-relaxed text-white/70">
                <Rich text={group.instruction_vi} className="[&_strong]:text-white" />
              </p>
            )}
          </div>
          {group.context && (
            <div className="overflow-x-auto rounded-xl border-[1.5px] border-ink-800/15 bg-cream px-4 py-3 font-mono text-[12.5px] leading-relaxed text-ink-700">
              <Rich text={group.context} className="whitespace-pre-wrap" />
            </div>
          )}
          <div className="grid gap-3">
            {(group.questions || []).map((question, index) => (
              <QuestionCard
                key={`${question.no}-${index}`}
                question={question}
                practice={practice}
                showVi={showVi}
                isListening={isListening}
              />
            ))}
          </div>
        </div>
      ))}

      {(section.tasks || []).map((task, index) => (
        <WritingTask key={index} task={task} practice={practice} showVi={showVi} />
      ))}
    </article>
  );
}

export default function FinalTestView() {
  const tests = useMemo(loadTests, []);
  const [testId, setTestId] = useState(tests[0]?.id);
  const [skill, setSkill] = useState('all');
  const [practice, setPractice] = useState(false);
  const [showVi, setShowVi] = useState(true);

  const test = tests.find((item) => item.id === testId) || tests[0];
  if (!test) {
    return <p className="card p-6 text-sm font-semibold text-ink-500">Chưa có đề nào.</p>;
  }

  const skillsInTest = Object.keys(SKILLS).filter((key) =>
    test.sections.some((section) => section.skill === key),
  );
  const visibleSections =
    skill === 'all' ? test.sections : test.sections.filter((section) => section.skill === skill);

  const selectTest = (id) => {
    setTestId(id);
    setSkill('all');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <span className="pill border-ink-800 bg-sun-200 text-ink-900">
            <GraduationCap size={11} /> Lời giải chi tiết · {tests.length} đề
          </span>
          <h2 className="mt-2 font-display text-3xl font-medium text-ink-900">
            FinalTest <span className="marker font-bold">Pre-Foundation</span>
          </h2>
          <p className="mt-1 max-w-2xl text-xs font-semibold text-ink-400">
            Đáp án, dẫn chứng, giải thích như một buổi chữa đề và bản dịch tiếng Việt. Writing viết ở mức band 5.0.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowVi(!showVi)}
            className={`btn btn-sm ${showVi ? 'btn-primary' : 'btn-soft'}`}
          >
            <Languages size={14} /> {showVi ? 'Đang hiện bản dịch' : 'Hiện bản dịch'}
          </button>
          <button
            type="button"
            onClick={() => setPractice(!practice)}
            className={`btn btn-sm ${practice ? 'btn-sun' : 'btn-soft'}`}
          >
            {practice ? <EyeOff size={14} /> : <Eye size={14} />}
            {practice ? 'Đang ẩn đáp án' : 'Tự làm trước (ẩn đáp án)'}
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tests.map((item, index) => {
          const active = item.id === test.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => selectTest(item.id)}
              className={`flex flex-col gap-2 rounded-card border-[1.5px] p-4 text-left transition-all ${
                active
                  ? 'border-ink-800 bg-teal-500 text-white shadow-card'
                  : 'border-ink-800/20 bg-paper text-ink-800 hover:border-ink-800'
              }`}
            >
              <span className="flex items-center gap-2">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-[1.5px] border-ink-800 text-[12px] font-extrabold ${
                    active ? 'bg-sun-300 text-ink-900' : 'bg-teal-100 text-ink-900'
                  }`}
                >
                  {index + 1}
                </span>
                <span className="font-display text-[15px] font-bold leading-tight">{item.title}</span>
              </span>
              <span className={`text-[11.5px] font-semibold leading-snug ${active ? 'text-white/85' : 'text-ink-500'}`}>
                {item.subtitle}
              </span>
              <span className="flex flex-wrap gap-1">
                {Object.keys(SKILLS)
                  .filter((key) => item.sections.some((section) => section.skill === key))
                  .map((key) => (
                    <span key={key} className={`pill ${SKILLS[key].chip} text-ink-900`}>
                      {SKILLS[key].label}
                    </span>
                  ))}
                <span className="pill bg-white text-ink-900">{countQuestions(item.sections)} mục</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-extrabold text-ink-400">{test.pages}</span>
        {['all', ...skillsInTest].map((key) => {
          const Icon = key === 'all' ? GraduationCap : SKILLS[key].icon;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSkill(key)}
              className={`btn btn-sm ${skill === key ? 'btn-primary' : 'btn-soft'}`}
            >
              <Icon size={14} /> {key === 'all' ? 'Tất cả' : SKILLS[key].label}
            </button>
          );
        })}
      </div>

      {visibleSections.map((section, index) => (
        <SectionCard
          key={`${test.id}-${index}`}
          section={section}
          practice={practice}
          showVi={showVi}
        />
      ))}
    </section>
  );
}
