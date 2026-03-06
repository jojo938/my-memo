"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "projectjk_memos_v1";

function safeJsonParse(value, fallback) {
  try {
    if (!value) return fallback;
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toDateKey(isoString) {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "invalid";
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatKoreanDateHeading(isoString) {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "날짜 정보 없음";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(d);
}

function formatKoreanDateTime(isoString) {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function makeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function normalizeMemo(raw) {
  if (!raw || typeof raw !== "object") return null;
  const id = typeof raw.id === "string" ? raw.id : makeId();
  const title = typeof raw.title === "string" ? raw.title : "";
  const content = typeof raw.content === "string" ? raw.content : "";
  const createdAt = typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString();
  const updatedAt = typeof raw.updatedAt === "string" ? raw.updatedAt : createdAt;
  return { id, title, content, createdAt, updatedAt };
}

function loadMemosFromStorage() {
  if (typeof window === "undefined") return [];
  const raw = safeJsonParse(window.localStorage.getItem(STORAGE_KEY), []);
  if (!Array.isArray(raw)) return [];
  const memos = raw.map(normalizeMemo).filter(Boolean);
  return memos;
}

function saveMemosToStorage(memos) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memos));
}

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [memos, setMemos] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");

  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  const newTitleRef = useRef(null);

  useEffect(() => {
    setMemos(loadMemosFromStorage());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    saveMemosToStorage(memos);
  }, [memos, mounted]);

  const selectedMemo = useMemo(() => memos.find((m) => m.id === selectedId) ?? null, [memos, selectedId]);

  useEffect(() => {
    if (!selectedMemo) return;
    setEditTitle(selectedMemo.title);
    setEditContent(selectedMemo.content);
  }, [selectedMemo?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredMemos = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [...memos].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (!q) return list;
    return list.filter((m) => {
      const hay = `${m.title}\n${m.content}`.toLowerCase();
      return hay.includes(q);
    });
  }, [memos, query]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const memo of filteredMemos) {
      const key = toDateKey(memo.createdAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(memo);
    }
    const keys = Array.from(map.keys()).sort((a, b) => (a < b ? 1 : -1));
    return keys.map((key) => ({
      key,
      heading: key === "invalid" ? "날짜 정보 없음" : formatKoreanDateHeading(`${key}T00:00:00.000Z`),
      memos: map.get(key),
    }));
  }, [filteredMemos]);

  function createMemo(e) {
    e.preventDefault();
    const title = newTitle.trim();
    const content = newContent.trim();
    if (!title && !content) return;

    const now = new Date().toISOString();
    const memo = {
      id: makeId(),
      title: title || "제목 없음",
      content,
      createdAt: now,
      updatedAt: now,
    };

    setMemos((prev) => [memo, ...prev]);
    setSelectedId(memo.id);
    setNewTitle("");
    setNewContent("");
    requestAnimationFrame(() => newTitleRef.current?.focus?.());
  }

  function deleteMemo(id) {
    const target = memos.find((m) => m.id === id);
    const name = target?.title ? `“${target.title}”` : "이 메모";
    if (!window.confirm(`${name}를 삭제할까요?\n삭제하면 되돌릴 수 없어요.`)) return;

    setMemos((prev) => prev.filter((m) => m.id !== id));
    setSelectedId((prev) => (prev === id ? null : prev));
  }

  function startEditing(memo) {
    setSelectedId(memo.id);
  }

  function saveEdit() {
    if (!selectedMemo) return;
    const title = editTitle.trim();
    const content = editContent.trim();

    setMemos((prev) =>
      prev.map((m) => {
        if (m.id !== selectedMemo.id) return m;
        const now = new Date().toISOString();
        return {
          ...m,
          title: title || "제목 없음",
          content,
          updatedAt: now,
        };
      }),
    );
  }

  function clearAll() {
    if (memos.length === 0) return;
    if (!window.confirm("전체 메모를 삭제할까요?\n삭제하면 되돌릴 수 없어요.")) return;
    setMemos([]);
    setSelectedId(null);
    setQuery("");
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-950 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col">
              <h1 className="text-2xl font-semibold tracking-tight">메모장</h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {mounted ? (
                  <>
                    메모 {memos.length.toLocaleString("ko-KR")}개 · localStorage에 자동 저장돼요
                  </>
                ) : (
                  <>불러오는 중…</>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedId(null);
                  setQuery("");
                  setNewTitle("");
                  setNewContent("");
                  requestAnimationFrame(() => newTitleRef.current?.focus?.());
                }}
                className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-950 shadow-sm transition hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
              >
                새 메모
              </button>
              <button
                type="button"
                onClick={clearAll}
                disabled={memos.length === 0}
                className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-red-600 shadow-sm transition hover:bg-zinc-50 disabled:opacity-50 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-zinc-900"
              >
                전체 삭제
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-md">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="검색 (제목/내용)…"
                className="h-11 w-full rounded-2xl border border-zinc-200 bg-white px-4 pr-10 text-sm outline-none ring-0 transition placeholder:text-zinc-400 focus:border-zinc-300 focus:bg-white dark:border-white/10 dark:bg-zinc-950 dark:placeholder:text-zinc-500 dark:focus:border-white/20"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/10"
                >
                  지우기
                </button>
              ) : null}
            </div>

            <div className="text-xs text-zinc-600 dark:text-zinc-400">
              날짜별로 자동 그룹화 · 작성/수정 시각 기록
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <section className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-950">
            <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">메모 작성</h2>
            <form onSubmit={createMemo} className="flex flex-col gap-3">
              <input
                ref={newTitleRef}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="제목"
                className="h-11 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-300 dark:border-white/10 dark:bg-zinc-950 dark:placeholder:text-zinc-500 dark:focus:border-white/20"
              />
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="내용을 입력하세요…"
                rows={8}
                className="w-full resize-none rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-zinc-400 focus:border-zinc-300 dark:border-white/10 dark:bg-zinc-950 dark:placeholder:text-zinc-500 dark:focus:border-white/20"
              />
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  {mounted ? "저장: 자동" : "저장: 대기"}
                </div>
                <button
                  type="submit"
                  className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                >
                  저장
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-3xl border border-zinc-200 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-950">
            <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">메모 목록</h2>
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                  항목을 클릭하면 오른쪽(또는 아래)에 상세/수정이 열려요.
                </p>
              </div>

              {selectedMemo ? (
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300">
                  <div>
                    <span className="font-medium">작성</span> {formatKoreanDateTime(selectedMemo.createdAt)}
                  </div>
                  <div>
                    <span className="font-medium">수정</span> {formatKoreanDateTime(selectedMemo.updatedAt)}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-zinc-500 dark:text-zinc-400">선택된 메모 없음</div>
              )}
            </div>

            <div className="grid gap-4 border-t border-zinc-100 p-4 dark:border-white/10 lg:grid-cols-[1fr_1.2fr]">
              <div className="flex min-h-[420px] flex-col gap-4">
                {grouped.length === 0 ? (
                  <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-zinc-200 p-10 text-center text-sm text-zinc-600 dark:border-white/10 dark:text-zinc-400">
                    {query ? "검색 결과가 없어요." : "아직 메모가 없어요. 왼쪽에서 메모를 저장해보세요."}
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {grouped.map((g) => (
                      <div key={g.key} className="flex flex-col gap-2">
                        <div className="sticky top-0 z-10 -mx-1 rounded-2xl bg-white/90 px-1 py-1 text-xs font-semibold text-zinc-700 backdrop-blur dark:bg-zinc-950/80 dark:text-zinc-200">
                          {g.heading}
                        </div>
                        <div className="flex flex-col gap-2">
                          {g.memos.map((memo) => {
                            const active = memo.id === selectedId;
                            return (
                              <button
                                key={memo.id}
                                type="button"
                                onClick={() => startEditing(memo)}
                                className={[
                                  "group flex w-full flex-col gap-1 rounded-2xl border px-3 py-3 text-left transition",
                                  active
                                    ? "border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950"
                                    : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-white/5",
                                ].join(" ")}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="truncate text-sm font-semibold">{memo.title || "제목 없음"}</div>
                                    <div
                                      className={[
                                        "mt-1 line-clamp-2 text-xs leading-5",
                                        active ? "text-white/80 dark:text-zinc-700" : "text-zinc-600 dark:text-zinc-400",
                                      ].join(" ")}
                                    >
                                      {memo.content || "내용 없음"}
                                    </div>
                                  </div>
                                  <div
                                    className={[
                                      "shrink-0 text-[11px]",
                                      active ? "text-white/80 dark:text-zinc-700" : "text-zinc-500 dark:text-zinc-400",
                                    ].join(" ")}
                                  >
                                    {new Intl.DateTimeFormat("ko-KR", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    }).format(new Date(memo.createdAt))}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex min-h-[420px] flex-col rounded-3xl border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-white/5">
                {!selectedMemo ? (
                  <div className="flex h-full flex-1 items-center justify-center text-center text-sm text-zinc-600 dark:text-zinc-400">
                    메모를 선택하면 여기에서 수정/삭제할 수 있어요.
                  </div>
                ) : (
                  <div className="flex flex-1 flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">선택된 메모</div>
                        <div className="mt-1 truncate text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                          {selectedMemo.title || "제목 없음"}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteMemo(selectedMemo.id)}
                        className="inline-flex h-9 items-center justify-center rounded-full border border-zinc-200 bg-white px-3 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                      >
                        삭제
                      </button>
                    </div>

                    <div className="grid gap-2">
                      <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">제목</label>
                      <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="h-11 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none transition focus:border-zinc-300 dark:border-white/10 dark:bg-zinc-950 dark:focus:border-white/20"
                      />
                    </div>

                    <div className="grid flex-1 gap-2">
                      <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">내용</label>
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={10}
                        className="w-full flex-1 resize-none rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-zinc-300 dark:border-white/10 dark:bg-zinc-950 dark:focus:border-white/20"
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="text-xs text-zinc-600 dark:text-zinc-400">
                        <div>
                          <span className="font-semibold">작성</span> {formatKoreanDateTime(selectedMemo.createdAt)}
                        </div>
                        <div>
                          <span className="font-semibold">최근 수정</span> {formatKoreanDateTime(selectedMemo.updatedAt)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={saveEdit}
                        className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                      >
                        수정 저장
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        <footer className="pt-2 text-xs text-zinc-500 dark:text-zinc-400">
          팁: 브라우저 저장소(localStorage)를 사용하므로, 같은 브라우저/기기에서만 유지돼요.
        </footer>
      </div>
    </div>
  );
}
