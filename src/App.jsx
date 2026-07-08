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
  Compass,
  Expand,
  FolderOpen,
  GraduationCap,
  Headphones,
  Languages,
  LayoutDashboard,
  Library,
  ListChecks,
  Menu,
  Mic,
  NotebookPen,
  Plus,
  RefreshCw,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  StickyNote,
  Trash2,
  X,
} from 'lucide-react';

const DATA_STORAGE_KEY = 'weekly-study-planner-data';
const DATA_API_ENDPOINT = '/api/data';

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

const EMPTY_SPEAKING_TOPICS = { part1: [], part2: [], part3: [] };

const EMPTY_DATA = {
  dailyTasks: {},
  scheduleRules: [],
  documents: [],
  speakingTopics: EMPTY_SPEAKING_TOPICS,
  legacyWeeks: null,
  defaultRulesSeeded: false,
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

const THEME_LABELS = {
  orange: 'IELTS Grammar',
  purple: 'Listening/Speaking',
  blue: 'Translation',
  teal: 'Automation',
  slate: 'General',
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

function normalizeSpeakingTopics(value) {
  if (!value || typeof value !== 'object') return EMPTY_SPEAKING_TOPICS;
  return {
    part1: Array.isArray(value.part1) ? value.part1 : [],
    part2: Array.isArray(value.part2) ? value.part2 : [],
    part3: Array.isArray(value.part3) ? value.part3 : [],
  };
}

function normalizeData(value) {
  if (!value || typeof value !== 'object') return EMPTY_DATA;

  if (value.dailyTasks && typeof value.dailyTasks === 'object') {
    return {
      ...EMPTY_DATA,
      ...value,
      dailyTasks: value.dailyTasks,
      scheduleRules: Array.isArray(value.scheduleRules)
        ? value.scheduleRules
        : [],
      documents: Array.isArray(value.documents) ? value.documents : [],
      speakingTopics: normalizeSpeakingTopics(value.speakingTopics),
    };
  }

  return {
    dailyTasks: {},
    scheduleRules: [],
    documents: [],
    speakingTopics: EMPTY_SPEAKING_TOPICS,
    legacyWeeks: value,
    defaultRulesSeeded: false,
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

function createDocument(partial) {
  const now = new Date().toISOString();
  return {
    id: `doc-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title: '',
    content: '',
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

function createSpeakingTopic(partial) {
  return {
    id: `topic-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: '',
    questions: [],
    ...partial,
  };
}

function filterSpeakingTopicByQuery(topic, query) {
  if (!query) return topic;
  if (topic.name.toLowerCase().includes(query)) return topic;
  return {
    ...topic,
    questions: topic.questions.filter((q) => q.text.toLowerCase().includes(query)),
  };
}

function createSpeakingQuestion(partial) {
  return {
    id: `sq-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    text: '',
    completed: false,
    userNote: '',
    ...partial,
  };
}

function createDefaultBulkTask() {
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
}

function getRuleIcon(theme) {
  return ['orange', 'purple'].includes(theme) ? 'mic' : 'code';
}

function buildRuleFromForm(form, existingRule) {
  return {
    id:
      existingRule?.id ||
      `rule-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    startDate: form.startDate,
    endDate: form.endDate,
    weekdays: [...form.weekdays].sort((left, right) => left - right),
    title: form.title.trim(),
    start: form.start,
    end: form.end,
    theme: form.theme,
    icon: getRuleIcon(form.theme),
    appliedCount: 0,
    createdAt: existingRule?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function removeTasksForRule(dailyTasks, ruleId) {
  return Object.fromEntries(
    Object.entries(dailyTasks).map(([dateKey, tasks]) => [
      dateKey,
      tasks.filter((task) => task.ruleId !== ruleId),
    ]),
  );
}

function countRuleOccurrences(rule) {
  const start = parseDateString(rule.startDate);
  const end = parseDateString(rule.endDate);
  const cursor = new Date(start);
  let count = 0;

  while (cursor <= end) {
    if (rule.weekdays.includes(cursor.getDay())) count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }

  return count;
}

function applyRuleToDailyTasks(dailyTasks, rule) {
  return {
    dailyTasks: removeTasksForRule(dailyTasks, rule.id),
    rule: { ...rule, appliedCount: countRuleOccurrences(rule) },
  };
}

function getRuleGeneratedTasks(rules, date) {
  const dateKey = formatDateString(date);
  const weekday = date.getDay();

  return rules
    .filter((rule) => {
      if (!rule.weekdays.includes(weekday)) return false;
      const start = parseDateString(rule.startDate);
      const end = parseDateString(rule.endDate);
      return date >= start && date <= end;
    })
    .map((rule) =>
      createTask({
        id: `${rule.id}-${dateKey}`,
        ruleId: rule.id,
        title: rule.title,
        time: buildTimeString(rule.start, rule.end),
        theme: rule.theme,
        icon: rule.icon,
      }),
    );
}

const DEFAULT_RULE_RANGE_START = '2020-01-01';
const DEFAULT_RULE_RANGE_END = '2035-12-31';

const DEFAULT_RULE_SEEDS = [
  {
    id: 'default-rule-mwf-exercise',
    weekdays: [1, 3, 5],
    title: 'Làm bài tập & Ôn bài cũ + mới',
    start: '10:00',
    end: '12:00',
    theme: 'orange',
    icon: 'book',
  },
  {
    id: 'default-rule-mwf-video',
    weekdays: [1, 3, 5],
    title: 'Học clip thầy Tùng',
    start: '13:00',
    end: '16:00',
    theme: 'purple',
    icon: 'headphones',
  },
  {
    id: 'default-rule-mwf-translation',
    weekdays: [1, 3, 5],
    title: 'Dịch Anh-Việt & Việt-Anh',
    start: '21:00',
    end: '23:00',
    theme: 'blue',
    icon: 'language',
  },
  {
    id: 'default-rule-tth-auto-morning',
    weekdays: [2, 4, 6],
    title: 'Học auto',
    start: '10:00',
    end: '12:00',
    theme: 'teal',
    icon: 'bot',
  },
  {
    id: 'default-rule-tth-auto-afternoon',
    weekdays: [2, 4, 6],
    title: 'Học auto',
    start: '13:00',
    end: '17:00',
    theme: 'teal',
    icon: 'bot',
  },
  {
    id: 'default-rule-tth-listen',
    weekdays: [2, 4, 6],
    title: 'Listen & Speak',
    start: '20:00',
    end: '22:00',
    theme: 'purple',
    icon: 'headphones',
  },
  {
    id: 'default-rule-sunday-rest',
    weekdays: [0],
    title: 'Nghỉ ngơi',
    start: '',
    end: '',
    theme: 'slate',
    icon: 'graduation',
  },
];

function buildDefaultRule(seed) {
  const rule = {
    id: seed.id,
    startDate: DEFAULT_RULE_RANGE_START,
    endDate: DEFAULT_RULE_RANGE_END,
    weekdays: seed.weekdays,
    title: seed.title,
    start: seed.start,
    end: seed.end,
    theme: seed.theme,
    icon: seed.icon,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return { ...rule, appliedCount: countRuleOccurrences(rule) };
}

function ensureDefaultRules(data) {
  if (data.defaultRulesSeeded) return data;
  return {
    ...data,
    scheduleRules: [
      ...data.scheduleRules,
      ...DEFAULT_RULE_SEEDS.map(buildDefaultRule),
    ],
    defaultRulesSeeded: true,
  };
}

function getTasksForDate(data, date) {
  const dateStr = formatDateString(date);
  if (data.dailyTasks[dateStr]) return data.dailyTasks[dateStr];
  return getRuleGeneratedTasks(data.scheduleRules, date);
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
    ensureDefaultRules(
      normalizeData(parseStoredData(window.localStorage.getItem(DATA_STORAGE_KEY))),
    ),
  );
  const [activeView, setActiveView] = useState('dashboard');
  const [currentDate, setCurrentDate] = useState(INITIAL_DATE);
  const [selectedDate, setSelectedDate] = useState(INITIAL_DATE);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
  const [bulkTask, setBulkTask] = useState(createDefaultBulkTask);
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [editingDocumentId, setEditingDocumentId] = useState(null);
  const [documentDraft, setDocumentDraft] = useState({ title: '', content: '' });
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
    setSyncStatus('Đang đồng bộ dữ liệu...');

    fetch(DATA_API_ENDPOINT, { signal: controller.signal })
      .then((response) => response.json())
      .then((payload) => {
        if (payload.data && Object.keys(payload.data).length > 0) {
          const remoteData = ensureDefaultRules(normalizeData(payload.data));
          setData(remoteData);
          window.localStorage.setItem(DATA_STORAGE_KEY, JSON.stringify(remoteData));
        }
        setSyncStatus('');
        hasLoadedRemote.current = true;
      })
      .catch((error) => {
        if (error?.name === 'AbortError') return;
        setSyncStatus('Mất kết nối, đang dùng dữ liệu trên máy');
        hasLoadedRemote.current = true;
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    window.localStorage.setItem(DATA_STORAGE_KEY, JSON.stringify(data));

    if (!hasLoadedRemote.current) return undefined;
    window.clearTimeout(pendingSave.current);
    pendingSave.current = window.setTimeout(() => {
      setSyncStatus('Đang lưu dữ liệu...');
      fetch(DATA_API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
          setSyncStatus('Đã lưu tạm trên máy, chưa đồng bộ được với server');
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
    setData({ ...EMPTY_DATA, defaultRulesSeeded: true });
    setEditingRuleId(null);
    setBulkTask(createDefaultBulkTask());
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

    const existingRule = data.scheduleRules.find(
      (rule) => rule.id === editingRuleId,
    );
    const draftRule = buildRuleFromForm(bulkTask, existingRule);
    const applied = applyRuleToDailyTasks(data.dailyTasks, draftRule);

    setData((current) => ({
      ...current,
      dailyTasks: applied.dailyTasks,
      scheduleRules: editingRuleId
        ? current.scheduleRules.map((rule) =>
            rule.id === editingRuleId ? applied.rule : rule,
          )
        : [applied.rule, ...current.scheduleRules],
    }));
    setEditingRuleId(null);
    setBulkTask(createDefaultBulkTask());
    showToast(
      editingRuleId
        ? `Đã cập nhật rule và áp dụng ${applied.rule.appliedCount} buổi vào lịch.`
        : `Đã lưu rule và áp dụng ${applied.rule.appliedCount} buổi vào lịch.`,
    );
  }

  function editScheduleRule(rule) {
    setEditingRuleId(rule.id);
    setBulkTask({
      startDate: rule.startDate,
      endDate: rule.endDate,
      weekdays: rule.weekdays,
      title: rule.title,
      start: rule.start,
      end: rule.end,
      theme: rule.theme,
    });
    setActiveView('settings');
    showToast('Đã đưa rule vào form để sửa.');
  }

  function cancelRuleEdit() {
    setEditingRuleId(null);
    setBulkTask(createDefaultBulkTask());
  }

  function deleteScheduleRule(ruleId) {
    setData((current) => ({
      ...current,
      dailyTasks: removeTasksForRule(current.dailyTasks, ruleId),
      scheduleRules: current.scheduleRules.filter((rule) => rule.id !== ruleId),
    }));

    if (editingRuleId === ruleId) {
      cancelRuleEdit();
    }
    showToast('Đã xóa rule và các mục lịch do rule này tạo.');
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

  function openNewDocument() {
    setEditingDocumentId(null);
    setDocumentDraft({ title: '', content: '' });
    setDocumentModalOpen(true);
  }

  function openEditDocument(doc) {
    setEditingDocumentId(doc.id);
    setDocumentDraft({ title: doc.title, content: doc.content });
    setDocumentModalOpen(true);
  }

  function closeDocumentModal() {
    setDocumentModalOpen(false);
    setEditingDocumentId(null);
    setDocumentDraft({ title: '', content: '' });
  }

  function saveDocument() {
    if (!documentDraft.title.trim()) {
      showToast('Vui lòng nhập tiêu đề tài liệu.');
      return;
    }

    setData((current) => {
      if (editingDocumentId) {
        return {
          ...current,
          documents: current.documents.map((doc) =>
            doc.id === editingDocumentId
              ? {
                  ...doc,
                  title: documentDraft.title.trim(),
                  content: documentDraft.content,
                  updatedAt: new Date().toISOString(),
                }
              : doc,
          ),
        };
      }

      const doc = createDocument({
        title: documentDraft.title.trim(),
        content: documentDraft.content,
      });
      return { ...current, documents: [doc, ...current.documents] };
    });

    showToast(editingDocumentId ? 'Đã cập nhật tài liệu.' : 'Đã lưu tài liệu mới.');
    closeDocumentModal();
  }

  function deleteDocument(docId) {
    if (!window.confirm('Bạn có chắc chắn muốn xóa tài liệu này?')) return;
    setData((current) => ({
      ...current,
      documents: current.documents.filter((doc) => doc.id !== docId),
    }));
    if (editingDocumentId === docId) {
      closeDocumentModal();
    }
    showToast('Đã xóa tài liệu.');
  }

  function updateSpeakingTopics(updater) {
    setData((current) => ({
      ...current,
      speakingTopics:
        typeof updater === 'function'
          ? updater(current.speakingTopics)
          : updater,
    }));
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'calendar', label: 'Calendar', icon: CalendarDays },
    { id: 'tasks', label: 'Tasks', icon: ListChecks, badge: incompleteSelected },
    { id: 'notes', label: 'Notes', icon: StickyNote },
    { id: 'documents', label: 'Documents', icon: Library },
    { id: 'speaking', label: 'Speaking', icon: Mic },
    { id: 'settings', label: 'Settings', icon: SlidersHorizontal },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 md:flex">
      <aside
        className={`sticky top-0 z-30 flex w-full shrink-0 flex-col border-b border-slate-200 bg-white transition-[width] duration-200 md:h-screen md:border-b-0 md:border-r ${
          sidebarCollapsed ? 'md:w-20' : 'md:w-64'
        }`}
      >
        <div
          className={`flex items-center justify-between gap-2 border-b border-slate-100 p-6 ${
            sidebarCollapsed ? 'md:flex-col md:justify-center md:p-4' : ''
          }`}
        >
          <div
            className={`flex items-center gap-3 ${sidebarCollapsed ? 'md:justify-center' : ''}`}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white shadow-md shadow-blue-500/20">
              S
            </div>
            {!sidebarCollapsed && (
              <div>
                <h1 className="text-base font-bold leading-tight text-slate-800">
                  StudyFlow
                </h1>
                <p className="text-xs font-medium text-slate-400">
                  Planned Progress
                </p>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
            className={`hidden rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 md:block ${
              sidebarCollapsed ? 'md:ml-0' : 'md:ml-auto'
            }`}
            aria-label={sidebarCollapsed ? 'Mở rộng menu' : 'Thu hẹp menu'}
            title={sidebarCollapsed ? 'Mở rộng menu' : 'Thu hẹp menu'}
          >
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="ml-auto rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 md:hidden"
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
                title={sidebarCollapsed ? item.label : undefined}
                className={`relative flex items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                  sidebarCollapsed ? 'md:justify-center md:px-0' : ''
                } ${
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
                <Icon size={18} className="w-5 shrink-0" />
                <span className={sidebarCollapsed ? 'md:hidden' : ''}>
                  {item.label}
                </span>
                {item.badge > 0 && (
                  <span
                    className={`ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 ${
                      sidebarCollapsed ? 'md:hidden' : ''
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {!sidebarCollapsed && (
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
        )}
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
            resetToDefaults={resetToDefaults}
            setActiveView={setActiveView}
            setEditingNotes={setEditingNotes}
            updateTask={updateTask}
          />
        )}

        {activeView === 'notes' && (
          <NotesView notes={allNotes} selectDate={selectDate} />
        )}

        {activeView === 'documents' && (
          <DocumentsView
            documents={data.documents}
            deleteDocument={deleteDocument}
            openEditDocument={openEditDocument}
            openNewDocument={openNewDocument}
          />
        )}

        {activeView === 'speaking' && (
          <SpeakingView
            speakingTopics={data.speakingTopics}
            setSpeakingTopics={updateSpeakingTopics}
          />
        )}

        {activeView === 'settings' && (
          <SettingsView
            bulkTask={bulkTask}
            clearAllData={clearAllData}
            editingRuleId={editingRuleId}
            rules={data.scheduleRules}
            cancelRuleEdit={cancelRuleEdit}
            deleteRule={deleteScheduleRule}
            editRule={editScheduleRule}
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

      {documentModalOpen && (
        <DocumentModal
          draft={documentDraft}
          isEditing={Boolean(editingDocumentId)}
          setDraft={setDocumentDraft}
          close={closeDocumentModal}
          save={saveDocument}
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
              task.completed ? 'text-slate-400' : styles.text
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

function DocumentsView({ documents, deleteDocument, openEditDocument, openNewDocument }) {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Documents</h2>
          <p className="text-xs text-slate-400">
            Kho lưu trữ tài liệu văn bản của bạn — ví dụ câu hỏi Speaking IELTS,
            danh sách từ vựng, hoặc bất kỳ ghi chú dài nào cần tra cứu lại.
          </p>
        </div>
        <button
          type="button"
          onClick={openNewDocument}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/15 transition-all hover:bg-blue-700"
        >
          <Plus size={16} /> Tạo tài liệu mới
        </button>
      </div>

      {documents.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center">
          <Library size={44} className="mx-auto mb-3 text-slate-300" />
          <h4 className="font-bold text-slate-700">Chưa có tài liệu nào</h4>
          <p className="mt-1 text-xs text-slate-400">
            Bấm &quot;Tạo tài liệu mới&quot; để bắt đầu lưu trữ nội dung học tập.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div>
                <div className="mb-3 flex items-start justify-between gap-3">
                  <h3 className="truncate text-sm font-extrabold text-slate-800">
                    {doc.title}
                  </h3>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {new Date(doc.updatedAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>
                <div
                  className="study-note-preview max-h-48 overflow-y-auto border-t border-slate-50 pt-3 text-slate-600"
                  dangerouslySetInnerHTML={{ __html: formatNoteHtml(doc.content) }}
                />
              </div>
              <div className="mt-4 flex justify-end gap-2 border-t border-slate-50 pt-3">
                <button
                  type="button"
                  onClick={() => deleteDocument(doc.id)}
                  className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-100"
                >
                  Xóa
                </button>
                <button
                  type="button"
                  onClick={() => openEditDocument(doc)}
                  className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-600 transition-colors hover:bg-blue-100"
                >
                  Xem / Sửa
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

const SPEAKING_PARTS = [
  { id: 'part1', label: 'Part 1' },
  { id: 'part2', label: 'Part 2' },
  { id: 'part3', label: 'Part 3' },
];

function SpeakingView({ speakingTopics, setSpeakingTopics }) {
  const [activePart, setActivePart] = useState('part1');
  const [selectedTopicId, setSelectedTopicId] = useState(
    () => speakingTopics.part1[0]?.id || '',
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [savingStates, setSavingStates] = useState({});
  const [topicModalOpen, setTopicModalOpen] = useState(false);
  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [newTopic, setNewTopic] = useState({ name: '', firstQuestion: '' });
  const [newQuestionText, setNewQuestionText] = useState('');
  const savingTimeouts = useRef({});

  function changePart(partId) {
    setActivePart(partId);
    setSelectedTopicId(speakingTopics[partId]?.[0]?.id || '');
    setSearchQuery('');
  }

  const query = searchQuery.trim().toLowerCase();
  const currentPartTopics = speakingTopics[activePart] || [];

  const activeTopicsList = useMemo(() => {
    if (!query) return currentPartTopics;
    return currentPartTopics
      .map((topic) => filterSpeakingTopicByQuery(topic, query))
      .filter(
        (topic) =>
          topic.name.toLowerCase().includes(query) || topic.questions.length > 0,
      );
  }, [currentPartTopics, query]);

  useEffect(() => {
    if (!query) return;
    if (activeTopicsList.some((topic) => topic.id === selectedTopicId)) return;
    setSelectedTopicId(activeTopicsList[0]?.id || '');
  }, [query, activeTopicsList, selectedTopicId]);

  const selectedTopic = useMemo(() => {
    const found = currentPartTopics.find((topic) => topic.id === selectedTopicId);
    if (!found) return null;
    return filterSpeakingTopicByQuery(found, query);
  }, [currentPartTopics, selectedTopicId, query]);

  function toggleQuestionComplete(questionId) {
    setSpeakingTopics((current) => ({
      ...current,
      [activePart]: current[activePart].map((topic) => ({
        ...topic,
        questions: topic.questions.map((q) =>
          q.id === questionId ? { ...q, completed: !q.completed } : q,
        ),
      })),
    }));
  }

  function updateQuestionNote(questionId, note) {
    setSavingStates((prev) => ({ ...prev, [questionId]: 'saving' }));
    setSpeakingTopics((current) => ({
      ...current,
      [activePart]: current[activePart].map((topic) => ({
        ...topic,
        questions: topic.questions.map((q) =>
          q.id === questionId ? { ...q, userNote: note } : q,
        ),
      })),
    }));

    window.clearTimeout(savingTimeouts.current[questionId]);
    savingTimeouts.current[questionId] = window.setTimeout(() => {
      setSavingStates((prev) => ({ ...prev, [questionId]: 'saved' }));
    }, 500);
  }

  function deleteQuestion(questionId) {
    setSpeakingTopics((current) => ({
      ...current,
      [activePart]: current[activePart].map((topic) => ({
        ...topic,
        questions: topic.questions.filter((q) => q.id !== questionId),
      })),
    }));
  }

  function deleteTopic(topicId) {
    if (!window.confirm('Bạn có chắc chắn muốn xóa chủ đề này?')) return;
    setSpeakingTopics((current) => ({
      ...current,
      [activePart]: current[activePart].filter((topic) => topic.id !== topicId),
    }));
    if (selectedTopicId === topicId) setSelectedTopicId('');
  }

  function submitAddTopic(event) {
    event.preventDefault();
    if (!newTopic.name.trim() || !newTopic.firstQuestion.trim()) return;

    const topic = createSpeakingTopic({
      name: newTopic.name.trim(),
      questions: [createSpeakingQuestion({ text: newTopic.firstQuestion.trim() })],
    });

    setSpeakingTopics((current) => ({
      ...current,
      [activePart]: [...current[activePart], topic],
    }));
    setSelectedTopicId(topic.id);
    setNewTopic({ name: '', firstQuestion: '' });
    setTopicModalOpen(false);
  }

  function submitAddQuestion(event) {
    event.preventDefault();
    if (!newQuestionText.trim() || !selectedTopic) return;

    const question = createSpeakingQuestion({ text: newQuestionText.trim() });
    setSpeakingTopics((current) => ({
      ...current,
      [activePart]: current[activePart].map((topic) =>
        topic.id === selectedTopic.id
          ? { ...topic, questions: [...topic.questions, question] }
          : topic,
      ),
    }));
    setNewQuestionText('');
    setQuestionModalOpen(false);
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Speaking</h2>
        </div>
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Tìm câu hỏi..."
            className="field-input pr-10"
          />
          <Search
            size={16}
            className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <aside className="flex flex-col gap-4 lg:col-span-4">
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
            {SPEAKING_PARTS.map((part) => (
              <button
                key={part.id}
                type="button"
                onClick={() => changePart(part.id)}
                className={`rounded-lg py-1.5 text-center text-xs font-bold transition-all ${
                  activePart === part.id
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {part.label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <Compass size={16} /> Chủ đề
            </h3>
            <button
              type="button"
              onClick={() => setTopicModalOpen(true)}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200"
              title="Thêm chủ đề mới"
            >
              <Plus size={14} />
            </button>
          </div>

          <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto pr-1">
            {activeTopicsList.length === 0 ? (
              <p className="rounded-xl border border-slate-100 bg-white p-4 text-center text-xs italic text-slate-400">
                Chưa có chủ đề nào ở mục này
              </p>
            ) : (
              activeTopicsList.map((topic) => {
                const isSelected = selectedTopicId === topic.id;
                const completedCount = topic.questions.filter(
                  (q) => q.completed,
                ).length;
                const totalCount = topic.questions.length;
                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => setSelectedTopicId(topic.id)}
                    title={topic.name}
                    className={`w-full rounded-xl border-2 px-4 py-3 text-left text-sm font-semibold transition-all ${
                      isSelected
                        ? 'border-blue-400 bg-blue-50 text-blue-700 shadow-sm'
                        : 'border-slate-100 bg-white text-slate-600 hover:border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate">{topic.name}</span>
                      {totalCount > 0 && (
                        <span className="shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                          {completedCount}/{totalCount}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <div className="lg:col-span-8">
          {!selectedTopic ? (
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-sm">
              <FolderOpen size={40} className="text-slate-300" />
              <div>
                <h4 className="font-bold text-slate-700">
                  Chưa chọn chủ đề nào
                </h4>
                <p className="mt-1 text-xs text-slate-400">
                  Hãy chọn một chủ đề bên trái hoặc tạo chủ đề mới để bắt đầu.
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-800">
                    {selectedTopic.name}
                  </h3>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuestionModalOpen(true)}
                    className="flex items-center gap-1.5 rounded-xl border border-blue-200 px-3 py-1.5 text-xs font-bold text-blue-600 transition-colors hover:bg-blue-50"
                  >
                    <Plus size={14} /> Thêm câu hỏi
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteTopic(selectedTopic.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500"
                    title="Xóa chủ đề"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {selectedTopic.questions.length === 0 ? (
                <p className="py-12 text-center text-sm italic text-slate-400">
                  Chưa có câu hỏi nào trong chủ đề này. Nhấn &quot;Thêm câu hỏi&quot;
                  để bắt đầu.
                </p>
              ) : (
                <div className="flex flex-col gap-4">
                  {selectedTopic.questions.map((q) => (
                    <div
                      key={q.id}
                      className={`rounded-2xl border p-4 transition-all ${
                        q.completed
                          ? 'border-emerald-200 bg-emerald-50/40'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => toggleQuestionComplete(q.id)}
                          className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all ${
                            q.completed
                              ? 'border-emerald-600 bg-emerald-500 text-white'
                              : 'border-slate-300 text-transparent hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-500'
                          }`}
                          title={
                            q.completed
                              ? 'Đã học xong (nhấn để bỏ)'
                              : 'Đánh dấu là đã học xong'
                          }
                        >
                          <Check size={12} strokeWidth={3} />
                        </button>
                        <p
                          className={`flex-1 text-[15px] font-semibold leading-relaxed ${
                            q.completed ? 'text-slate-600' : 'text-slate-800'
                          }`}
                        >
                          {q.text}
                        </p>
                        <button
                          type="button"
                          onClick={() => deleteQuestion(q.id)}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500"
                          title="Xóa câu hỏi"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div className="mt-3 flex flex-col gap-1.5 border-t border-slate-100 pt-3">
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span className="text-slate-400">Câu trả lời</span>
                          {savingStates[q.id] === 'saving' && (
                            <span className="text-amber-500">Đang lưu...</span>
                          )}
                          {savingStates[q.id] === 'saved' && (
                            <span className="text-emerald-500">Đã tự lưu</span>
                          )}
                        </div>
                        <textarea
                          value={q.userNote || ''}
                          onChange={(event) =>
                            updateQuestionNote(q.id, event.target.value)
                          }
                          placeholder="Nhập câu trả lời của bạn vào đây..."
                          rows={4}
                          className="field-input min-h-[7rem] resize-y text-sm leading-relaxed"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {topicModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <form
            onSubmit={submitAddTopic}
            className="flex w-full max-w-md flex-col gap-4 rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-bold text-slate-800">
                Thêm chủ đề nói mới
              </h4>
              <button
                type="button"
                onClick={() => setTopicModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>
            <Field label="Tên chủ đề (Tiếng Anh)">
              <input
                type="text"
                value={newTopic.name}
                onChange={(event) =>
                  setNewTopic((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Ví dụ: Daily Routine"
                className="field-input"
                required
              />
            </Field>
            <Field label="Câu hỏi đầu tiên">
              <textarea
                value={newTopic.firstQuestion}
                onChange={(event) =>
                  setNewTopic((current) => ({
                    ...current,
                    firstQuestion: event.target.value,
                  }))
                }
                rows={3}
                placeholder="Ví dụ: What is your favorite time of the day?"
                className="field-input resize-none"
                required
              />
            </Field>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setTopicModalOpen(false)}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Lưu chủ đề
              </button>
            </div>
          </form>
        </div>
      )}

      {questionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <form
            onSubmit={submitAddQuestion}
            className="flex w-full max-w-md flex-col gap-4 rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-bold text-slate-800">
                Thêm câu hỏi luyện nói
              </h4>
              <button
                type="button"
                onClick={() => setQuestionModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>
            <Field label="Nội dung câu hỏi (Tiếng Anh)">
              <textarea
                value={newQuestionText}
                onChange={(event) => setNewQuestionText(event.target.value)}
                rows={3}
                placeholder="Ví dụ: What is your favorite time of the day?"
                className="field-input resize-none"
                required
              />
            </Field>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setQuestionModalOpen(false)}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Lưu câu hỏi
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

function SettingsView({
  bulkTask,
  cancelRuleEdit,
  clearAllData,
  deleteRule,
  editRule,
  editingRuleId,
  rules,
  setBulkTask,
  submit,
}) {
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
          Lập lịch hàng loạt theo rule, xem lại rule đã tạo và quản lý dữ liệu.
        </p>
      </div>

      <form
        onSubmit={submit}
        className="flex flex-col gap-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
      >
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <Settings size={18} className="text-blue-600" />
            <h3 className="font-bold text-slate-700">
              {editingRuleId ? 'Sửa rule lịch học' : 'Tạo lịch tự động'}
            </h3>
          </div>
          {editingRuleId && (
            <button
              type="button"
              onClick={cancelRuleEdit}
              className="w-max rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-200"
            >
              Hủy sửa
            </button>
          )}
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
          <Plus size={16} /> {editingRuleId ? 'Cập nhật rule' : 'Áp dụng lịch'}
        </button>
      </form>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h3 className="font-bold text-slate-700">Rule hiện tại</h3>
            <p className="mt-1 text-xs text-slate-400">
              Tất cả rule đã lưu, kèm trạng thái đã apply vào lịch học.
            </p>
          </div>
          <span className="w-max rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600">
            {rules.length} rule
          </span>
        </div>

        {rules.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
            <CalendarDays size={32} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-bold text-slate-600">
              Chưa có rule nào được tạo
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Sau khi bấm Áp dụng lịch, rule sẽ xuất hiện ở đây để bạn xem, sửa hoặc xóa.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-2">
            {rules.map((rule) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                isEditing={editingRuleId === rule.id}
                deleteRule={deleteRule}
                editRule={editRule}
              />
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-rose-100 bg-white p-6 shadow-sm">
        <h3 className="font-bold text-slate-700">Quản lý dữ liệu</h3>
        <p className="mt-1 text-xs text-slate-400">
          Dữ liệu được lưu trên máy và đồng bộ với server khi có mạng.
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

function RuleCard({ rule, isEditing, deleteRule, editRule }) {
  const styles = THEME_STYLES[rule.theme] || THEME_STYLES.blue;
  const weekdayText = rule.weekdays
    .map((day) => VIETNAMESE_DAYS[day])
    .join(', ');
  const timeText = buildTimeString(rule.start, rule.end) || 'Không đặt giờ';

  return (
    <article
      className={`rounded-2xl border p-4 ${
        isEditing ? 'border-blue-300 bg-blue-50' : 'border-slate-100 bg-slate-50/60'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${styles.badge}`}
            >
              {THEME_LABELS[rule.theme] || rule.theme}
            </span>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
              Đã apply {rule.appliedCount || 0} buổi
            </span>
          </div>
          <h4 className="truncate text-sm font-extrabold text-slate-800">
            {rule.title}
          </h4>
        </div>
        {isEditing && (
          <span className="rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-bold text-white">
            Đang sửa
          </span>
        )}
      </div>

      <dl className="mt-3 grid grid-cols-1 gap-2 text-xs text-slate-500 sm:grid-cols-2">
        <div>
          <dt className="font-bold text-slate-400">Khoảng ngày</dt>
          <dd className="mt-0.5 text-slate-700">
            {rule.startDate} - {rule.endDate}
          </dd>
        </div>
        <div>
          <dt className="font-bold text-slate-400">Thời gian</dt>
          <dd className="mt-0.5 text-slate-700">{timeText}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="font-bold text-slate-400">Thứ áp dụng</dt>
          <dd className="mt-0.5 text-slate-700">{weekdayText}</dd>
        </div>
      </dl>

      <div className="mt-4 flex justify-end gap-2 border-t border-slate-200/70 pt-3">
        <button
          type="button"
          onClick={() => editRule(rule)}
          className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-blue-600 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-blue-50"
        >
          Sửa
        </button>
        <button
          type="button"
          onClick={() => deleteRule(rule.id)}
          className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-100"
        >
          Xóa
        </button>
      </div>
    </article>
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

function DocumentModal({ draft, isEditing, setDraft, close, save }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="grid h-[82vh] w-full max-w-5xl grid-cols-1 overflow-hidden rounded-2xl bg-white shadow-2xl md:grid-cols-2">
        <div className="flex flex-col border-r border-slate-100">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 p-4">
            <h3 className="font-bold text-slate-800">
              {isEditing ? 'Sửa tài liệu' : 'Tạo tài liệu mới'}
            </h3>
            <button
              type="button"
              onClick={close}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-600"
            >
              <X size={18} />
            </button>
          </div>
          <div className="border-b border-slate-100 p-4">
            <input
              type="text"
              value={draft.title}
              onChange={(event) =>
                setDraft((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="Tiêu đề tài liệu, ví dụ: Câu hỏi Speaking Part 1"
              className="field-input"
            />
          </div>
          <textarea
            value={draft.content}
            onChange={(event) =>
              setDraft((current) => ({ ...current, content: event.target.value }))
            }
            className="min-h-0 flex-1 resize-none p-5 text-sm outline-none"
            placeholder="Dán hoặc soạn nội dung tài liệu ở đây... Dùng **từ khóa** để bôi đậm, `code` cho lệnh, '- ' cho danh sách."
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
              Lưu tài liệu
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
              __html: draft.content
                ? formatNoteHtml(draft.content)
                : '<span class="text-slate-400 italic">Preview nội dung sẽ hiện ở đây...</span>',
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
