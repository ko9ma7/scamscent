# ScamScent

**Scam + Scent** — 문자, 이메일, URL에 숨어 있는 사기 위험 신호를 “냄새 맡듯” 찾아 근거와 함께 보여주는 브라우저 기반 웹서비스입니다.

ScamScent는 `사기입니다 / 아닙니다`를 단정하지 않습니다. 결제 재촉, 개인정보 요구, 인증번호 요청, 원격제어 유도, 단축 URL, 도메인 구조 등의 **위험 신호를 설명 가능한 방식으로 분리해 보여주고 다음 행동을 제안**합니다.

## Preview

첫 화면에서 바로 검사기를 사용할 수 있습니다.

- 문자·이메일·URL 붙여넣기
- 위험 신호 점수와 단계 표시
- 감지된 신호별 근거와 가중치 표시
- URL 구조 확인 및 사전 조사 DB 대조
- 추천 행동 제공
- 최근 검사 기록(LocalStorage), 테마, 공유 링크 지원

Social Preview 자산:

- `public/og-image.png` — 1200×630
- `public/github-social-preview.png` — 1280×640

## Features

### 위험 신호 분석

현재 버전은 서버 없는 설명 가능한 휴리스틱 엔진을 사용합니다.

- 긴급성 / 시간 압박
- 예상하지 못한 결제·송금
- 기프트카드·암호화폐 결제 요구
- 비밀번호·카드정보·주민번호 등 민감정보 요구
- OTP / 인증번호 전달 요구
- 원격제어 프로그램 설치 유도
- 처벌·계정 폐쇄 위협
- 과도한 보상·당첨 문구
- 주변에 알리지 말라는 요구
- HTTP, IP 호스트, Punycode, 단축 URL, 비표준 포트, 깊은 하위 도메인 등의 URL 신호

점수는 **사기일 확률이 아니라 감지된 위험 신호의 누적 강도**입니다.

### Pre-researched Domain Intel

`src/data/intel.js`에 조사된 도메인 레코드를 관리합니다. 검사 URL이 DB와 일치하면 알려진 서비스 유형과 주의점을 결과에 먼저 보여줍니다.

현재 seed 데이터에는 공식 서비스 도메인, URL 단축 서비스, 문서용 예시/합성 레코드가 포함되어 있습니다. 특정 도메인이 DB에 없다고 안전하다는 뜻은 아닙니다.

### Privacy-first

- 분석 API 없음
- 입력 원문 서버 전송 없음
- 최근 기록 저장은 선택 사항
- LocalStorage에는 원문 전체 대신 짧은 미리보기와 분석 결과만 저장
- 공유 URL에는 원문을 넣지 않고 점수·신호 수·도메인 요약만 포함

### UI / UX

- Light / Dark / System theme
- 모바일 내비게이션
- Loading / Empty / Toast / Dialog 상태
- 키보드 포커스 및 `Ctrl/Cmd + Enter` 검사
- 모바일 320px 이상 대응
- `prefers-reduced-motion` 지원

## Tech Stack

- HTML5
- CSS3
- Vanilla JavaScript ES Modules
- Node.js 20+ (개발 서버 / 정적 빌드 스크립트만 사용)
- GitHub Actions + GitHub Pages

런타임 프레임워크나 외부 CDN은 사용하지 않습니다.

## Project Structure

```text
/
├─ public/
│  ├─ favicon.svg
│  ├─ favicon-16x16.png
│  ├─ favicon-32x32.png
│  ├─ apple-touch-icon.png
│  ├─ icon-192.png
│  ├─ icon-512.png
│  ├─ og-image.png
│  ├─ github-social-preview.png
│  ├─ manifest.webmanifest
│  ├─ robots.txt
│  ├─ sitemap.xml
│  └─ 404.html
├─ src/
│  ├─ data/
│  │  ├─ intel.js
│  │  └─ samples.js
│  ├─ app.js
│  └─ styles.css
├─ scripts/
│  ├─ dev.mjs
│  ├─ build.mjs
│  ├─ preview.mjs
│  ├─ github-bootstrap.ps1
│  └─ github-push.ps1
├─ .github/workflows/deploy.yml
├─ .gitignore
├─ github-bootstrap.cmd
├─ setup-github.cmd
├─ push.cmd
├─ index.html
├─ site.config.json
├─ package.json
└─ README.md
```

## Windows CMD 빠른 배포

Windows 배포 스크립트는 **CMD wrapper + PowerShell worker** 구조입니다. CMD 안에서 GitHub API와 JSON 처리를 직접 하지 않기 때문에 Windows CMD의 따옴표/변수 확장 문제를 피합니다.

### 최초 1회: `github-bootstrap.cmd`

프로젝트 루트에서 파일을 더블클릭하거나 CMD에서 실행합니다.

```cmd
github-bootstrap.cmd
```

저장소 이름과 공개 범위를 바로 지정할 수도 있습니다.

```cmd
github-bootstrap.cmd scamscent public
```

`setup-github.cmd`도 동일한 PowerShell worker를 호출하는 호환용 별칭입니다.

```cmd
setup-github.cmd scamscent public
```

실제 구조는 다음과 같습니다.

```text
github-bootstrap.cmd
  ↓
scripts/github-bootstrap.ps1
  ↓
GitHub 로그인 → Repository 생성/연결 → 실제 Pages URL 반영
→ npm ci → npm run build → commit → push
→ GitHub Pages workflow 모드 활성화 → deploy.yml 실행
```

Bootstrap이 자동으로 수행하는 작업:

1. Git / Node.js / npm / GitHub CLI 설치 여부 확인
2. GitHub CLI 로그인 확인 — 필요하면 브라우저 로그인 실행
3. 로컬 Git 저장소 초기화 및 `main` 브랜치 설정
4. 새 GitHub Repository 생성 또는 기존 빈 Repository 연결
5. 실제 `https://USERNAME.github.io/REPOSITORY/` 주소를 `site.config.json`에 반영
6. `npm ci` + `npm run build` 실행
7. 전체 소스 commit 및 `origin/main` push
8. GitHub Pages를 `workflow` build type으로 활성화
9. `.github/workflows/deploy.yml` 수동 실행도 한 번 요청하여 최초 배포를 확실히 시작

안전상 기존 원격 `main`에 로컬에 없는 커밋이 있으면 **강제 push하지 않고 중단**합니다. 기존 내용이 있는 Repository를 사용할 경우 먼저 내용을 병합하거나 새 빈 Repository를 사용하세요.

필수 프로그램:

- Git for Windows
- Node.js 20+
- GitHub CLI (`gh`)

### 이후 업데이트: `push.cmd`

사이트를 수정한 뒤에는 아래 파일만 실행합니다.

```cmd
push.cmd
```

커밋 메시지를 바로 전달할 수도 있습니다.

```cmd
push.cmd "Update scam detection rules"
```

`push.cmd`는 `scripts/github-push.ps1`을 호출하고, production build가 성공한 경우에만 변경 파일을 commit하고 `main`으로 push합니다. Push 뒤 GitHub Actions가 자동으로 Pages를 배포합니다.

### CMD 창이 바로 닫히는 경우

더블클릭 대신 프로젝트 폴더에서 CMD를 열어 아래처럼 실행하면 오류 메시지를 그대로 볼 수 있습니다.

```cmd
github-bootstrap.cmd
```

wrapper가 PowerShell의 종료 코드를 전달하고 마지막에 `pause`하므로 실패 원인을 확인할 수 있습니다.

## Local Development

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:5173/`을 엽니다.

## Build

```bash
npm run build
```

`dist/`에 GitHub Pages 배포용 정적 파일이 생성됩니다.

빌드 시 실제 사이트 URL을 지정할 수도 있습니다.

```bash
SITE_URL="https://USERNAME.github.io/REPOSITORY/" npm run build
```

## GitHub Pages Deployment

### 권장: Windows CMD 자동 설정

Windows에서는 `github-bootstrap.cmd`를 사용하는 것이 가장 간단합니다. CMD는 wrapper 역할만 하고 실제 처리는 `scripts/github-bootstrap.ps1`에서 수행합니다. Repository 생성/연결, 실제 URL 반영, build, commit, push, Pages workflow 설정까지 한 번에 진행합니다.

```cmd
github-bootstrap.cmd scamscent public
```

`setup-github.cmd`도 같은 기능의 호환용 별칭입니다.

이후 변경사항은 다음 한 줄로 배포합니다.

```cmd
push.cmd
```

### 수동 배포

CMD 자동 설정을 사용하지 않을 경우:

1. GitHub에서 새 Repository를 만듭니다.
2. 프로젝트를 `main` 브랜치에 push합니다.
3. Repository → **Settings → Pages → Build and deployment**에서 Source를 **GitHub Actions**로 선택합니다.
4. `.github/workflows/deploy.yml`이 `npm ci` → `npm run build` → Pages 배포를 자동 수행합니다.

GitHub Actions에서는 `GITHUB_REPOSITORY` 값으로 기본 Pages URL을 자동 계산합니다. 따라서 일반적인 `USERNAME.github.io/REPOSITORY/` 배포에는 `SITE_URL` Variable을 따로 만들 필요가 없습니다.

커스텀 도메인을 사용할 때만 Repository → **Settings → Secrets and variables → Actions → Variables**에 `SITE_URL`을 추가하면 해당 값이 우선 적용됩니다.

## Configuration

### 서비스 이름 / 설명

`site.config.json`과 `index.html`의 메타 정보를 수정합니다.

### 사전 조사 DB

`src/data/intel.js`의 `intelRecords` 배열에 레코드를 추가합니다.

권장 필드:

```js
{
  host: 'example.com',
  category: 'official-domain',
  confidence: 'known-service',
  title: '레코드 제목',
  summary: '확인된 사실과 주의점',
  action: '사용자 권고 행동',
  reviewedAt: 'YYYY-MM-DD',
  tags: ['태그']
}
```

**확인되지 않은 신고를 사실처럼 등록하지 마세요.** 위험/안전 확정 대신 출처가 있는 구체적 사실과 주의점을 기록하는 것을 권장합니다.

### 전 사용자 검사 빈도 집계

GitHub Pages만으로는 여러 사용자의 검사 횟수를 안전하게 집계할 수 없습니다. 현재 UI는 사전 조사 DB + 브라우저별 최근 검사 기록을 사용합니다.

향후 “많이 검사된 사이트” 집계가 필요하면 다음 중 하나를 붙이는 방식이 적합합니다.

- Cloudflare Workers / D1
- Supabase Edge Functions
- Firebase / Firestore
- Google Apps Script + 검증된 Queue
- 자체 Serverless API

이때 URL 원문이나 메시지 내용을 그대로 수집하지 말고, **정규화된 도메인과 익명 카운트만 최소 수집**하는 것이 좋습니다.

## Custom Domain

커스텀 도메인을 사용할 경우:

1. `public/CNAME` 파일을 만들고 도메인 한 줄을 입력합니다.
2. `SITE_URL` Actions Variable을 새 도메인으로 바꿉니다.
3. GitHub Pages Settings에서 Custom Domain을 등록합니다.
4. DNS 전파 후 **Enforce HTTPS**를 활성화합니다.

## 404

`public/404.html`은 GitHub Pages의 기본 404 대신 ScamScent 디자인을 사용합니다. `github.io` 하위 Repository 경로도 감지해 홈 링크를 계산합니다.

## PWA

기본 `manifest.webmanifest`와 앱 아이콘을 포함합니다. 현재 서비스는 온라인 의존성이 거의 없지만 Service Worker는 의도적으로 넣지 않았습니다. 휴리스틱 규칙과 조사 DB가 빠르게 바뀔 수 있어 오래된 캐시가 남는 위험을 피하기 위한 선택입니다.

## Security Notes

- API Secret, PAT, Private Key를 프론트엔드에 넣지 마세요.
- 실시간 평판 조회 API를 연결한다면 키를 숨길 수 있는 Serverless Proxy를 사용하세요.
- 정적 조사 DB에 개인 정보나 민감한 신고 원문을 넣지 마세요.

## License

MIT License. 자세한 내용은 `LICENSE`를 참고하세요.
