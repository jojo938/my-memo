import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-zinc-50 font-sans text-zinc-950 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-16 sm:px-6 lg:px-8">
        <header className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">오늘도 안녕</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">오늘도 잠시 쉬었다 가</p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
          <Link
            href="/memo"
            className="group flex flex-col rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-zinc-300 hover:shadow-md dark:border-white/10 dark:bg-zinc-950 dark:hover:border-white/20"
          >
            <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">사색의 흔적</span>
            <span className="mt-2 flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
              <span>당신의 생각과 영감을 여기에 남기세요.</span>
              <span>로그인은 여기서 진행돼요.</span>
            </span>
            <span className="mt-4 text-sm font-medium text-zinc-950 group-hover:underline dark:text-zinc-50">
              들어가기 →
            </span>
          </Link>

          <Link
            href="/fortune"
            className="group flex flex-col rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-zinc-300 hover:shadow-md dark:border-white/10 dark:bg-zinc-950 dark:hover:border-white/20"
          >
            <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">포춘 쿠키</span>
            <span className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">오늘의 포춘쿠키 메세지를 확인하세요.</span>
            <span className="mt-4 text-sm font-medium text-zinc-950 group-hover:underline dark:text-zinc-50">
              들어가기 →
            </span>
          </Link>

          <Link
            href="/poem"
            className="group flex flex-col rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-zinc-300 hover:shadow-md dark:border-white/10 dark:bg-zinc-950 dark:hover:border-white/20 sm:col-span-2 lg:col-span-1"
          >
            <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">마음의 울림</span>
            <span className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              키워드로 마음에 울리는 시를 만들어 보세요.
            </span>
            <span className="mt-4 text-sm font-medium text-zinc-950 group-hover:underline dark:text-zinc-50">
              들어가기 →
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
