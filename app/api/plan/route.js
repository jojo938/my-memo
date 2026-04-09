import { NextResponse } from "next/server";

export const runtime = "nodejs";

function buildAnalysisPrompt(items) {
  const lines = items
    .map(
      (it, i) =>
        `### ${i + 1}. ${it.sectionKo} (${it.sectionEn})\n답변:\n${(it.answer || "").trim() || "(미작성)"}`,
    )
    .join("\n\n");

  return `당신은 사업 기획·VC·전략 컨설팅 경험이 있는 조언자입니다. 아래는 창업자가 작성한 사업 기획 질문지입니다.

${lines}

---

다음 형식으로 **한국어**로만 답변하세요. 마크다운 제목(##, ###)을 사용하세요.

1. **전체 요약** — 모든 답변을 아우르는 한 페이지 분량 이내의 요약.

2. **섹션별 피드백** — 위 10개 섹션 각각에 대해 반드시 다음 소제목을 포함합니다:
   - **강점**
   - **약점**
   - **고민해볼 점**

3. 마지막에 **한 줄 조언**으로 마무리하세요.

답변이 비어 있거나 짧은 섹션은 그 점을 지적하고 보완을 유도하세요.`;
}

export async function POST(req) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "서버에 API 키가 설정되지 않았어요." }, { status: 500 });
  }

  let body = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 올바르지 않아요." }, { status: 400 });
  }

  const items = Array.isArray(body.items) ? body.items : null;
  if (!items || items.length !== 10) {
    return NextResponse.json({ error: "10개 항목이 모두 필요해요." }, { status: 400 });
  }

  const userMessage = buildAnalysisPrompt(items);

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Anthropic plan error:", res.status, errText);
      return NextResponse.json({ error: "분석을 생성하지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 502 });
    }

    const data = await res.json();
    const textBlock = data?.content?.find((b) => b.type === "text");
    const text = (textBlock?.text || "").trim();
    if (!text) {
      return NextResponse.json({ error: "응답이 비어 있어요." }, { status: 502 });
    }

    return NextResponse.json({ text });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "서버 오류가 발생했어요." }, { status: 500 });
  }
}
