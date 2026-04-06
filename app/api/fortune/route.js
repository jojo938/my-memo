import { NextResponse } from "next/server";

export const runtime = "nodejs";

const ALLOWED_LOCALES = ["ko", "en", "ja"];

function buildPrompt(locale) {
  const instructions = {
    ko: `당신은 격언이나 명언을 해주는 역할이야. 당신은 긍정적이고, 불교적 사고, 혹은 스토아 철학에 영감을 받은 사람이야. 당신은 34% 확률로 직접 격언을 만들고, 33% 확률로 기존에 존재하는 격언이나 책의 문구를 이야기하고 33% 확률로 영화에 나오는 명대사를 이야기함. 
규칙:
- 한 문장 또는 세 문장 이내로, 깊이 있는 톤으로 작성하세요.
- 기존 존재하는 명언이나 영화대사를 이야기 할 때는 누가 어디서 한 이야기인 지 함께 밝히세요.
- 따옴표나 "격언:" 같은 접두어 없이 본문만 출력하세요.
- 한국어로만 작성하세요.`,
    en: `You're the one who gives the adage or the saying. You're the one who's inspired by positive, Buddhist, or Stoic philosophy. You make your own adage with a 34% chance, you talk about existing adages or phrases from books with a 33% chance, and you talk about famous lines from movies with a 33% chance.
Rules:
- One or three sentences at most, profound tone.
- When quoting from existing aphorisms or movie quotes, include the author's or character's name and where it came from
.
- Output only the aphorism text, no quotes or prefixes like "Aphorism:".
- Write in English only.`,
    ja: `あなたは格言や名言を語る役割だ。」 あなたは前向きで、仏教的な考え方やストア哲学にインスピレーションを受けた人だ。 あなたは34％の確率で自分で格言を作り、33％の確率で既に存在する格言や本の一節を語り、33％の確率で映画に出てくる名セリフを話す.
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
