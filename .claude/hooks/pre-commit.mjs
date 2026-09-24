// Claude Code PreToolUse 훅: Claude가 `git commit`을 실행하기 직전에 lint → build → test 실행
// 하나라도 실패하면 exit 2로 커밋을 차단하고, 실패 로그를 stderr로 Claude에게 전달한다.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

// 훅 입력(JSON)은 stdin으로 전달됨
let input = {};
try {
  input = JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.exit(0);
}

// git commit 명령이 아니면 통과 (예: "git add . && git commit -m ...", "git -C x commit")
const command = input?.tool_input?.command ?? "";
if (!/\bgit\b(\s+-\S+(\s+\S+)?)*\s+commit\b/.test(command)) process.exit(0);

const pkg = JSON.parse(readFileSync(path.join(projectDir, "package.json"), "utf8"));
const scripts = pkg.scripts ?? {};

const steps = [
  { name: "lint", script: "lint" },
  { name: "build", script: "build" },
  { name: "test", script: "test" },
];

const skipped = [];

for (const step of steps) {
  if (!scripts[step.script]) {
    skipped.push(step.name);
    continue;
  }
  const result = spawnSync("npm", ["run", step.script], {
    cwd: projectDir,
    encoding: "utf8",
    shell: process.platform === "win32", // Windows에서 npm.cmd 실행용
  });
  if (result.status !== 0) {
    // 로그가 길면 끝부분만 전달 (에러는 대개 마지막에 출력됨)
    const log = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim().slice(-4000);
    process.stderr.write(
      `[pre-commit] ${step.name} 실패 → 커밋 차단\n원인을 수정한 뒤 다시 커밋하세요.\n\n${log}\n`,
    );
    process.exit(2);
  }
}

if (skipped.length) {
  // 통과는 시키되 누락된 단계를 Claude에게 알림
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        additionalContext: `[pre-commit] package.json에 없는 스크립트 건너뜀: ${skipped.join(", ")}`,
      },
    }),
  );
}
process.exit(0);
