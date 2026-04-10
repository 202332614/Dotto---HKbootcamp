# Dotto---HKbootcamp
# ✅ Dotto — Dot your day

## 1. 프로젝트 개요

- **수행 주제:** 회원가입/로그인 기능이 포함된 개인 할 일(Todo) 관리 웹 애플리케이션
- **배포 주소:** https://durham-patients-clothing-ken.trycloudflare.com
- **사용 기술:** HTML, CSS, JavaScript, Node.js, Express.js, MySQL, bcrypt, GCP, Cloudflare Tunnel

---

## 2. 백엔드 구성 및 라우팅

`server.js`에서 Express를 사용하여 API를 구성하였고, `requireAuth` 미들웨어로 로그인한 사용자만 접근할 수 있도록 처리하였습니다.

### 페이지 라우트

| 경로 | 설명 |
|------|------|
| `GET /` , `GET /login` | 로그인 페이지 |
| `GET /signup` | 회원가입 페이지 |
| `GET /todo` | 할 일 관리 페이지 |
| `GET /mypage` | 마이페이지 |

### 인증 API

| 메서드 | 경로 | 역할 |
|--------|------|------|
| `POST` | `/api/signup` | 회원가입 (아이디 중복 확인 + 비밀번호 해시 저장) |
| `POST` | `/api/login` | 로그인 (비밀번호 검증 후 세션 발급) |
| `POST` | `/api/logout` | 로그아웃 (세션 파기) |
| `GET` | `/api/me` | 현재 로그인한 사용자 정보 조회 |

### 할 일(Todo) API

| 메서드 | 경로 | 역할 |
|--------|------|------|
| `GET` | `/api/todos` | 할 일 목록 조회 |
| `POST` | `/api/todos` | 새 할 일 추가 |
| `PUT` | `/api/todos/:id/toggle` | 완료/미완료 상태 변경 |
| `DELETE` | `/api/todos/:id` | 할 일 삭제 |

### 마이페이지 API

| 메서드 | 경로 | 역할 |
|--------|------|------|
| `PUT` | `/api/profile` | 닉네임, 소개 수정 |
| `PUT` | `/api/password` | 비밀번호 변경 |
| `DELETE` | `/api/account` | 회원 탈퇴 |

---

## 3. 데이터베이스 및 SQL 활용

MySQL 8.0을 사용하였으며, 서버 시작 시 테이블이 자동으로 생성됩니다.

### 테이블 구조

**users (사용자)**

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | INT AUTO_INCREMENT | 기본키 |
| `username` | VARCHAR(50) UNIQUE | 로그인 아이디 |
| `password_hash` | VARCHAR(255) | bcrypt로 해시된 비밀번호 |
| `nickname` | VARCHAR(50) | 닉네임 |
| `bio` | VARCHAR(200) | 한 줄 소개 |
| `created_at` | TIMESTAMP | 가입일 |

**todos (할 일)**

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | INT AUTO_INCREMENT | 기본키 |
| `user_id` | INT (FK → users.id) | 작성자 |
| `title` | VARCHAR(255) | 할 일 내용 |
| `is_completed` | TINYINT(1) | 완료 여부 (0/1) |
| `created_at` | TIMESTAMP | 생성일 |

### 주요 SQL

```sql
-- 사용자의 할 일 목록을 최신순으로 조회
SELECT * FROM todos WHERE user_id = ? ORDER BY created_at DESC;

-- 아이디 중복 확인
SELECT id FROM users WHERE username = ?;

-- 할 일 완료 상태 토글
UPDATE todos SET is_completed = ? WHERE id = ?;

-- 회원 탈퇴 시 할 일도 함께 삭제 (ON DELETE CASCADE)
DELETE FROM users WHERE id = ?;
```

비밀번호는 bcrypt로 해시 처리하였고, 모든 SQL 쿼리에 `?` 바인딩을 사용하여 SQL Injection을 방지하였습니다.

---

## 4. 인프라 및 배포 기록

### 클라우드 서버

1. GCP에서 VM 인스턴스 생성 (asia-northeast3, Ubuntu)
2. SSH로 접속하여 MySQL, Node.js 설치
3. 프로젝트 파일 업로드 후 `npm install`로 패키지 설치
4. 환경변수 설정 후 `nohup node server.js &`로 백그라운드 실행

### Cloudflare 연결

1. VM에 `cloudflared` 설치
2. `cloudflared tunnel --url http://localhost:3000`으로 Quick Tunnel 생성
3. 자동으로 HTTPS가 적용된 외부 접속 URL 발급
4. `nohup`으로 백그라운드 실행하여 SSH 종료 후에도 터널 유지

---

## 5. 트러블슈팅 (문제 해결 기록)

### 사례 1: `Cannot find module 'node:buffer'` 오류

- **문제:** `node server.js` 실행 시 모듈을 찾을 수 없다는 에러 발생
- **원인:** `apt install nodejs`로 설치하면 Node.js 12 버전이 설치되는데, 프로젝트에서 사용하는 mysql2 패키지가 Node.js 16 이상을 요구했음
- **해결:** 기존 Node.js를 제거하고 NodeSource 저장소를 통해 Node.js 20 버전을 설치하여 해결

### 사례 2: Node.js 설치 중 패키지 충돌

- **문제:** Node.js 20 설치 중 `libnode-dev` 패키지와 파일이 겹친다는 dpkg 에러 발생
- **원인:** 이전에 설치된 `libnode-dev`가 같은 경로의 파일을 사용하고 있어서 충돌
- **해결:** `sudo apt remove -y libnode-dev`로 충돌 패키지를 먼저 제거한 후 재설치하여 해결

### 사례 3: Cloudflare Tunnel URL 변경

- **문제:** 터널을 재시작하면 이전 URL로 접속이 안 됨
- **원인:** Quick Tunnel은 실행할 때마다 새로운 임시 URL을 발급함
- **해결:** `cat tunnel.log | grep trycloudflare` 명령으로 새 URL을 확인하여 사용

---

## 6. 최종 회고

### 배운 점

이번 프로젝트는 처음으로 프론트엔드, 백엔드, 데이터베이스, 서버 배포까지 전부 직접 해본 경험이었다. 솔직히 각각의 기술을 깊이 이해하고 있다고는 말하기 어렵지만, 한 번이라도 전체 흐름을 직접 경험해본 것 자체가 의미가 있었다고 생각한다.

특히 GCP VM에서 서버를 띄우고 Cloudflare로 외부에 공개하는 과정이 인상 깊었다. Node.js 버전 문제나 패키지 충돌처럼 코드와 관계없는 환경 설정 에러를 만났을 때 당황스러웠지만, 에러 메시지를 읽고 하나씩 해결해나가면서 "에러가 나는 게 당연하고, 해결하는 과정이 개발"이라는 것을 느꼈다.

### 아쉬운 점

- bcrypt 해시나 세션 인증 같은 보안 관련 코드를 사용하긴 했지만, 왜 이렇게 하는 건지 원리까지 완전히 이해하지는 못했다. 추가 학습이 필요하다.
- SQL도 기본적인 CRUD 쿼리만 사용했는데, JOIN이나 서브쿼리 같은 복잡한 쿼리를 다뤄보지 못한 것이 아쉽다.
- 시간 제약으로 프론트엔드 디자인을 다듬는 데 충분한 시간을 쏟지 못했다.

### 개선 계획

- Quick Tunnel의 임시 URL 대신 고정 도메인을 연결해보고 싶다
- 할 일에 마감 기한이나 카테고리 분류 기능을 추가하면 실용성이 높아질 것 같다
- `nohup` 대신 `pm2` 같은 프로세스 매니저를 사용해서 서버가 죽어도 자동으로 재시작되게 해보고 싶다
