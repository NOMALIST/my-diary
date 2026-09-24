"use client";

import { useState } from "react";
import {
  addDays,
  addMonths,
  formatDateLabel,
  formatMonthLabel,
  monthDays,
  monthKeyOf,
  todayKey,
  weekDays,
  weekStartOf,
} from "@/lib/dates";
import type {
  DailySummary,
  DiaryData,
  MonthlySummary,
  SummaryMode,
  WeeklySummary,
} from "@/lib/schemas";

type Tab = SummaryMode;

const TABS: [Tab, string][] = [
  ["daily", "오늘 일기"],
  ["weekly", "주간 회고"],
  ["monthly", "월간 회고"],
];

// ---------------- API 호출 ----------------

async function callApi<T>(url: string, method: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error ?? `요청 실패 (${res.status})`);
  return json as T;
}

const saveEntry = (date: string, text: string) => callApi("/api/entries", "PUT", { date, text });

const requestSummary = <T,>(mode: SummaryMode, key: string) =>
  callApi<{ data: T }>("/api/summarize", "POST", { mode, key }).then((r) => r.data);

// ---------------- 앱 ----------------

export default function DiaryApp({ initialData }: { initialData: DiaryData }) {
  const [tab, setTab] = useState<Tab>("daily");
  const [data, setData] = useState(initialData);

  // 서버 저장 성공 후 화면 상태에도 반영
  function patch<K extends keyof DiaryData>(field: K, key: string, value: DiaryData[K][string] | null) {
    setData((prev) => {
      const next = { ...prev[field] };
      if (value === null) delete next[key];
      else next[key] = value;
      return { ...prev, [field]: next };
    });
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:py-12">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">한 줄 일기 ✍️</h1>
        <p className="mt-1 text-sm text-zinc-500">일기를 쓰면 AI가 한 줄로 요약하고, 한 주·한 달을 회고해 줘요.</p>
      </header>

      <nav className="mb-6 flex gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
              tab === key
                ? "bg-white shadow-sm dark:bg-zinc-800"
                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === "daily" && (
        <DailyView
          entries={data.entries}
          summaries={data.dailySummaries}
          onSaved={(date, text) => patch("entries", date, text.trim() ? text : null)}
          onSummary={(date, s) => patch("dailySummaries", date, s)}
        />
      )}
      {tab === "weekly" && (
        <PeriodView
          mode="weekly"
          data={data}
          summaries={data.weeklySummaries}
          // 서버가 mode별 스키마로 검증한 결과이므로 해당 타입으로 확정
          onSummary={(key, s) => patch("weeklySummaries", key, s as WeeklySummary)}
        />
      )}
      {tab === "monthly" && (
        <PeriodView
          mode="monthly"
          data={data}
          summaries={data.monthlySummaries}
          onSummary={(key, s) => patch("monthlySummaries", key, s as MonthlySummary)}
        />
      )}
    </main>
  );
}

// ---------------- 오늘 일기 ----------------

function DailyView(props: {
  entries: Record<string, string>;
  summaries: Record<string, DailySummary>;
  onSaved: (date: string, text: string) => void;
  onSummary: (date: string, s: DailySummary) => void;
}) {
  const { entries, summaries, onSaved, onSummary } = props;
  const [date, setDate] = useState(todayKey);
  const [text, setText] = useState(entries[todayKey()] ?? "");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saved = (entries[date] ?? "") === text;
  const summary = summaries[date];

  async function save(targetDate = date, targetText = text) {
    if ((entries[targetDate] ?? "") === targetText) return;
    setSaving(true);
    try {
      await saveEntry(targetDate, targetText);
      onSaved(targetDate, targetText);
    } finally {
      setSaving(false);
    }
  }

  async function changeDate(next: string) {
    if (!next) return;
    setError(null);
    try {
      await save();
    } catch (e) {
      setError(errorMessage(e));
      return; // 저장 실패 시 작성 중인 내용 보존을 위해 이동하지 않음
    }
    setDate(next);
    setText(entries[next] ?? "");
  }

  async function summarize() {
    setLoading(true);
    setError(null);
    try {
      await save(); // 서버가 저장 파일에서 일기를 읽으므로 먼저 저장
      onSummary(date, await requestSummary<DailySummary>("daily", date));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => changeDate(addDays(date, -1))} className={navBtn} aria-label="이전 날">◀</button>
        <input
          type="date"
          value={date}
          max={todayKey()}
          onChange={(e) => changeDate(e.target.value)}
          className="flex-1 rounded-lg border border-zinc-200 bg-transparent px-3 py-2 text-sm dark:border-zinc-800"
        />
        <button
          onClick={() => changeDate(addDays(date, 1))}
          disabled={date >= todayKey()}
          className={navBtn}
          aria-label="다음 날"
        >
          ▶
        </button>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => save().catch((e) => setError(errorMessage(e)))}
        placeholder="오늘 있었던 일, 느낀 점을 자유롭게 적어보세요."
        rows={10}
        className="w-full resize-y rounded-xl border border-zinc-200 bg-transparent p-4 leading-relaxed outline-none focus:border-zinc-400 dark:border-zinc-800 dark:focus:border-zinc-600"
      />

      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-zinc-500">
          {text.length.toLocaleString()}자 · {saving ? "저장 중…" : saved ? "저장됨" : "저장 안 됨"}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => save().catch((e) => setError(errorMessage(e)))}
            disabled={saved || saving}
            className={secondaryBtn}
          >
            저장
          </button>
          <button onClick={summarize} disabled={loading || !text.trim()} className={primaryBtn}>
            {loading ? "요약 중…" : summary ? "다시 요약" : "한 줄 요약"}
          </button>
        </div>
      </div>

      {error && <ErrorBox message={error} />}

      {summary && (
        <div className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
          <div className="flex items-start gap-3">
            <span className="text-3xl leading-none">{summary.mood}</span>
            <p className="text-lg font-semibold leading-snug">{summary.oneLine}</p>
          </div>
          {summary.keywords.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {summary.keywords.map((k) => (
                <span key={k} className="rounded-full bg-zinc-100 px-3 py-1 text-xs dark:bg-zinc-900">
                  #{k}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ---------------- 주간 / 월간 회고 ----------------

type PeriodSummary = WeeklySummary | MonthlySummary;

// 기간별 설정: 이동 단위, 날짜 목록, 결과 섹션
const PERIOD = {
  weekly: {
    initialKey: () => weekStartOf(todayKey()),
    move: (key: string, delta: number) => addDays(key, delta * 7),
    days: weekDays,
    label: (key: string) => {
      const days = weekDays(key);
      return `${formatDateLabel(days[0])} ~ ${formatDateLabel(days[6])}`;
    },
    showEmptyDays: true,
    button: ["주간 회고 생성", "회고 작성 중…", "다시 회고"],
    sections: [
      ["highlights", "👍 잘한 점"],
      ["improvements", "🤔 개선할 점"],
      ["nextActions", "🎯 다음 주 액션"],
    ],
  },
  monthly: {
    initialKey: () => monthKeyOf(todayKey()),
    move: addMonths,
    days: monthDays,
    label: formatMonthLabel,
    showEmptyDays: false, // 한 달은 길어서 작성한 날만 표시
    button: ["월간 회고 생성", "회고 작성 중…", "다시 회고"],
    sections: [
      ["themes", "🧭 이달의 테마"],
      ["highlights", "👍 잘한 점"],
      ["improvements", "🤔 개선할 점"],
      ["nextGoals", "🎯 다음 달 목표"],
    ],
  },
} as const;

function PeriodView(props: {
  mode: "weekly" | "monthly";
  data: DiaryData;
  summaries: Record<string, PeriodSummary>;
  onSummary: (key: string, s: PeriodSummary) => void;
}) {
  const { mode, data, summaries, onSummary } = props;
  const cfg = PERIOD[mode];
  const [key, setKey] = useState(cfg.initialKey);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const days = cfg.days(key);
  const written = days.filter((d) => data.entries[d]?.trim());
  const listed = cfg.showEmptyDays ? days : written;
  const summary = summaries[key];
  const isCurrent = key >= cfg.initialKey();

  function move(delta: number) {
    setKey(cfg.move(key, delta));
    setError(null);
  }

  async function summarize() {
    setLoading(true);
    setError(null);
    try {
      onSummary(key, await requestSummary<PeriodSummary>(mode, key));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => move(-1)} className={navBtn} aria-label="이전">◀</button>
        <p className="flex-1 text-center text-sm font-medium">{cfg.label(key)}</p>
        <button onClick={() => move(1)} disabled={isCurrent} className={navBtn} aria-label="다음">▶</button>
      </div>

      {listed.length > 0 ? (
        <ul className="max-h-96 divide-y divide-zinc-200 overflow-y-auto rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {listed.map((d) => {
            const text = data.entries[d];
            const s = data.dailySummaries[d];
            return (
              <li key={d} className="flex items-center gap-3 px-4 py-3 text-sm">
                <span className="w-20 shrink-0 text-zinc-500">{formatDateLabel(d)}</span>
                <span className="w-6 shrink-0 text-center">{s?.mood ?? (text ? "📝" : "·")}</span>
                <span className={`truncate ${text ? "" : "text-zinc-400"}`}>
                  {s?.oneLine ?? (text ? text.slice(0, 40) : "기록 없음")}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-400 dark:border-zinc-800">
          이 기간에 작성한 일기가 없어요.
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-zinc-500">
          작성한 일기 {written.length}/{days.length}
        </span>
        <button onClick={summarize} disabled={loading || written.length === 0} className={primaryBtn}>
          {loading ? cfg.button[1] : summary ? cfg.button[2] : cfg.button[0]}
        </button>
      </div>

      {error && <ErrorBox message={error} />}

      {summary && (
        <div className="space-y-5 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
          <p className="text-lg font-semibold leading-snug">“{summary.oneLine}”</p>
          {cfg.sections.map(([field, title]) => (
            <RetroList key={field} title={title} items={(summary as Record<string, unknown>)[field]} />
          ))}
        </div>
      )}
    </section>
  );
}

function RetroList({ title, items }: { title: string; items: unknown }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">
        {items.map((it, i) => (
          <li key={i}>{String(it)}</li>
        ))}
      </ul>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
      {message}
    </p>
  );
}

function errorMessage(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

// ---------------- 공통 스타일 ----------------

const primaryBtn =
  "rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300";
const secondaryBtn =
  "rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-800 dark:hover:bg-zinc-900";
const navBtn =
  "rounded-lg border border-zinc-200 px-3 py-2 text-sm transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-30 dark:border-zinc-800 dark:hover:bg-zinc-900";
