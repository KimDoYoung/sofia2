# Project Sofia 2

기존의 Python FastAPI 기반 프로젝트를 현대적인 Spring Boot와 React 스택으로 새롭게 재작성한 종합 이미지 폴더 관리 및 뷰어 시스템입니다.

## 🚀 프로젝트 개요

Sofia 2는 폴더별로 정리된 이미지 파일들을 관리하고 조회할 수 있도록 설계되었습니다. 물리 디렉토리를 스캔하여 메타데이터와 폴더 구조를 PostgreSQL 데이터베이스에 저장하고, 썸네일을 생성하며, EXIF 메타데이터 조회를 지원하는 풍부한 웹 인터페이스를 제공합니다.

* **백엔드(Backend):** Spring Boot 3.4.x, Java 17/21, Spring Security (HttpOnly 쿠키 기반 JWT), JPA (PostgreSQL).
* **프론트엔드(Frontend):** React 19, Vite, Tailwind CSS 4, shadcn/ui, AG Grid, Zustand, React Router 7, TanStack Query.
* **데이터베이스(Database):** PostgreSQL.
* **인증(Auth):** Access 토큰과 Refresh 토큰을 활용한 JWT 기반 인증.

## 🛠 빌드 및 실행 방법

프로젝트 루트 디렉토리에서 관리를 위한 여러 편의성 스크립트를 제공합니다.

### 백엔드 (Spring Boot)

백엔드 관리는 `./bm.sh` 스크립트를 사용합니다:

* `./bm.sh run`: 개발 서버 시작 (기본 포트: `9595`, 컨텍스트 경로: `/sofia`).
* `./bm.sh build`: 전체 빌드 (컴파일 + JAR/WAR 생성).
* `./bm.sh clean`: 빌드 아티팩트(산출물) 삭제.
* `./bm.sh test`: 테스트 실행.
* `./bm.sh lint`: Spotless 코드 스타일 검사.
* `./bm.sh format`: Spotless 코드 스타일 자동 포맷팅.

### 프론트엔드 (React)

프론트엔드 관리는 `./fm.sh` 스크립트를 사용합니다:

* `./fm.sh dev`: Vite 개발 서버 시작 (기본 포트: `5173`).
* `./fm.sh install`: npm 의존성 패키지 설치.
* `./fm.sh build`: 프로덕션용 빌드.
* `./fm.sh lint`: ESLint 문법 검사 실행.

### 데이터베이스

데이터베이스 작업은 `./db.sh` 스크립트를 사용합니다:

* 테이블 목록 조회, 테이블 구조 상세 보기, SQL 쿼리 실행, 백엔드 백업 기능 등을 메뉴 형태로 제공합니다.

### 배포 (Deployment)

* `./deploy.sh`: 운영 서버(`jskn.iptime.org`)로의 배포 프로세스를 처리합니다.

## ⚙️ 환경 설정

본 프로젝트는 `.env` 파일들을 통해 환경 변수를 관리합니다.

* **SOFIA_MODE:** 로드할 환경 설정 파일의 종류를 결정합니다 (예: `local`, `prod`). 기본값은 `local`입니다.
* **환경 설정 파일:** `.env.local`, `.env.prod` 등의 파일은 루트 디렉토리 또는 `backend/` 디렉토리에 위치해야 합니다.
* **주요 환경 변수:**
* `DB_USERNAME` / `DB_PASSWORD`: PostgreSQL 접속 계정 정보.
* `JWT_SECRET`: JWT 서명에 사용할 비밀키.
* `SOFIA_MODE`: 현재 활성화된 프로필/모드.



## 📂 프로젝트 구조

### 백엔드 (`/backend`)

* `src/main/java/kr/co/kalpa/sofia/`: 루트 패키지.
* `controller/`: REST API 엔드포인트.
* `domain/`: JPA 엔티티 클래스 (User, ImageFile, ImageFolder 등).
* `dto/`: 데이터 전송 객체 (Data Transfer Objects).
* `repository/`: Spring Data JPA 리포지토리 인터페이스.
* `security/`: JWT 및 시큐리티 관련 설정.
* `service/`: 비즈니스 로직 클래스 (ImageService, FolderService 등).


* `src/main/resources/`: 설정 파일 관련 (`application.properties`).

### 프론트엔드 (`/frontend`)

* `src/domain/`: 도메인별 전용 페이지 및 컴포넌트 (예: `folder/`, `user/`).
* `src/shared/`: 재사용 가능한 공통 컴포넌트, 커스텀 훅, 레이아웃.
* `src/lib/`: API 클라이언트 (axios) 및 유틸리티 함수.
* `src/store/`: Zustand 전역 상태 관리 (인증, UI, 상태 등).
* `src/components/ui/`: shadcn/ui 컴포넌트 프리셋.

## 📝 개발 규칙 (Conventions)

* **프론트엔드 구조:** 페이지 단위 컴포넌트들은 `src/domain/` 아래의 각 도메인별로 조직화해야 합니다. UI 컴포넌트는 shadcn/ui를 기반으로 작성합니다.
* **API 통신:** `src/lib/api.ts`에 정의된 중앙 집중식 axios 인스턴스를 사용합니다. 해당 인스턴스는 HttpOnly 쿠키를 통해 JWT 토큰을 자동으로 처리합니다.
* **상태 관리:** 가벼운 전역 상태 관리가 필요할 때는 Zustand를 사용합니다.
* **백엔드 패키지:** 기존에 확립된 패키지 구조를 준수합니다. JSON 직렬화 시 무한 참조(순환 참조)가 발생하는 것을 막기 위해 엔티티 클래스에 `@JsonIgnoreProperties` 어노테이션을 적절히 활용합니다.
* **썸네일:** Thumbnailator 라이브러리를 사용하여 생성되며, `sofia.base.folder` 환경 변수에 지정된 경로에 저장됩니다.

## 🌐 API 및 엔드포인트

* **헬스 체크 (Health Check):** `http://localhost:9595/sofia/pcms/health`
* **프론트엔드 개발 서버:** `http://localhost:5173`
* **백엔드 API 베이스 경로:** `http://localhost:9595/sofia/api/` (프론트엔드 개발 서버에서 프록시 처리됨)