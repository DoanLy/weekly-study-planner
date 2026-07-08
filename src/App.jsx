import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  Bot,
  CalendarCheck,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  Code2,
  Expand,
  GraduationCap,
  Headphones,
  Languages,
  LayoutDashboard,
  ListChecks,
  Menu,
  Mic,
  NotebookPen,
  Plus,
  RefreshCw,
  Settings,
  SlidersHorizontal,
  Sparkles,
  StickyNote,
  Trash2,
  WandSparkles,
  X,
} from 'lucide-react';

const DATA_STORAGE_KEY = 'weekly-study-planner-data';
const SHEETS_ENDPOINT =
  'https://script.google.com/macros/s/AKfycbzVKJPjWGsQpMdF_LKW4Ix_md92kYfLJXafupLl3d8laqdxZo2vbaF4afmSkSuetZ5P/exec';

const INITIAL_DATE = new Date(2026, 6, 8);
const VIETNAMESE_DAYS = [
  'Chủ Nhật',
  'Thứ Hai',
  'Thứ Ba',
  'Thứ Tư',
  'Thứ Năm',
  'Thứ Sáu',
  'Thứ Bảy',
];
const ENGLISH_DAYS = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
];
const WEEKDAY_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const EMPTY_DATA = {
  dailyTasks: {},
  legacyWeeks: null,
};

const THEME_STYLES = {
  orange: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-700',
    accent: 'text-orange-500',
    badge: 'bg-orange-100 text-orange-700 border-orange-200',
  },
  purple: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-700',
    accent: 'text-purple-500',
    badge: 'bg-purple-100 text-purple-700 border-purple-200',
  },
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    accent: 'text-blue-500',
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  teal: {
    bg: 'bg-teal-50',
    border: 'border-teal-200',
    text: 'text-teal-700',
    accent: 'text-teal-500',
    badge: 'bg-teal-100 text-teal-700 border-teal-200',
  },
  slate: {
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    text: 'text-slate-700',
    accent: 'text-slate-500',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
  },
};

const ICONS = {
  book: BookOpen,
  headphones: Headphones,
  code: Code2,
  mic: Mic,
  language: Languages,
  bot: Bot,
  graduation: GraduationCap,
};

function parseStoredData(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function normalizeData(value) {
  if (!value || typeof value !== 'object') return EMPTY_DATA;

  if (value.dailyTasks && typeof value.dailyTasks === 'object') {
    return {
      ...EMPTY_DATA,
      ...value,
      dailyTasks: value.dailyTasks,
    };
  }

  return {
    dailyTasks: {},
    legacyWeeks: value,
  };
}

function formatDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateString(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function isSameDate(left, right) {
  return formatDateString(left) === formatDateString(right);
}

function buildTimeString(start, end) {
  if (start && end) return `${start} - ${end}`;
  return start || end || '';
}

function createTask(partial) {
  return {
    id: `task-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title: '',
    time: '',
    note: '',
    completed: false,
    theme: 'blue',
    icon: 'graduation',
    ...partial,
  };
}

function getDefaultTasks(date) {
  const dateStr = formatDateString(date);
  const day = date.getDay();

  if ([1, 3, 5].includes(day)) {
    return [
      createTask({
        id: `default-exercise-${dateStr}-1`,
        title: 'Làm bài tập & Ôn bài cũ + mới',
        time: '10:00 - 12:00',
        theme: 'orange',
        icon: 'book',
      }),
      createTask({
        id: `default-exercise-${dateStr}-2`,
        title: 'Học clip thầy Tùng',
        time: '13:00 - 16:00',
        theme: 'purple',
        icon: 'headphones',
      }),
      createTask({
        id: `default-translation-${dateStr}`,
        title: 'Dịch Anh-Việt & Việt-Anh',
        time: '21:00 - 23:00',
        theme: 'blue',
        icon: 'language',
      }),
    ];
  }

  if ([2, 4, 6].includes(day)) {
    return [
      createTask({
        id: `default-auto-${dateStr}-1`,
        title: 'Học auto',
        time: '10:00 - 12:00',
        theme: 'teal',
        icon: 'bot',
      }),
      createTask({
        id: `default-auto-${dateStr}-2`,
        title: 'Học auto',
        time: '13:00 - 17:00',
        theme: 'teal',
        icon: 'bot',
      }),
      createTask({
        id: `default-listen-${dateStr}`,
        title: 'Listen & Speak',
        time: '20:00 - 22:00',
        theme: 'purple',
        icon: 'headphones',
      }),
    ];
  }

  return [
    createTask({
      id: `default-rest-${dateStr}`,
      title: 'Nghỉ ngơi',
      time: 'Cả ngày',
      theme: 'slate',
      icon: 'graduation',
    }),
  ];
}

function getTasksForDate(data, date) {
  const dateStr = formatDateString(date);
  return data.dailyTasks[dateStr] || getDefaultTasks(date);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function parseInlineMarkdown(text) {
  return escapeHtml(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

function formatNoteHtml(text) {
  if (!text) return '';
  const lines = text.split('\n');
  let listOpen = false;
  let html = '';

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      if (listOpen) {
        html += '</ul>';
        listOpen = false;
      }
      html += '<br />';
      return;
    }

    if (trimmed.startsWith('- ')) {
      if (!listOpen) {
        html += '<ul class="list-disc pl-5 space-y-1">';
        listOpen = true;
      }
      html += `<li>${parseInlineMarkdown(trimmed.slice(2))}</li>`;
      return;
    }

    if (listOpen) {
      html += '</ul>';
      listOpen = false;
    }
    html += `<p>${parseInlineMarkdown(trimmed)}</p>`;
  });

  if (listOpen) html += '</ul>';
  return html;
}

function getCalendarCells(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const prevLastDay = new Date(year, month, 0).getDate();
  const cells = [];

  for (let index = firstDayIndex; index > 0; index -= 1) {
    cells.push({
      key: `prev-${index}`,
      day: prevLastDay - index + 1,
      date: new Date(year, month - 1, prevLastDay - index + 1),
      muted: true,
    });
  }

  for (let day = 1; day <= lastDay; day += 1) {
    cells.push({
      key: `current-${day}`,
      day,
      date: new Date(year, month, day),
      muted: false,
    });
  }

  const remainingCells = (7 - (cells.length % 7)) % 7;
  for (let day = 1; day <= remainingCells; day += 1) {
    cells.push({
      key: `next-${day}`,
      day,
      date: new Date(year, month + 1, day),
      muted: true,
    });
  }

  return cells;
}

function getTaskStats(tasks) {
  const completed = tasks.filter((task) => task.completed).length;
  const total = tasks.length;
  return {
    completed,
    total,
    percent: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

function App() {
  const [data, setData] = useState(() =>
    normalizeData(parseStoredData(window.localStorage.getItem(DATA_STORAGE_KEY))),
  );
  const [activeView, setActiveView] = useState('dashboard');
  const [currentDate, setCurrentDate] = useState(INITIAL_DATE);
  const [selectedDate, setSelectedDate] = useState(INITIAL_DATE);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [fullNoteTaskId, setFullNoteTaskId] = useState(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [syncStatus, setSyncStatus] = useState('');
  const [toast, setToast] = useState('');
  const [editingNotes, setEditingNotes] = useState({});
  const [newTask, setNewTask] = useState({
    title: '',
    start: '',
    end: '',
    theme: 'orange',
    icon: 'book',
    note: '',
  });
  const [bulkTask, setBulkTask] = useState(() => {
    const today = formatDateString(new Date());
    const later = new Date();
    later.setMonth(later.getMonth() + 1);
    return {
      startDate: today,
      endDate: formatDateString(later),
      weekdays: [1, 3, 5],
      title: '',
      start: '',
      end: '',
      theme: 'blue',
    };
  });
  const pendingSave = useRef(null);
  const hasLoadedRemote = useRef(false);

  const selectedDateKey = formatDateString(selectedDate);
  const selectedTasks = useMemo(
    () => getTasksForDate(data, selectedDate),
    [data, selectedDate],
  );
  const selectedStats = getTaskStats(selectedTasks);
  const calendarCells = useMemo(() => getCalendarCells(currentDate), [currentDate]);
  const todayLabel = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const allStoredTasks = useMemo(() => {
    return Object.entries(data.dailyTasks)
      .flatMap(([date, tasks]) => tasks.map((task) => ({ ...task, date })))
      .sort((left, right) => left.date.localeCompare(right.date));
  }, [data.dailyTasks]);
  const allNotes = allStoredTasks.filter((task) => task.note?.trim());
  const globalCompleted = allStoredTasks.filter((task) => task.completed).length;
  const incompleteSelected = selectedTasks.filter((task) => !task.completed).length;
  const weekStats = useMemo(() => {
    let total = 0;
    let completed = 0;
    for (let offset = -3; offset <= 3; offset += 1) {
      const date = new Date(selectedDate);
      date.setDate(date.getDate() + offset);
      const tasks = getTasksForDate(data, date);
      const stats = getTaskStats(tasks);
      total += stats.total;
      completed += stats.completed;
    }
    return {
      total,
      completed,
      percent: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [data, selectedDate]);

  useEffect(() => {
    const controller = new AbortController();
    setSyncStatus('Đang đồng bộ Google Sheets...');

    fetch(`${SHEETS_ENDPOINT}?action=load`, { signal: controller.signal })
      .then((response) => response.json())
      .then((payload) => {
        if (payload.data && Object.keys(payload.data).length > 0) {
          const remoteData = normalizeData(payload.data);
          setData(remoteData);
          window.localStorage.setItem(DATA_STORAGE_KEY, JSON.stringify(remoteData));
        }
        setSyncStatus('');
      })
      .catch(() => {
        setSyncStatus('Mất kết nối, đang dùng dữ liệu trên máy');
      })
      .finally(() => {
        hasLoadedRemote.current = true;
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    window.localStorage.setItem(DATA_STORAGE_KEY, JSON.stringify(data));

    if (!hasLoadedRemote.current) return undefined;
    window.clearTimeout(pendingSave.current);
    pendingSave.current = window.setTimeout(() => {
      setSyncStatus('Đang lưu Google Sheets...');
      fetch(SHEETS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ data }),
      })
        .then((response) => {
          if (!response.ok) throw new Error('Save failed');
          return response.json();
        })
        .then((payload) => {
          if (!payload.ok) throw new Error('Save failed');
          setSyncStatus('');
        })
        .catch(() => {
          setSyncStatus('Đã lưu tạm trên máy, chưa đồng bộ được Google Sheets');
        });
    }, 700);

    return () => window.clearTimeout(pendingSave.current);
  }, [data]);

  function showToast(message) {
    setToast(message);
    window.clearTimeout(showToast.timeoutId);
    showToast.timeoutId = window.setTimeout(() => setToast(''), 2800);
  }

  function saveTasksForDate(dateKey, tasks) {
    setData((current) => ({
      ...current,
      dailyTasks: {
        ...current.dailyTasks,
        [dateKey]: tasks,
      },
    }));
  }

  function updateTask(taskId, patch) {
    const tasks = getTasksForDate(data, selectedDate).map((task) =>
      task.id === taskId ? { ...task, ...patch } : task,
    );
    saveTasksForDate(selectedDateKey, tasks);
  }

  function deleteTask(taskId) {
    const tasks = getTasksForDate(data, selectedDate).filter(
      (task) => task.id !== taskId,
    );
    saveTasksForDate(selectedDateKey, tasks);
    showToast('Nhiệm vụ đã được gỡ bỏ.');
  }

  function resetToDefaults() {
    setData((current) => {
      const nextTasks = { ...current.dailyTasks };
      delete nextTasks[selectedDateKey];
      return { ...current, dailyTasks: nextTasks };
    });
    setEditingNotes({});
    showToast('Đã khôi phục thời khóa biểu mẫu cho ngày này.');
  }

  function clearAllData() {
    if (!window.confirm('Bạn có chắc chắn muốn xóa tất cả dữ liệu đã lưu?')) {
      return;
    }
    setData(EMPTY_DATA);
    setEditingNotes({});
    showToast('Đã xóa sạch dữ liệu lưu trữ.');
  }

  function addTask(event) {
    event.preventDefault();
    const task = createTask({
      title: newTask.title,
      time: buildTimeString(newTask.start, newTask.end),
      note: newTask.note,
      theme: newTask.theme,
      icon: newTask.icon,
    });
    saveTasksForDate(selectedDateKey, [...getTasksForDate(data, selectedDate), task]);
    setNewTask({
      title: '',
      start: '',
      end: '',
      theme: 'orange',
      icon: 'book',
      note: '',
    });
    setAddModalOpen(false);
    showToast('Đã thêm nhiệm vụ học tập mới.');
  }

  function applyBulkSchedule(event) {
    event.preventDefault();
    if (bulkTask.weekdays.length === 0) {
      showToast('Vui lòng chọn ít nhất một thứ trong tuần.');
      return;
    }

    const start = parseDateString(bulkTask.startDate);
    const end = parseDateString(bulkTask.endDate);
    if (end < start) {
      showToast('Ngày kết thúc không thể nhỏ hơn ngày bắt đầu.');
      return;
    }

    let applied = 0;
    const dailyTasks = { ...data.dailyTasks };
    const cursor = new Date(start);
    while (cursor <= end) {
      if (bulkTask.weekdays.includes(cursor.getDay())) {
        const dateKey = formatDateString(cursor);
        const tasks = dailyTasks[dateKey] || getDefaultTasks(cursor);
        dailyTasks[dateKey] = [
          ...tasks,
          createTask({
            title: bulkTask.title,
            time: buildTimeString(bulkTask.start, bulkTask.end),
            theme: bulkTask.theme,
            icon: ['orange', 'purple'].includes(bulkTask.theme) ? 'mic' : 'code',
          }),
        ];
        applied += 1;
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    setData((current) => ({ ...current, dailyTasks }));
    setBulkTask((current) => ({ ...current, title: '', start: '', end: '' }));
    showToast(`Đã thêm tự động ${applied} nhiệm vụ học tập.`);
  }

  function selectDate(date, view = 'tasks') {
    setSelectedDate(date);
    setCurrentDate(new Date(date.getFullYear(), date.getMonth(), 1));
    setActiveView(view);
    setMobileMenuOpen(false);
  }

  function changeMonth(direction) {
    setCurrentDate((date) => new Date(date.getFullYear(), date.getMonth() + direction, 1));
  }

  function openFullNote(task) {
    setFullNoteTaskId(task.id);
    setNoteDraft(task.note || '');
  }

  function saveFullNote() {
    if (!fullNoteTaskId) return;
    updateTask(fullNoteTaskId, { note: noteDraft });
    setFullNoteTaskId(null);
    setNoteDraft('');
    showToast('Đã lưu ghi chú.');
  }

  function refineNote(taskId) {
    const task = selectedTasks.find((item) => item.id === taskId);
    if (!task?.note?.trim()) {
      showToast('Hãy viết ghi chú trước khi tối ưu.');
      return;
    }

    const refined = task.note
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => (line.startsWith('- ') ? line : `- ${line}`))
      .join('\n');
    updateTask(taskId, { note: refined });
    showToast('Đã định dạng ghi chú thành dạng gạch đầu dòng.');
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'calendar', label: 'Calendar', icon: CalendarDays },
    { id: 'tasks', label: 'Tasks', icon: ListChecks, badge: incompleteSelected },
    { id: 'notes', label: 'Notes', icon: StickyNote },
    { id: 'settings', label: 'Settings', icon: SlidersHorizontal },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 md:flex">
      <aside className="sticky top-0 z-30 flex w-full shrink-0 flex-col border-b border-slate-200 bg-white md:h-screen md:w-64 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between border-b border-slate-100 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white shadow-md shadow-blue-500/20">
              S
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight text-slate-800">
                StudyFlow
              </h1>
              <p className="text-xs font-medium text-slate-400">
                Planned Progress
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 md:hidden"
            aria-label="Mở menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav
          className={`flex-grow flex-col gap-1 overflow-y-auto p-4 ${mobileMenuOpen ? 'flex' : 'hidden md:flex'}`}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveView(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`relative flex items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                <span
                  className={`absolute left-0 top-1/4 bottom-1/4 w-1 rounded-r bg-blue-600 ${
                    active ? 'opacity-100' : 'opacity-0'
                  }`}
                />
                <Icon size={18} className="w-5" />
                {item.label}
                {item.badge > 0 && (
                  <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="hidden border-t border-slate-100 p-4 md:block">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Hôm nay là
            </p>
            <p className="mt-1 text-xs font-bold text-slate-700">{todayLabel}</p>
            <p className="mt-1 text-[10px] font-bold text-blue-600">
              {globalCompleted} mục đã hoàn thành
            </p>
          </div>
        </div>
      </aside>

      <main className="h-screen flex-grow overflow-y-auto p-4 md:p-8">
        {activeView === 'dashboard' && (
          <DashboardView
            calendarCells={calendarCells}
            currentDate={currentDate}
            data={data}
            selectedDate={selectedDate}
            syncStatus={syncStatus}
            weekStats={weekStats}
            changeMonth={changeMonth}
            selectDate={selectDate}
            setActiveView={setActiveView}
          />
        )}

        {activeView === 'calendar' && (
          <CalendarView
            calendarCells={calendarCells}
            currentDate={currentDate}
            data={data}
            selectedDate={selectedDate}
            changeMonth={changeMonth}
            selectDate={selectDate}
          />
        )}

        {activeView === 'tasks' && (
          <TasksView
            date={selectedDate}
            editingNotes={editingNotes}
            selectedStats={selectedStats}
            tasks={selectedTasks}
            deleteTask={deleteTask}
            openAddTask={() => setAddModalOpen(true)}
            openFullNote={openFullNote}
            refineNote={refineNote}
            resetToDefaults={resetToDefaults}
            setActiveView={setActiveView}
            setEditingNotes={setEditingNotes}
            updateTask={updateTask}
          />
        )}

        {activeView === 'notes' && (
          <NotesView notes={allNotes} selectDate={selectDate} />
        )}

        {activeView === 'settings' && (
          <SettingsView
            bulkTask={bulkTask}
            clearAllData={clearAllData}
            setBulkTask={setBulkTask}
            submit={applyBulkSchedule}
          />
        )}
      </main>

      {addModalOpen && (
        <AddTaskModal
          newTask={newTask}
          setNewTask={setNewTask}
          close={() => setAddModalOpen(false)}
          submit={addTask}
        />
      )}

      {fullNoteTaskId && (
        <FullNoteModal
          draft={noteDraft}
          setDraft={setNoteDraft}
          close={() => setFullNoteTaskId(null)}
          save={saveFullNote}
        />
      )}

      <div
        className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-xl transition-all ${
          toast
            ? 'translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-12 opacity-0'
        }`}
      >
        {toast}
      </div>
    </div>
  );
}

function DashboardView({
  calendarCells,
  currentDate,
  data,
  selectedDate,
  syncStatus,
  weekStats,
  changeMonth,
  selectDate,
  setActiveView,
}) {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            Chào mừng quay trở lại, Học viên!
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Tiến trình học tập thông minh & phân tích hiệu quả IELTS, Auto và
            ghi chú.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <span>{syncStatus || 'Hệ thống đang hoạt động ổn định'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm md:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 p-5">
            <div className="flex items-center gap-2">
              <CalendarCheck size={20} className="text-blue-600" />
              <span className="text-base font-bold text-slate-700">
                {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
              </span>
            </div>
            <MonthControls changeMonth={changeMonth} />
          </div>
          <MiniCalendar
            cells={calendarCells}
            data={data}
            selectedDate={selectedDate}
            selectDate={selectDate}
          />
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/30 p-5">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-blue-100 bg-blue-50">
                <span className="text-sm font-bold text-blue-600">
                  {weekStats.percent}%
                </span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-700">
                  Tiến độ tổng quan
                </h4>
                <p className="mt-0.5 text-xs text-slate-400">
                  {weekStats.completed}/{weekStats.total} mục trong tuần này
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveView('tasks')}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-blue-600 shadow-sm transition-all hover:bg-slate-50"
            >
              Xem chi tiết
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 p-6 text-white shadow-lg shadow-blue-500/10">
            <GraduationCap className="absolute -right-6 -bottom-6 h-28 w-28 text-white/15" />
            <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">
              Hành trình 2026
            </span>
            <h3 className="mt-3 text-xl font-bold">
              Luyện IELTS & Kỹ năng chuyên môn
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-blue-100/90">
              Học đều đặn, tối ưu thời gian và ghi nhớ kiến thức cốt lõi qua hệ
              thống ghi chú thông minh.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h4 className="mb-3 text-sm font-bold text-slate-700">
              Chú thích lịch học
            </h4>
            <div className="flex flex-col gap-2.5 text-xs text-slate-500">
              <LegendDot color="bg-emerald-400" label="Đã hoàn thành tất cả mục học" />
              <LegendDot color="bg-amber-400" label="Còn mục học chưa làm" />
              <LegendDot color="bg-slate-200" label="Chưa có lịch hoặc chưa học" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CalendarView({
  calendarCells,
  currentDate,
  data,
  selectedDate,
  changeMonth,
  selectDate,
}) {
  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">
          Lịch Học Chi Tiết
        </h2>
        <p className="text-xs text-slate-400">
          Bấm chọn một ngày bất kỳ để thiết lập danh sách mục tiêu hoàn thành.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
          <span className="text-lg font-bold text-slate-700">
            {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
          </span>
          <MonthControls changeMonth={changeMonth} labels />
        </div>
        <div className="grid grid-cols-7 gap-4">
          {WEEKDAY_SHORT.map((day) => (
            <div
              key={day}
              className="hidden text-xs font-bold uppercase tracking-wider text-slate-400 md:block"
            >
              {day}
            </div>
          ))}
          {calendarCells.map((cell) => {
            const tasks = getTasksForDate(data, cell.date);
            const stats = getTaskStats(tasks);
            const selected = isSameDate(cell.date, selectedDate);
            const today = isSameDate(cell.date, new Date());
            return (
              <button
                key={cell.key}
                type="button"
                onClick={() => selectDate(cell.date)}
                className={`min-h-28 rounded-2xl border p-3 text-left transition-all ${
                  selected
                    ? 'border-blue-500 bg-blue-50 shadow-md shadow-blue-500/10'
                    : 'border-slate-100 bg-white hover:bg-slate-50'
                } ${cell.muted ? 'opacity-45' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-sm font-bold ${
                      today ? 'text-blue-600' : 'text-slate-700'
                    }`}
                  >
                    {cell.day}
                  </span>
                  {stats.total > 0 && (
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                        stats.completed === stats.total
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {stats.completed}/{stats.total}
                    </span>
                  )}
                </div>
                <div className="mt-3 space-y-1">
                  {tasks.slice(0, 2).map((task) => (
                    <div
                      key={task.id}
                      className="truncate text-[10px] font-medium text-slate-500"
                    >
                      • {task.title}
                    </div>
                  ))}
                  {stats.total > 2 && (
                    <div className="text-[9px] font-bold italic text-slate-400">
                      +{stats.total - 2} nhiệm vụ nữa
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function TasksView({
  date,
  editingNotes,
  selectedStats,
  tasks,
  deleteTask,
  openAddTask,
  openFullNote,
  refineNote,
  resetToDefaults,
  setActiveView,
  setEditingNotes,
  updateTask,
}) {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={() => setActiveView('dashboard')}
          className="flex w-max items-center gap-2 rounded-xl bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition-all hover:bg-slate-100 hover:text-blue-600"
        >
          <ArrowLeft size={16} /> Quay lại Dashboard
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-400">
            Bạn đang xem lịch chi tiết ngày:
          </span>
          <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600">
            {date.toLocaleDateString('vi-VN', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
        </div>
      </div>

      <div className="relative flex flex-col items-start justify-between gap-4 overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:flex-row sm:items-center">
        <div className="pointer-events-none absolute right-4 top-4 select-none text-6xl font-bold text-slate-100">
          {String(date.getDate()).padStart(2, '0')}
        </div>
        <div className="relative z-10">
          <h2 className="flex items-center gap-3 text-3xl font-extrabold text-slate-800">
            {VIETNAMESE_DAYS[date.getDay()]}
          </h2>
          <p className="mt-1 text-xs font-extrabold uppercase tracking-wider text-slate-400">
            {ENGLISH_DAYS[date.getDay()]}
          </p>
        </div>
        <div className="relative z-10 flex w-full items-center justify-between gap-3 border-t border-slate-100 pt-3 sm:w-auto sm:justify-start sm:border-t-0 sm:pt-0">
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
            {tasks.length} mục
          </span>
          <button
            type="button"
            onClick={openAddTask}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/15 transition-all hover:bg-blue-700"
          >
            <Plus size={16} /> Thêm mục mới
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-500">
          <span>TIẾN ĐỘ HOÀN THÀNH NGÀY</span>
          <span className="text-blue-600">{selectedStats.percent}%</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
            style={{ width: `${selectedStats.percent}%` }}
          />
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white p-12 text-center">
          <NotebookPen size={44} className="mb-3 text-slate-300" />
          <h4 className="font-bold text-slate-700">Ngày này chưa có lịch học</h4>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={resetToDefaults}
              className="rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-200"
            >
              Khôi phục lịch mẫu
            </button>
            <button
              type="button"
              onClick={openAddTask}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Thêm nhiệm vụ
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              editing={Boolean(editingNotes[task.id])}
              deleteTask={deleteTask}
              openFullNote={openFullNote}
              refineNote={refineNote}
              setEditing={(editing) =>
                setEditingNotes((current) => ({
                  ...current,
                  [task.id]: editing,
                }))
              }
              updateTask={updateTask}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function TaskCard({
  task,
  editing,
  deleteTask,
  openFullNote,
  refineNote,
  setEditing,
  updateTask,
}) {
  const styles = THEME_STYLES[task.theme] || THEME_STYLES.teal;
  const Icon = ICONS[task.icon] || GraduationCap;

  return (
    <article
      className={`rounded-2xl border p-5 shadow-sm transition-all ${styles.bg} ${styles.border}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {task.time && (
              <span
                className={`rounded-full border px-3 py-1 text-xs font-bold ${styles.badge}`}
              >
                {task.time}
              </span>
            )}
            <Icon size={18} className={styles.accent} />
          </div>
          <h3
            className={`text-lg font-extrabold ${
              task.completed ? 'text-slate-400 line-through' : styles.text
            }`}
          >
            {task.title}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => deleteTask(task.id)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-300 transition-all hover:bg-rose-50 hover:text-rose-500"
            aria-label="Xóa nhiệm vụ"
          >
            <Trash2 size={16} />
          </button>
          <button
            type="button"
            onClick={() => updateTask(task.id, { completed: !task.completed })}
            className={`flex h-9 w-9 items-center justify-center rounded-full border-2 shadow-sm transition-all ${
              task.completed
                ? 'border-emerald-500 bg-emerald-500 text-white'
                : 'border-slate-300 bg-white text-slate-400 hover:border-blue-500'
            }`}
            aria-label="Đánh dấu hoàn thành"
          >
            {task.completed ? <Check size={18} /> : <Circle size={18} />}
          </button>
        </div>
      </div>

      <div className="mt-4 border-t border-slate-200/60 pt-4">
        <div className="mb-3 flex flex-col justify-between gap-2 text-xs font-semibold text-slate-400 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <NotebookPen size={14} className={styles.accent} />
            <span>Ghi chú bài học</span>
          </div>
          <div className="flex w-max flex-wrap items-center gap-2 rounded-lg border border-slate-200/30 bg-slate-100/55 px-2 py-1">
            <button
              type="button"
              onClick={() => setEditing(!editing)}
              className="flex items-center gap-1 transition-colors hover:text-blue-600"
            >
              <StickyNote size={13} /> {editing ? 'Xem' : 'Sửa'}
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={() => openFullNote(task)}
              className="flex items-center gap-1 transition-colors hover:text-blue-600"
            >
              <Expand size={13} /> Mở rộng
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={() => refineNote(task.id)}
              className="flex items-center gap-1 font-bold text-indigo-600 transition-colors hover:text-indigo-800"
            >
              <WandSparkles size={13} /> AI Refine
            </button>
          </div>
        </div>

        {editing ? (
          <textarea
            value={task.note || ''}
            onChange={(event) => updateTask(task.id, { note: event.target.value })}
            placeholder="Gõ từ vựng, ngữ pháp, các dòng lệnh... Dùng **từ khóa** để bôi đậm, `code` cho lệnh, '- ' cho danh sách."
            className="min-h-24 w-full resize-y rounded-xl border border-slate-200 bg-white p-3.5 text-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="min-h-16 w-full rounded-xl border border-slate-100 bg-white/70 p-3.5 text-left text-sm shadow-sm transition-all hover:border-slate-200 hover:bg-white"
          >
            {task.note ? (
              <div
                className="study-note-preview"
                dangerouslySetInnerHTML={{ __html: formatNoteHtml(task.note) }}
              />
            ) : (
              <span className="flex items-center gap-1.5 text-xs italic text-slate-400">
                <StickyNote size={14} /> Click vào đây để soạn thảo ghi chú bài
                học...
              </span>
            )}
          </button>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <Icon size={12} /> Lĩnh vực:{' '}
          {['orange', 'purple'].includes(task.theme)
            ? 'IELTS English'
            : 'Chuyên môn'}
        </span>
        {task.completed ? (
          <span className="flex items-center gap-1 font-bold text-emerald-600">
            <Check size={12} /> Đã hoàn tất
          </span>
        ) : (
          <span className="font-medium text-amber-600">Chờ hoàn tất</span>
        )}
      </div>
    </article>
  );
}

function NotesView({ notes, selectDate }) {
  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Master Notes</h2>
        <p className="text-xs text-slate-400">
          Toàn bộ ghi chú đã lưu từ các nhiệm vụ học tập.
        </p>
      </div>

      {notes.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center">
          <StickyNote size={44} className="mx-auto mb-3 text-slate-300" />
          <h4 className="font-bold text-slate-700">
            Chưa có ghi chú nào được lưu
          </h4>
          <p className="mt-1 text-xs text-slate-400">
            Hãy bắt đầu viết ghi chú trong các nhiệm vụ để lưu trữ kiến thức tại
            đây.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {notes.map((task) => {
            const date = parseDateString(task.date);
            return (
              <div
                key={`${task.date}-${task.id}`}
                className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {task.date} ({VIETNAMESE_DAYS[date.getDay()]})
                    </span>
                    <span className="truncate text-xs font-bold text-blue-600">
                      {task.title}
                    </span>
                  </div>
                  <div
                    className="study-note-preview max-h-48 overflow-y-auto border-t border-slate-50 pt-3 text-slate-600"
                    dangerouslySetInnerHTML={{ __html: formatNoteHtml(task.note) }}
                  />
                </div>
                <div className="mt-4 flex justify-end border-t border-slate-50 pt-3">
                  <button
                    type="button"
                    onClick={() => selectDate(date)}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    Xem chi tiết ngày này
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function SettingsView({ bulkTask, clearAllData, setBulkTask, submit }) {
  function toggleWeekday(value) {
    setBulkTask((current) => ({
      ...current,
      weekdays: current.weekdays.includes(value)
        ? current.weekdays.filter((day) => day !== value)
        : [...current.weekdays, value],
    }));
  }

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Settings</h2>
        <p className="text-xs text-slate-400">
          Lập lịch hàng loạt theo quy tắc và quản lý dữ liệu lưu trữ.
        </p>
      </div>

      <form
        onSubmit={submit}
        className="flex flex-col gap-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
      >
        <div className="flex items-center gap-2">
          <Settings size={18} className="text-blue-600" />
          <h3 className="font-bold text-slate-700">Tạo lịch tự động</h3>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Ngày bắt đầu">
            <input
              type="date"
              value={bulkTask.startDate}
              onChange={(event) =>
                setBulkTask((current) => ({
                  ...current,
                  startDate: event.target.value,
                }))
              }
              className="field-input"
              required
            />
          </Field>
          <Field label="Ngày kết thúc">
            <input
              type="date"
              value={bulkTask.endDate}
              onChange={(event) =>
                setBulkTask((current) => ({
                  ...current,
                  endDate: event.target.value,
                }))
              }
              className="field-input"
              required
            />
          </Field>
        </div>

        <div>
          <label className="mb-2 block text-xs font-bold text-slate-500">
            Chọn thứ trong tuần
          </label>
          <div className="flex flex-wrap gap-2">
            {VIETNAMESE_DAYS.map((day, index) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleWeekday(index)}
                className={`rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
                  bulkTask.weekdays.includes(index)
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        <Field label="Tên nhiệm vụ">
          <input
            type="text"
            value={bulkTask.title}
            onChange={(event) =>
              setBulkTask((current) => ({
                ...current,
                title: event.target.value,
              }))
            }
            placeholder="Ví dụ: Ôn phản xạ nói Speaking Part 2"
            className="field-input"
            required
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Giờ bắt đầu">
            <input
              type="time"
              value={bulkTask.start}
              onChange={(event) =>
                setBulkTask((current) => ({ ...current, start: event.target.value }))
              }
              className="field-input"
            />
          </Field>
          <Field label="Giờ kết thúc">
            <input
              type="time"
              value={bulkTask.end}
              onChange={(event) =>
                setBulkTask((current) => ({ ...current, end: event.target.value }))
              }
              className="field-input"
            />
          </Field>
          <Field label="Chủ đề">
            <select
              value={bulkTask.theme}
              onChange={(event) =>
                setBulkTask((current) => ({
                  ...current,
                  theme: event.target.value,
                }))
              }
              className="field-input"
            >
              <option value="orange">IELTS Grammar</option>
              <option value="purple">Listening/Speaking</option>
              <option value="blue">Translation</option>
              <option value="teal">Automation</option>
            </select>
          </Field>
        </div>

        <button
          type="submit"
          className="flex w-max items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/15 transition-all hover:bg-blue-700"
        >
          <Plus size={16} /> Áp dụng lịch
        </button>
      </form>

      <div className="rounded-2xl border border-rose-100 bg-white p-6 shadow-sm">
        <h3 className="font-bold text-slate-700">Quản lý dữ liệu</h3>
        <p className="mt-1 text-xs text-slate-400">
          Dữ liệu được lưu trên máy và đồng bộ Google Sheets khi có mạng.
        </p>
        <button
          type="button"
          onClick={clearAllData}
          className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-100"
        >
          <Trash2 size={16} /> Xóa tất cả dữ liệu
        </button>
      </div>
    </section>
  );
}

function AddTaskModal({ newTask, setNewTask, close, submit }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 p-5">
          <h3 className="font-bold text-slate-800">Thêm nhiệm vụ học tập</h3>
          <button
            type="button"
            onClick={close}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-4 p-6">
          <Field label="Tên nhiệm vụ">
            <input
              type="text"
              value={newTask.title}
              onChange={(event) =>
                setNewTask((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="Ví dụ: Luyện Speaking Part 2"
              className="field-input"
              required
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Bắt đầu">
              <input
                type="time"
                value={newTask.start}
                onChange={(event) =>
                  setNewTask((current) => ({ ...current, start: event.target.value }))
                }
                className="field-input"
              />
            </Field>
            <Field label="Kết thúc">
              <input
                type="time"
                value={newTask.end}
                onChange={(event) =>
                  setNewTask((current) => ({ ...current, end: event.target.value }))
                }
                className="field-input"
              />
            </Field>
          </div>
          <Field label="Chủ đề">
            <select
              value={newTask.theme}
              onChange={(event) =>
                setNewTask((current) => ({
                  ...current,
                  theme: event.target.value,
                }))
              }
              className="field-input"
            >
              <option value="orange">IELTS Grammar</option>
              <option value="purple">Listening/Speaking</option>
              <option value="blue">Translation</option>
              <option value="teal">Automation</option>
            </select>
          </Field>
          <Field label="Icon">
            <select
              value={newTask.icon}
              onChange={(event) =>
                setNewTask((current) => ({ ...current, icon: event.target.value }))
              }
              className="field-input"
            >
              <option value="book">Book</option>
              <option value="headphones">Headphones</option>
              <option value="code">Code</option>
              <option value="mic">Microphone</option>
              <option value="language">Language</option>
            </select>
          </Field>
          <Field label="Ghi chú ban đầu">
            <textarea
              value={newTask.note}
              onChange={(event) =>
                setNewTask((current) => ({ ...current, note: event.target.value }))
              }
              rows={2}
              placeholder="Ghi mục tiêu, bài tập cần làm..."
              className="field-input resize-none"
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={close}
              className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-200"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/15 transition-colors hover:bg-blue-700"
            >
              Thêm nhiệm vụ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FullNoteModal({ draft, setDraft, close, save }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="grid h-[82vh] w-full max-w-5xl grid-cols-1 overflow-hidden rounded-2xl bg-white shadow-2xl md:grid-cols-2">
        <div className="flex flex-col border-r border-slate-100">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 p-4">
            <h3 className="font-bold text-slate-800">Soạn ghi chú</h3>
            <button
              type="button"
              onClick={close}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-600"
            >
              <X size={18} />
            </button>
          </div>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="min-h-0 flex-1 resize-none p-5 text-sm outline-none"
            placeholder="Viết ghi chú ở đây..."
          />
          <div className="flex justify-end gap-2 border-t border-slate-100 p-4">
            <button
              type="button"
              onClick={close}
              className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={save}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Lưu ghi chú
            </button>
          </div>
        </div>
        <div className="overflow-y-auto bg-slate-50 p-5">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <Sparkles size={14} /> Preview
          </div>
          <div
            className="study-note-preview rounded-2xl border border-slate-100 bg-white p-5 text-sm text-slate-700 shadow-sm"
            dangerouslySetInnerHTML={{
              __html: draft
                ? formatNoteHtml(draft)
                : '<span class="text-slate-400 italic">Preview ghi chú sẽ hiện ở đây...</span>',
            }}
          />
        </div>
      </div>
    </div>
  );
}

function MiniCalendar({ cells, data, selectedDate, selectDate }) {
  return (
    <div className="p-6">
      <div className="mb-4 grid grid-cols-7 gap-y-2 text-center text-xs font-bold uppercase tracking-widest text-slate-400">
        {WEEKDAY_SHORT.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2 text-center">
        {cells.map((cell) => {
          const tasks = getTasksForDate(data, cell.date);
          const stats = getTaskStats(tasks);
          const selected = isSameDate(cell.date, selectedDate);
          const today = isSameDate(cell.date, new Date());
          const dot =
            stats.total === 0
              ? 'bg-slate-200'
              : stats.completed === stats.total
                ? 'bg-emerald-400'
                : 'bg-amber-400';
          return (
            <button
              key={cell.key}
              type="button"
              onClick={() => selectDate(cell.date)}
              className={`relative flex h-11 items-center justify-center rounded-xl text-sm font-medium transition-all ${
                selected
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : today
                    ? 'bg-blue-50 text-blue-700'
                    : 'bg-slate-50/20 text-slate-700 hover:bg-slate-100'
              } ${cell.muted ? 'opacity-40' : ''}`}
            >
              {cell.day}
              {stats.total > 0 && (
                <span
                  className={`absolute bottom-1 h-1 w-1 rounded-full ${selected ? 'bg-white' : dot}`}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MonthControls({ changeMonth, labels = false }) {
  return (
    <div className="flex gap-1.5">
      <button
        type="button"
        onClick={() => changeMonth(-1)}
        className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition-all hover:bg-slate-50"
      >
        <ChevronLeft size={14} />
        {labels && <span className="hidden text-xs font-semibold sm:inline">Tháng trước</span>}
      </button>
      <button
        type="button"
        onClick={() => changeMonth(1)}
        className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition-all hover:bg-slate-50"
      >
        {labels && <span className="hidden text-xs font-semibold sm:inline">Tháng sau</span>}
        <ChevronRight size={14} />
      </button>
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-3 w-3 rounded-full ${color}`} />
      <span>{label}</span>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

export default App;
