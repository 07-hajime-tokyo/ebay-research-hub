"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Play,
  Plus,
  TimerReset,
  UserRound,
} from "lucide-react";
import { ResearchScheduleWorkspace } from "@/components/research-schedule-workspace";
import type { EbayTask } from "@/lib/ebay-supabase";

type TaskInput = Omit<EbayTask, "id">;
type TaskLane = "today" | "working" | "upcoming";
type Draft = {
  title: string;
  owner: string;
  date: string;
  stage: string;
  minutes: number;
};

const stages = ["リサーチ", "仕入れ", "出品準備", "価格確認", "分析", "レビュー", "その他"];
const minuteOptions = [30, 45, 60, 90];

function addDaysToKey(key: string, days: number) {
  const [year, month, day] = key.split("-").map(Number);
  if (!year || !month || !day) return key;
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

function formatShortDate(key: string) {
  const date = new Date(`${key}T00:00:00+09:00`);
  if (Number.isNaN(date.getTime())) return key;
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

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

function taskInputFromTask(task: EbayTask): TaskInput {
  return {
    title: task.title,
    status: task.status,
    stage: task.stage,
    date: task.date,
    due: task.due,
    end: task.end,
    owner: task.owner,
    minutes: task.minutes,
    priority: task.priority,
    display: task.display,
    pinned: task.pinned,
    note: task.note,
  };
}

function emptyDraft(todayKey: string, lane: TaskLane): Draft {
  return {
    title: "",
    owner: "",
    date: lane === "upcoming" ? addDaysToKey(todayKey, 1) : todayKey,
    stage: "リサーチ",
    minutes: 60,
  };
}

function taskSort(a: EbayTask, b: EbayTask) {
  return `${a.date || "9999-12-31"}${a.due || "99:99"}`.localeCompare(`${b.date || "9999-12-31"}${b.due || "99:99"}`);
}

function isOpenTask(task: EbayTask) {
  return task.status !== "進行中" && task.status !== "完了";
}

async function saveTaskRequest(task: TaskInput, id?: string) {
  const response = await fetch(id ? `/api/ebay/tasks/${id}` : "/api/ebay/tasks", {
    method: id ? "PATCH" : "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(task),
  });
  if (!response.ok) throw new Error(await response.text());
  const data = await response.json();
  return data.task as EbayTask;
}

function TaskCard({
  task,
  lane,
  isSaving,
  onStart,
  onComplete,
  onReturn,
}: {
  task: EbayTask;
  lane: TaskLane;
  isSaving: boolean;
  onStart: (task: EbayTask) => void;
  onComplete: (task: EbayTask) => void;
  onReturn: (task: EbayTask) => void;
}) {
  return (
    <article className="rounded-md border border-[#d8cbb8] bg-[#fffaf1] p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="line-clamp-2 text-sm font-semibold leading-snug">{task.title}</div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[#7d6f59]">
            <span className="rounded border border-[#d8cbb8] bg-white px-2 py-0.5">{task.stage}</span>
            <span className="inline-flex items-center gap-1">
              <UserRound className="size-3" />
              {task.owner || "未設定"}
            </span>
          </div>
        </div>
        <span className="shrink-0 rounded bg-[#211e18] px-2 py-1 font-mono text-[11px] text-white">
          {task.due || "--:--"}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#7d6f59]">
        <span>{formatShortDate(task.date)}</span>
        <span>{task.minutes}m</span>
      </div>

      {task.note ? <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[#6d604c]">{task.note}</p> : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {lane === "working" ? (
          <>
            <button
              type="button"
              onClick={() => onComplete(task)}
              disabled={isSaving}
              className="inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-md bg-[#211e18] px-3 text-xs font-semibold text-white disabled:bg-zinc-300"
            >
              <CheckCircle2 className="size-3.5" />
              完了
            </button>
            <button
              type="button"
              onClick={() => onReturn(task)}
              disabled={isSaving}
              className="inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-md border border-[#d8cbb8] bg-white px-3 text-xs font-semibold text-[#6d604c] disabled:text-zinc-300"
            >
              <TimerReset className="size-3.5" />
              戻す
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => onStart(task)}
            disabled={isSaving}
            className="inline-flex h-8 w-full items-center justify-center gap-1 rounded-md bg-[#211e18] px-3 text-xs font-semibold text-white disabled:bg-zinc-300"
          >
            <Play className="size-3.5" />
            着手
          </button>
        )}
      </div>
    </article>
  );
}

function AddTaskForm({
  lane,
  draft,
  isSaving,
  onChange,
  onSubmit,
}: {
  lane: Exclude<TaskLane, "working">;
  draft: Draft;
  isSaving: boolean;
  onChange: (draft: Draft) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="rounded-md border border-[#e0d3bf] bg-[#fffdf8] p-3">
      <div className="grid gap-2">
        <input
          value={draft.title}
          onChange={(event) => onChange({ ...draft, title: event.target.value })}
          placeholder="カードを追加"
          className="h-9 min-w-0 rounded-md border border-[#d8cbb8] bg-white px-3 text-sm outline-none focus:border-[#9f8a67]"
        />
        <div className="grid gap-2 sm:grid-cols-2">
          {lane === "upcoming" ? (
            <input
              type="date"
              value={draft.date}
              onChange={(event) => onChange({ ...draft, date: event.target.value })}
              className="h-9 rounded-md border border-[#d8cbb8] bg-white px-2 text-xs outline-none focus:border-[#9f8a67]"
            />
          ) : null}
          <input
            value={draft.owner}
            onChange={(event) => onChange({ ...draft, owner: event.target.value })}
            placeholder="担当者"
            className="h-9 rounded-md border border-[#d8cbb8] bg-white px-2 text-xs outline-none focus:border-[#9f8a67]"
          />
          <select
            value={draft.stage}
            onChange={(event) => onChange({ ...draft, stage: event.target.value })}
            className="h-9 rounded-md border border-[#d8cbb8] bg-white px-2 text-xs outline-none focus:border-[#9f8a67]"
          >
            {stages.map((stage) => <option key={stage}>{stage}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <div className="grid grid-cols-4 gap-1">
            {minuteOptions.map((minutes) => (
              <button
                key={minutes}
                type="button"
                onClick={() => onChange({ ...draft, minutes })}
                className={`h-8 rounded-md border border-[#d8cbb8] text-[11px] font-semibold ${draft.minutes === minutes ? "bg-[#211e18] text-white" : "bg-white text-[#6d604c]"}`}
              >
                {minutes}m
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSaving || !draft.title.trim()}
            className="inline-flex h-8 items-center justify-center gap-1 rounded-md bg-[#211e18] px-3 text-xs font-semibold text-white disabled:bg-zinc-300"
          >
            <Plus className="size-3.5" />
            追加
          </button>
        </div>
      </div>
    </div>
  );
}

function TaskLaneColumn({
  lane,
  title,
  subtitle,
  count,
  children,
}: {
  lane: TaskLane;
  title: string;
  subtitle: string;
  count: number;
  children: ReactNode;
}) {
  const Icon = lane === "today" ? CalendarDays : lane === "working" ? Play : Clock3;

  return (
    <section className="rounded-md border border-[#d8cbb8] bg-[#fbfaf6] p-4 text-[#241f17] shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-md bg-[#211e18] text-[#f3d27b]">
            <Icon className="size-4" />
          </div>
          <div>
            <h2 className="font-semibold">{title}</h2>
            <div className="mt-1 text-xs text-[#7d6f59]">{subtitle}</div>
          </div>
        </div>
        <span className="rounded-full border border-[#d8cbb8] bg-[#efe5d4] px-3 py-1 font-mono text-xs font-semibold">
          {count} tasks
        </span>
      </div>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

export function TaskDashboard({
  initialTasks,
  todayKey,
  nowLabel,
}: {
  initialTasks: EbayTask[];
  todayKey: string;
  nowLabel: string;
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [drafts, setDrafts] = useState<Record<Exclude<TaskLane, "working">, Draft>>({
    today: emptyDraft(todayKey, "today"),
    upcoming: emptyDraft(todayKey, "upcoming"),
  });
  const [savingId, setSavingId] = useState("");
  const [savingLane, setSavingLane] = useState<TaskLane | "">("");
  const [message, setMessage] = useState("");

  const todayTasks = useMemo(
    () => tasks.filter((task) => task.date === todayKey && isOpenTask(task)).sort(taskSort),
    [tasks, todayKey],
  );
  const workingTasks = useMemo(
    () => tasks.filter((task) => task.status === "進行中").sort(taskSort),
    [tasks],
  );
  const upcomingTasks = useMemo(
    () => tasks.filter((task) => task.date && task.date > todayKey && isOpenTask(task)).sort(taskSort),
    [tasks, todayKey],
  );

  function mergeTask(saved: EbayTask | null) {
    if (!saved) return;
    setTasks((current) => {
      const exists = current.some((task) => task.id === saved.id);
      if (exists) return current.map((task) => task.id === saved.id ? saved : task);
      return [saved, ...current];
    });
  }

  async function addTask(lane: Exclude<TaskLane, "working">) {
    const draft = drafts[lane];
    const title = draft.title.trim();
    if (!title) return;

    setSavingLane(lane);
    setMessage("");
    const due = "10:00";
    const payload: TaskInput = {
      title,
      status: "未着手",
      stage: draft.stage,
      date: lane === "today" ? todayKey : draft.date,
      due,
      end: timeFromMinutes((minutesFromTime(due) ?? 600) + draft.minutes),
      owner: draft.owner.trim(),
      minutes: draft.minutes,
      priority: "中",
      display: lane === "today" ? "今日" : "通常",
      pinned: false,
      note: "",
    };

    try {
      const saved = await saveTaskRequest(payload);
      mergeTask(saved);
      setDrafts((current) => ({ ...current, [lane]: emptyDraft(todayKey, lane) }));
      setMessage(lane === "today" ? "本日のタスクに追加しました。" : "これからのタスクに追加しました。");
    } catch {
      setMessage("タスク追加に失敗しました。ログイン状態を確認してください。");
    } finally {
      setSavingLane("");
    }
  }

  async function updateTaskStatus(task: EbayTask, status: string) {
    setSavingId(task.id);
    setMessage("");
    const payload = {
      ...taskInputFromTask(task),
      status,
      date: status === "進行中" ? todayKey : task.date,
      display: status === "進行中" ? "今日" : task.display,
    };

    try {
      const saved = await saveTaskRequest(payload, task.id);
      mergeTask(saved);
      setMessage(status === "進行中" ? "作業中に移動しました。" : status === "完了" ? "完了にしました。" : "未着手に戻しました。");
    } catch {
      setMessage("タスク更新に失敗しました。");
    } finally {
      setSavingId("");
    }
  }

  return (
    <>
      <section className="grid gap-6 xl:grid-cols-3">
        <TaskLaneColumn
          lane="today"
          title="本日のタスク"
          subtitle="今日進める出品改善"
          count={todayTasks.length}
        >
          <AddTaskForm
            lane="today"
            draft={drafts.today}
            isSaving={savingLane === "today"}
            onChange={(draft) => setDrafts((current) => ({ ...current, today: draft }))}
            onSubmit={() => void addTask("today")}
          />
          {todayTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              lane="today"
              isSaving={savingId === task.id}
              onStart={(item) => void updateTaskStatus(item, "進行中")}
              onComplete={(item) => void updateTaskStatus(item, "完了")}
              onReturn={(item) => void updateTaskStatus(item, "未着手")}
            />
          ))}
          {!todayTasks.length ? (
            <div className="rounded-md border border-dashed border-[#d8cbb8] bg-[#fffaf1] p-4 text-sm text-[#7d6f59]">
              本日のタスクはまだありません。
            </div>
          ) : null}
        </TaskLaneColumn>

        <TaskLaneColumn
          lane="working"
          title="作業中"
          subtitle="着手済みのカード"
          count={workingTasks.length}
        >
          {workingTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              lane="working"
              isSaving={savingId === task.id}
              onStart={(item) => void updateTaskStatus(item, "進行中")}
              onComplete={(item) => void updateTaskStatus(item, "完了")}
              onReturn={(item) => void updateTaskStatus(item, "未着手")}
            />
          ))}
          {!workingTasks.length ? (
            <div className="rounded-md border border-dashed border-[#d8cbb8] bg-[#fffaf1] p-4 text-sm text-[#7d6f59]">
              着手中のタスクはありません。
            </div>
          ) : null}
        </TaskLaneColumn>

        <TaskLaneColumn
          lane="upcoming"
          title="これからのタスク"
          subtitle="明日以降の確認予定"
          count={upcomingTasks.length}
        >
          <AddTaskForm
            lane="upcoming"
            draft={drafts.upcoming}
            isSaving={savingLane === "upcoming"}
            onChange={(draft) => setDrafts((current) => ({ ...current, upcoming: draft }))}
            onSubmit={() => void addTask("upcoming")}
          />
          {upcomingTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              lane="upcoming"
              isSaving={savingId === task.id}
              onStart={(item) => void updateTaskStatus(item, "進行中")}
              onComplete={(item) => void updateTaskStatus(item, "完了")}
              onReturn={(item) => void updateTaskStatus(item, "未着手")}
            />
          ))}
          {!upcomingTasks.length ? (
            <div className="rounded-md border border-dashed border-[#d8cbb8] bg-[#fffaf1] p-4 text-sm text-[#7d6f59]">
              これからのタスクはまだありません。
            </div>
          ) : null}
        </TaskLaneColumn>
      </section>

      {message ? (
        <div className="rounded-md border border-[#d8cbb8] bg-[#fffdf8] px-4 py-3 text-sm font-semibold text-[#6d604c]">
          {message}
        </div>
      ) : null}

      <ResearchScheduleWorkspace
        initialTasks={initialTasks}
        tasks={tasks}
        onTasksChange={setTasks}
        todayKey={todayKey}
        nowLabel={nowLabel}
      />
    </>
  );
}
