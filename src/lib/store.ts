import postgres from "postgres";
import type {
  DailySummary,
  DiaryData,
  MonthlySummary,
  SummaryMode,
  WeeklySummary,
} from "./schemas";

// Supabase Postgres(diary 스키마)에 일기·요약을 저장하는 서버 전용 저장소
// 날짜·기간 단위 row로 upsert → 여러 기기에서 동시에 써도 서로 덮어쓰지 않음

type Sql = ReturnType<typeof postgres>;

// 접속 설정 오류 (메시지에 비밀값 미포함 → 그대로 로그 가능)
export class DbConfigError extends Error {
  name = "DbConfigError";
}

// 개발 모드 HMR로 모듈이 다시 로드돼도 접속 풀을 하나만 유지
const globalForDb = globalThis as unknown as { diarySql?: Sql };

function getSql(): Sql {
  if (globalForDb.diarySql) return globalForDb.diarySql;

  const url = process.env.DATABASE_URL;
  if (!url) throw new DbConfigError("DATABASE_URL 환경변수가 없습니다. .env.local을 확인하세요.");
  // 형식이 깨진 URL은 라이브러리 에러에 원문(비밀번호 포함)이 찍히므로 미리 걸러냄
  try {
    new URL(url);
  } catch {
    throw new DbConfigError("DATABASE_URL 형식이 올바르지 않습니다. 특수문자 인코딩을 확인하세요.");
  }

  globalForDb.diarySql = postgres(url, { max: 5, idle_timeout: 20, connect_timeout: 15 });
  return globalForDb.diarySql;
}

type SummaryRow = { kind: SummaryMode; key: string; data: unknown };

// DB row → 화면에서 쓰는 전체 데이터 구조로 변환
export function toDiaryData(
  entryRows: { date: string; text: string }[],
  summaryRows: SummaryRow[],
): DiaryData {
  const data: DiaryData = { entries: {}, dailySummaries: {}, weeklySummaries: {}, monthlySummaries: {} };
  for (const { date, text } of entryRows) data.entries[date] = text;
  for (const { kind, key, data: summary } of summaryRows) {
    if (kind === "daily") data.dailySummaries[key] = summary as DailySummary;
    else if (kind === "weekly") data.weeklySummaries[key] = summary as WeeklySummary;
    else if (kind === "monthly") data.monthlySummaries[key] = summary as MonthlySummary;
  }
  return data;
}

export async function readData(): Promise<DiaryData> {
  const sql = getSql();
  const [entryRows, summaryRows] = await Promise.all([
    sql<{ date: string; text: string }[]>`select date, text from diary.entries`,
    sql<SummaryRow[]>`select kind, key, data from diary.summaries`,
  ]);
  return toDiaryData(entryRows, summaryRows);
}

// 지정한 날짜들의 일기만 조회 (요약 대상 기간)
export async function readEntries(dates: string[]): Promise<Record<string, string>> {
  if (dates.length === 0) return {};
  const sql = getSql();
  const rows = await sql<{ date: string; text: string }[]>`
    select date, text from diary.entries where date in ${sql(dates)}
  `;
  return Object.fromEntries(rows.map((r) => [r.date, r.text]));
}

// 일기 저장 (빈 내용이면 해당 날짜 일기 삭제)
export async function saveEntry(date: string, text: string): Promise<void> {
  const sql = getSql();
  if (!text.trim()) {
    await sql`delete from diary.entries where date = ${date}`;
    return;
  }
  await sql`
    insert into diary.entries (date, text, updated_at) values (${date}, ${text}, now())
    on conflict (date) do update set text = excluded.text, updated_at = now()
  `;
}

export async function saveSummary(
  kind: SummaryMode,
  key: string,
  data: DailySummary | WeeklySummary | MonthlySummary,
): Promise<void> {
  const sql = getSql();
  await sql`
    insert into diary.summaries (kind, key, data, updated_at) values (${kind}, ${key}, ${sql.json(data)}, now())
    on conflict (kind, key) do update set data = excluded.data, updated_at = now()
  `;
}
