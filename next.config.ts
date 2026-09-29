import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";
import type { NextConfig } from "next";

// 상위 폴더(my-app)의 공유 접속 정보 로드
// - Next가 프로젝트 .env*를 먼저 읽은 뒤 이 파일을 실행 → 이미 값이 있는 키는 유지(프로젝트 값 우선)
// - 여기서 추가한 값은 Next가 초기 env로 보존 → dev 중 .env 재로드 후에도 유지
const SHARED_ENV_FILE = path.resolve(import.meta.dirname, "..", ".env.local");
if (existsSync(SHARED_ENV_FILE)) {
  const shared = parseEnv(readFileSync(SHARED_ENV_FILE, "utf8"));
  for (const [key, value] of Object.entries(shared)) {
    if (!process.env[key]) process.env[key] = value;
  }
}

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
