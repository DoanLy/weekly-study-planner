import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  Bot,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Circle,
  Coffee,
  Flag,
  Headphones,
  Languages,
  MessageSquareText,
  NotebookPen,
  Pencil,
  Plus,
  Search,
  Target,
  Trash2,
  TrendingUp,
} from 'lucide-react';

const DATA_STORAGE_KEY = 'weekly-study-planner-data';
const SELECTED_WEEK_STORAGE_KEY = 'weekly-study-planner-selected-week';
const SHEETS_ENDPOINT =
  'https://script.google.com/macros/s/AKfycbzVKJPjWGsQpMdF_LKW4Ix_md92kYfLJXafupLl3d8laqdxZo2vbaF4afmSkSuetZ5P/exec';

const INITIAL_DATA = {
  1: {
    tasks: {},
    globalNotes: '',
  },
};

const TOPICS = [
  { id: 'english', label: 'Tiếng Anh' },
  { id: 'auto', label: 'Auto' },
  { id: 'ielts', label: 'IELTS' },
];

const TRANSLATION_TASK = {
  time: '21:00 - 23:00',
  title: 'Dịch Anh-Việt & Việt-Anh',
  desc: 'Hội thoại công việc / Clip auto thầy Đảm / Phỏng vấn',
  color: 'bg-blue-100 text-blue-700 border-blue-200',
  icon: Languages,
};

const AUTO_TASKS = [
  {
    time: '10:00 - 12:00',
    title: 'Học auto',
    desc: '2 clip/ngày',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    icon: Bot,
  },
  {
    time: '13:00 - 17:00',
    title: 'Học auto',
    desc: '2 clip/ngày',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    icon: Bot,
  },
  {
    time: '20:00 - 22:00',
    title: 'Listen & Speak',
    desc: "Chép chính tả (clip 10', ghi từ mới) + Speak (1h)",
    color: 'bg-pink-100 text-pink-700 border-pink-200',
    icon: Headphones,
  },
];

const EXERCISE_TASKS = [
  {
    time: '10:00 - 12:00',
    title: 'Làm bài tập & Ôn bài cũ + mới',
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    icon: BookOpen,
  },
  {
    time: '13:00 - 16:00',
    title: 'Học clip thầy Tùng',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    icon: Headphones,
  },
  TRANSLATION_TASK,
];

const DAYS = [
  { id: 'mon', day: 'Thứ 2', enDay: 'Monday', tasks: EXERCISE_TASKS },
  { id: 'tue', day: 'Thứ 3', enDay: 'Tuesday', tasks: AUTO_TASKS },
  { id: 'wed', day: 'Thứ 4', enDay: 'Wednesday', tasks: EXERCISE_TASKS },
  { id: 'thu', day: 'Thứ 5', enDay: 'Thursday', tasks: AUTO_TASKS },
  { id: 'fri', day: 'Thứ 6', enDay: 'Friday', tasks: EXERCISE_TASKS },
  {
    id: 'sat',
    day: 'Thứ 7',
    enDay: 'Saturday',
    isWeekend: true,
    tasks: AUTO_TASKS,
  },
  {
    id: 'sun',
    day: 'Chủ Nhật',
    enDay: 'Sunday',
    isWeekend: true,
    tasks: [
      {
        time: 'Cả ngày',
        title: 'Nghỉ ngơi',
        desc: 'Tái tạo năng lượng cho tuần mới',
        color: 'bg-slate-100 text-slate-600 border-slate-200',
        icon: Coffee,
      },
    ],
  },
];

function parseStoredData(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function readSelectedWeek() {
  const selectedWeek = Number.parseInt(
    window.localStorage.getItem(SELECTED_WEEK_STORAGE_KEY) || '',
    10,
  );
  return Number.isInteger(selectedWeek) && selectedWeek >= 1 ? selectedWeek : 1;
}

function stripHtml(value) {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cloneData(data) {
  return JSON.parse(JSON.stringify(data || {}));
}

function setNestedValue(target, path, value) {
  let current = target;
  path.slice(0, -1).forEach((key) => {
    current[key] = current[key] || {};
    current = current[key];
  });
  current[path.at(-1)] = value;
}

function applyPatches(data, patches) {
  const nextData = cloneData(data);

  patches.forEach((patch) => {
    if (patch.type === 'set') {
      setNestedValue(nextData, patch.path, patch.value);
      return;
    }

    const weekData = nextData[patch.week] || {};
    const studyNotes = weekData.studyNotes || [];

    if (patch.type === 'prepend-study-note') {
      nextData[patch.week] = {
        ...weekData,
        studyNotes: studyNotes.some((note) => note.id === patch.note.id)
          ? studyNotes
          : [patch.note, ...studyNotes],
      };
      return;
    }

    if (patch.type === 'update-study-note') {
      nextData[patch.week] = {
        ...weekData,
        studyNotes: studyNotes.map((note) =>
          note.id === patch.noteId
            ? { ...note, [patch.field]: patch.value }
            : note,
        ),
      };
      return;
    }

    if (patch.type === 'delete-study-note') {
      nextData[patch.week] = {
        ...weekData,
        studyNotes: studyNotes.filter((note) => note.id !== patch.noteId),
      };
    }
  });

  return nextData;
}

function applyTextFormat(command, value) {
  document.execCommand(command, false, value);
}

function RichNoteCell({ value, placeholder, className = '', onChange }) {
  const elementRef = useRef(null);

  useEffect(() => {
    if (elementRef.current && elementRef.current.innerHTML !== value) {
      elementRef.current.innerHTML = value;
    }
  }, [value]);

  return (
    <div
      ref={elementRef}
      contentEditable
      data-placeholder={placeholder}
      onInput={(event) => onChange(event.currentTarget.innerHTML)}
      onBlur={(event) => onChange(event.currentTarget.innerHTML)}
      className={`rich-note-cell ${className}`}
      suppressContentEditableWarning
    />
  );
}

function App() {
  const [currentWeek, setCurrentWeek] = useState(readSelectedWeek);
  const [data, setData] = useState(INITIAL_DATA);
  const [syncStatus, setSyncStatus] = useState('Đang tải dữ liệu...');
  const [activeTab, setActiveTab] = useState('planner');
  const [expandedDays, setExpandedDays] = useState({});
  const hasLoadedRemoteData = useRef(false);
  const isSaving = useRef(false);
  const pendingPatches = useRef([]);
  const [syncRevision, setSyncRevision] = useState(0);
  const [selectedWeek, setSelectedWeek] = useState(() =>
    window.localStorage.getItem(SELECTED_WEEK_STORAGE_KEY),
  );
  const [searchText, setSearchText] = useState('');
  const [noteFilter, setNoteFilter] = useState('all');
  const [activeTopic, setActiveTopic] = useState('english');

  const weekData = data[currentWeek] || {};
  const taskData = weekData.tasks || {};
  const weekLabel = weekData.weekLabel ?? `Tuần ${currentWeek}`;
  const globalNotes = weekData.globalNotes || '';
  const studyNotes = weekData.studyNotes || [];

  const studyDays = useMemo(() => DAYS.filter((day) => day.id !== 'sun'), []);
  const studyTasks = useMemo(
    () =>
      studyDays.flatMap((day) =>
        day.tasks.map((task, taskIndex) => ({
          ...task,
          taskId: `${day.id}-${taskIndex}`,
          day: day.day,
          enDay: day.enDay,
        })),
      ),
    [studyDays],
  );

  const totalTasks = studyTasks.length;
  const completedTasks = studyTasks.filter(
    (task) => taskData[task.taskId]?.completed,
  ).length;
  const averageProgress = totalTasks
    ? Math.round(
        studyTasks.reduce(
          (sum, task) => sum + (taskData[task.taskId]?.progress || 0),
          0,
        ) / totalTasks,
      )
    : 0;
  const completionRate = totalTasks
    ? Math.round((completedTasks / totalTasks) * 100)
    : 0;
  const sessionNotes = studyTasks
    .map((task) => ({
      ...task,
      notes: taskData[task.taskId]?.notes?.trim() || '',
      progress: taskData[task.taskId]?.progress || 0,
      completed: Boolean(taskData[task.taskId]?.completed),
    }))
    .filter((task) => task.notes.length > 0);
  const dailyReports = studyDays.map((day) => {
    const dailyTasks = day.tasks.map(
      (_, taskIndex) => taskData[`${day.id}-${taskIndex}`] || {},
    );
    const completed = dailyTasks.filter((task) => task.completed).length;
    const average = dailyTasks.length
      ? Math.round(
          dailyTasks.reduce((sum, task) => sum + (task.progress || 0), 0) /
            dailyTasks.length,
        )
      : 0;

    return {
      id: day.id,
      day: day.day,
      enDay: day.enDay,
      completed,
      total: dailyTasks.length,
      average,
    };
  });

  const normalizedSearchText = searchText.trim().toLowerCase();
  const activeTopicLabel =
    TOPICS.find((topic) => topic.id === activeTopic)?.label || 'Tiếng Anh';
  const topicNotes = studyNotes.filter(
    (note) => (note.topic || 'english') === activeTopic,
  );
  const topicCounts = TOPICS.reduce(
    (counts, topic) => ({
      ...counts,
      [topic.id]: studyNotes.filter(
        (note) => (note.topic || 'english') === topic.id,
      ).length,
    }),
    { english: 0, auto: 0, ielts: 0 },
  );
  const visibleNotes = topicNotes.filter((note) => {
    const matchesSearch =
      !normalizedSearchText ||
      [note.main, note.note, note.related].some((value) =>
        stripHtml(value).toLowerCase().includes(normalizedSearchText),
      );
    const matchesFilter =
      noteFilter === 'all' ||
      (noteFilter === 'remembered' && note.remembered) ||
      (noteFilter === 'review' && !note.remembered);
    return matchesSearch && matchesFilter;
  });

  useEffect(() => {
    const localData = parseStoredData(
      window.localStorage.getItem(DATA_STORAGE_KEY),
    );
    if (localData) {
      setData(localData);
      setSyncStatus('Đang đồng bộ Google Sheets...');
    }

    const controller = new AbortController();
    fetch(`${SHEETS_ENDPOINT}?action=load`, { signal: controller.signal })
      .then((response) => response.json())
      .then((response) => {
        if (response.data && Object.keys(response.data).length > 0) {
          const latestData = applyPatches(
            response.data,
            pendingPatches.current,
          );
          setData(latestData);
          window.localStorage.setItem(
            DATA_STORAGE_KEY,
            JSON.stringify(latestData),
          );
        }
        setSyncStatus('');
      })
      .catch(() => {
        setSyncStatus(
          localData
            ? 'Mất kết nối, đang dùng dữ liệu trên máy'
            : 'Không tải được Google Sheets',
        );
      })
      .finally(() => {
        hasLoadedRemoteData.current = true;
        if (pendingPatches.current.length > 0) {
          setSyncRevision((revision) => revision + 1);
        }
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    window.localStorage.setItem(DATA_STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    if (
      !hasLoadedRemoteData.current ||
      pendingPatches.current.length === 0
    ) {
      return undefined;
    }

    const timeout = window.setTimeout(flushPendingPatches, 700);
    return () => window.clearTimeout(timeout);
  }, [syncRevision]);

  function queuePatches(...patches) {
    pendingPatches.current.push(...patches);
    setData((currentData) => applyPatches(currentData, patches));
    setSyncRevision((revision) => revision + 1);
  }

  async function flushPendingPatches() {
    if (
      isSaving.current ||
      !hasLoadedRemoteData.current ||
      pendingPatches.current.length === 0
    ) {
      return;
    }

    isSaving.current = true;
    setSyncStatus('Đang lưu Google Sheets...');
    const patchesToSave = pendingPatches.current.slice();

    try {
      const latestResponse = await fetch(`${SHEETS_ENDPOINT}?action=load`, {
        cache: 'no-store',
      });
      const latestPayload = await latestResponse.json();
      if (!latestResponse.ok || !latestPayload.ok) {
        throw new Error('Could not load the latest Google Sheets data.');
      }

      const mergedData = applyPatches(latestPayload.data, patchesToSave);
      const saveResponse = await fetch(SHEETS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ data: mergedData }),
      });
      const savePayload = await saveResponse.json();
      if (!saveResponse.ok || !savePayload.ok) {
        throw new Error('Could not save Google Sheets data.');
      }

      pendingPatches.current.splice(0, patchesToSave.length);
      const latestLocalData = applyPatches(
        mergedData,
        pendingPatches.current,
      );
      setData(latestLocalData);
      setSyncStatus('');

      if (pendingPatches.current.length > 0) {
        setSyncRevision((revision) => revision + 1);
      }
    } catch {
      setSyncStatus('Mất kết nối, đã lưu tạm trên máy');
    } finally {
      isSaving.current = false;
    }
  }

  function rememberCurrentWeek() {
    const nextSelectedWeek =
      selectedWeek === String(currentWeek) ? null : String(currentWeek);
    if (nextSelectedWeek === null) {
      window.localStorage.removeItem(SELECTED_WEEK_STORAGE_KEY);
    } else {
      window.localStorage.setItem(
        SELECTED_WEEK_STORAGE_KEY,
        nextSelectedWeek,
      );
    }
    setSelectedWeek(nextSelectedWeek);
  }

  function toggleDay(dayId) {
    setExpandedDays((currentDays) => ({
      ...currentDays,
      [dayId]: !currentDays[dayId],
    }));
  }

  function updateWeekLabel(value) {
    queuePatches({
      type: 'set',
      path: [String(currentWeek), 'weekLabel'],
      value,
    });
  }

  function updateTask(taskId, field, value) {
    queuePatches({
      type: 'set',
      path: [String(currentWeek), 'tasks', taskId, field],
      value,
    });
  }

  function toggleCompleted(taskId) {
    const currentTask = taskData[taskId] || {};
    const completed = !currentTask.completed;
    queuePatches(
      {
        type: 'set',
        path: [String(currentWeek), 'tasks', taskId, 'completed'],
        value: completed,
      },
      {
        type: 'set',
        path: [String(currentWeek), 'tasks', taskId, 'progress'],
        value: completed ? 100 : currentTask.progress || 0,
      },
    );
  }

  function updateGlobalNotes(value) {
    queuePatches({
      type: 'set',
      path: [String(currentWeek), 'globalNotes'],
      value,
    });
  }

  function addStudyNote() {
    const note = {
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      topic: activeTopic,
      main: '',
      note: '',
      related: '',
      remembered: false,
      createdAt: new Date().toISOString(),
    };
    queuePatches({
      type: 'prepend-study-note',
      week: String(currentWeek),
      note,
    });
  }

  function updateStudyNote(noteId, field, value) {
    queuePatches({
      type: 'update-study-note',
      week: String(currentWeek),
      noteId,
      field,
      value,
    });
  }

  function deleteStudyNote(noteId) {
    queuePatches({
      type: 'delete-study-note',
      week: String(currentWeek),
      noteId,
    });
  }

  const compactWeekLabelMatch = weekLabel.match(/^(.+?)\s*\((.+)\)$/);
  const compactWeekTitle = compactWeekLabelMatch?.[1] || weekLabel;
  const compactWeekDates = compactWeekLabelMatch?.[2] || '';
  const navigationTabs = [
    { id: 'planner', label: 'Lịch học', icon: CalendarDays },
    { id: 'report', label: 'Report tuần', icon: BarChart3 },
    { id: 'notes', label: 'Bảng Note', icon: Pencil },
  ];

  return (
    <div
      className={`min-h-screen font-sans text-slate-800 ${
        activeTab === 'notes'
          ? 'bg-slate-50'
          : 'bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-4 md:p-8'
      }`}
    >
      {activeTab !== 'notes' && (
        <>
          <header className="mx-auto mb-10 max-w-7xl text-center">
        <div className="mb-4 inline-flex items-center justify-center rounded-2xl bg-indigo-100 p-3 text-indigo-600 shadow-sm">
          <CalendarDays size={32} />
        </div>
        <h1 className="mb-3 overflow-visible bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text py-3 text-3xl font-extrabold leading-[1.18] tracking-tight text-transparent md:text-4xl lg:text-5xl">
          Weekly Study Planner
        </h1>
        {syncStatus && (
          <p className="text-sm font-semibold text-slate-500">{syncStatus}</p>
        )}

        <div className="mt-5 flex items-center justify-center gap-4">
          <button
            onClick={() => setCurrentWeek((week) => Math.max(1, week - 1))}
            disabled={currentWeek === 1}
            className="rounded-full bg-white p-2.5 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md disabled:opacity-30 disabled:hover:shadow-sm"
            aria-label="Tuần trước"
          >
            <ChevronLeft size={24} className="text-slate-600" />
          </button>

          <div className="group relative flex min-w-[240px] flex-col items-center rounded-2xl border border-slate-100 bg-white px-6 py-2.5 shadow-sm">
            <span className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-400">
              Tiến độ hiện tại
            </span>
            <input
              type="text"
              value={weekLabel}
              onChange={(event) => updateWeekLabel(event.target.value)}
              placeholder="VD: 25/05 - 31/05"
              title="Bấm vào để sửa ngày tháng"
              className="w-full rounded border-b-2 border-transparent bg-transparent pb-0.5 text-center text-2xl font-black text-indigo-900 transition-all hover:bg-slate-50 focus:border-indigo-400 focus:outline-none"
            />
            <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-500">
              <input
                type="checkbox"
                checked={selectedWeek === String(currentWeek)}
                onChange={rememberCurrentWeek}
                className="cursor-pointer accent-emerald-500"
              />
              Mở tuần này khi tải lại
            </label>
            <Pencil
              size={12}
              className="pointer-events-none absolute right-4 top-1/2 text-slate-500 opacity-0 transition-opacity group-hover:opacity-40"
            />
          </div>

          <button
            onClick={() => setCurrentWeek((week) => week + 1)}
            className="rounded-full bg-white p-2.5 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md"
            aria-label="Tuần sau"
          >
            <ChevronRight size={24} className="text-slate-600" />
          </button>
        </div>
          </header>

          <nav className="mx-auto mb-8 flex max-w-7xl justify-center">
            <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
              {navigationTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                      activeTab === tab.id
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon size={16} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </nav>
        </>
      )}

      {activeTab === 'planner' && (
        <>
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 md:grid-cols-2">
            {DAYS.map((day) => (
              <section
                key={day.id}
                className="flex flex-col rounded-3xl border border-slate-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <button
                  onClick={() => toggleDay(day.id)}
                  className={`${
                    expandedDays[day.id] ? 'mb-6 pb-4' : 'pb-0'
                  } flex items-end justify-between border-b border-slate-100 text-left transition-all hover:border-indigo-100`}
                >
                  <div>
                    <h2
                      className={`text-2xl font-bold ${
                        day.isWeekend ? 'text-rose-500' : 'text-slate-700'
                      }`}
                    >
                      {day.day}
                    </h2>
                    <p className="text-sm font-medium uppercase tracking-wider text-slate-400">
                      {day.enDay}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
                      {day.tasks.length} mục
                    </span>
                    {expandedDays[day.id] ? (
                      <ChevronUp size={20} className="text-slate-500" />
                    ) : (
                      <ChevronDown size={20} className="text-slate-500" />
                    )}
                  </div>
                </button>

                {expandedDays[day.id] && (
                  <div className="flex-1 space-y-4">
                    {day.tasks.map((task, taskIndex) => {
                      const taskId = `${day.id}-${taskIndex}`;
                      const status = taskData[taskId] || {
                        completed: false,
                        progress: 0,
                        notes: '',
                      };
                      const Icon = task.icon;

                      return (
                        <article
                          key={taskId}
                          className={`relative flex flex-col gap-2 rounded-2xl border bg-opacity-40 p-4 transition-all duration-300 hover:bg-opacity-60 ${
                            task.color
                          } ${
                            status.completed
                              ? 'border-slate-200 bg-slate-50 opacity-60 grayscale-[20%]'
                              : ''
                          }`}
                        >
                          <div className="mb-1 flex items-center justify-between">
                            <span
                              className={`inline-flex items-center rounded-full bg-white bg-opacity-80 px-2.5 py-0.5 text-xs font-bold shadow-sm ${
                                status.completed
                                  ? 'text-slate-500 line-through'
                                  : ''
                              }`}
                            >
                              {task.time}
                            </span>
                            <div className="flex items-center gap-3">
                              <Icon
                                size={18}
                                className={`opacity-70 ${
                                  status.completed ? 'text-slate-400' : ''
                                }`}
                              />
                              <button
                                onClick={() => toggleCompleted(taskId)}
                                className="transition-transform hover:scale-110 focus:outline-none"
                                title="Đánh dấu hoàn thành"
                                aria-label="Đánh dấu hoàn thành"
                              >
                                {status.completed ? (
                                  <CheckCircle2
                                    size={24}
                                    className="fill-emerald-100 text-emerald-500"
                                  />
                                ) : (
                                  <Circle
                                    size={24}
                                    className="text-slate-400 transition-colors hover:text-emerald-500"
                                  />
                                )}
                              </button>
                            </div>
                          </div>

                          <div
                            className={
                              status.completed
                                ? 'text-slate-500 line-through'
                                : ''
                            }
                          >
                            <h3 className="mb-1 text-[15px] font-bold leading-tight">
                              {task.title}
                            </h3>
                            {task.desc && (
                              <p className="text-sm leading-snug opacity-80">
                                {task.desc}
                              </p>
                            )}
                          </div>

                          {day.id !== 'sun' && (
                            <div className="mt-1 border-t border-slate-200/50 pt-2">
                              <div className="flex items-center gap-1.5 py-1 text-[13px] font-semibold text-slate-600">
                                <Pencil size={14} />
                                Tiến độ & Ghi chú
                              </div>
                              <div className="mt-3 space-y-3 rounded-xl border border-white bg-white/70 p-3 shadow-sm">
                                <div className="flex items-center gap-3">
                                  <label className="w-16 text-xs font-bold text-slate-700">
                                    Tiến độ:
                                  </label>
                                  <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="5"
                                    value={status.progress || 0}
                                    onChange={(event) =>
                                      updateTask(
                                        taskId,
                                        'progress',
                                        Number.parseInt(event.target.value, 10),
                                      )
                                    }
                                    className="h-1.5 flex-1 cursor-pointer appearance-none rounded-lg bg-slate-200 accent-emerald-500"
                                  />
                                  <span className="w-10 rounded-md bg-emerald-50 px-1.5 py-0.5 text-right text-xs font-bold text-emerald-600">
                                    {status.progress || 0}%
                                  </span>
                                </div>
                                <textarea
                                  placeholder="Bạn đã hoàn thành đến đâu? Có từ vựng nào cần nhớ không..."
                                  value={status.notes || ''}
                                  onChange={(event) =>
                                    updateTask(taskId, 'notes', event.target.value)
                                  }
                                  className="w-full resize-none rounded-lg border border-slate-200 bg-white p-2.5 text-sm placeholder-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                  rows={2}
                                />
                              </div>
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            ))}
          </div>

          <div className="mx-auto mt-10 max-w-7xl">
            <div className="group relative overflow-hidden rounded-3xl border-2 border-dashed border-amber-200 bg-amber-50 p-6 md:p-8">
              <div className="absolute right-0 top-0 p-6 opacity-10 transition-opacity group-hover:opacity-20">
                <Target size={120} />
              </div>
              <div className="relative z-10 flex flex-col gap-8 lg:flex-row">
                <div className="flex-1">
                  <h3 className="mb-4 flex items-center gap-2 text-xl font-extrabold text-amber-800">
                    <Flag className="text-amber-600" />
                    Mục tiêu cố định
                  </h3>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3 text-amber-900">
                      <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500" />
                      <p>
                        <strong>Speak:</strong> Vẫn là câu hỏi PV, tập trung luyện
                        thuyết trình về nó cho thật trôi chảy.
                      </p>
                    </li>
                  </ul>
                </div>

                <div className="flex-1 rounded-2xl border border-amber-200 bg-white/60 p-5 shadow-sm backdrop-blur-sm">
                  <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-amber-800">
                    <MessageSquareText size={18} className="text-amber-600" />
                    Tổng kết {weekData.weekLabel || `Tuần ${currentWeek}`}
                  </h3>
                  <textarea
                    value={globalNotes}
                    onChange={(event) => updateGlobalNotes(event.target.value)}
                    placeholder="Tuần này bạn cảm thấy thế nào? Cần cải thiện thêm kỹ năng gì vào tuần sau?..."
                    className="h-24 w-full resize-none rounded-xl border border-amber-200 bg-white/80 p-3 text-sm placeholder-amber-700/40 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'report' && (
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
              <div className="mb-4 inline-flex rounded-2xl bg-emerald-100 p-3 text-emerald-600">
                <CheckCircle2 size={26} />
              </div>
              <p className="text-sm font-bold uppercase tracking-wider text-slate-400">
                Hoàn thành
              </p>
              <p className="mt-1 text-4xl font-black text-slate-800">
                {completedTasks}/{totalTasks}
              </p>
              <p className="mt-2 text-sm font-semibold text-emerald-700">
                {completionRate}% số buổi học
              </p>
            </div>
            <div className="rounded-3xl border border-indigo-100 bg-white p-6 shadow-sm">
              <div className="mb-4 inline-flex rounded-2xl bg-indigo-100 p-3 text-indigo-600">
                <TrendingUp size={26} />
              </div>
              <p className="text-sm font-bold uppercase tracking-wider text-slate-400">
                Tiến độ trung bình
              </p>
              <p className="mt-1 text-4xl font-black text-slate-800">
                {averageProgress}%
              </p>
              <div className="mt-4 h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-indigo-500"
                  style={{ width: `${averageProgress}%` }}
                />
              </div>
            </div>
            <div className="rounded-3xl border border-amber-100 bg-white p-6 shadow-sm">
              <div className="mb-4 inline-flex rounded-2xl bg-amber-100 p-3 text-amber-600">
                <NotebookPen size={26} />
              </div>
              <p className="text-sm font-bold uppercase tracking-wider text-slate-400">
                Ghi chú học tập
              </p>
              <p className="mt-1 text-4xl font-black text-slate-800">
                {sessionNotes.length}
              </p>
              <p className="mt-2 text-sm font-semibold text-amber-700">
                mục có ghi chú trong tuần
              </p>
            </div>
          </div>

          <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm md:p-8">
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-800">
                  Report {weekLabel}
                </h2>
                <p className="text-sm font-semibold text-slate-500">
                  Tổng hợp tiến độ theo từng ngày học
                </p>
              </div>
              <span className="rounded-full bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-700">
                {completionRate >= 80
                  ? 'Tuần rất tốt'
                  : completionRate >= 50
                    ? 'Đang đi đúng hướng'
                    : 'Cần tăng tốc'}
              </span>
            </div>
            <div className="space-y-4">
              {dailyReports.map((report) => (
                <div
                  key={report.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                >
                  <div className="mb-3 flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-800">
                        {report.day}
                      </h3>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        {report.enDay}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-700">
                        {report.completed}/{report.total} hoàn thành
                      </p>
                      <p className="text-sm font-bold text-indigo-600">
                        {report.average}% tiến độ
                      </p>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-white">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500"
                      style={{ width: `${report.average}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-xl font-black text-slate-800">
                <MessageSquareText size={20} className="text-indigo-600" />
                Ghi chú theo buổi
              </h2>
              {sessionNotes.length > 0 ? (
                <div className="space-y-3">
                  {sessionNotes.map((note) => (
                    <div
                      key={note.taskId}
                      className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="font-bold text-slate-800">
                          {note.day} - {note.title}
                        </p>
                        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-indigo-600">
                          {note.progress}%
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed text-slate-600">
                        {note.notes}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                  Chưa có ghi chú chi tiết nào trong tuần này.
                </p>
              )}
            </section>

            <section className="rounded-3xl border border-amber-100 bg-amber-50 p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-xl font-black text-amber-900">
                <Target size={22} className="text-amber-600" />
                Tổng kết tuần
              </h2>
              <div className="min-h-32 rounded-2xl border border-amber-200 bg-white/70 p-4 text-sm leading-relaxed text-amber-950">
                {globalNotes ||
                  'Chưa có tổng kết tuần. Bạn có thể quay lại Lịch học để nhập phần tổng kết.'}
              </div>
            </section>
          </div>
        </div>
      )}

      {activeTab === 'notes' && (
        <>
          <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between md:px-8">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-indigo-100 p-3 text-indigo-600">
                  <CalendarDays size={28} />
                </div>
                <h1 className="text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
                  Weekly Study Planner
                </h1>
              </div>

              <div className="flex min-w-[260px] items-center justify-between rounded-full border border-slate-200 bg-slate-50 px-4 py-2">
                <button
                  onClick={() =>
                    setCurrentWeek((week) => Math.max(1, week - 1))
                  }
                  disabled={currentWeek === 1}
                  className="rounded-full p-1 text-slate-600 transition-colors hover:bg-white disabled:opacity-30"
                  aria-label="Tuần trước"
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="px-3 text-center">
                  <p className="text-sm font-black text-indigo-600">
                    {compactWeekTitle}
                  </p>
                  {compactWeekDates && (
                    <p className="text-xs font-medium text-slate-500">
                      {compactWeekDates}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setCurrentWeek((week) => week + 1)}
                  className="rounded-full p-1 text-slate-600 transition-colors hover:bg-white"
                  aria-label="Tuần sau"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            <nav className="mx-auto flex max-w-[1600px] overflow-x-auto px-4 md:px-8">
              {navigationTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-4 text-sm font-bold transition-colors ${
                      activeTab === tab.id
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                        : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                  >
                    <Icon size={18} />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </header>

          <main className="p-4 md:p-8">
            <section className="mx-auto max-w-[1600px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 pt-5 md:px-8">
                <div className="flex flex-wrap gap-6">
                  {TOPICS.map((topic) => (
                    <button
                      key={topic.id}
                      onClick={() => setActiveTopic(topic.id)}
                      className={`relative flex items-center gap-2 pb-4 text-sm font-bold transition-colors ${
                        activeTopic === topic.id
                          ? 'text-indigo-600'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {topic.label}
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${
                          activeTopic === topic.id
                            ? 'bg-indigo-100 text-indigo-600'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {topicCounts[topic.id]}
                      </span>
                      {activeTopic === topic.id && (
                        <span className="absolute inset-x-0 bottom-0 h-0.5 bg-indigo-600" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-b border-slate-200 px-5 py-6 md:px-7">
                <div className="relative">
                  <Search
                    size={19}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    placeholder={`Tìm trong ${activeTopicLabel}...`}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="inline-flex w-fit items-center rounded-xl border border-slate-200 bg-slate-50 px-2 py-1">
                    <button
                      onMouseDown={(event) => {
                        event.preventDefault();
                        applyTextFormat('foreColor', '#dc2626');
                      }}
                      className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-white"
                      title="Tô chữ đỏ cho phần đang chọn"
                    >
                      <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                      Đỏ
                    </button>
                    <button
                      onMouseDown={(event) => {
                        event.preventDefault();
                        applyTextFormat('hiliteColor', '#fef08a');
                      }}
                      className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-white"
                      title="Highlight phần đang chọn"
                    >
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                      Highlight
                    </button>
                    <div className="mx-1 h-4 w-px bg-slate-200" />
                    <button
                      onMouseDown={(event) => {
                        event.preventDefault();
                        applyTextFormat('removeFormat');
                      }}
                      className="rounded-lg px-2.5 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-white"
                      title="Bỏ định dạng phần đang chọn"
                    >
                      Bỏ màu
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <span className="text-sm font-black text-slate-800">
                      {visibleNotes.length}/{topicNotes.length} dòng
                    </span>
                    <button
                      onClick={addStudyNote}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-indigo-700"
                    >
                      <Plus size={18} />
                      Thêm note
                    </button>
                  </div>
                </div>
              </div>

              <div className="hidden grid-cols-[1.05fr_1.05fr_0.9fr_64px] border-b border-slate-200 bg-slate-50 text-sm font-black text-slate-700 md:grid">
                <div className="px-8 py-4">Nội dung chính</div>
                <div className="px-8 py-4">Ghi chú / Giải thích</div>
                <div className="px-8 py-4">Bổ sung</div>
                <div />
              </div>

              {visibleNotes.length > 0 ? (
                <div className="divide-y divide-slate-200">
                  {visibleNotes.map((note) => (
                    <div
                      key={note.id}
                      className="group grid grid-cols-1 md:grid-cols-[1.05fr_1.05fr_0.9fr_64px]"
                    >
                      {[
                        {
                          field: 'main',
                          label: 'Nội dung chính',
                          placeholder: 'VD: please let me know...',
                          className: 'font-semibold text-slate-900',
                        },
                        {
                          field: 'note',
                          label: 'Ghi chú / Giải thích',
                          placeholder: 'Nghĩa, ngữ cảnh, cách dùng...',
                          className: 'text-slate-700',
                        },
                        {
                          field: 'related',
                          label: 'Bổ sung',
                          placeholder: 'related to / regarding / about...',
                          className: 'text-slate-700',
                        },
                      ].map((cell) => (
                        <div key={cell.field} className="px-5 py-4 md:px-8">
                          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400 md:hidden">
                            {cell.label}
                          </label>
                          <RichNoteCell
                            value={note[cell.field]}
                            onChange={(value) =>
                              updateStudyNote(note.id, cell.field, value)
                            }
                            placeholder={cell.placeholder}
                            className={`min-h-16 w-full rounded-lg border border-transparent bg-transparent p-1 text-[15px] leading-relaxed outline-none transition-all hover:bg-slate-50 focus:border-indigo-200 focus:bg-white focus:ring-2 focus:ring-indigo-100 ${cell.className}`}
                          />
                        </div>
                      ))}

                      <div className="flex items-center justify-end gap-1 px-5 pb-4 md:flex-col md:justify-center md:px-2 md:py-4">
                        <button
                          onClick={() =>
                            updateStudyNote(
                              note.id,
                              'remembered',
                              !note.remembered,
                            )
                          }
                          className={`rounded-full p-2 transition-all md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100 ${
                            note.remembered
                              ? 'text-emerald-600 hover:bg-emerald-50'
                              : 'text-amber-600 hover:bg-amber-50'
                          }`}
                          title={note.remembered ? 'Đã nhớ' : 'Cần ôn'}
                          aria-label={note.remembered ? 'Đã nhớ' : 'Cần ôn'}
                        >
                          {note.remembered ? (
                            <CheckCircle2 size={17} />
                          ) : (
                            <Circle size={17} />
                          )}
                        </button>
                        <button
                          onClick={() => deleteStudyNote(note.id)}
                          className="rounded-full p-2 text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-600"
                          title="Xóa note"
                          aria-label="Xóa note"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <div className="mx-auto mb-4 inline-flex rounded-2xl bg-indigo-50 p-4 text-indigo-500">
                    <NotebookPen size={32} />
                  </div>
                  <p className="text-lg font-black text-slate-800">
                    Chưa có note nào trong {activeTopicLabel}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Bấm "Thêm note" để bắt đầu ghi lại các ý cần xem dần.
                  </p>
                </div>
              )}
            </section>
          </main>
        </>
      )}
    </div>
  );
}

export default App;
