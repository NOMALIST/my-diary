import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { DiaryData } from "./schemas";

// 프로젝트 폴더의 data/diary.json에 일기·요약을 저장하는 서버 전용 저장소

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "diary.json");

function emptyData(): DiaryData {
  return { entries: {}, dailySummaries: {}, weeklySummaries: {}, monthlySummaries: {} };
}

export async function readData(): Promise<DiaryData> {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    // 이전 버전 파일에 없는 항목은 빈 값으로 채움
    return { ...emptyData(), ...(JSON.parse(raw) as Partial<DiaryData>) };
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return emptyData();
    throw e;
  }
}

// 동시 요청이 서로 덮어쓰지 않도록 수정 작업을 한 줄로 세워 순서대로 처리
let queue: Promise<unknown> = Promise.resolve();

export function updateData(mutate: (data: DiaryData) => void): Promise<DiaryData> {
  const task = queue.then(async () => {
    const data = await readData();
    mutate(data);
    await mkdir(DATA_DIR, { recursive: true });
    // 임시 파일에 먼저 쓰고 교체 → 쓰기 도중 종료돼도 기존 파일 보존
    const tmp = `${DATA_FILE}.tmp`;
    await writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
    await rename(tmp, DATA_FILE);
    return data;
  });
  queue = task.catch(() => {});
  return task;
}
