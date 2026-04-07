"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const EXAMPLE_KEYWORDS = ["바다", "행복", "바람", "삶", "그리움", "빛"];
const POEM_RATE_KEY = "poem_last_gen_v1";
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

const RATE_LIMIT_MSG =
  "시는 6시간에 한 번만 생성할 수 있어요. 잠시 후 다시 시도해 주세요.";

function readPoemCooldownActive() {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(POEM_RATE_KEY);
    if (!raw) return false;
    const last = Number(JSON.parse(raw));
    if (!Number.isFinite(last)) return false;
    return Date.now() - last < SIX_HOURS_MS;
  } catch {
    return false;
  }
}

function savePoemGenerationTime() {
  try {
    localStorage.setItem(POEM_RATE_KEY, JSON.stringify(Date.now()));
  } catch {
    /* ignore */
  }
}

function detectLocale() {
  if (typeof navigator === "undefined") return "en";
  const lang = (navigator.language || "en").toLowerCase();
  if (lang.startsWith("ko")) return "ko";
  if (lang.startsWith("ja")) return "ja";
  if (lang.startsWith("en")) return "en";
  return "en";
}

export default function PoemPage() {
  const [keyword, setKeyword] = useState("");
  const [poem, setPoem] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [copyDone, setCopyDone] = useState(false);
  const [locale, setLocale] = useState("en");
  const [inCooldown, setInCooldown] = useState(false);

  useEffect(() => {
    setLocale(detectLocale());
    setInCooldown(readPoemCooldownActive());
    const tick = () => setInCooldown(readPoemCooldownActive());
    const id = setInterval(tick, 60_000);
    window.addEventListener("focus", tick);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", tick);
    };
  }, []);

  const generate = useCallback(async () => {
    const kw = keyword.trim();
    if (!kw) {
      setErrorMsg("키워드를 입력해 주세요.");
      return;
    }
    if (readPoemCooldownActive()) {
      setErrorMsg(RATE_LIMIT_MSG);
      setInCooldown(true);
      return;
    }
    setErrorMsg("");
    setCopyDone(false);
    const loc = detectLocale();
    setLocale(loc);
    setLoading(true);
    setPoem("");

    try {
      const res = await fetch("/api/poem", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ keyword: kw, locale: loc }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 429 || data.code === "RATE_LIMIT") {
        setErrorMsg(data.error || RATE_LIMIT_MSG);
        setInCooldown(true);
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setErrorMsg(data.error || "시를 받아오지 못했어요.");
        setLoading(false);
        return;
      }
      setPoem(data.text || "");
      savePoemGenerationTime();
      setInCooldown(true);
    } catch {
      setErrorMsg("네트워크 오류가 발생했어요.");
    } finally {
      setLoading(false);
    }
  }, [keyword]);

  const copyPoem = useCallback(async () => {
    if (!poem) return;
    try {
      await navigator.clipboard.writeText(poem);
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
    } catch {
      setErrorMsg("복사에 실패했어요.");
    }
  }, [poem]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-zinc-50 font-sans text-zinc-950 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-12 sm:px-6">
        <Link
          href="/"
          className="inline-flex w-fit text-sm font-medium text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          ← 홈으로
        </Link>

        {errorMsg ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            {errorMsg}
          </div>
        ) : null}

        <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-zinc-950">
          <h1 className="text-center text-xl font-semibold">마음의 울림</h1>
          <p className="mt-2 text-center text-sm text-zinc-600 dark:text-zinc-400">
            키워드를 넣으면 그에 어울리는 시를 지어 드려요.
          </p>

          <div className="mt-6">
            <label htmlFor="poem-keyword" className="sr-only">
              키워드
            </label>
            <input
              id="poem-keyword"
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && generate()}
              placeholder="시의 씨앗이 될 키워드를 입력하세요"
              className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-300 dark:border-white/10 dark:bg-zinc-900 dark:placeholder:text-zinc-500 dark:focus:border-white/20"
            />
            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2">
              <span className="shrink-0 text-xs font-medium text-zinc-500 dark:text-zinc-400">예시:</span>
              {EXAMPLE_KEYWORDS.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setKeyword(ex)}
                  className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={generate}
            disabled={loading || inCooldown}
            className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-full bg-zinc-950 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            {loading ? "생성 중…" : inCooldown ? "다음 생성까지 대기" : "생성하기"}
          </button>
          {inCooldown && !loading ? (
            <p className="mt-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
              시는 6시간에 한 번만 만들 수 있어요.
            </p>
          ) : null}

          {poem ? (
            <div className="mt-8 flex flex-col gap-4">
              <pre className="whitespace-pre-wrap rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4 font-sans text-base leading-relaxed text-zinc-900 dark:border-white/10 dark:bg-white/5 dark:text-zinc-100">
                {poem}
              </pre>
              <button
                type="button"
                onClick={copyPoem}
                className="inline-flex h-10 w-full items-center justify-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
              >
                {copyDone ? "복사됨" : "시 복사"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
