import { describe, expect, it } from "vitest";
import { DateKeySchema, MonthKeySchema, SummarizeRequestSchema } from "./schemas";

describe("달력 유효성", () => {
  it("DateKeySchema: 존재하는 날짜만 허용", () => {
    expect(DateKeySchema.safeParse("2024-02-29").success).toBe(true); // 윤년
    expect(DateKeySchema.safeParse("2026-02-29").success).toBe(false);
    expect(DateKeySchema.safeParse("2024-02-30").success).toBe(false);
    expect(DateKeySchema.safeParse("2026-13-01").success).toBe(false);
    expect(DateKeySchema.safeParse("2026-00-10").success).toBe(false);
    expect(DateKeySchema.safeParse("2026-09-00").success).toBe(false);
  });

  it("MonthKeySchema: 1~12월만 허용", () => {
    expect(MonthKeySchema.safeParse("2026-12").success).toBe(true);
    expect(MonthKeySchema.safeParse("2026-13").success).toBe(false);
    expect(MonthKeySchema.safeParse("2026-00").success).toBe(false);
  });

  it("주간 요청은 월요일 키만 허용", () => {
    expect(SummarizeRequestSchema.safeParse({ mode: "weekly", key: "2026-09-21" }).success).toBe(true);
    expect(SummarizeRequestSchema.safeParse({ mode: "weekly", key: "2026-09-23" }).success).toBe(false);
  });
});

describe("SummarizeRequestSchema", () => {
  it("모드별 올바른 키 허용", () => {
    expect(SummarizeRequestSchema.safeParse({ mode: "daily", key: "2026-09-25" }).success).toBe(true);
    expect(SummarizeRequestSchema.safeParse({ mode: "weekly", key: "2026-09-21" }).success).toBe(true);
    expect(SummarizeRequestSchema.safeParse({ mode: "monthly", key: "2026-09" }).success).toBe(true);
  });

  it("모드와 키 형식 불일치 거부", () => {
    expect(SummarizeRequestSchema.safeParse({ mode: "daily", key: "2026-09" }).success).toBe(false);
    expect(SummarizeRequestSchema.safeParse({ mode: "monthly", key: "2026-09-25" }).success).toBe(false);
  });

  it("알 수 없는 모드·누락·경로 조작 문자열 거부", () => {
    expect(SummarizeRequestSchema.safeParse({ mode: "yearly", key: "2026" }).success).toBe(false);
    expect(SummarizeRequestSchema.safeParse({ mode: "daily" }).success).toBe(false);
    expect(SummarizeRequestSchema.safeParse(null).success).toBe(false);
    expect(
      SummarizeRequestSchema.safeParse({ mode: "daily", key: "../../etc/passwd" }).success,
    ).toBe(false);
  });
});
