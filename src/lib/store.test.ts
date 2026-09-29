import { describe, expect, it } from "vitest";
import { toDiaryData } from "./store";

// DB 접속이 필요한 함수는 실제 개인 데이터를 건드리므로 단위 테스트에서 제외하고,
// row → 화면 데이터 변환만 검증한다.
describe("toDiaryData", () => {
  it("row가 없으면 빈 데이터 반환", () => {
    expect(toDiaryData([], [])).toEqual({
      entries: {},
      dailySummaries: {},
      weeklySummaries: {},
      monthlySummaries: {},
    });
  });

  it("일기와 요약을 종류별로 분류", () => {
    const daily = { oneLine: "하루", mood: "🙂", keywords: ["a"] };
    const weekly = { oneLine: "한 주", highlights: [], improvements: [], nextActions: [] };
    const monthly = { oneLine: "한 달", themes: [], highlights: [], improvements: [], nextGoals: [] };

    const data = toDiaryData(
      [{ date: "2026-09-28", text: "오늘의 일기" }],
      [
        { kind: "daily", key: "2026-09-28", data: daily },
        { kind: "weekly", key: "2026-09-28", data: weekly },
        { kind: "monthly", key: "2026-09", data: monthly },
      ],
    );

    expect(data.entries).toEqual({ "2026-09-28": "오늘의 일기" });
    expect(data.dailySummaries["2026-09-28"]).toEqual(daily);
    expect(data.weeklySummaries["2026-09-28"]).toEqual(weekly);
    expect(data.monthlySummaries["2026-09"]).toEqual(monthly);
  });
});
