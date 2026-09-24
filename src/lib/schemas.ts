import { z } from "zod";
import { addMonths, fromDateKey, toDateKey, weekStartOf } from "./dates";

// 일간 한 줄 요약 결과
export const DailySummarySchema = z.object({
  oneLine: z.string().describe("일기 전체를 담은 한 문장 요약 (40자 내외)"),
  mood: z.string().describe("그날의 감정을 나타내는 이모지 1개"),
  keywords: z.array(z.string()).describe("핵심 키워드 3개 이내"),
});
export type DailySummary = z.infer<typeof DailySummarySchema>;

// 주간 회고 결과
export const WeeklySummarySchema = z.object({
  oneLine: z.string().describe("한 주를 담은 한 문장 요약 (50자 내외)"),
  highlights: z.array(z.string()).describe("잘한 점 / 좋았던 순간 2~3개"),
  improvements: z.array(z.string()).describe("아쉬웠던 점 / 개선할 점 1~3개"),
  nextActions: z.array(z.string()).describe("다음 주에 실천할 구체적 행동 1~3개"),
});
export type WeeklySummary = z.infer<typeof WeeklySummarySchema>;

// 월간 회고 결과
export const MonthlySummarySchema = z.object({
  oneLine: z.string().describe("한 달을 담은 한 문장 요약 (60자 내외)"),
  themes: z.array(z.string()).describe("한 달을 관통하는 주요 테마·흐름 2~3개"),
  highlights: z.array(z.string()).describe("잘한 점 / 인상 깊었던 순간 2~4개"),
  improvements: z.array(z.string()).describe("아쉬웠던 점 / 개선할 점 1~3개"),
  nextGoals: z.array(z.string()).describe("다음 달 목표 1~3개"),
});
export type MonthlySummary = z.infer<typeof MonthlySummarySchema>;

// 요약 API 요청: 대상 기간만 지정하고, 일기 본문은 서버가 저장 파일에서 읽음
// key: daily = 날짜, weekly = 해당 주 월요일, monthly = YYYY-MM
// 형식뿐 아니라 실제 달력 날짜인지 확인 (2024-02-30, 2026-13 등은 UI에서 보이지 않는 고아 데이터가 됨)
export const DateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((key) => toDateKey(fromDateKey(key)) === key, "존재하지 않는 날짜");
export const MonthKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/)
  .refine((key) => addMonths(key, 0) === key, "존재하지 않는 월");
const WeekStartKeySchema = DateKeySchema.refine(
  (key) => weekStartOf(key) === key,
  "주간 키는 월요일이어야 함",
);

export const SummarizeRequestSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("daily"), key: DateKeySchema }),
  z.object({ mode: z.literal("weekly"), key: WeekStartKeySchema }),
  z.object({ mode: z.literal("monthly"), key: MonthKeySchema }),
]);
export type SummaryMode = z.infer<typeof SummarizeRequestSchema>["mode"];

// 프로젝트 파일(data/diary.json)에 저장되는 전체 데이터
// 키: 일기·일간 요약 = 날짜(YYYY-MM-DD), 주간 = 해당 주 월요일, 월간 = YYYY-MM
export type DiaryData = {
  entries: Record<string, string>;
  dailySummaries: Record<string, DailySummary>;
  weeklySummaries: Record<string, WeeklySummary>;
  monthlySummaries: Record<string, MonthlySummary>;
};
