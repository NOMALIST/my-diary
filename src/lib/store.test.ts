import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// store.ts는 모듈 로드 시점의 process.cwd()로 저장 경로를 정하므로,
// 테스트마다 임시 폴더를 cwd로 지정한 뒤 모듈을 새로 불러온다.
let tmpDir: string;

async function loadStore() {
  vi.resetModules();
  return import("./store");
}

beforeEach(async () => {
  tmpDir = await mkdtemp(path.join(os.tmpdir(), "diary-store-"));
  vi.spyOn(process, "cwd").mockReturnValue(tmpDir);
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(tmpDir, { recursive: true, force: true });
});

describe("store", () => {
  it("파일이 없으면 빈 데이터 반환", async () => {
    const { readData } = await loadStore();
    expect(await readData()).toEqual({
      entries: {},
      dailySummaries: {},
      weeklySummaries: {},
      monthlySummaries: {},
    });
  });

  it("updateData로 저장한 내용이 파일에 반영", async () => {
    const { readData, updateData } = await loadStore();
    await updateData((d) => {
      d.entries["2026-09-25"] = "오늘의 일기";
    });

    expect((await readData()).entries["2026-09-25"]).toBe("오늘의 일기");
    const raw = JSON.parse(await readFile(path.join(tmpDir, "data", "diary.json"), "utf8"));
    expect(raw.entries["2026-09-25"]).toBe("오늘의 일기");
  });

  it("동시 수정 요청도 유실 없이 모두 반영", async () => {
    const { readData, updateData } = await loadStore();
    const days = Array.from({ length: 20 }, (_, i) => `2026-09-${String(i + 1).padStart(2, "0")}`);

    await Promise.all(
      days.map((day) =>
        updateData((d) => {
          d.entries[day] = day;
        }),
      ),
    );

    expect(Object.keys((await readData()).entries)).toHaveLength(days.length);
  });

  it("수정 함수가 실패해도 이후 요청은 정상 처리", async () => {
    const { readData, updateData } = await loadStore();
    await expect(
      updateData(() => {
        throw new Error("실패");
      }),
    ).rejects.toThrow("실패");

    await updateData((d) => {
      d.entries["2026-09-25"] = "복구";
    });
    expect((await readData()).entries["2026-09-25"]).toBe("복구");
  });
});
