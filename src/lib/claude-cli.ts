import { spawn } from "node:child_process";
import { z } from "zod";

// 로그인된 Claude Code CLI(구독 플랜)를 헤드리스 모드로 호출해 구조화 결과를 받는다.
// API 키 없이 동작하며, 본인 PC 로컬 전용이다.

const TIMEOUT_MS = 120_000;
const MODEL = process.env.CLAUDE_MODEL ?? "sonnet";

// CLI --output-format json 결과 중 사용하는 필드만 검증
const CliResultSchema = z.object({
  is_error: z.boolean(),
  result: z.string().optional(),
  structured_output: z.unknown().optional(),
});

export class ClaudeCliError extends Error {}

export async function runClaude<T extends z.ZodType>(options: {
  systemPrompt: string;
  prompt: string;
  schema: T;
}): Promise<z.infer<T>> {
  // CLI 검증기가 2020-12 메타스키마 참조($schema)를 인식하지 못하므로 제거
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { $schema, ...jsonSchema } = z.toJSONSchema(options.schema);
  const args = [
    "-p",
    "--output-format", "json",
    "--json-schema", JSON.stringify(jsonSchema),
    "--system-prompt", options.systemPrompt,
    "--tools", "", // 도구 비활성: 파일·명령 접근 없이 요약만
    "--no-session-persistence",
    "--model", MODEL,
  ];

  const stdout = await new Promise<string>((resolve, reject) => {
    const child = spawn("claude", args, { windowsHide: true });
    let out = "";
    let err = "";

    const timer = setTimeout(() => {
      child.kill();
      reject(new ClaudeCliError("Claude 응답 시간이 초과되었습니다."));
    }, TIMEOUT_MS);

    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", (e: NodeJS.ErrnoException) => {
      clearTimeout(timer);
      reject(
        new ClaudeCliError(
          e.code === "ENOENT"
            ? "claude CLI를 찾을 수 없습니다. Claude Code 설치 여부를 확인하세요."
            : `claude CLI 실행 실패: ${e.message}`,
        ),
      );
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      // 실패해도 JSON 결과가 있으면 아래에서 is_error로 판별
      if (code !== 0 && !out.trim()) {
        reject(new ClaudeCliError(`claude CLI 종료 코드 ${code}: ${err.trim() || "원인 불명"}`));
        return;
      }
      resolve(out);
    });

    // 일기 본문은 stdin으로 전달 (인자 길이·이스케이프 문제 회피)
    child.stdin.end(options.prompt);
  });

  let parsed: z.infer<typeof CliResultSchema>;
  try {
    parsed = CliResultSchema.parse(JSON.parse(stdout));
  } catch {
    throw new ClaudeCliError("claude CLI 출력 형식을 해석할 수 없습니다.");
  }

  if (parsed.is_error) {
    throw new ClaudeCliError(
      `Claude 호출 실패: ${parsed.result ?? "알 수 없는 오류"} (로그인 상태·사용량 한도 확인)`,
    );
  }

  const result = options.schema.safeParse(parsed.structured_output);
  if (!result.success) {
    throw new ClaudeCliError("Claude 응답이 예상 형식과 다릅니다. 다시 시도해 주세요.");
  }
  return result.data;
}
