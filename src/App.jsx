import { useEffect, useMemo, useRef, useState } from 'react';
import TESTING_DATA from './testing-data.json';
import { TESTING_GLOSSARY } from './testing-glossary.js';
import {
  ArrowLeft,
  BarChart3,
  Bold,
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
  FlaskConical,
  FolderOpen,
  GraduationCap,
  Headphones,
  Highlighter,
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
  StickyNote,
  Trash2,
  X,
} from 'lucide-react';

const translationCache = new Map();

const DATA_STORAGE_KEY = 'weekly-study-planner-data';
const DATA_API_ENDPOINT = '/api/data';

const INITIAL_DATE = new Date();
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
    bg: 'bg-sun-50',
    border: 'border-ink-800',
    text: 'text-ink-900',
    accent: 'text-sun-600',
    badge: 'bg-sun-200 text-ink-900 border-ink-800',
  },
  purple: {
    bg: 'bg-coral-50',
    border: 'border-ink-800',
    text: 'text-ink-900',
    accent: 'text-coral-500',
    badge: 'bg-coral-200 text-ink-900 border-ink-800',
  },
  blue: {
    bg: 'bg-sky-50',
    border: 'border-ink-800',
    text: 'text-ink-900',
    accent: 'text-sky-600',
    badge: 'bg-sky-200 text-ink-900 border-ink-800',
  },
  teal: {
    bg: 'bg-teal-50',
    border: 'border-ink-800',
    text: 'text-ink-900',
    accent: 'text-teal-600',
    badge: 'bg-teal-200 text-ink-900 border-ink-800',
  },
  slate: {
    bg: 'bg-ink-50',
    border: 'border-ink-800',
    text: 'text-ink-900',
    accent: 'text-ink-500',
    badge: 'bg-ink-100 text-ink-900 border-ink-800',
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
    ...(partial?.note?.trim() ? { noteUpdatedAt: new Date().toISOString() } : {}),
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
    .replace(/==(.*?)==/g, '<mark>$1</mark>')
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

const HTML_TAG_PATTERN = /<[a-z][\s\S]*>/i;

function renderNoteHtml(text) {
  if (!text) return '';
  if (HTML_TAG_PATTERN.test(text)) return text;
  return formatNoteHtml(text);
}

const PASTE_UNSAFE_SELECTOR = 'script,style,link,meta,object,embed,iframe';

function sanitizePastedHtml(html) {
  const container = document.createElement('div');
  container.innerHTML = html;
  container.querySelectorAll(PASTE_UNSAFE_SELECTOR).forEach((el) => el.remove());
  container.querySelectorAll('*').forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      const isJsUrl = (name === 'href' || name === 'src') && /^\s*javascript:/i.test(attr.value);
      if (name.startsWith('on') || isJsUrl) {
        el.removeAttribute(attr.name);
      }
    });
  });
  return container.innerHTML;
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
  const [fullNoteTaskDate, setFullNoteTaskDate] = useState('');
  const [noteDraft, setNoteDraft] = useState('');
  const [viewingNoteTask, setViewingNoteTask] = useState(null);
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
  const [viewingDocumentId, setViewingDocumentId] = useState(null);
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
  const allNotes = useMemo(() => {
    return allStoredTasks
      .filter((task) => task.note?.trim())
      .sort((left, right) => {
        const leftKey = left.noteUpdatedAt || left.date;
        const rightKey = right.noteUpdatedAt || right.date;
        return rightKey.localeCompare(leftKey);
      });
  }, [allStoredTasks]);
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

  const latestData = useRef(data);
  latestData.current = data;

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

  useEffect(() => {
    function flushPendingSave() {
      if (!hasLoadedRemote.current) return;
      window.clearTimeout(pendingSave.current);
      const blob = new Blob([JSON.stringify({ data: latestData.current })], {
        type: 'application/json',
      });
      navigator.sendBeacon(DATA_API_ENDPOINT, blob);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') flushPendingSave();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', flushPendingSave);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', flushPendingSave);
    };
  }, []);

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
    const finalPatch =
      'note' in patch ? { ...patch, noteUpdatedAt: new Date().toISOString() } : patch;
    const tasks = getTasksForDate(data, selectedDate).map((task) =>
      task.id === taskId ? { ...task, ...finalPatch } : task,
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

  function openFullNote(task, dateKey) {
    setFullNoteTaskId(task.id);
    setFullNoteTaskDate(dateKey || selectedDateKey);
    setNoteDraft(task.note || '');
  }

  function saveFullNote() {
    if (!fullNoteTaskId) return;
    const dateKey = fullNoteTaskDate || selectedDateKey;
    const tasks = getTasksForDate(data, parseDateString(dateKey)).map((task) =>
      task.id === fullNoteTaskId
        ? { ...task, note: noteDraft, noteUpdatedAt: new Date().toISOString() }
        : task,
    );
    saveTasksForDate(dateKey, tasks);
    setFullNoteTaskId(null);
    setFullNoteTaskDate('');
    setNoteDraft('');
    showToast('Đã lưu ghi chú.');
  }

  function openViewNote(task) {
    setViewingNoteTask(task);
  }

  function closeViewNote() {
    setViewingNoteTask(null);
  }

  function openNewDocument() {
    setEditingDocumentId(null);
    setDocumentDraft({ title: '', content: '' });
    setDocumentModalOpen(true);
  }

  function openEditDocument(doc) {
    setViewingDocumentId(null);
    setEditingDocumentId(doc.id);
    setDocumentDraft({ title: doc.title, content: doc.content });
    setDocumentModalOpen(true);
  }

  function closeDocumentModal() {
    setDocumentModalOpen(false);
    setEditingDocumentId(null);
    setDocumentDraft({ title: '', content: '' });
  }

  function openViewDocument(doc) {
    setViewingDocumentId(doc.id);
  }

  function closeViewDocument() {
    setViewingDocumentId(null);
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
    if (viewingDocumentId === docId) {
      closeViewDocument();
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
    { id: 'testing', label: 'Testing', icon: FlaskConical },
    { id: 'settings', label: 'Settings', icon: SlidersHorizontal },
  ];

  return (
    <div className="min-h-screen bg-cream font-sans text-ink-800 md:flex">
      <aside
        className={`sticky top-0 z-30 flex w-full shrink-0 flex-col border-b-[1.5px] border-ink-800/15 bg-paper transition-[width] duration-200 md:h-screen md:border-b-0 md:border-r-[1.5px] ${
          sidebarCollapsed ? 'md:w-20' : 'md:w-64'
        }`}
      >
        <div
          className={`flex items-center justify-between gap-2 border-b-[1.5px] border-dashed border-ink-800/20 p-6 ${
            sidebarCollapsed ? 'md:flex-col md:justify-center md:p-4' : ''
          }`}
        >
          <div
            className={`flex items-center gap-3 ${sidebarCollapsed ? 'md:justify-center' : ''}`}
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[1.5px] border-ink-800 bg-teal-500 font-display text-xl font-bold text-white shadow-chip">
              S
            </div>
            {!sidebarCollapsed && (
              <div>
                <h1 className="font-display text-lg font-bold leading-tight text-ink-900">
                  Study<span className="marker">Flow</span>
                </h1>
                <p className="text-[11px] font-bold uppercase tracking-wider text-ink-400">
                  Planned Progress
                </p>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
            className={`icon-btn hidden h-8 w-8 md:flex ${
              sidebarCollapsed ? 'md:ml-0' : 'md:ml-auto'
            }`}
            aria-label={sidebarCollapsed ? 'Mở rộng menu' : 'Thu hẹp menu'}
            title={sidebarCollapsed ? 'Mở rộng menu' : 'Thu hẹp menu'}
          >
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="icon-btn icon-btn-coral ml-auto h-9 w-9 md:hidden"
            aria-label="Mở menu"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <nav
          className={`flex-grow flex-col gap-1.5 overflow-y-auto p-4 ${mobileMenuOpen ? 'flex' : 'hidden md:flex'}`}
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
                className={`relative flex items-center gap-3 rounded-full border-[1.5px] px-3.5 py-2.5 text-sm font-extrabold transition-all ${
                  sidebarCollapsed ? 'md:justify-center md:px-0' : ''
                } ${
                  active
                    ? 'border-ink-800 bg-teal-500 text-white shadow-chip'
                    : 'border-transparent text-ink-500 hover:border-ink-800/20 hover:bg-ink-50 hover:text-ink-800'
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors ${
                    active ? 'bg-sun-300 text-ink-900' : 'text-ink-400'
                  }`}
                >
                  <Icon size={16} />
                </span>
                <span className={sidebarCollapsed ? 'md:hidden' : ''}>
                  {item.label}
                </span>
                {item.badge > 0 && (
                  <span
                    className={`ml-auto rounded-full border-[1.5px] border-ink-800 bg-coral-200 px-2 py-0.5 text-[10px] font-extrabold text-ink-900 ${
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
          <div className="hidden p-4 md:block">
            <div className="card-dashed p-3 text-center">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-400">
                Hôm nay là
              </p>
              <p className="mt-1 text-xs font-extrabold text-ink-800">{todayLabel}</p>
              <p className="mt-1.5 inline-flex rounded-full border-[1.5px] border-ink-800 bg-sun-200 px-2.5 py-0.5 text-[10px] font-extrabold text-ink-900">
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
          <NotesView
            notes={allNotes}
            selectDate={selectDate}
            openFullNote={openFullNote}
            openViewNote={openViewNote}
          />
        )}

        {activeView === 'documents' && (
          <DocumentsView
            documents={data.documents}
            deleteDocument={deleteDocument}
            openEditDocument={openEditDocument}
            openViewDocument={openViewDocument}
            openNewDocument={openNewDocument}
          />
        )}

        {activeView === 'speaking' && (
          <SpeakingView
            speakingTopics={data.speakingTopics}
            setSpeakingTopics={updateSpeakingTopics}
          />
        )}

        {activeView === 'testing' && <TestingView />}

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
          close={() => {
            setFullNoteTaskId(null);
            setFullNoteTaskDate('');
          }}
          save={saveFullNote}
        />
      )}

      {viewingNoteTask && (
        <NoteViewModal
          task={viewingNoteTask}
          close={closeViewNote}
          edit={(task) => {
            closeViewNote();
            openFullNote(task, task.date);
          }}
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

      {viewingDocumentId && (
        <DocumentViewModal
          doc={data.documents.find((doc) => doc.id === viewingDocumentId)}
          close={closeViewDocument}
          edit={(doc) => openEditDocument(doc)}
        />
      )}

      <div
        className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border-[1.5px] border-ink-800 bg-ink-900 px-5 py-3 text-sm font-extrabold text-white shadow-pop transition-all ${
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
          <h2 className="font-display text-3xl font-medium text-ink-900">
            Chào mừng quay trở lại,{' '}
            <span className="marker font-bold">Học viên!</span>
          </h2>
          <p className="mt-1 text-xs font-semibold text-ink-400">
            Tiến trình học tập thông minh & phân tích hiệu quả IELTS, Auto và
            ghi chú.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border-[1.5px] border-ink-800 bg-paper px-4 py-2 text-xs font-extrabold text-ink-700 shadow-chip">
          <span className="h-2.5 w-2.5 rounded-full border-[1.5px] border-ink-800 bg-teal-400" />
          <span>{syncStatus || 'Hệ thống đang hoạt động ổn định'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="card overflow-hidden md:col-span-2">
          <div className="flex items-center justify-between border-b-[1.5px] border-dashed border-ink-800/25 bg-teal-50 p-5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border-[1.5px] border-ink-800 bg-sun-300 text-ink-900">
                <CalendarCheck size={18} />
              </span>
              <span className="font-display text-lg font-bold text-ink-900">
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
          <div className="flex flex-wrap items-center justify-between gap-3 border-t-[1.5px] border-dashed border-ink-800/25 p-5">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border-[1.5px] border-ink-800 bg-sun-200">
                <span className="text-sm font-extrabold text-ink-900">
                  {weekStats.percent}%
                </span>
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-ink-900">
                  Tiến độ tổng quan
                </h4>
                <p className="mt-0.5 text-xs font-semibold text-ink-400">
                  {weekStats.completed}/{weekStats.total} mục trong tuần này
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveView('tasks')}
              className="btn btn-sm btn-outline"
            >
              Xem chi tiết
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="relative overflow-hidden rounded-card border-[1.5px] border-ink-800 bg-teal-500 p-6 text-white shadow-card">
            <GraduationCap className="absolute -right-6 -bottom-6 h-28 w-28 text-white/20" />
            <span className="inline-flex rounded-full border-[1.5px] border-ink-800 bg-sun-300 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-ink-900">
              Hành trình 2026
            </span>
            <h3 className="mt-3 font-display text-xl font-bold">
              Luyện IELTS & Kỹ năng chuyên môn
            </h3>
            <p className="mt-2 text-xs font-semibold leading-relaxed text-white/85">
              Học đều đặn, tối ưu thời gian và ghi nhớ kiến thức cốt lõi qua hệ
              thống ghi chú thông minh.
            </p>
          </div>

          <div className="card p-5">
            <h4 className="mb-3 font-display text-base font-bold text-ink-900">
              Chú thích lịch học
            </h4>
            <div className="flex flex-col gap-2.5 text-xs font-semibold text-ink-500">
              <LegendDot color="bg-teal-400" label="Đã hoàn thành tất cả mục học" />
              <LegendDot color="bg-sun-300" label="Còn mục học chưa làm" />
              <LegendDot color="bg-white" label="Chưa có lịch hoặc chưa học" />
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
        <h2 className="font-display text-3xl font-medium text-ink-900">
          Lịch <span className="marker font-bold">Học Chi Tiết</span>
        </h2>
        <p className="mt-1 text-xs font-semibold text-ink-400">
          Bấm chọn một ngày bất kỳ để thiết lập danh sách mục tiêu hoàn thành.
        </p>
      </div>

      <div className="card p-6">
        <div className="mb-6 flex items-center justify-between border-b-[1.5px] border-dashed border-ink-800/25 pb-4">
          <span className="font-display text-xl font-bold text-ink-900">
            {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
          </span>
          <MonthControls changeMonth={changeMonth} labels />
        </div>
        <div className="grid grid-cols-7 gap-3">
          {WEEKDAY_SHORT.map((day) => (
            <div
              key={day}
              className="hidden text-xs font-extrabold uppercase tracking-wider text-ink-400 md:block"
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
                className={`min-h-28 rounded-2xl border-[1.5px] p-3 text-left transition-all ${
                  selected
                    ? 'border-ink-800 bg-teal-100 shadow-chip'
                    : 'border-ink-800/20 bg-white hover:border-ink-800 hover:bg-teal-50'
                } ${cell.muted ? 'opacity-45' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-extrabold ${
                      today
                        ? 'border-[1.5px] border-ink-800 bg-sun-300 text-ink-900'
                        : 'text-ink-800'
                    }`}
                  >
                    {cell.day}
                  </span>
                  {stats.total > 0 && (
                    <span
                      className={`rounded-full border-[1.5px] border-ink-800 px-1.5 py-0.5 text-[10px] font-extrabold text-ink-900 ${
                        stats.completed === stats.total
                          ? 'bg-teal-200'
                          : 'bg-sun-200'
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
                      className="truncate text-[10px] font-bold text-ink-500"
                    >
                      • {task.title}
                    </div>
                  ))}
                  {stats.total > 2 && (
                    <div className="text-[9px] font-bold italic text-ink-400">
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
      <div className="card flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={() => setActiveView('dashboard')}
          className="btn btn-sm btn-soft w-max"
        >
          <ArrowLeft size={15} /> Quay lại Dashboard
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-ink-400">
            Bạn đang xem lịch chi tiết ngày:
          </span>
          <span className="rounded-full border-[1.5px] border-ink-800 bg-teal-100 px-3 py-1 text-xs font-extrabold text-ink-900">
            {date.toLocaleDateString('vi-VN', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
        </div>
      </div>

      <div className="card relative flex flex-col items-start justify-between gap-4 overflow-hidden p-6 sm:flex-row sm:items-center">
        <div className="pointer-events-none absolute right-4 top-2 select-none font-display text-7xl font-bold text-ink-50">
          {String(date.getDate()).padStart(2, '0')}
        </div>
        <div className="relative z-10">
          <h2 className="font-display text-3xl font-bold text-ink-900">
            <span className="marker">{VIETNAMESE_DAYS[date.getDay()]}</span>
          </h2>
          <p className="mt-1 text-xs font-extrabold uppercase tracking-wider text-ink-400">
            {ENGLISH_DAYS[date.getDay()]}
          </p>
        </div>
        <div className="relative z-10 flex w-full items-center justify-between gap-3 border-t-[1.5px] border-dashed border-ink-800/20 pt-3 sm:w-auto sm:justify-start sm:border-t-0 sm:pt-0">
          <span className="rounded-full border-[1.5px] border-ink-800 bg-white px-3 py-1.5 text-xs font-extrabold text-ink-800">
            {tasks.length} mục
          </span>
          <button type="button" onClick={openAddTask} className="btn btn-primary">
            <Plus size={16} /> Thêm mục mới
          </button>
        </div>
      </div>

      <div className="card p-4">
        <div className="mb-2 flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-ink-500">
          <span>Tiến độ hoàn thành ngày</span>
          <span className="text-ink-900">{selectedStats.percent}%</span>
        </div>
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ width: `${selectedStats.percent}%` }}
          />
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="card flex flex-col items-center justify-center p-12 text-center">
          <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border-[1.5px] border-ink-800 bg-sun-100 text-ink-800">
            <NotebookPen size={30} />
          </span>
          <h4 className="font-display text-lg font-bold text-ink-900">
            Ngày này chưa có lịch học
          </h4>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={resetToDefaults}
              className="btn btn-sm btn-outline"
            >
              Khôi phục lịch mẫu
            </button>
            <button
              type="button"
              onClick={openAddTask}
              className="btn btn-sm btn-primary"
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
      className={`rounded-card border-[1.5px] p-5 shadow-card transition-all ${styles.bg} ${styles.border}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {task.time && (
              <span
                className={`rounded-full border-[1.5px] px-3 py-0.5 text-xs font-extrabold ${styles.badge}`}
              >
                {task.time}
              </span>
            )}
            <span className="flex h-7 w-7 items-center justify-center rounded-full border-[1.5px] border-ink-800 bg-white">
              <Icon size={14} className={styles.accent} />
            </span>
          </div>
          <h3
            className={`font-display text-xl font-bold ${
              task.completed ? 'text-ink-400 line-through' : styles.text
            }`}
          >
            {task.title}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => deleteTask(task.id)}
            className="icon-btn icon-btn-coral h-8 w-8"
            aria-label="Xóa nhiệm vụ"
          >
            <Trash2 size={15} />
          </button>
          <button
            type="button"
            onClick={() => updateTask(task.id, { completed: !task.completed })}
            className={`flex h-9 w-9 items-center justify-center rounded-full border-[1.5px] border-ink-800 shadow-chip transition-all ${
              task.completed
                ? 'bg-teal-400 text-white'
                : 'bg-white text-ink-300 hover:bg-sun-100'
            }`}
            aria-label="Đánh dấu hoàn thành"
          >
            {task.completed ? <Check size={18} strokeWidth={3} /> : <Circle size={18} />}
          </button>
        </div>
      </div>

      <div className="mt-4 border-t-[1.5px] border-dashed border-ink-800/25 pt-4">
        <div className="mb-3 flex flex-col justify-between gap-2 text-xs font-extrabold text-ink-500 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <NotebookPen size={14} className={styles.accent} />
            <span>Ghi chú bài học</span>
          </div>
          <div className="flex w-max flex-wrap items-center gap-2 rounded-full border-[1.5px] border-ink-800/20 bg-white px-3 py-1">
            <button
              type="button"
              onClick={() => setEditing(!editing)}
              className="flex items-center gap-1 transition-colors hover:text-teal-600"
            >
              <StickyNote size={13} /> {editing ? 'Xem' : 'Sửa'}
            </button>
            <span className="text-ink-200">|</span>
            <button
              type="button"
              onClick={() => openFullNote(task)}
              className="flex items-center gap-1 transition-colors hover:text-teal-600"
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
            className="field-input min-h-24 resize-y font-medium"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="min-h-16 w-full rounded-2xl border-[1.5px] border-ink-800/20 bg-white p-3.5 text-left text-sm transition-all hover:border-ink-800"
          >
            {task.note ? (
              <div
                className="study-note-preview"
                dangerouslySetInnerHTML={{ __html: renderNoteHtml(task.note) }}
              />
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-semibold italic text-ink-400">
                <StickyNote size={14} /> Click vào đây để soạn thảo ghi chú bài
                học...
              </span>
            )}
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold text-ink-400">
        <span className="flex items-center gap-1.5">
          <Icon size={12} /> Lĩnh vực:{' '}
          {['orange', 'purple'].includes(task.theme)
            ? 'IELTS English'
            : 'Chuyên môn'}
        </span>
        {task.completed ? (
          <span className="flex items-center gap-1 rounded-full border-[1.5px] border-ink-800 bg-teal-200 px-2.5 py-0.5 font-extrabold text-ink-900">
            <Check size={12} strokeWidth={3} /> Đã hoàn tất
          </span>
        ) : (
          <span className="rounded-full border-[1.5px] border-dashed border-ink-800/50 px-2.5 py-0.5 font-extrabold text-ink-600">
            Chờ hoàn tất
          </span>
        )}
      </div>
    </article>
  );
}

function NotesView({ notes, selectDate, openFullNote, openViewNote }) {
  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-3xl font-medium text-ink-900">
          Master <span className="marker font-bold">Notes</span>
        </h2>
        <p className="mt-1 text-xs font-semibold text-ink-400">
          Toàn bộ ghi chú đã lưu từ các nhiệm vụ học tập.
        </p>
      </div>

      {notes.length === 0 ? (
        <div className="card p-12 text-center">
          <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-[1.5px] border-ink-800 bg-sun-100 text-ink-800">
            <StickyNote size={30} />
          </span>
          <h4 className="font-display text-lg font-bold text-ink-900">
            Chưa có ghi chú nào được lưu
          </h4>
          <p className="mt-1 text-xs font-semibold text-ink-400">
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
                className="card flex flex-col justify-between p-5 transition-transform hover:-translate-y-0.5"
              >
                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="rounded-full border-[1.5px] border-ink-800 bg-sun-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-ink-900">
                      {task.date} ({VIETNAMESE_DAYS[date.getDay()]})
                    </span>
                    <span className="truncate text-xs font-extrabold text-teal-600">
                      {task.title}
                    </span>
                  </div>
                  <div
                    className="study-note-preview max-h-48 overflow-y-auto border-t-[1.5px] border-dashed border-ink-800/20 pt-3 text-ink-600"
                    dangerouslySetInnerHTML={{ __html: renderNoteHtml(task.note) }}
                  />
                </div>
                <div className="mt-4 flex items-center justify-between gap-2 border-t-[1.5px] border-dashed border-ink-800/20 pt-3">
                  <button
                    type="button"
                    onClick={() => selectDate(date)}
                    className="text-xs font-extrabold text-ink-400 underline decoration-dotted underline-offset-4 hover:text-ink-800"
                  >
                    Đi tới ngày này
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openViewNote(task)}
                      className="btn btn-sm btn-outline"
                    >
                      Xem
                    </button>
                    <button
                      type="button"
                      onClick={() => openFullNote(task, task.date)}
                      className="btn btn-sm btn-primary"
                    >
                      Sửa
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function NoteViewModal({ task, close, edit }) {
  if (!task) return null;
  const date = parseDateString(task.date);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4 backdrop-blur-sm">
      <div className="flex h-[82vh] w-full max-w-2xl flex-col overflow-hidden rounded-card border-[1.5px] border-ink-800 bg-paper shadow-pop">
        <div className="flex items-center justify-between gap-3 border-b-[1.5px] border-ink-800/20 bg-teal-50 p-4">
          <div className="min-w-0">
            <h3 className="truncate font-display text-lg font-bold text-ink-900">
              {task.title}
            </h3>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink-400">
              {task.date} ({VIETNAMESE_DAYS[date.getDay()]})
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="icon-btn icon-btn-coral h-9 w-9"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div
            className="study-note-preview text-sm leading-relaxed text-ink-700"
            dangerouslySetInnerHTML={{ __html: renderNoteHtml(task.note) }}
          />
        </div>
        <div className="flex justify-end gap-2 border-t-[1.5px] border-dashed border-ink-800/25 p-4">
          <button type="button" onClick={close} className="btn btn-sm btn-outline">
            Đóng
          </button>
          <button
            type="button"
            onClick={() => edit(task)}
            className="btn btn-sm btn-primary"
          >
            Sửa
          </button>
        </div>
      </div>
    </div>
  );
}

function DocumentsView({
  documents,
  deleteDocument,
  openEditDocument,
  openViewDocument,
  openNewDocument,
}) {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-3xl font-medium text-ink-900">
            <span className="marker font-bold">Documents</span>
          </h2>
          <p className="mt-1 text-xs font-semibold text-ink-400">
            Kho lưu trữ tài liệu văn bản của bạn — ví dụ câu hỏi Speaking IELTS,
            danh sách từ vựng, hoặc bất kỳ ghi chú dài nào cần tra cứu lại.
          </p>
        </div>
        <button type="button" onClick={openNewDocument} className="btn btn-primary">
          <Plus size={16} /> Tạo tài liệu mới
        </button>
      </div>

      {documents.length === 0 ? (
        <div className="card p-12 text-center">
          <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-[1.5px] border-ink-800 bg-teal-100 text-ink-800">
            <Library size={30} />
          </span>
          <h4 className="font-display text-lg font-bold text-ink-900">
            Chưa có tài liệu nào
          </h4>
          <p className="mt-1 text-xs font-semibold text-ink-400">
            Bấm &quot;Tạo tài liệu mới&quot; để bắt đầu lưu trữ nội dung học tập.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="card flex flex-col justify-between p-5 transition-transform hover:-translate-y-0.5"
            >
              <div>
                <div className="mb-3 flex items-start justify-between gap-3">
                  <h3 className="truncate font-display text-base font-bold text-ink-900">
                    {doc.title}
                  </h3>
                  <span className="shrink-0 rounded-full border-[1.5px] border-ink-800 bg-sky-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-ink-900">
                    {new Date(doc.updatedAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>
                <div
                  className="study-note-preview max-h-48 overflow-y-auto border-t-[1.5px] border-dashed border-ink-800/20 pt-3 text-ink-600"
                  dangerouslySetInnerHTML={{ __html: renderNoteHtml(doc.content) }}
                />
              </div>
              <div className="mt-4 flex justify-end gap-2 border-t-[1.5px] border-dashed border-ink-800/20 pt-3">
                <button
                  type="button"
                  onClick={() => deleteDocument(doc.id)}
                  className="btn btn-sm btn-coral"
                >
                  Xóa
                </button>
                <button
                  type="button"
                  onClick={() => openViewDocument(doc)}
                  className="btn btn-sm btn-outline"
                >
                  Xem
                </button>
                <button
                  type="button"
                  onClick={() => openEditDocument(doc)}
                  className="btn btn-sm btn-primary"
                >
                  Sửa
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
  const answerRefs = useRef({});

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

  function applyAnswerFormatting(questionId, command, value) {
    const el = answerRefs.current[questionId];
    if (!el) return;
    el.focus();
    document.execCommand(command, false, value);
    updateQuestionNote(questionId, el.innerHTML);
  }

  function handleAnswerPaste(event) {
    event.preventDefault();
    const text = event.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
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
          <h2 className="font-display text-3xl font-medium text-ink-900">
            <span className="marker font-bold">Speaking</span>
          </h2>
        </div>
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Tìm câu hỏi..."
            className="field-input rounded-full pr-10"
          />
          <Search
            size={16}
            className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-400"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <aside className="flex flex-col gap-4 lg:col-span-4">
          <div className="grid grid-cols-3 gap-1 rounded-full border-[1.5px] border-ink-800 bg-white p-1">
            {SPEAKING_PARTS.map((part) => (
              <button
                key={part.id}
                type="button"
                onClick={() => changePart(part.id)}
                className={`rounded-full py-1.5 text-center text-xs font-extrabold transition-all ${
                  activePart === part.id
                    ? 'bg-teal-500 text-white'
                    : 'text-ink-500 hover:bg-ink-50 hover:text-ink-800'
                }`}
              >
                {part.label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-ink-400">
              <Compass size={16} /> Chủ đề
            </h3>
            <button
              type="button"
              onClick={() => setTopicModalOpen(true)}
              className="icon-btn h-8 w-8 border-ink-800 bg-sun-300 text-ink-900 hover:bg-sun-400"
              title="Thêm chủ đề mới"
            >
              <Plus size={14} />
            </button>
          </div>

          <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto pr-1">
            {activeTopicsList.length === 0 ? (
              <p className="card-dashed p-4 text-center text-xs font-semibold italic text-ink-400">
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
                    className={`w-full rounded-2xl border-[1.5px] px-4 py-3 text-left text-sm font-extrabold transition-all ${
                      isSelected
                        ? 'border-ink-800 bg-teal-100 text-ink-900 shadow-chip'
                        : 'border-ink-800/20 bg-white text-ink-600 hover:border-ink-800 hover:bg-teal-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate">{topic.name}</span>
                      {totalCount > 0 && (
                        <span className="shrink-0 rounded-full border-[1.5px] border-ink-800 bg-sun-200 px-1.5 py-0.5 text-[10px] font-extrabold text-ink-900">
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
            <div className="card flex flex-col items-center justify-center gap-4 p-12 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full border-[1.5px] border-ink-800 bg-coral-100 text-ink-800">
                <FolderOpen size={30} />
              </span>
              <div>
                <h4 className="font-display text-lg font-bold text-ink-900">
                  Chưa chọn chủ đề nào
                </h4>
                <p className="mt-1 text-xs font-semibold text-ink-400">
                  Hãy chọn một chủ đề bên trái hoặc tạo chủ đề mới để bắt đầu.
                </p>
              </div>
            </div>
          ) : (
            <div className="card p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b-[1.5px] border-dashed border-ink-800/25 pb-4">
                <div>
                  <h3 className="font-display text-2xl font-bold text-ink-900">
                    {selectedTopic.name}
                  </h3>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuestionModalOpen(true)}
                    className="btn btn-sm btn-outline"
                  >
                    <Plus size={14} /> Thêm câu hỏi
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteTopic(selectedTopic.id)}
                    className="icon-btn icon-btn-coral h-8 w-8"
                    title="Xóa chủ đề"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {selectedTopic.questions.length === 0 ? (
                <p className="py-12 text-center text-sm font-semibold italic text-ink-400">
                  Chưa có câu hỏi nào trong chủ đề này. Nhấn &quot;Thêm câu hỏi&quot;
                  để bắt đầu.
                </p>
              ) : (
                <div className="flex flex-col gap-4">
                  {selectedTopic.questions.map((q) => (
                    <div
                      key={q.id}
                      className={`rounded-card border-[1.5px] p-4 transition-all ${
                        q.completed
                          ? 'border-ink-800 bg-teal-50'
                          : 'border-ink-800/20 bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => toggleQuestionComplete(q.id)}
                          className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[1.5px] border-ink-800 transition-all ${
                            q.completed
                              ? 'bg-teal-400 text-white'
                              : 'bg-white text-transparent hover:bg-sun-100'
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
                          className={`flex-1 text-[15px] font-bold leading-relaxed ${
                            q.completed ? 'text-ink-500' : 'text-ink-900'
                          }`}
                        >
                          {q.text}
                        </p>
                        <button
                          type="button"
                          onClick={() => deleteQuestion(q.id)}
                          className="icon-btn icon-btn-coral h-7 w-7"
                          title="Xóa câu hỏi"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <div className="mt-4 rounded-2xl border-[1.5px] border-dashed border-ink-800/30 bg-ink-50/60 p-3">
                        <div className="mb-2 flex items-center justify-between gap-2 text-[11px] font-extrabold">
                          <span className="uppercase tracking-wider text-ink-400">
                            Câu trả lời
                          </span>
                          {savingStates[q.id] === 'saving' && (
                            <span className="text-sun-600">Đang lưu...</span>
                          )}
                          {savingStates[q.id] === 'saved' && (
                            <span className="text-teal-600">Đã tự lưu</span>
                          )}
                        </div>

                        <div className="mb-1.5 flex items-center gap-1">
                          <button
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => applyAnswerFormatting(q.id, 'bold')}
                            title="In đậm phần đã bôi đen"
                            className="icon-btn h-7 w-7"
                          >
                            <Bold size={14} />
                          </button>
                          <button
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() =>
                              applyAnswerFormatting(q.id, 'hiliteColor', '#fbd95f')
                            }
                            title="Tô màu phần đã bôi đen"
                            className="icon-btn h-7 w-7"
                          >
                            <Highlighter size={14} />
                          </button>
                        </div>
                        <div
                          ref={(el) => {
                            if (!el) return;
                            answerRefs.current[q.id] = el;
                            if (el.dataset.seeded !== '1') {
                              el.innerHTML = q.userNote || '';
                              el.dataset.seeded = '1';
                            }
                          }}
                          contentEditable
                          suppressContentEditableWarning
                          onInput={(event) =>
                            updateQuestionNote(q.id, event.currentTarget.innerHTML)
                          }
                          onPaste={handleAnswerPaste}
                          data-placeholder="Nhập câu trả lời của bạn vào đây... Bôi đen chữ rồi bấm nút để in đậm/tô màu."
                          className="rich-note-cell field-input min-h-[3rem] bg-white text-sm leading-relaxed"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4 backdrop-blur-sm">
          <form
            onSubmit={submitAddTopic}
            className="flex w-full max-w-md flex-col gap-4 rounded-card border-[1.5px] border-ink-800 bg-paper p-6 shadow-pop"
          >
            <div className="flex items-center justify-between">
              <h4 className="font-display text-xl font-bold text-ink-900">
                Thêm chủ đề nói mới
              </h4>
              <button
                type="button"
                onClick={() => setTopicModalOpen(false)}
                className="icon-btn icon-btn-coral h-9 w-9"
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
                className="btn btn-sm btn-outline"
              >
                Hủy
              </button>
              <button type="submit" className="btn btn-sm btn-primary">
                Lưu chủ đề
              </button>
            </div>
          </form>
        </div>
      )}

      {questionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4 backdrop-blur-sm">
          <form
            onSubmit={submitAddQuestion}
            className="flex w-full max-w-md flex-col gap-4 rounded-card border-[1.5px] border-ink-800 bg-paper p-6 shadow-pop"
          >
            <div className="flex items-center justify-between">
              <h4 className="font-display text-xl font-bold text-ink-900">
                Thêm câu hỏi luyện nói
              </h4>
              <button
                type="button"
                onClick={() => setQuestionModalOpen(false)}
                className="icon-btn icon-btn-coral h-9 w-9"
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
                className="btn btn-sm btn-outline"
              >
                Hủy
              </button>
              <button type="submit" className="btn btn-sm btn-primary">
                Lưu câu hỏi
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

function TestingAnswerRenderer({ text, onWordClick }) {
  const paragraphs = text.split('\n').filter((p) => p.trim());
  return (
    <div>
      {paragraphs.map((para, pi) => {
        const tokens = para.split(/(\w+)/);
        return (
          <p
            key={pi}
            className="mb-3 text-sm font-medium leading-relaxed text-ink-700 last:mb-0"
          >
            {tokens.map((token, i) => {
              if (i % 2 === 1) {
                return (
                  <span
                    key={i}
                    className="cursor-pointer rounded px-px hover:bg-sun-200 hover:text-ink-900"
                    onClick={(e) => onWordClick(token, e)}
                  >
                    {token}
                  </span>
                );
              }
              return token || null;
            })}
          </p>
        );
      })}
    </div>
  );
}

function TestingView() {
  const [expandedSections, setExpandedSections] = useState(() => {
    const init = {};
    if (TESTING_DATA[0]) init[TESTING_DATA[0].id] = true;
    return init;
  });
  const [selectedQ, setSelectedQ] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [tooltip, setTooltip] = useState(null);

  const query = searchQuery.trim().toLowerCase();

  const filteredSections = useMemo(() => {
    if (!query) return TESTING_DATA;
    return TESTING_DATA.map((section) => ({
      ...section,
      questions: section.questions.filter(
        (q) =>
          q.question.toLowerCase().includes(query) ||
          q.answer.toLowerCase().includes(query),
      ),
    })).filter((s) => s.questions.length > 0);
  }, [query]);

  useEffect(() => {
    if (!query) return;
    const expanded = {};
    filteredSections.forEach((s) => {
      expanded[s.id] = true;
    });
    setExpandedSections(expanded);
  }, [query]);

  useEffect(() => {
    if (!selectedQ || !query) return;
    const section = filteredSections.find((s) => s.id === selectedQ.sectionId);
    if (!section || !section.questions.find((q) => q.id === selectedQ.qId)) {
      setSelectedQ(null);
    }
  }, [filteredSections, selectedQ, query]);

  const fullSelectedQ = useMemo(() => {
    if (!selectedQ) return null;
    const section = TESTING_DATA.find((s) => s.id === selectedQ.sectionId);
    if (!section) return null;
    const q = section.questions.find((q) => q.id === selectedQ.qId);
    if (!q) return null;
    return { ...q, sectionTitle: section.title };
  }, [selectedQ]);

  function toggleSection(sectionId) {
    setExpandedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  }

  function selectQuestion(sectionId, qId) {
    setSelectedQ({ sectionId, qId });
    setTooltip(null);
  }

  async function handleWordClick(word, event) {
    event.stopPropagation();
    if (word.length < 2 || /^\d+$/.test(word)) return;
    const rect = event.target.getBoundingClientRect();
    const x = Math.min(rect.left, window.innerWidth - 320);
    const y = rect.bottom + 8;

    // Glossary takes priority (instant, no API needed)
    const canonical = Object.keys(TESTING_GLOSSARY).find(
      (k) => k.toLowerCase() === word.toLowerCase(),
    );
    if (canonical) {
      setTooltip({ word: canonical, translation: TESTING_GLOSSARY[canonical], loading: false, x, y });
      return;
    }

    // Check cache
    const cacheKey = word.toLowerCase();
    if (translationCache.has(cacheKey)) {
      setTooltip({ word, translation: translationCache.get(cacheKey), loading: false, x, y });
      return;
    }

    // Show loading → call Google Translate (unofficial, no key needed)
    setTooltip({ word, translation: null, loading: true, x, y });
    try {
      const res = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=${encodeURIComponent(word)}`,
      );
      const data = await res.json();
      const translation = data?.[0]?.[0]?.[0];
      const result =
        translation && translation.toLowerCase() !== word.toLowerCase()
          ? translation
          : '(không tìm thấy)';
      translationCache.set(cacheKey, result);
      setTooltip((prev) => (prev?.word === word ? { ...prev, translation: result, loading: false } : prev));
    } catch {
      setTooltip((prev) =>
        prev?.word === word ? { ...prev, translation: 'Lỗi kết nối', loading: false } : prev,
      );
    }
  }

  useEffect(() => {
    if (!tooltip) return;
    function close() {
      setTooltip(null);
    }
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [tooltip]);

  const totalQuestions = TESTING_DATA.reduce((s, sec) => s + sec.questions.length, 0);

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-3xl font-medium text-ink-900">
            Testing <span className="marker font-bold">Q&amp;A</span>
          </h2>
          <p className="mt-1 text-xs font-semibold text-ink-400">
            {totalQuestions} câu hỏi · {TESTING_DATA.length} sections
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm câu hỏi..."
            className="field-input rounded-full pr-10"
          />
          <Search
            size={16}
            className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-400"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <aside className="lg:col-span-4">
          <div className="flex max-h-[72vh] flex-col gap-1.5 overflow-y-auto pr-1">
            {filteredSections.length === 0 ? (
              <p className="card-dashed p-4 text-center text-xs font-semibold italic text-ink-400">
                Không tìm thấy câu hỏi nào
              </p>
            ) : (
              filteredSections.map((section) => {
                const isExpanded = !!expandedSections[section.id];
                const origIdx = TESTING_DATA.findIndex((s) => s.id === section.id);
                return (
                  <div key={section.id}>
                    <button
                      type="button"
                      onClick={() => toggleSection(section.id)}
                      className="flex w-full items-center justify-between gap-2 rounded-2xl border-[1.5px] border-ink-800/20 bg-white px-3 py-2.5 text-left transition-colors hover:border-ink-800 hover:bg-teal-50"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="shrink-0 rounded-full border-[1.5px] border-ink-800 bg-sun-200 px-1.5 py-0.5 text-[10px] font-extrabold text-ink-900">
                          {origIdx + 1}
                        </span>
                        <span className="truncate text-xs font-extrabold text-ink-800">
                          {section.title}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span className="rounded-full border-[1.5px] border-ink-800/25 px-1.5 py-0.5 text-[10px] font-extrabold text-ink-500">
                          {section.questions.length}
                        </span>
                        <ChevronRight
                          size={13}
                          className={`text-ink-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                        />
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="mt-1 flex flex-col gap-1 pl-3">
                        {section.questions.map((q) => {
                          const isSelected = selectedQ?.qId === q.id;
                          return (
                            <button
                              key={q.id}
                              type="button"
                              onClick={() => selectQuestion(section.id, q.id)}
                              className={`w-full rounded-xl border-l-[3px] px-3 py-2 text-left text-xs font-semibold transition-all ${
                                isSelected
                                  ? 'border-ink-800 bg-teal-100 font-extrabold text-ink-900'
                                  : 'border-ink-800/20 bg-white text-ink-600 hover:border-ink-800 hover:bg-ink-50'
                              }`}
                            >
                              <span className="line-clamp-2">{q.question}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </aside>

        <div className="lg:col-span-8">
          {!fullSelectedQ ? (
            <div className="card flex flex-col items-center justify-center gap-4 p-12 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full border-[1.5px] border-ink-800 bg-sky-100 text-ink-800">
                <FolderOpen size={30} />
              </span>
              <div>
                <h4 className="font-display text-lg font-bold text-ink-900">
                  Chưa chọn câu hỏi nào
                </h4>
                <p className="mt-1 text-xs font-semibold text-ink-400">
                  Chọn một câu hỏi từ danh sách bên trái để xem nội dung.
                </p>
              </div>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="border-b-[1.5px] border-dashed border-ink-800/25 bg-teal-50 px-6 py-4">
                <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-wider text-ink-400">
                  {fullSelectedQ.sectionTitle}
                </p>
                <h3 className="font-display text-lg font-bold leading-snug text-ink-900">
                  {fullSelectedQ.question}
                </h3>
              </div>
              <div className="px-6 py-5">
                <p className="mb-3 text-[10px] font-extrabold uppercase tracking-wider text-ink-400">
                  Bấm vào bất kỳ từ nào để xem nghĩa tiếng Việt
                </p>
                <TestingAnswerRenderer text={fullSelectedQ.answer} onWordClick={handleWordClick} />
              </div>
            </div>
          )}
        </div>
      </div>

      {tooltip && (
        <div
          className="fixed z-50 max-w-xs rounded-2xl border-[1.5px] border-ink-800 bg-paper p-3 shadow-pop"
          style={{ top: tooltip.y, left: tooltip.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="mb-1 text-xs font-extrabold text-teal-600">{tooltip.word}</p>
          {tooltip.loading ? (
            <p className="text-xs font-semibold italic text-ink-400">Đang dịch...</p>
          ) : (
            <p className="text-xs font-semibold leading-relaxed text-ink-600">
              {tooltip.translation}
            </p>
          )}
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
        <h2 className="font-display text-3xl font-medium text-ink-900">
          <span className="marker font-bold">Settings</span>
        </h2>
        <p className="mt-1 text-xs font-semibold text-ink-400">
          Lập lịch hàng loạt theo rule, xem lại rule đã tạo và quản lý dữ liệu.
        </p>
      </div>

      <form onSubmit={submit} className="card flex flex-col gap-5 p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border-[1.5px] border-ink-800 bg-teal-100 text-ink-800">
              <Settings size={17} />
            </span>
            <h3 className="font-display text-lg font-bold text-ink-900">
              {editingRuleId ? 'Sửa rule lịch học' : 'Tạo lịch tự động'}
            </h3>
          </div>
          {editingRuleId && (
            <button
              type="button"
              onClick={cancelRuleEdit}
              className="btn btn-sm btn-outline w-max"
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
          <label className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-ink-500">
            Chọn thứ trong tuần
          </label>
          <div className="flex flex-wrap gap-2">
            {VIETNAMESE_DAYS.map((day, index) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleWeekday(index)}
                className={`rounded-full border-[1.5px] px-3.5 py-2 text-xs font-extrabold transition-colors ${
                  bulkTask.weekdays.includes(index)
                    ? 'border-ink-800 bg-teal-500 text-white shadow-chip'
                    : 'border-ink-800/25 bg-white text-ink-500 hover:border-ink-800 hover:bg-ink-50'
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

        <button type="submit" className="btn btn-primary w-max">
          <Plus size={16} /> {editingRuleId ? 'Cập nhật rule' : 'Áp dụng lịch'}
        </button>
      </form>

      <div className="card p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h3 className="font-display text-lg font-bold text-ink-900">
              Rule hiện tại
            </h3>
            <p className="mt-1 text-xs font-semibold text-ink-400">
              Tất cả rule đã lưu, kèm trạng thái đã apply vào lịch học.
            </p>
          </div>
          <span className="w-max rounded-full border-[1.5px] border-ink-800 bg-sun-200 px-3 py-1 text-xs font-extrabold text-ink-900">
            {rules.length} rule
          </span>
        </div>

        {rules.length === 0 ? (
          <div className="card-dashed mt-5 p-6 text-center">
            <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full border-[1.5px] border-ink-800 bg-sun-100 text-ink-800">
              <CalendarDays size={26} />
            </span>
            <p className="font-display text-base font-bold text-ink-900">
              Chưa có rule nào được tạo
            </p>
            <p className="mt-1 text-xs font-semibold text-ink-400">
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

      <div className="rounded-card border-[1.5px] border-ink-800 bg-coral-50 p-6 shadow-card">
        <h3 className="font-display text-lg font-bold text-ink-900">
          Quản lý dữ liệu
        </h3>
        <p className="mt-1 text-xs font-semibold text-ink-400">
          Dữ liệu được lưu trên máy và đồng bộ với server khi có mạng.
        </p>
        <button type="button" onClick={clearAllData} className="btn btn-coral mt-4">
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
      className={`rounded-card border-[1.5px] p-4 ${
        isEditing ? 'border-ink-800 bg-teal-100 shadow-chip' : 'border-ink-800/20 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border-[1.5px] px-2.5 py-0.5 text-[10px] font-extrabold ${styles.badge}`}
            >
              {THEME_LABELS[rule.theme] || rule.theme}
            </span>
            <span className="rounded-full border-[1.5px] border-dashed border-ink-800/50 px-2.5 py-0.5 text-[10px] font-extrabold text-ink-600">
              Đã apply {rule.appliedCount || 0} buổi
            </span>
          </div>
          <h4 className="truncate font-display text-base font-bold text-ink-900">
            {rule.title}
          </h4>
        </div>
        {isEditing && (
          <span className="shrink-0 rounded-full border-[1.5px] border-ink-800 bg-sun-300 px-2.5 py-0.5 text-[10px] font-extrabold text-ink-900">
            Đang sửa
          </span>
        )}
      </div>

      <dl className="mt-3 grid grid-cols-1 gap-2 text-xs text-ink-500 sm:grid-cols-2">
        <div>
          <dt className="text-[10px] font-extrabold uppercase tracking-wide text-ink-400">
            Khoảng ngày
          </dt>
          <dd className="mt-0.5 font-bold text-ink-800">
            {rule.startDate} - {rule.endDate}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-extrabold uppercase tracking-wide text-ink-400">
            Thời gian
          </dt>
          <dd className="mt-0.5 font-bold text-ink-800">{timeText}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-[10px] font-extrabold uppercase tracking-wide text-ink-400">
            Thứ áp dụng
          </dt>
          <dd className="mt-0.5 font-bold text-ink-800">{weekdayText}</dd>
        </div>
      </dl>

      <div className="mt-4 flex justify-end gap-2 border-t-[1.5px] border-dashed border-ink-800/25 pt-3">
        <button
          type="button"
          onClick={() => editRule(rule)}
          className="btn btn-sm btn-outline"
        >
          Sửa
        </button>
        <button
          type="button"
          onClick={() => deleteRule(rule.id)}
          className="btn btn-sm btn-coral"
        >
          Xóa
        </button>
      </div>
    </article>
  );
}

function AddTaskModal({ newTask, setNewTask, close, submit }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-card border-[1.5px] border-ink-800 bg-paper shadow-pop">
        <div className="flex items-center justify-between border-b-[1.5px] border-ink-800/20 bg-teal-50 p-5">
          <h3 className="font-display text-xl font-bold text-ink-900">
            Thêm nhiệm vụ học tập
          </h3>
          <button
            type="button"
            onClick={close}
            className="icon-btn icon-btn-coral h-9 w-9"
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
            <button type="button" onClick={close} className="btn btn-sm btn-outline">
              Hủy
            </button>
            <button type="submit" className="btn btn-sm btn-primary">
              Thêm nhiệm vụ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FullNoteModal({ draft, setDraft, close, save }) {
  const editorRef = useRef(null);

  function applyFormatting(command, value) {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    document.execCommand(command, false, value);
    setDraft(el.innerHTML);
  }

  function handlePaste(event) {
    event.preventDefault();
    const text = event.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4 backdrop-blur-sm">
      <div className="flex h-[82vh] w-full max-w-2xl flex-col overflow-hidden rounded-card border-[1.5px] border-ink-800 bg-paper shadow-pop">
        <div className="flex items-center justify-between border-b-[1.5px] border-ink-800/20 bg-teal-50 p-4">
          <h3 className="font-display text-xl font-bold text-ink-900">
            Soạn ghi chú
          </h3>
          <button
            type="button"
            onClick={close}
            className="icon-btn icon-btn-coral h-9 w-9"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center gap-1.5 border-b-[1.5px] border-dashed border-ink-800/25 bg-white px-4 py-2">
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyFormatting('bold')}
            title="In đậm phần đã bôi đen"
            className="icon-btn h-8 w-8"
          >
            <Bold size={16} />
          </button>
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyFormatting('hiliteColor', '#fbd95f')}
            title="Tô màu phần đã bôi đen"
            className="icon-btn h-8 w-8"
          >
            <Highlighter size={16} />
          </button>
        </div>

        <div
          ref={(el) => {
            if (!el) return;
            editorRef.current = el;
            if (el.dataset.seeded !== '1') {
              el.innerHTML = draft || '';
              el.dataset.seeded = '1';
            }
          }}
          contentEditable
          suppressContentEditableWarning
          onInput={(event) => setDraft(event.currentTarget.innerHTML)}
          onPaste={handlePaste}
          data-placeholder="Viết ghi chú ở đây... Bôi đen chữ rồi bấm nút để in đậm/tô màu."
          className="rich-note-cell min-h-0 flex-1 overflow-y-auto p-5 text-sm font-medium leading-relaxed outline-none"
        />

        <div className="flex justify-end gap-2 border-t-[1.5px] border-dashed border-ink-800/25 p-4">
          <button type="button" onClick={close} className="btn btn-sm btn-outline">
            Đóng
          </button>
          <button type="button" onClick={save} className="btn btn-sm btn-primary">
            Lưu ghi chú
          </button>
        </div>
      </div>
    </div>
  );
}

function DocumentModal({ draft, isEditing, setDraft, close, save }) {
  const editorRef = useRef(null);

  function applyFormatting(command, value) {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    document.execCommand(command, false, value);
    setDraft((current) => ({ ...current, content: el.innerHTML }));
  }

  function handlePaste(event) {
    event.preventDefault();
    const html = event.clipboardData.getData('text/html');
    if (html) {
      document.execCommand('insertHTML', false, sanitizePastedHtml(html));
      return;
    }
    const text = event.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4 backdrop-blur-sm">
      <div className="flex h-[82vh] w-full max-w-2xl flex-col overflow-hidden rounded-card border-[1.5px] border-ink-800 bg-paper shadow-pop">
        <div className="flex items-center justify-between border-b-[1.5px] border-ink-800/20 bg-teal-50 p-4">
          <h3 className="font-display text-xl font-bold text-ink-900">
            {isEditing ? 'Sửa tài liệu' : 'Tạo tài liệu mới'}
          </h3>
          <button
            type="button"
            onClick={close}
            className="icon-btn icon-btn-coral h-9 w-9"
          >
            <X size={18} />
          </button>
        </div>
        <div className="border-b-[1.5px] border-dashed border-ink-800/25 p-4">
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

        <div className="flex items-center gap-1.5 border-b-[1.5px] border-dashed border-ink-800/25 bg-white px-4 py-2">
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyFormatting('bold')}
            title="In đậm phần đã bôi đen"
            className="icon-btn h-8 w-8"
          >
            <Bold size={16} />
          </button>
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyFormatting('hiliteColor', '#fbd95f')}
            title="Tô màu phần đã bôi đen"
            className="icon-btn h-8 w-8"
          >
            <Highlighter size={16} />
          </button>
        </div>

        <div
          ref={(el) => {
            if (!el) return;
            editorRef.current = el;
            if (el.dataset.seeded !== '1') {
              el.innerHTML = renderNoteHtml(draft.content);
              el.dataset.seeded = '1';
            }
          }}
          contentEditable
          suppressContentEditableWarning
          onInput={(event) => {
            const html = event.currentTarget.innerHTML;
            setDraft((current) => ({ ...current, content: html }));
          }}
          onPaste={handlePaste}
          data-placeholder="Dán hoặc soạn nội dung tài liệu ở đây... Bôi đen chữ rồi bấm nút để in đậm/tô màu."
          className="rich-note-cell min-h-0 flex-1 overflow-y-auto p-5 text-sm font-medium leading-relaxed outline-none"
        />

        <div className="flex justify-end gap-2 border-t-[1.5px] border-dashed border-ink-800/25 p-4">
          <button type="button" onClick={close} className="btn btn-sm btn-outline">
            Đóng
          </button>
          <button type="button" onClick={save} className="btn btn-sm btn-primary">
            Lưu tài liệu
          </button>
        </div>
      </div>
    </div>
  );
}

function DocumentViewModal({ doc, close, edit }) {
  if (!doc) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4 backdrop-blur-sm">
      <div className="flex h-[82vh] w-full max-w-2xl flex-col overflow-hidden rounded-card border-[1.5px] border-ink-800 bg-paper shadow-pop">
        <div className="flex items-center justify-between gap-3 border-b-[1.5px] border-ink-800/20 bg-teal-50 p-4">
          <h3 className="truncate font-display text-xl font-bold text-ink-900">
            {doc.title}
          </h3>
          <button
            type="button"
            onClick={close}
            className="icon-btn icon-btn-coral h-9 w-9"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div
            className="study-note-preview text-sm leading-relaxed text-ink-700"
            dangerouslySetInnerHTML={{
              __html: doc.content
                ? renderNoteHtml(doc.content)
                : '<span class="text-ink-400 italic">Tài liệu chưa có nội dung.</span>',
            }}
          />
        </div>
        <div className="flex justify-end gap-2 border-t-[1.5px] border-dashed border-ink-800/25 p-4">
          <button type="button" onClick={close} className="btn btn-sm btn-outline">
            Đóng
          </button>
          <button
            type="button"
            onClick={() => edit(doc)}
            className="btn btn-sm btn-primary"
          >
            Sửa
          </button>
        </div>
      </div>
    </div>
  );
}

function MiniCalendar({ cells, data, selectedDate, selectDate }) {
  return (
    <div className="p-6">
      <div className="mb-4 grid grid-cols-7 gap-y-2 text-center text-xs font-extrabold uppercase tracking-widest text-ink-400">
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
              ? 'bg-ink-200'
              : stats.completed === stats.total
                ? 'bg-teal-400'
                : 'bg-sun-400';
          return (
            <button
              key={cell.key}
              type="button"
              onClick={() => selectDate(cell.date)}
              className={`relative flex h-11 items-center justify-center rounded-full border-[1.5px] text-sm font-bold transition-all ${
                selected
                  ? 'border-ink-800 bg-teal-500 text-white shadow-chip'
                  : today
                    ? 'border-ink-800 bg-sun-300 text-ink-900'
                    : 'border-transparent text-ink-700 hover:border-ink-800/30 hover:bg-teal-50'
              } ${cell.muted ? 'opacity-40' : ''}`}
            >
              {cell.day}
              {stats.total > 0 && (
                <span
                  className={`absolute bottom-1 h-1.5 w-1.5 rounded-full ${selected ? 'bg-white' : dot}`}
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
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => changeMonth(-1)}
        className="icon-btn h-9 gap-2 border-ink-800 px-2.5 hover:bg-coral-100"
      >
        <ChevronLeft size={15} />
        {labels && <span className="hidden text-xs font-extrabold sm:inline">Tháng trước</span>}
      </button>
      <button
        type="button"
        onClick={() => changeMonth(1)}
        className="icon-btn h-9 gap-2 border-ink-800 px-2.5 hover:bg-coral-100"
      >
        {labels && <span className="hidden text-xs font-extrabold sm:inline">Tháng sau</span>}
        <ChevronRight size={15} />
      </button>
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-3.5 w-3.5 rounded-full border-[1.5px] border-ink-800 ${color}`} />
      <span>{label}</span>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide text-ink-500">
        {label}
      </span>
      {children}
    </label>
  );
}

export default App;
