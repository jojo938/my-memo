import { NextResponse } from "next/server";

export const runtime = "nodejs";

const ALLOWED_LOCALES = ["ko", "en", "ja"];

function buildPrompt(locale) {
  const instructions = {
    ko: `긍정적이거나, 불교적 철학이거나, 혹은 스토아 철학의 격언이나 명언을 해줘. 아님 흥미롭거나 인상적인 영화의 명대사를 해줘. 
규칙:
- 한 문장 또는 세 문장 이내로, 깊이 있는 톤으로 작성하세요.
- 기존 존재하는 명언이나 영화대사를 이야기 할 때는 누가 어디서 한 이야기인 지 함께 밝히세요.
- 따옴표나 "격언:" 같은 접두어 없이 본문만 출력하세요.
- 한국어로만 작성하세요.`,
    en: `Give me a positive, Buddhist philosophy, or a Stoic maxim or quote. Or give me an interesting or impressive movie line
Rules:
- One or three sentences at most, profound tone.
- When quoting from existing aphorisms or movie quotes, include the author's or character's name and where it came from
.
- Output only the aphorism text, no quotes or prefixes like "Aphorism:".
- Write in English only.`,
    ja: `ポジティブであれ、仏教的な哲学であれ、あるいはストア哲学の格言や名言を教えてくれ。 あるいは、面白いまたは印象的な映画の名セリフを言ってくれ。
ルール:
- 一文または二文以内、静かで深いトーンで。
- 引用符や「格言：」などの接頭辞は付けず、本文のみ出力。
- 日本語のみで書いてください。`,
  };
  return instructions[locale] || instructions.en;
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
    body = {};
  }

  let locale = typeof body.locale === "string" ? body.locale.toLowerCase().slice(0, 2) : "en";
  if (!ALLOWED_LOCALES.includes(locale)) {
    locale = "en";
  }

  const userMessage = buildPrompt(locale);

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 256,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Anthropic error:", res.status, errText);
      return NextResponse.json({ error: "격언을 가져오지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 502 });
    }

    const data = await res.json();
    const textBlock = data?.content?.find((b) => b.type === "text");
    const text = (textBlock?.text || "").trim();
    if (!text) {
      return NextResponse.json({ error: "응답이 비어 있어요." }, { status: 502 });
    }

    return NextResponse.json({ text, locale });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "서버 오류가 발생했어요." }, { status: 500 });
  }
}
