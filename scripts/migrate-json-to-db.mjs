// 기존 로컬 파일(data/diary.json)을 Supabase diary 스키마로 1회 이전
// 실행: npm run db:migrate-json  (여러 번 실행해도 같은 키는 덮어쓰기만 함)
// 비밀값 보호: 에러 원문은 출력하지 않고 코드만 표시
import { readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

const KINDS = { dailySummaries: "daily", weeklySummaries: "weekly", monthlySummaries: "monthly" };

let sql;
try {
  const raw = JSON.parse(await readFile(path.join(process.cwd(), "data", "diary.json"), "utf8"));
  if (!process.env.DATABASE_URL) throw Object.assign(new Error(), { code: "NO_DATABASE_URL" });
  sql = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 15 });

  const entries = Object.entries(raw.entries ?? {}).filter(([, text]) => String(text).trim());
  const summaries = Object.entries(KINDS).flatMap(([field, kind]) =>
    Object.entries(raw[field] ?? {}).map(([key, data]) => ({ kind, key, data })),
  );

  // 전부 성공하거나 전부 취소
  await sql.begin(async (tx) => {
    for (const [date, text] of entries) {
      await tx`
        insert into diary.entries (date, text, updated_at) values (${date}, ${text}, now())
        on conflict (date) do update set text = excluded.text, updated_at = now()
      `;
    }
    for (const { kind, key, data } of summaries) {
      await tx`
        insert into diary.summaries (kind, key, data, updated_at) values (${kind}, ${key}, ${tx.json(data)}, now())
        on conflict (kind, key) do update set data = excluded.data, updated_at = now()
      `;
    }
  });

  console.log(`이전 완료: 일기 ${entries.length}건, 요약 ${summaries.length}건`);
} catch (e) {
  console.log("이전 실패:", e?.code ?? e?.name ?? "UNKNOWN");
  process.exitCode = 1;
} finally {
  try {
    await sql?.end({ timeout: 5 });
  } catch {}
}
