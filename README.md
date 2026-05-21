# 패트리어트 스마트 회비 관리 웹 애플리케이션

## Stack
- Frontend: Next.js App Router + Tailwind CSS
- Backend: Spring Boot + Spring Security + JWT
- Database: PostgreSQL
- Hosting: 사내 서버 배포 기준

## 현재 구조
- `backend/`: Spring Boot API 서버
- `app/`, `components/`, `lib/`: Next.js 프론트엔드
- `app/actions.ts`: Next 서버 액션을 통해 Spring API 호출
- `lib/dashboard-data.ts`: 로그인 쿠키를 읽어 대시보드 번들 로드
- `docker-compose.yml`: 로컬 테스트용 PostgreSQL 컨테이너

## 프론트 환경 변수
`.env.local`

```bash
PATRIOT_API_BASE_URL=http://localhost:8080
ENABLE_MOCK_FALLBACK=false
```

## 백엔드 환경 변수
- `PATRIOT_DB_URL`
- `PATRIOT_DB_USERNAME`
- `PATRIOT_DB_PASSWORD`
- `PATRIOT_ALLOWED_ORIGINS`
- `PATRIOT_SUPER_ADMIN_EMAIL`
- `PATRIOT_SUPER_ADMIN_PASSWORD`
- `PATRIOT_SUPER_ADMIN_NAME`
- `PATRIOT_JWT_SECRET`
- `PATRIOT_JWT_EXPIRATION_SECONDS`

자세한 내용은 [backend/README.md](/Users/hong-woosung/Desktop/Floorball/backend/README.md) 참고

## 로컬 테스트 권장 순서
1. Docker로 PostgreSQL 실행
2. Spring Boot 백엔드 실행
3. 프론트 `.env.local`에 `PATRIOT_API_BASE_URL` 설정
4. `npm run dev`

### 1. PostgreSQL Docker 실행
저장소 루트에서:

```bash
docker compose up -d
```

정상 확인:

```bash
docker compose ps
```

중지:

```bash
docker compose down
```

## 구현 메모
- 2026년은 5월부터 시작합니다.
- 2027년 이후 신규 연도는 1월부터 12월까지 생성됩니다.
- 회원가입 시 생년월일 기준으로 `정회원/준회원`이 자동 분류됩니다.
- 과거 회비 왜곡을 막기 위해 납부 row에 `charged_amount`, `applied_grade`를 저장합니다.
- `woosung9801@gmail.com` 계정은 일반 회원 목록에서 숨깁니다.

## 초기 관리자
기본 설정 기준
- 이메일: `woosung9801@gmail.com`
- 비밀번호: `0000`

실운영 전에는 반드시 변경하세요.
