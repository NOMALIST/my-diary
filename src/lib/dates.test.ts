import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  formatDateLabel,
  formatMonthLabel,
  fromDateKey,
  monthDays,
  monthKeyOf,
  toDateKey,
  weekDays,
  weekStartOf,
} from "./dates";

describe("날짜 키 변환", () => {
  it("toDateKey ↔ fromDateKey 왕복", () => {
    expect(toDateKey(fromDateKey("2026-03-05"))).toBe("2026-03-05");
  });

  it("addDays: 월·연 경계 넘김", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2025-12-31", 1)).toBe("2026-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("주 계산 (월요일 시작)", () => {
  it("평일·일요일 모두 해당 주 월요일 반환", () => {
    expect(weekStartOf("2026-09-23")).toBe("2026-09-21"); // 수
    expect(weekStartOf("2026-09-21")).toBe("2026-09-21"); // 월
    expect(weekStartOf("2026-09-27")).toBe("2026-09-21"); // 일
  });

  it("월 경계에 걸친 주", () => {
    expect(weekStartOf("2026-10-01")).toBe("2026-09-28");
  });

  it("weekDays: 월~일 7일", () => {
    const days = weekDays("2026-09-28");
    expect(days).toHaveLength(7);
    expect(days[0]).toBe("2026-09-28");
    expect(days[6]).toBe("2026-10-04");
  });
});

describe("월 계산", () => {
  it("monthKeyOf", () => {
    expect(monthKeyOf("2026-09-25")).toBe("2026-09");
  });

  it("addMonths: 연 경계", () => {
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
  });

  it("monthDays: 월별 일수·윤년", () => {
    expect(monthDays("2026-09")).toHaveLength(30);
    expect(monthDays("2026-02")).toHaveLength(28);
    expect(monthDays("2028-02")).toHaveLength(29);
    expect(monthDays("2026-01").at(-1)).toBe("2026-01-31");
  });
});

describe("표시용 라벨", () => {
  it("formatDateLabel: 월/일 (요일)", () => {
    expect(formatDateLabel("2026-09-25")).toBe("9/25 (금)");
  });

  it("formatMonthLabel", () => {
    expect(formatMonthLabel("2026-09")).toBe("2026년 9월");
  });
});
