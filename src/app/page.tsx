import { connection } from "next/server";
import DiaryApp from "@/components/DiaryApp";
import { logError } from "@/lib/log";
import { DbConfigError, readData } from "@/lib/store";

// DB 조회 실패 시 안내 문구 반환 (원문 에러는 화면·로그에 노출하지 않음)
async function loadData() {
  try {
    return { data: await readData() };
  } catch (e) {
    logError("[home]", e);
    return {
      error: e instanceof DbConfigError ? e.message : "잠시 후 새로고침하거나 인터넷 연결을 확인하세요.",
    };
  }
}

export default async function Home() {
  // 빌드 시 미리 렌더링하지 않고, 요청마다 DB에서 최신 데이터를 읽음
  await connection();
  const result = await loadData();
  if (!result.data) {
    return (
      <main className="mx-auto max-w-xl p-8 text-center">
        <p className="font-semibold">일기 데이터를 불러오지 못했습니다.</p>
        <p className="mt-2 text-sm opacity-70">{result.error}</p>
      </main>
    );
  }
  return <DiaryApp initialData={result.data} />;
}
