import postgres from "postgres";
import { ClaudeCliError } from "./claude-cli";
import { DbConfigError } from "./store";

// 서버 에러 로그: 원문 에러(스택·접속 URL 등 비밀값이 섞일 수 있음)는 찍지 않고
// 안전하다고 확인된 정보만 남긴다.
export function logError(tag: string, e: unknown) {
  if (e instanceof ClaudeCliError || e instanceof DbConfigError) {
    console.error(tag, e.name, e.message);
  } else if (e instanceof postgres.PostgresError) {
    // DB 서버가 돌려준 SQL 오류 (접속 정보 미포함)
    console.error(tag, "PostgresError", e.code, e.message);
  } else if (e instanceof Error) {
    const code = (e as NodeJS.ErrnoException).code;
    console.error(tag, e.name, code ?? "");
  } else {
    console.error(tag, "알 수 없는 오류");
  }
}
