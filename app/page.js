"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toDateKey(isoString) {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "invalid";
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function dateFromKey(key) {
  const parts = key.split("-").map((v) => Number(v));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null;
  const [y, m, d] = parts;
  return new Date(y, m - 1, d);
}

function formatKoreanDateHeading(input) {
  const d = input instanceof Date ? input : new Date(input);
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

function fromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title ?? "",
    content: row.content ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
    mediaUrl: row.media_url ?? null,
  };
}

function isVideoUrl(url) {
  if (!url) return false;
  const lower = url.toLowerCase().split("?")[0];
  return lower.endsWith(".mp4");
}

function resizeImageToMax1200(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      try {
        const maxSize = 1200;
        let { width, height } = img;
        const scale = Math.min(1, maxSize / Math.max(width, height));
        width = Math.round(width * scale);
        height = Math.round(height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error("이미지 컨텍스트를 만들 수 없어요."));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url);
            if (!blob) {
              reject(new Error("이미지를 변환하는 데 실패했어요."));
              return;
            }
            resolve(blob);
          },
          "image/jpeg",
          0.8,
        );
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("이미지를 불러오는 데 실패했어요."));
    };

    img.src = url;
  });
}

function getSupabaseErrorMessage(error) {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (typeof error.message === "string") return error.message;
  return "알 수 없는 오류";
}

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [user, setUser] = useState(null);
  const [memos, setMemos] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [creating, setCreating] = useState(false);
   const [selectedFile, setSelectedFile] = useState(null);

  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [clearing, setClearing] = useState(false);

  const newTitleRef = useRef(null);

  useEffect(() => {
    if (!supabase) {
      setErrorMsg("Supabase 환경변수가 없어요. .env.local의 NEXT_PUBLIC_SUPABASE_URL / KEY를 확인해주세요.");
      setAuthLoading(false);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchUser() {
      setAuthLoading(true);
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (error) {
        setErrorMsg(`인증 상태 확인 실패: ${getSupabaseErrorMessage(error)}`);
      }

      setUser(user ?? null);
      setAuthLoading(false);
    }

    fetchUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchMemos() {
      if (!supabase) return;
      if (!user) {
        setMemos([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMsg("");
      const { data, error } = await supabase
        .from("memos")
        .select("id, created_at, title, content, updated_at, user_id, media_url")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (cancelled) return;
      if (error) {
        setErrorMsg(`불러오기 실패: ${getSupabaseErrorMessage(error)}`);
        setMemos([]);
      } else {
        setMemos((data ?? []).map(fromRow).filter(Boolean));
      }
      setLoading(false);
    }

    fetchMemos();
    return () => {
      cancelled = true;
    };
  }, [user]);

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
      heading: key === "invalid" ? "날짜 정보 없음" : formatKoreanDateHeading(dateFromKey(key) ?? key),
      memos: map.get(key),
    }));
  }, [filteredMemos]);

  async function createMemo(e) {
    e.preventDefault();
    const title = newTitle.trim();
    const content = newContent.trim();
    if (!title && !content) return;
    if (!supabase) return;
    if (!user) {
      setErrorMsg("로그인한 사용자 정보가 없어 메모를 저장할 수 없어요.");
      return;
    }

    const now = new Date().toISOString();
    setCreating(true);
    setErrorMsg("");

    let mediaUrl = null;
    if (selectedFile) {
      const file = selectedFile;
      const mime = file.type || "";
      const isImage = mime.startsWith("image/");
      const isGif = isImage && mime === "image/gif";
      const isMp4 = mime === "video/mp4";
      if (!isImage && !isMp4) {
        setErrorMsg("이미지 또는 MP4 파일만 첨부할 수 있어요.");
        setCreating(false);
        return;
      }

      try {
        let uploadBlob = file;
        let contentType = mime || "application/octet-stream";
        let ext = (file.name || "").toLowerCase().split(".").pop() || "bin";

        if (isImage && !isGif) {
          uploadBlob = await resizeImageToMax1200(file);
          contentType = "image/jpeg";
          ext = "jpg";
        }

        const originalName = (file.name || "media").toLowerCase();
        const baseName = originalName.replace(/\.[^.]+$/, "").replace(/[^a-z0-9-_]/g, "_") || "media";
        const timestamp = Date.now();
        const path = `${user.id}/${timestamp}_${baseName}.${ext}`;

        const { error: uploadError } = await supabase.storage.from("memo-media").upload(path, uploadBlob, {
          cacheControl: "3600",
          contentType,
          upsert: false,
        });

        if (uploadError) {
          setErrorMsg(`파일 업로드 실패: ${getSupabaseErrorMessage(uploadError)}`);
          setCreating(false);
          return;
        }

        const { data: urlData } = supabase.storage.from("memo-media").getPublicUrl(path);
        mediaUrl = urlData?.publicUrl || null;
      } catch (err) {
        setErrorMsg(err.message || "파일 업로드 중 오류가 발생했어요.");
        setCreating(false);
        return;
      }
    }

    const { data, error } = await supabase
      .from("memos")
      .insert({
        title: title || "제목 없음",
        content,
        user_id: user.id,
        created_at: now,
        updated_at: now,
        media_url: mediaUrl,
      })
      .select("id, created_at, title, content, updated_at, user_id, media_url")
      .single();

    if (error) {
      setErrorMsg(`저장 실패: ${getSupabaseErrorMessage(error)}`);
      setCreating(false);
      return;
    }

    const memo = fromRow(data);
    if (memo) {
      setMemos((prev) => [memo, ...prev]);
      setSelectedId(memo.id);
      setNewTitle("");
      setNewContent("");
      setSelectedFile(null);
      requestAnimationFrame(() => newTitleRef.current?.focus?.());
    }
    setCreating(false);
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    // 디버깅용 로그: 파일 선택 여부 확인
    console.log("handleFileChange 호출됨, 선택된 파일:", file);
    if (!file) return;
    const mime = file.type || "";
    const isImage = mime.startsWith("image/");
    const isGif = isImage && mime === "image/gif";
    const isMp4 = mime === "video/mp4";
    if (!isImage && !isMp4) {
      setErrorMsg("이미지 또는 MP4 파일만 첨부할 수 있어요.");
      setSelectedFile(null);
      return;
    }

    setErrorMsg("");
    setSelectedFile(file);
  }

  async function signInWithGoogle() {
    if (!supabase) return;
    setErrorMsg("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "https://josephk.app",
      },
    });
    if (error) {
      setErrorMsg(`로그인 실패: ${getSupabaseErrorMessage(error)}`);
    }
  }

  async function signOut() {
    if (!supabase) return;
    setErrorMsg("");
    const { error } = await supabase.auth.signOut();
    if (error) {
      setErrorMsg(`로그아웃 실패: ${getSupabaseErrorMessage(error)}`);
      return;
    }
    setMemos([]);
    setSelectedId(null);
    setQuery("");
  }

  async function deleteMemo(id) {
    if (!supabase) return;
    const target = memos.find((m) => m.id === id);
    const name = target?.title ? `“${target.title}”` : "이 메모";
    if (!window.confirm(`${name}를 삭제할까요?\n삭제하면 되돌릴 수 없어요.`)) return;

    setDeletingId(id);
    setErrorMsg("");
    const { error } = await supabase.from("memos").delete().eq("id", id);
    if (error) {
      setErrorMsg(`삭제 실패: ${getSupabaseErrorMessage(error)}`);
      setDeletingId(null);
      return;
    }

    setMemos((prev) => prev.filter((m) => m.id !== id));
    setSelectedId((prev) => (prev === id ? null : prev));
    setDeletingId(null);
  }

  function startEditing(memo) {
    setSelectedId(memo.id);
  }

  async function saveEdit() {
    if (!selectedMemo) return;
    if (!supabase) return;
    const title = editTitle.trim();
    const content = editContent.trim();
    const now = new Date().toISOString();

    setSavingEdit(true);
    setErrorMsg("");
    const { data, error } = await supabase
      .from("memos")
      .update({
        title: title || "제목 없음",
        content,
        updated_at: now,
      })
      .eq("id", selectedMemo.id)
      .select("id, created_at, title, content, updated_at")
      .single();

    if (error) {
      setErrorMsg(`수정 저장 실패: ${getSupabaseErrorMessage(error)}`);
      setSavingEdit(false);
      return;
    }

    const updated = fromRow(data);
    if (updated) {
      setMemos((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    }
    setSavingEdit(false);
  }

  async function clearAll() {
    if (memos.length === 0) return;
    if (!supabase) return;
    if (!window.confirm("전체 메모를 삭제할까요?\n삭제하면 되돌릴 수 없어요.")) return;

    setClearing(true);
    setErrorMsg("");
    const ids = memos.map((m) => m.id).filter(Boolean);
    const { error } = ids.length ? await supabase.from("memos").delete().in("id", ids) : { error: null };

    if (error) {
      setErrorMsg(`전체 삭제 실패: ${getSupabaseErrorMessage(error)}`);
      setClearing(false);
      return;
    }

    setMemos([]);
    setSelectedId(null);
    setQuery("");
    setClearing(false);
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-950 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col">
              <h1 className="text-2xl font-semibold tracking-tight">메모장</h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {!loading ? (
                  <>
                    메모 {memos.length.toLocaleString("ko-KR")}개 · Supabase에 저장돼요
                  </>
                ) : (
                  <>불러오는 중…</>
                )}
              </p>
            </div>

            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end">
                  <span className="max-w-[180px] truncate text-xs font-medium text-zinc-800 dark:text-zinc-100">
                    {user.email || user.user_metadata?.full_name || "로그인됨"}
                  </span>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Google 계정</span>
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
                    disabled={memos.length === 0 || clearing}
                    className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-red-600 shadow-sm transition hover:bg-zinc-50 disabled:opacity-50 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                  >
                    {clearing ? "삭제 중…" : "전체 삭제"}
                  </button>
                  <button
                    type="button"
                    onClick={signOut}
                    className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
                  >
                    로그아웃
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={signInWithGoogle}
                  disabled={authLoading || !supabase}
                  className="inline-flex h-10 items-center justify-center rounded-full bg-white px-4 text-sm font-semibold text-zinc-900 shadow-sm ring-1 ring-zinc-200 transition hover:bg-zinc-50 disabled:opacity-60 dark:bg-zinc-950 dark:text-zinc-50 dark:ring-white/10 dark:hover:bg-zinc-900"
                >
                  {authLoading ? "로그인 상태 확인 중…" : "Google로 로그인"}
                </button>
              </div>
            )}
          </div>

          {errorMsg ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
              {errorMsg}
            </div>
          ) : null}

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

        {!user ? (
          <main className="mt-8 flex flex-1 items-center justify-center">
            <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-white/10 dark:bg-zinc-950">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">로그인이 필요해요</h2>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Google 계정으로 로그인하면 메모를 Supabase에 안전하게 저장하고, 여러 기기에서 동일하게 볼 수 있어요.
              </p>
              <button
                type="button"
                onClick={signInWithGoogle}
                disabled={authLoading || !supabase}
                className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                {authLoading ? "로그인 상태 확인 중…" : "Google로 로그인"}
              </button>
            </div>
          </main>
        ) : (
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
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  {loading ? "상태: 불러오는 중" : "저장: Supabase"}
                </div>
                <div className="flex items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/20 dark:text-zinc-100 dark:hover:border-white/40 dark:hover:bg-zinc-900">
                    <span>파일 첨부</span>
                    <input
                      type="file"
                      accept="image/*,video/mp4"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={creating}
                    className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                  >
                    {creating ? "저장 중…" : "저장"}
                  </button>
                </div>
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
                        disabled={deletingId === selectedMemo.id}
                        className="inline-flex h-9 items-center justify-center rounded-full border border-zinc-200 bg-white px-3 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                      >
                        {deletingId === selectedMemo.id ? "삭제 중…" : "삭제"}
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
                      {selectedMemo.mediaUrl ? (
                        <div className="mt-3">
                          {isVideoUrl(selectedMemo.mediaUrl) ? (
                            <video
                              src={selectedMemo.mediaUrl}
                              controls
                              className="h-auto max-h-96 w-full max-w-full rounded-2xl object-contain"
                            />
                          ) : (
                            <img
                              src={selectedMemo.mediaUrl}
                              alt=""
                              className="h-auto max-h-96 w-full max-w-full rounded-2xl object-contain"
                            />
                          )}
                        </div>
                      ) : null}
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
                        disabled={savingEdit}
                        className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                      >
                        {savingEdit ? "저장 중…" : "수정 저장"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
        )}

        <footer className="pt-2 text-xs text-zinc-500 dark:text-zinc-400">
          팁: Supabase에 저장되므로, 같은 계정/정책(RLS)에 따라 여러 기기에서도 동일하게 볼 수 있어요.
        </footer>
      </div>
    </div>
  );
}
