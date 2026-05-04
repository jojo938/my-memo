# josephk.app 바이브 코딩 프로젝트 정리

## 기술 스택
- **프론트엔드**: Next.js (App Router, JavaScript)
- **DB/Auth**: Supabase (PostgreSQL + Auth + Storage)
- **호스팅**: Vercel
- **AI**: Anthropic Claude API (Haiku, Sonnet)
- **에디터**: Cursor AI
- **버전관리**: Git + GitHub
- **도메인**: josephk.app (Namecheap 구매)

---

## 프로젝트 구조

```
app/
├── page.js            # 홈 화면 (기능 선택 랜딩)
├── memo/
│   └── page.js        # 메모장
├── fortune/
│   └── page.js        # 포춘쿠키
├── poem/
│   └── page.js        # 마음의 울림 (시 생성)
├── plan/
│   └── page.js        # 꿈을 현실로 (사업 기획)
└── api/
    ├── fortune/
    │   └── route.js   # 포춘쿠키 API
    ├── poem/
    │   └── route.js   # 시 생성 API
    └── plan/
        └── route.js   # 사업 기획 분석 API
```

---

## 구현된 기능

### 1. 메모장 (`/memo`)
- CRUD (작성/조회/수정/삭제)
- Google OAuth 로그인 (Supabase Auth)
- user_id 기반 개인 메모 분리 (RLS 적용)
- 이미지/GIF/MP4 첨부 (Supabase Storage)
- Canvas API로 이미지 리사이징 (최대 1200px)
- 날짜별 그룹화 + 타임스탬프
- 검색 기능
- 반응형 UI

### 2. 포춘쿠키 (`/fortune`)
- 버튼 클릭 시 Claude Haiku API 호출
- 영화/책/철학자에서 명대사 생성
- 브라우저 언어 감지 (ko/en/ja)
- 12시간 제한 (localStorage)
- 복사 버튼

### 3. 마음의 울림 (`/poem`)
- 키워드 입력 시 Claude Sonnet으로 시 생성
- 예시 키워드 버튼 (바다, 행복, 바람, 삶 등)
- 브라우저 언어 감지
- 복사 버튼

### 4. 꿈을 현실로 (`/plan`)
- Tally 스타일 사업 기획 도우미
- 10개 질문 순서대로 답변
- 진행률 표시
- localStorage 자동 저장 (홈 갔다 와도 유지)
- 하루 3번 사용 제한
- 완료 후 Claude Sonnet이 섹션별 피드백 제공

---

## Supabase 설정

### memos 테이블 컬럼
| 컬럼명 | 타입 |
|--------|------|
| id | int8 (PK) |
| created_at | timestamptz |
| title | text |
| content | text |
| updated_at | timestamptz |
| user_id | uuid |
| media_url | text |

### RLS 정책 (memos)
- SELECT: `auth.uid() = user_id`
- INSERT: `auth.uid() = user_id`
- UPDATE: `auth.uid() = user_id`
- DELETE: `auth.uid() = user_id`

### Storage
- 버킷명: `memo-media` (Public)
- 경로: `{user_id}/{timestamp_filename}`

---

## 환경변수

### `.env.local` (로컬)
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxx
ANTHROPIC_API_KEY=sk-ant-xxxx
```

### Vercel 환경변수
위 3개 동일하게 등록 필요

---

## Claude API 모델 선택 기준
- **Haiku** (`claude-haiku-4-5-20251001`): 빠르고 저렴. 포춘쿠키처럼 짧은 텍스트 생성에 적합
- **Sonnet** (`claude-sonnet-4-20250514`): 창의적이고 논리적. 시 생성, 사업 기획 분석에 적합

---

## 자주 쓰는 명령어

```bash
# 로컬 개발 서버 실행
npm run dev

# GitHub에 배포 (Vercel 자동 반영)
git add .
git commit -m "커밋 메시지"
git push
```

---

## 주요 삽질 포인트 (하드코딩 금지!)

- `.env.local` 파일 인코딩은 반드시 **UTF-8** (Windows 메모장 저장 시 주의)
- 환경변수 변경 후 **서버 재시작** 필수 (`Ctrl+C` 후 `npm run dev`)
- Vercel에도 환경변수 별도 등록 필요
- **API 키는 절대 코드에 하드코딩 금지** - GitHub가 감지하고 push 차단함
- Supabase RLS 켜면 정책 없으면 데이터 접근 불가
- `git push` 해야 Vercel에 반영됨 (로컬 저장만으론 안 됨)
- Google OAuth Client Secret 코드에 넣으면 GitHub push 차단됨

---

## Supabase Auth 설정
- Provider: Google OAuth
- Site URL: `https://josephk.app`
- Redirect URL: `https://josephk.app/memo`
- 로컬 테스트 시 Site URL을 `http://localhost:3000`으로 임시 변경 필요

---

## 도메인 연결 (Namecheap → Vercel)
1. Namecheap Advanced DNS에서 A Record 추가
   - Host: `@`
   - Value: `216.198.79.1`
2. Vercel 프로젝트 Settings → Domains에서 `josephk.app` 추가
