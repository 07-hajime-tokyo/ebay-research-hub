"use client";

import { useMemo, useState, type SetStateAction } from "react";
import { CalendarDays, GripVertical, Plus, Trash2, X } from "lucide-react";
import type { EbayTask } from "@/lib/ebay-supabase";

type ViewMode = "day" | "week" | "month";

type ResearchTask = EbayTask;

type ResearchTaskInput = Omit<ResearchTask, "id">;

function makeEmptyTask(today: string): ResearchTaskInput {
  return {
    title: "",
    status: "未着手",
    stage: "リサーチ",
    date: today,
    due: "10:00",
    end: "11:00",
    owner: "",
    minutes: 60,
    priority: "中",
    display: "今日",
    pinned: false,
    note: "",
  };
}

const stages = ["リサーチ", "仕入れ", "出品準備", "価格確認", "分析", "レビュー", "その他"];
const statuses = ["未着手", "進行中", "確認待ち", "完了"];
const priorities = ["高", "中", "低"];
const displays = ["今日", "通常", "未配置"];
const tones = [
  "bg-[#9fb1d0] border-[#536892]",
  "bg-[#c9a4c8] border-[#8b658b]",
  "bg-[#9fc0a4] border-[#628166]",
  "bg-[#e1b9b3] border-[#a66b64]",
  "bg-[#dccb91] border-[#9b8756]",
];

function minutesFromTime(time?: string) {
  if (!time) return null;
  const [hours, minutes] = time.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

function timeFromMinutes(total: number) {
  const clamped = Math.max(0, Math.min(23 * 60 + 45, Math.round(total / 15) * 15));
  const hours = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function weekStart(date: Date) {
  const start = new Date(date);
  const day = start.getDay();
  start.setDate(start.getDate() + (day === 0 ? -6 : 1 - day));
  return start;
}

function formatShortDate(key: string) {
  const date = new Date(`${key}T00:00:00+09:00`);
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
  }).format(date);
}

function weekOfMonth(date: Date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  return Math.ceil((date.getDate() + first.getDay()) / 7);
}

function totalMinutes(tasks: ResearchTask[]) {
  return tasks.reduce((sum, task) => sum + (task.minutes || 0), 0);
}

function primaryStage(tasks: ResearchTask[]) {
  const counts = tasks.reduce<Record<string, number>>((acc, task) => {
    acc[task.stage] = (acc[task.stage] ?? 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "未配置";
}

function normalizeTask(task: ResearchTask): ResearchTaskInput {
  const { id: _id, ...input } = task;
  return input;
}

async function saveTaskRequest(task: ResearchTaskInput, id?: string) {
  const response = await fetch(id ? `/api/ebay/tasks/${id}` : "/api/ebay/tasks", {
    method: id ? "PATCH" : "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(task),
  });
  if (!response.ok) throw new Error(await response.text());
  const data = await response.json();
  return data.task as ResearchTask;
}

async function deleteTaskRequest(id: string) {
  const response = await fetch(`/api/ebay/tasks/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error(await response.text());
}

export function ResearchScheduleWorkspace({
  initialTasks = [],
  tasks: controlledTasks,
  onTasksChange,
  todayKey,
  nowLabel,
}: {
  initialTasks?: ResearchTask[];
  tasks?: ResearchTask[];
  onTasksChange?: (tasks: ResearchTask[]) => void;
  todayKey: string;
  nowLabel: string;
}) {
  const emptyTask = useMemo(() => makeEmptyTask(todayKey), [todayKey]);
  const [internalTasks, setInternalTasks] = useState(initialTasks);
  const [view, setView] = useState<ViewMode>("day");
  const [selectedId, setSelectedId] = useState(initialTasks[0]?.id ?? "");
  const [form, setForm] = useState<ResearchTaskInput>(() =>
    initialTasks[0] ? normalizeTask(initialTasks[0]) : { ...emptyTask },
  );
  const [quickTitle, setQuickTitle] = useState("");
  const [quickMinutes, setQuickMinutes] = useState(60);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [message, setMessage] = useState("");
  const tasks = controlledTasks ?? internalTasks;

  function setTasks(next: SetStateAction<ResearchTask[]>) {
    if (controlledTasks) {
      onTasksChange?.(typeof next === "function" ? next(tasks) : next);
      return;
    }
    setInternalTasks(next);
  }

  const selectedTask = tasks.find((task) => task.id === selectedId);
  const todayTasks = useMemo(() => tasks.filter((task) => task.date === todayKey), [tasks, todayKey]);
  const weekDays = useMemo(() => {
    const start = weekStart(new Date(`${todayKey}T00:00:00+09:00`));
    return Array.from({ length: 7 }).map((_, index) => {
      const key = dateKey(addDays(start, index));
      const dayTasks = tasks.filter((task) => task.date === key);
      return {
        key,
        day: ["月", "火", "水", "木", "金", "土", "日"][index],
        tasks: dayTasks,
      };
    });
  }, [tasks, todayKey]);

  const monthRows = useMemo(() => {
    const base = new Date(`${todayKey}T00:00:00+09:00`);
    const groups = tasks.reduce<Record<string, ResearchTask[]>>((acc, task) => {
      if (!task.date) return acc;
      const date = new Date(`${task.date}T00:00:00+09:00`);
      if (date.getMonth() !== base.getMonth() || date.getFullYear() !== base.getFullYear()) return acc;
      const key = `${weekOfMonth(date)}週目`;
      acc[key] = [...(acc[key] ?? []), task];
      return acc;
    }, {});
    return Object.entries(groups).map(([week, weekTasks]) => ({ week, tasks: weekTasks }));
  }, [tasks, todayKey]);

  function updateForm<K extends keyof ResearchTaskInput>(key: K, value: ResearchTaskInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function selectTask(task: ResearchTask) {
    setSelectedId(task.id);
    setForm(normalizeTask(task));
    setModalOpen(true);
  }

  function newTask(date = todayKey) {
    setSelectedId("");
    setForm({ ...emptyTask, date, display: date === todayKey ? "今日" : "通常" });
    setModalOpen(true);
  }

  async function saveTask() {
    const payload = { ...form, title: form.title.trim(), minutes: Number(form.minutes || 0) };
    if (!payload.title) {
      setMessage("タスク名を入力してください。");
      return;
    }
    try {
      if (selectedTask) {
        const task = await saveTaskRequest(payload, selectedTask.id);
        setTasks((current) => current.map((item) => item.id === selectedTask.id ? task : item));
        setMessage("タスクを保存しました。");
      } else {
        const task = await saveTaskRequest(payload);
        setTasks((current) => [task, ...current]);
        setSelectedId(task.id);
        setMessage("タスクを追加しました。");
      }
      setModalOpen(false);
    } catch {
      setMessage("保存に失敗しました。");
    }
  }

  async function quickAdd() {
    const title = quickTitle.trim();
    if (!title) return;
    const start = form.due || "10:00";
    const payload: ResearchTaskInput = {
      ...emptyTask,
      title,
      date: todayKey,
      display: "今日",
      minutes: quickMinutes,
      due: start,
      end: timeFromMinutes((minutesFromTime(start) ?? 600) + quickMinutes),
    };
    try {
      const task = await saveTaskRequest(payload);
      setTasks((current) => [task, ...current]);
      setQuickTitle("");
      setMessage("タスクを追加しました。");
    } catch {
      setMessage("追加に失敗しました。");
    }
  }

  async function deleteTask() {
    if (!selectedTask) return;
    try {
      await deleteTaskRequest(selectedTask.id);
      setTasks((current) => current.filter((task) => task.id !== selectedTask.id));
      setSelectedId("");
      setForm({ ...emptyTask });
      setModalOpen(false);
      setMessage("削除しました。");
    } catch {
      setMessage("削除に失敗しました。");
    }
  }

  async function updateTaskTimeFromGrid(clientX: number, task: ResearchTask, rect: DOMRect) {
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const start = Math.round((ratio * 24 * 60) / 15) * 15;
    const payload = {
      ...task,
      due: timeFromMinutes(start),
      end: timeFromMinutes(start + (task.minutes || 60)),
    };
    setTasks((current) => current.map((item) => item.id === task.id ? payload : item));
    await saveTaskRequest(normalizeTask(payload), task.id).catch(() => {
      setMessage("時間変更の保存に失敗しました。");
    });
  }

  function barStyle(task: ResearchTask, index: number) {
    const start = minutesFromTime(task.due) ?? 9 * 60 + index * 60;
    const end = minutesFromTime(task.end) ?? start + Math.max(task.minutes, 30);
    const left = Math.max(0, Math.min(96, (start / 1440) * 100));
    const width = Math.max(4, Math.min(100 - left, ((end - start) / 1440) * 100));
    return { left: `${left}%`, width: `${width}%` };
  }

  return (
    <section className="overflow-hidden rounded-md border border-[#d8cbb8] bg-[#f5efe4] text-[#241f17] shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d8cbb8] bg-[#fbfaf6] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-md bg-[#211e18] text-[#f3d27b]">
            <CalendarDays className="size-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold">Schedule</h2>
              <span className="rounded-full border border-[#d8cbb8] bg-[#efe5d4] px-2 py-0.5 text-[11px] font-semibold">Research DB</span>
              <span className="rounded-full border border-[#d8cbb8] bg-white/70 px-2 py-0.5 text-[11px] font-semibold">EDITABLE</span>
            </div>
            <div className="mt-1 text-[11px] font-semibold uppercase text-[#8b7a61]">research schedule</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          {(["day", "week", "month"] as ViewMode[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setView(item)}
              className={`rounded-full px-4 py-2 ${view === item ? "bg-[#211e18] text-white" : "border border-[#d8cbb8] bg-white text-[#6d604c]"}`}
            >
              {item === "day" ? "今日" : item === "week" ? "今週" : "今月"}
            </button>
          ))}
          <span className="rounded-full border border-[#d8cbb8] bg-white px-3 py-2 text-[#44614f]">Supabase保存</span>
        </div>
      </div>

      <div className="min-w-0 space-y-5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-semibold">
            <span>{formatShortDate(todayKey)}</span>
            <span className="ml-4 font-mono text-lg">{nowLabel}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#7d6f59]">
            <span>{todayTasks.length} tasks</span>
            <span>{totalMinutes(todayTasks)}分</span>
          </div>
        </div>

        <div className="rounded-md border border-[#d8cbb8] bg-[#fffdf8] p-3">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <input
              value={quickTitle}
              onChange={(event) => setQuickTitle(event.target.value)}
              placeholder="新しいタスク..."
              className="h-10 min-w-0 flex-1 rounded-md border border-[#d8cbb8] bg-white px-3 text-sm outline-none focus:border-[#9f8a67]"
            />
            <div className="grid grid-cols-4 gap-2 lg:w-[280px]">
              {[30, 45, 60, 90].map((duration) => (
                <button
                  key={duration}
                  type="button"
                  onClick={() => {
                    setQuickMinutes(duration);
                    updateForm("minutes", duration);
                  }}
                  className={`h-9 rounded-md border border-[#d8cbb8] text-xs font-semibold ${quickMinutes === duration ? "bg-[#211e18] text-white" : "bg-white text-[#6d604c]"}`}
                >
                  {duration}m
                </button>
              ))}
            </div>
            <div className="flex gap-2 lg:w-[260px]">
              <button type="button" onClick={quickAdd} className="h-9 flex-1 rounded-md bg-[#211e18] px-3 text-xs font-semibold text-white">
                今日に追加
              </button>
              <button type="button" onClick={() => newTask()} className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-md border border-[#d8cbb8] bg-white px-3 text-xs font-semibold text-[#6d604c]">
                <Plus className="size-3.5" />
                詳細
              </button>
            </div>
          </div>
          {message ? <p className="mt-2 text-xs text-[#7d6f59]">{message}</p> : null}
        </div>

        {view === "day" ? (
          <div className="overflow-x-auto rounded-md border border-[#d8cbb8] bg-[#fffdf8]">
            <div className="min-w-[1040px]">
              <div
                className="grid border-b border-[#e6dac8] px-2 py-1 text-center font-mono text-[10px] text-[#8b7a61]"
                style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}
              >
                {Array.from({ length: 24 }).map((_, hour) => <span key={hour}>{String(hour).padStart(2, "0")}</span>)}
              </div>
              <div
                className="relative h-[174px]"
                onPointerUp={(event) => {
                  if (!draggingId) return;
                  const task = tasks.find((item) => item.id === draggingId);
                  const rect = event.currentTarget.getBoundingClientRect();
                  setDraggingId(null);
                  if (task) void updateTaskTimeFromGrid(event.clientX, task, rect);
                }}
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(to right, transparent 0, transparent calc(100% / 24 - 1px), rgba(183,151,103,.28) calc(100% / 24 - 1px), rgba(183,151,103,.28) calc(100% / 24)), linear-gradient(135deg, rgba(214,197,166,.18) 25%, transparent 25%, transparent 50%, rgba(214,197,166,.18) 50%, rgba(214,197,166,.18) 75%, transparent 75%)",
                  backgroundSize: "auto, 16px 16px",
                }}
              >
                <div className="absolute left-2 top-4 rounded border border-[#e2d6c4] bg-white px-2 py-1 text-[11px] text-[#7d6f59]">計画</div>
                {todayTasks.map((task, index) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => selectTask(task)}
                    onPointerDown={() => setDraggingId(task.id)}
                    className={`absolute flex h-7 items-center gap-1 truncate rounded border px-2 py-1 text-left text-xs font-semibold shadow-sm ${tones[index % tones.length]}`}
                    style={{ ...barStyle(task, index), top: `${26 + index * 30}px` }}
                    title="ドラッグして開始時間を変更"
                  >
                    <GripVertical className="size-3 shrink-0" />
                    <span className="truncate">{task.title}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {view === "week" ? (
          <div className="rounded-md border border-[#d8cbb8] bg-[#fffdf8] p-4">
            <div className="grid gap-2 md:grid-cols-7">
              {weekDays.map((item, index) => (
                <button key={item.key} type="button" onClick={() => newTask(item.key)} className="min-h-28 rounded-md border border-[#e0d3bf] bg-[#fbf6ec] p-2 text-left">
                  <div className="flex items-center justify-between text-[11px] text-[#7d6f59]">
                    <span className="font-semibold">{item.day}</span>
                    <span>{formatShortDate(item.key)}</span>
                  </div>
                  <div className={`mt-3 rounded border px-2 py-1 text-xs font-semibold ${tones[index % tones.length]}`}>
                    {primaryStage(item.tasks)}
                  </div>
                  <div className="mt-3 text-[11px] text-[#7d6f59]">{item.tasks.length} tasks / {totalMinutes(item.tasks)}分</div>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {view === "month" ? (
          <div className="rounded-md border border-[#d8cbb8] bg-[#fffdf8] p-4">
            <div className="space-y-2">
              {monthRows.length ? monthRows.map((item) => (
                <div key={item.week} className="grid grid-cols-[64px_1fr_auto] items-center gap-3 rounded-md border border-[#e0d3bf] bg-[#fbf6ec] p-3">
                  <div className="text-xs font-semibold text-[#7d6f59]">{item.week}</div>
                  <div className="text-sm font-semibold">{primaryStage(item.tasks)}</div>
                  <div className="rounded-full bg-[#efe5d4] px-2 py-1 font-mono text-[11px]">{item.tasks.length}</div>
                </div>
              )) : <p className="text-sm text-[#7d6f59]">今月のタスクはまだありません。</p>}
            </div>
          </div>
        ) : null}
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-2xl rounded-md border border-[#d8cbb8] bg-[#fffdf8] shadow-xl">
            <div className="flex items-center justify-between border-b border-[#d8cbb8] px-4 py-3">
              <div>
                <h3 className="font-semibold">{selectedTask ? "タスクを編集" : "新しいタスク"}</h3>
                <div className="mt-1 text-xs text-[#7d6f59]">リサーチスケジュールを編集します</div>
              </div>
              <button type="button" onClick={() => setModalOpen(false)} className="flex size-8 items-center justify-center rounded-md border border-[#d8cbb8] bg-white text-[#6d604c]">
                <X className="size-4" />
              </button>
            </div>

            <div className="max-h-[75vh] space-y-4 overflow-y-auto p-4">
              <section className="rounded-md border border-[#eadfce] bg-white p-3">
                <div className="mb-3 text-xs font-semibold text-[#7d6f59]">基本情報</div>
                <div className="space-y-3">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-[#6d604c]">タスク名</span>
                    <input value={form.title} onChange={(event) => updateForm("title", event.target.value)} placeholder="例: 価格乖離チェック" className="h-10 w-full rounded-md border border-[#d8cbb8] px-3 text-sm" />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold text-[#6d604c]">ステータス</span>
                      <select value={form.status} onChange={(event) => updateForm("status", event.target.value)} className="h-9 w-full rounded-md border border-[#d8cbb8] bg-white px-2 text-xs">
                        {statuses.map((item) => <option key={item}>{item}</option>)}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold text-[#6d604c]">工程</span>
                      <select value={form.stage} onChange={(event) => updateForm("stage", event.target.value)} className="h-9 w-full rounded-md border border-[#d8cbb8] bg-white px-2 text-xs">
                        {stages.map((item) => <option key={item}>{item}</option>)}
                      </select>
                    </label>
                  </div>
                </div>
              </section>

              <section className="rounded-md border border-[#eadfce] bg-white p-3">
                <div className="mb-3 text-xs font-semibold text-[#7d6f59]">日時</div>
                <div className="grid gap-3 sm:grid-cols-4">
                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-xs font-semibold text-[#6d604c]">日付</span>
                    <input type="date" value={form.date} onChange={(event) => updateForm("date", event.target.value)} className="h-9 w-full rounded-md border border-[#d8cbb8] px-2 text-xs" />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-[#6d604c]">開始</span>
                    <input type="time" value={form.due} onChange={(event) => updateForm("due", event.target.value)} className="h-9 w-full rounded-md border border-[#d8cbb8] px-2 text-xs" />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-[#6d604c]">終了</span>
                    <input type="time" value={form.end} onChange={(event) => updateForm("end", event.target.value)} className="h-9 w-full rounded-md border border-[#d8cbb8] px-2 text-xs" />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-[#6d604c]">予定分</span>
                    <input type="number" min="0" value={form.minutes} onChange={(event) => updateForm("minutes", Number(event.target.value))} className="h-9 w-full rounded-md border border-[#d8cbb8] px-2 text-xs" />
                  </label>
                  <div className="flex items-end gap-2 sm:col-span-3">
                    {[30, 45, 60, 90].map((duration) => (
                      <button
                        key={duration}
                        type="button"
                        onClick={() => updateForm("minutes", duration)}
                        className={`h-9 flex-1 rounded-md border border-[#d8cbb8] text-xs font-semibold ${form.minutes === duration ? "bg-[#211e18] text-white" : "bg-[#fffdf8] text-[#6d604c]"}`}
                      >
                        {duration}m
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              <section className="rounded-md border border-[#eadfce] bg-white p-3">
                <div className="mb-3 text-xs font-semibold text-[#7d6f59]">管理</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-[#6d604c]">担当者</span>
                    <input value={form.owner} onChange={(event) => updateForm("owner", event.target.value)} placeholder="例: 担当A" className="h-9 w-full rounded-md border border-[#d8cbb8] px-2 text-xs" />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-[#6d604c]">優先度</span>
                    <select value={form.priority} onChange={(event) => updateForm("priority", event.target.value)} className="h-9 w-full rounded-md border border-[#d8cbb8] bg-white px-2 text-xs">
                      {priorities.map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-[#6d604c]">表示</span>
                    <select value={form.display} onChange={(event) => updateForm("display", event.target.value)} className="h-9 w-full rounded-md border border-[#d8cbb8] bg-white px-2 text-xs">
                      {displays.map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </label>
                  <label className="flex h-[58px] items-end gap-2 rounded-md border border-[#d8cbb8] bg-[#fffdf8] px-3 pb-2 text-xs font-semibold text-[#6d604c]">
                    <input type="checkbox" checked={Boolean(form.pinned)} onChange={(event) => updateForm("pinned", event.target.checked)} />
                    固定表示
                  </label>
                </div>
              </section>

              <section className="rounded-md border border-[#eadfce] bg-white p-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-[#6d604c]">メモ</span>
                  <textarea value={form.note} onChange={(event) => updateForm("note", event.target.value)} placeholder="補足や引き継ぎ内容" className="min-h-24 w-full rounded-md border border-[#d8cbb8] px-3 py-2 text-sm" />
                </label>
              </section>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#d8cbb8] px-4 py-3">
              <button type="button" onClick={deleteTask} disabled={!selectedTask} className="inline-flex h-9 items-center gap-1 rounded-md border border-red-200 bg-white px-3 text-xs font-semibold text-red-700 disabled:opacity-40">
                <Trash2 className="size-3.5" />
                削除
              </button>
              <div className="ml-auto flex items-center gap-2">
                <button type="button" onClick={() => setModalOpen(false)} className="h-9 rounded-md border border-[#d8cbb8] bg-white px-4 text-xs font-semibold text-[#6d604c]">キャンセル</button>
                <button type="button" onClick={saveTask} className="h-9 rounded-md bg-[#211e18] px-4 text-xs font-semibold text-white">
                  {selectedTask ? "変更を保存" : "新規保存"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
