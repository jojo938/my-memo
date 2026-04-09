"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

const PLAN_QUESTIONS = [
  {
    sectionEn: "COMPANY PURPOSE",
    sectionKo: "회사의 목적",
    guide:
      "여기서 시작하세요. 회사를 하나의 선언적 문장으로 정의하십시오. 보기보다 어렵습니다. 미션을 전달하는 대신 기능을 나열하는 데 빠지기 쉽습니다.",
  },
  {
    sectionEn: "PROBLEM",
    sectionKo: "문제",
    guide:
      "고객의 고통을 설명하세요. 현재 이 문제가 어떻게 해결되고 있으며, 기존 솔루션의 한계는 무엇인가요?",
  },
  {
    sectionEn: "SOLUTION",
    sectionKo: "솔루션",
    guide:
      "당신의 유레카 순간을 설명하세요. 왜 당신의 가치 제안이 독보적이고 설득력 있나요? 왜 지속될 수 있나요? 그리고 앞으로 어디로 나아가나요?",
  },
  {
    sectionEn: "WHY NOW?",
    sectionKo: "왜 지금인가?",
    guide:
      "최고의 회사들은 거의 항상 명확한 '왜 지금인가?'를 가지고 있습니다. 자연은 진공을 싫어합니다. 그렇다면 왜 이 솔루션이 지금까지 만들어지지 않았을까요?",
  },
  {
    sectionEn: "MARKET POTENTIAL",
    sectionKo: "시장 잠재력",
    guide: "고객과 시장을 정의하세요. 최고의 회사들 중 일부는 자신만의 시장을 창조합니다.",
  },
  {
    sectionEn: "COMPETITION",
    sectionKo: "경쟁/대안",
    guide: "직접 경쟁자와 간접 경쟁자는 누구인가요? 승리할 계획이 있다는 것을 보여주세요.",
  },
  {
    sectionEn: "BUSINESS MODEL",
    sectionKo: "비즈니스 모델",
    guide: "어떻게 성장하고 수익을 낼 것인가요?",
  },
  {
    sectionEn: "TEAM",
    sectionKo: "팀",
    guide: "창업자와 핵심 팀원들의 이야기를 들려주세요.",
  },
  {
    sectionEn: "FINANCIALS",
    sectionKo: "재무",
    guide: "있다면 포함해 주세요.",
  },
  {
    sectionEn: "VISION",
    sectionKo: "비전",
    guide: "모든 것이 잘 풀린다면, 5년 후 무엇을 만들어 놓았을까요?",
  },
];

const DRAFT_KEY = "plan_draft_v1";
const USAGE_KEY = "plan_daily_usage_v1";
const RESULT_KEY = "plan_last_analysis_v1";
const DAILY_LIMIT = 3;

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function loadDraft() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || !Array.isArray(d.answers) || d.answers.length !== 10) return null;
    const step = Math.min(9, Math.max(0, Number(d.step) || 0));
    const answers = d.answers.map((a) => (typeof a === "string" ? a : ""));
    return { answers, step };
  } catch {
    return null;
  }
}

function saveDraft(answers, step) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ answers, step, updatedAt: Date.now() }));
  } catch {
    /* ignore */
  }
}

function loadUsageCount() {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(USAGE_KEY);
    if (!raw) return 0;
    const d = JSON.parse(raw);
    if (d.date !== todayStr()) return 0;
    return Math.min(DAILY_LIMIT, Math.max(0, Number(d.count) || 0));
  } catch {
    return 0;
  }
}

function incrementUsage() {
  const date = todayStr();
  let count = 0;
  try {
    const raw = localStorage.getItem(USAGE_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      count = d.date === date ? Number(d.count) || 0 : 0;
    }
  } catch {
    /* ignore */
  }
  count += 1;
  localStorage.setItem(USAGE_KEY, JSON.stringify({ date, count }));
}

function loadSavedResult() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(RESULT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    return typeof d.text === "string" ? d.text : null;
  } catch {
    return null;
  }
}

function saveResult(text) {
  try {
    localStorage.setItem(RESULT_KEY, JSON.stringify({ text, savedAt: Date.now() }));
  } catch {
    /* ignore */
  }
}

export default function PlanPage() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(() => Array(10).fill(""));
  const [hydrated, setHydrated] = useState(false);
  const [phase, setPhase] = useState("quiz");
  const [analyzing, setAnalyzing] = useState(false);
  const [resultText, setResultText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [usageCount, setUsageCount] = useState(0);
  const [copyDone, setCopyDone] = useState(false);
  const [hasStoredAnalysis, setHasStoredAnalysis] = useState(false);

  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      setAnswers(draft.answers);
      setStep(draft.step);
    }
    setUsageCount(loadUsageCount());
    const saved = loadSavedResult();
    if (saved) {
      setResultText(saved);
      setHasStoredAnalysis(true);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveDraft(answers, step);
  }, [answers, step, hydrated]);

  const current = PLAN_QUESTIONS[step];
  const progressLabel = `${step + 1}/10`;

  const setAnswerAt = useCallback((idx, value) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  }, []);

  const goNext = useCallback(() => {
    if (step < 9) {
      setStep((s) => s + 1);
      setErrorMsg("");
    }
  }, [step]);

  const runAnalysis = useCallback(async () => {
    const used = loadUsageCount();
    if (used >= DAILY_LIMIT) {
      setErrorMsg(`오늘은 분석을 ${DAILY_LIMIT}번 모두 사용했어요. 내일 다시 시도해 주세요.`);
      return;
    }
    setErrorMsg("");
    setAnalyzing(true);
    const items = PLAN_QUESTIONS.map((q, i) => ({
      sectionEn: q.sectionEn,
      sectionKo: q.sectionKo,
      answer: answers[i] || "",
    }));

    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(data.error || "분석에 실패했어요.");
        setAnalyzing(false);
        return;
      }
      const text = data.text || "";
      setResultText(text);
      saveResult(text);
      setHasStoredAnalysis(true);
      incrementUsage();
      setUsageCount(loadUsageCount());
      setPhase("result");
    } catch {
      setErrorMsg("네트워크 오류가 발생했어요.");
    } finally {
      setAnalyzing(false);
    }
  }, [answers]);

  const copyResult = useCallback(async () => {
    if (!resultText) return;
    try {
      await navigator.clipboard.writeText(resultText);
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
    } catch {
      setErrorMsg("복사에 실패했어요.");
    }
  }, [resultText]);

  const resetAll = useCallback(() => {
    setAnswers(Array(10).fill(""));
    setStep(0);
    setPhase("quiz");
    setErrorMsg("");
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const showSavedAnalysis = useCallback(() => {
    const t = loadSavedResult();
    if (t) {
      setResultText(t);
      setPhase("result");
    }
  }, []);

  const numLabel = String(step + 1).padStart(2, "0");

  const remaining = useMemo(() => Math.max(0, DAILY_LIMIT - usageCount), [usageCount]);

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="flex min-h-screen items-center justify-center text-sm text-zinc-400">불러오는 중…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 pb-12 pt-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="text-sm font-medium text-zinc-400 underline-offset-4 hover:text-white hover:underline"
          >
            ← 홈으로
          </Link>
          {phase === "quiz" && (
            <span className="text-sm text-zinc-500">
              오늘 남은 분석: {remaining}/{DAILY_LIMIT}
            </span>
          )}
        </div>

        {hasStoredAnalysis && phase === "quiz" ? (
          <button
            type="button"
            onClick={showSavedAnalysis}
            className="mt-4 w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-left text-sm text-zinc-200 hover:bg-zinc-800"
          >
            저장된 분석 결과 보기 →
          </button>
        ) : null}

        {errorMsg ? (
          <div className="mt-4 rounded-2xl border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            {errorMsg}
          </div>
        ) : null}

        {phase === "result" ? (
          <div className="mt-8 flex flex-1 flex-col gap-4">
            <h1 className="text-xl font-semibold">분석 결과</h1>
            <div className="max-h-[60vh] overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-sm leading-relaxed text-zinc-100">
              <pre className="whitespace-pre-wrap font-sans">{resultText}</pre>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={copyResult}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-full border border-zinc-600 bg-white px-4 text-sm font-semibold text-black hover:bg-zinc-200 sm:flex-initial"
              >
                {copyDone ? "복사됨" : "결과 복사"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPhase("quiz");
                  setErrorMsg("");
                }}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-full border border-zinc-600 bg-transparent px-4 text-sm font-medium text-zinc-200 hover:bg-zinc-900 sm:flex-initial"
              >
                질문으로 돌아가기
              </button>
              <button
                type="button"
                onClick={resetAll}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 px-4 text-sm font-medium text-zinc-200 hover:bg-zinc-800 sm:flex-initial"
              >
                처음부터 작성
              </button>
            </div>
          </div>
        ) : analyzing ? (
          <div className="mt-16 flex flex-col items-center justify-center gap-4 text-zinc-400">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-600 border-t-white" />
            <p>AI가 분석 중입니다…</p>
          </div>
        ) : (
          <>
            <div className="mt-6 w-full">
              <div className="mb-2 h-1 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full bg-white transition-[width] duration-300"
                  style={{ width: `${((step + 1) / 10) * 100}%` }}
                />
              </div>
              <p className="mt-2 text-left text-xs text-zinc-500">{progressLabel}</p>
            </div>

            <div className="mt-8 flex flex-col">
              <p className="text-sm text-zinc-500">
                {numLabel} · {current.sectionEn}
              </p>
              <h2 className="mt-1 text-2xl font-bold text-white">{current.sectionKo}</h2>

              <p className="mt-10 max-w-xl text-left text-base leading-relaxed text-zinc-300">
                {current.guide}
              </p>

              <div className="mt-12 flex flex-col gap-4">
                <label htmlFor="plan-answer" className="sr-only">
                  {current.sectionKo} 답변
                </label>
                <textarea
                  id="plan-answer"
                  value={answers[step]}
                  onChange={(e) => setAnswerAt(step, e.target.value)}
                  rows={8}
                  placeholder="여기에 답변을 입력하세요."
                  className="w-full resize-y rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm leading-relaxed text-white placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
                />
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  {step > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setStep((s) => Math.max(0, s - 1));
                        setErrorMsg("");
                      }}
                      className="h-11 rounded-full border border-zinc-600 px-6 text-sm font-medium text-zinc-300 hover:bg-zinc-900"
                    >
                      이전
                    </button>
                  ) : null}
                  {step < 9 ? (
                    <button
                      type="button"
                      onClick={goNext}
                      className="h-11 rounded-full bg-white px-8 text-sm font-semibold text-black hover:bg-zinc-200"
                    >
                      다음
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={runAnalysis}
                      disabled={analyzing || remaining <= 0}
                      className="h-11 rounded-full bg-white px-8 text-sm font-semibold text-black hover:bg-zinc-200 disabled:opacity-40"
                    >
                      분석 받기
                    </button>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
