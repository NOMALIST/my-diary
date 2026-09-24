import { z } from "zod";
import { DateKeySchema } from "@/lib/schemas";
import { updateData } from "@/lib/store";

const SaveEntrySchema = z.object({
  date: DateKeySchema,
  text: z.string().max(10000),
});

// 일기 저장 (빈 내용이면 해당 날짜 일기 삭제)
export async function PUT(request: Request) {
  const parsed = SaveEntrySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "일기 내용을 확인해 주세요." }, { status: 400 });
  }
  const { date, text } = parsed.data;

  try {
    await updateData((data) => {
      if (text.trim()) data.entries[date] = text;
      else delete data.entries[date];
    });
    return Response.json({ ok: true });
  } catch (e) {
    console.error("[entries]", e);
    return Response.json({ error: "일기 파일 저장에 실패했습니다." }, { status: 500 });
  }
}
