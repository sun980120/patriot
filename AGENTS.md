# AGENTS.md

## Project Type

이 프로젝트는 GitHub 저장소를 사용한다.

## Branch Strategy

- 기본 개발 브랜치는 `develop`이다.
- 모든 신규 기능은 `develop`에서 분기한다.
- 기능 브랜치는 `feature/{기능명}` 형식을 사용한다.
- 버그 수정 브랜치는 `fix/{이슈명}` 형식을 사용한다.
- 긴급 수정 브랜치는 `hotfix/{이슈명}` 형식을 사용한다.
- `develop`, `main`, `master`에 직접 push하지 않는다.

## Pull Request Strategy

- Pull Request 대상 브랜치는 항상 `develop`이다.
- PR은 기본적으로 Draft PR로 생성한다.
- PR 제목은 Conventional Commits 형식을 사용한다.

예시:

```text
feat(order): 주문 취소 API 추가
fix(auth): JWT 만료 처리 오류 수정
refactor(payment): 결제 서비스 책임 분리