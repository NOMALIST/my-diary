import { connection } from "next/server";
import DiaryApp from "@/components/DiaryApp";
import { readData } from "@/lib/store";

export default async function Home() {
  // 빌드 시 미리 렌더링하지 않고, 요청마다 최신 저장 파일을 읽음
  await connection();
  const data = await readData();
  return <DiaryApp initialData={data} />;
}
