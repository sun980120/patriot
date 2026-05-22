# Patriot Finance Backend

Spring Boot 기반 백엔드입니다.

## 기술 스택
- Spring Boot 3.4.x
- Java 21
- Spring Web
- Spring Data JPA
- Spring Security
- JWT
- PostgreSQL

## 현재 포함된 기능
- 회원 가입 API
- JWT 로그인 API
- 현재 로그인 회원 조회 API
- 대시보드 번들 API
- 회원 승인/활성화/비활성화/관리자 승격 API
- 연도 생성/조회 API
- 세입/지출 추가/삭제 API
- 회비 납부 토글 API
- 최초 `super_admin` 자동 부트스트랩

## 인증 방식
로그인 후 `accessToken`을 발급합니다.
이후 요청 헤더에 아래 형식으로 전달합니다.

```http
Authorization: Bearer {token}
```

## 기본 관리자
환경변수 미설정 시 아래 값으로 생성됩니다.
- 이메일: `woosung9801@gmail.com`
- 비밀번호: `0000`
- 테스트용 임시 데이터 시드는 기본적으로 꺼져 있습니다. 필요할 때만 `PATRIOT_BOOTSTRAP_SEED_DEMO_DATA=true` 로 켜서 사용합니다.

실운영 전에는 반드시 변경하세요.

## 환경변수
- `PATRIOT_DB_URL`
- `PATRIOT_DB_USERNAME`
- `PATRIOT_DB_PASSWORD`
- `PATRIOT_ALLOWED_ORIGINS`
- `PATRIOT_SUPER_ADMIN_EMAIL`
- `PATRIOT_SUPER_ADMIN_PASSWORD`
- `PATRIOT_SUPER_ADMIN_NAME`
- `PATRIOT_JWT_SECRET`
- `PATRIOT_JWT_EXPIRATION_SECONDS`

## 주요 API
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/dashboard`
- `GET /api/years`
- `POST /api/years`
- `GET /api/finance/incomes?fiscalYearId={uuid}`
- `POST /api/finance/incomes`
- `DELETE /api/finance/incomes/{id}`
- `GET /api/finance/expenses?fiscalYearId={uuid}`
- `POST /api/finance/expenses`
- `DELETE /api/finance/expenses/{id}`
- `GET /api/payments?fiscalYearId={uuid}`
- `PATCH /api/payments/toggle`
- `GET /api/admin/members`
- `PATCH /api/admin/members/{memberId}/approve`
- `PATCH /api/admin/members/{memberId}/activate`
- `PATCH /api/admin/members/{memberId}/deactivate`
- `PATCH /api/admin/members/{memberId}/promote-admin`
- `PATCH /api/admin/members/{memberId}/admin-promote`

## 실행 준비
현재 저장소에는 Gradle Wrapper가 없습니다.

### 1. PostgreSQL 실행
저장소 루트에서:

```bash
docker compose up -d
```

기본 DB 정보:
- DB: `patriot_finance`
- USER: `postgres`
- PASSWORD: `postgres`
- PORT: `5432`

### 2. 백엔드 환경변수
예시:

```bash
export PATRIOT_DB_URL=jdbc:postgresql://localhost:5432/patriot_finance
export PATRIOT_DB_USERNAME=postgres
export PATRIOT_DB_PASSWORD=postgres
export PATRIOT_ALLOWED_ORIGINS=http://localhost:3000
```

### 3. Spring Boot 실행
`backend/` 디렉터리에서 실행

```bash
gradle bootRun
```

또는 IntelliJ에서 `backend/build.gradle` 을 열어 실행할 수 있습니다.

## 다음 단계 권장
1. Gradle Wrapper 추가
2. Flyway 마이그레이션 도입
3. 프론트 API 에러 UI 정교화
4. 관리자/회원 권한별 네비게이션 제어 강화
