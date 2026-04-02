"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "fortuneCookie_v1";
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

function detectLocale() {
  if (typeof navigator === "undefined") return "en";
  console.log(navigator.language);
  const lang = (navigator.language || "en").toLowerCase();
  if (lang.startsWith("ko")) return "ko";
  if (lang.startsWith("ja")) return "ja";
  if (lang.startsWith("en")) return "en";
  return "en";
}

function momentMessage(locale) {
  if (locale === "ko") return "지금 이 순간을 살아가세요.";
  if (locale === "ja") return "今この瞬間を生きていきましょう。";
  return "Live fully in this moment.";
}

function loadStored() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.text !== "string" || typeof parsed.savedAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export default function FortunePage() {
  const [phase, setPhase] = useState("idle");
  const [quote, setQuote] = useState("");
  const [locale, setLocale] = useState("en");
  const [fromCache, setFromCache] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [copyDone, setCopyDone] = useState(false);

  useEffect(() => {
    const loc = detectLocale();
    setLocale(loc);
  }, []);

  const openFortune = useCallback(async () => {
    setErrorMsg("");
    setCopyDone(false);
    const loc = detectLocale();
    setLocale(loc);

    const stored = loadStored();
    const now = Date.now();
    if (stored && now - stored.savedAt < TWELVE_HOURS_MS) {
      setQuote(stored.text);
      setFromCache(true);
      if (stored.locale && ["ko", "en", "ja"].includes(stored.locale)) {
        setLocale(stored.locale);
      }
      setPhase("open");
      return;
    }

    setPhase("loading");
    try {
      const res = await fetch("/api/fortune", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale: loc }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(data.error || "격언을 받아오지 못했어요.");
        setPhase("idle");
        return;
      }
      const text = data.text || "";
      setQuote(text);
      setFromCache(false);
      setPhase("open");
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ text, savedAt: now, locale: data.locale || loc }),
        );
      } catch {
        /* ignore */
      }
    } catch {
      setErrorMsg("네트워크 오류가 발생했어요.");
      setPhase("idle");
    }
  }, []);

  const copyQuote = useCallback(async () => {
    if (!quote) return;
    try {
      await navigator.clipboard.writeText(quote);
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
    } catch {
      setErrorMsg("복사에 실패했어요.");
    }
  }, [quote]);

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

        <div className="rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-white/10 dark:bg-zinc-950">
          <div className="text-7xl leading-none" aria-hidden>
            🥠
          </div>
          <h1 className="mt-4 text-xl font-semibold">포춘 쿠키</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            버튼을 눌러 오늘의 격언을 열어보세요.
          </p>

          {phase === "idle" || phase === "loading" ? (
            <button
              type="button"
              onClick={openFortune}
              disabled={phase === "loading"}
              className="mt-8 inline-flex h-11 w-full max-w-xs items-center justify-center rounded-full bg-zinc-950 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              {phase === "loading" ? "열리는 중…" : "포춘쿠키 열기"}
            </button>
          ) : null}

          {phase === "open" && quote ? (
            <div className="mt-8 flex flex-col gap-4 text-left">
              <blockquote className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4 text-base leading-relaxed text-zinc-900 dark:border-white/10 dark:bg-white/5 dark:text-zinc-100">
                {quote}
              </blockquote>
              {fromCache ? (
                <p className="text-center text-sm font-medium text-amber-800 dark:text-amber-200">
                  {momentMessage(locale)}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={copyQuote}
                  className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
                >
                  {copyDone ? "복사됨" : "격언 복사"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPhase("idle");
                    setQuote("");
                    setFromCache(false);
                    setCopyDone(false);
                  }}
                  className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-600 shadow-sm transition hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
                >
                  닫기
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
