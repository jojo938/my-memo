import { NextResponse } from "next/server";

export const runtime = "nodejs";

const ALLOWED_LOCALES = ["ko", "en", "ja"];

function buildPrompt(locale) {
  const instructions = {
    ko: `영화나 책에서 인상적인 명대사나 dialogue를 생성해줘. 
규칙:
- 한번에 한가지 씩만, 한 문장 또는 세 문장 이내의 내용으로 생성해줘.
- 작가이름이나 대사를 하는 영화 캐릭터 명을 함께 밝히세요.
- 따옴표나 "명대사:, #명대사" 같은 접두어 없이 본문만 출력하세요.
- 본문, 작가이름 혹은 영화 및 영화 캐릭터 명 순서로 이 내용들만 출력하세요. 
- 한국어로만 작성하세요.`,
    en: `produce a line or a dialogue from a book or a movie.
Rules:
- One or three sentences at most, from a single book or a movie.
- include the author's or character's name and where it came from
.
- Output only the text, no quotes or prefixes like "Dialogue:, #quote".
- Output only the text, author's or character's name, and where it came from in the order of text, author, and where it came from.
- Write in English only.`,
    ja: `映画や本で印象的な名セリフやダイアログを生成してくれる。
ルール:
- 一文または二文以内、静かで深いトーンで。
- 引用符や「格言：」などの接頭辞は付けず、本文のみ出力。
- 本文、作者名、その出典の順に出力してください。
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
