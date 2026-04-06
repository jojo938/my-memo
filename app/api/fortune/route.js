import { NextResponse } from "next/server";

export const runtime = "nodejs";

const ALLOWED_LOCALES = ["ko", "en", "ja"];

function buildPrompt(locale) {
  const instructions = {
    ko: `긍정적이고, 불교적 사고, 혹은 스토아 철학에 영감을 받은 격언이나 명언, 영화의 명대사를 해줘. 직접 생성하거나 기존 존재하는 것들에서 찾아 이야기 해줘. 
규칙:
- 한 문장 또는 세 문장 이내로, 깊이 있는 톤으로 작성하세요.
- 기존 존재하는 명언이나 영화대사를 이야기 할 때는 누가 어디서 한 이야기인 지 함께 밝히세요.
- 따옴표나 "격언:" 같은 접두어 없이 본문만 출력하세요.
- 한국어로만 작성하세요.`,
    en: `Give me a good line of maxim, quote, or movie inspired by Buddhist thought or Stoicism. Create it yourself or find it from existing things and tell me.
Rules:
- One or three sentences at most, profound tone.
- When quoting from existing aphorisms or movie quotes, include the author's or character's name and where it came from
.
- Output only the aphorism text, no quotes or prefixes like "Aphorism:".
- Write in English only.`,
    ja: `前向きで、仏教的な考え方、あるいはストア哲学にインスパイアされた格言や名言、映画の名セリフを教えてくれ。」 直接作成するか、既に存在するものから探して教えてくれ。
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
