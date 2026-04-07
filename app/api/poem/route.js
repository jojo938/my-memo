import { NextResponse } from "next/server";

export const runtime = "nodejs";

const ALLOWED_LOCALES = ["ko", "en", "ja"];
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

/** @type {Map<string, number>} */
const ipLastPoemAt = new Map();

function getClientIp(req) {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first.slice(0, 128);
  }
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim().slice(0, 128);
  return "unknown";
}

const RATE_LIMIT_MESSAGE =
  "시는 6시간에 한 번만 생성할 수 있어요. 잠시 후 다시 시도해 주세요.";

function buildUserMessage(keyword, locale) {
  const k = String(keyword).trim().slice(0, 80);
  const instructions = {
    ko: `다음 키워드를 중심으로, 마음에 울림을 주는 짧은 시를 써 주세요. 제목은 붙이지 말고 시 본문만 출력하세요. 적절한 줄바꿈을 사용하세요. 키워드: "${k}"`,
    en: `Write a short poem inspired by the following keyword that resonates with the heart ("echo of the heart"). Output only the poem body, no title. Use line breaks where appropriate. Keyword: "${k}"`,
    ja: `次のキーワードを中心に、心に響く短い詩を書いてください。タイトルは付けず本文のみ。適宜改行してください。キーワード: 「${k}」`,
  };
  return instructions[locale] || instructions.en;
}

export async function POST(req) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "서버에 API 키가 설정되지 않았어요." }, { status: 500 });
  }

  const ip = getClientIp(req);
  const now = Date.now();
  const lastAt = ipLastPoemAt.get(ip);
  if (lastAt != null && now - lastAt < SIX_HOURS_MS) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE, code: "RATE_LIMIT" }, { status: 429 });
  }

  let body = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const keyword = typeof body.keyword === "string" ? body.keyword.trim() : "";
  if (!keyword) {
    return NextResponse.json({ error: "키워드를 입력해 주세요." }, { status: 400 });
  }

  let locale = typeof body.locale === "string" ? body.locale.toLowerCase().slice(0, 2) : "en";
  if (!ALLOWED_LOCALES.includes(locale)) {
    locale = "en";
  }

  const userMessage = buildUserMessage(keyword, locale);

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
        max_tokens: 2048,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Anthropic poem error:", res.status, errText);
      return NextResponse.json({ error: "시를 생성하지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 502 });
    }

    const data = await res.json();
    const textBlock = data?.content?.find((b) => b.type === "text");
    const text = (textBlock?.text || "").trim();
    if (!text) {
      return NextResponse.json({ error: "응답이 비어 있어요." }, { status: 502 });
    }

    ipLastPoemAt.set(ip, Date.now());

    return NextResponse.json({ text, locale });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "서버 오류가 발생했어요." }, { status: 500 });
  }
}
