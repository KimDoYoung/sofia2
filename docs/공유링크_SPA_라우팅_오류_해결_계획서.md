# [계획서] 공유 링크 접속 시 NoResourceFoundException 서버 오류 해결 계획

## 1. 개요 및 원인 분석 (Goal & Root Cause Analysis)

### 현상 및 에러 로그
운영 서버(`jskn`)에 배포 후 보관소에서 생성된 공개 공유 링크(예: `http://<host>/sofia/archive/share/ca255ed3819a4e2396da227e3b4c8a02`)로 브라우저에서 직접 접속하면 다음과 같은 예외가 발생하며 서버 에러가 발생함:

```
org.springframework.web.servlet.resource.NoResourceFoundException: No static resource archive/share/ca255ed3819a4e2396da227e3b4c8a02.
    at org.springframework.web.servlet.resource.ResourceHttpRequestHandler.handleRequest(...)
```

### 근본 원인 (Root Cause)
1. **SPA (React Router) 포워딩 컨트롤러 누락**:
   - Sofia는 Spring Boot 내부에서 React 정적 빌드물(`index.html`, `/assets/**`)을 함께 호스팅하는 SPA 구조입니다.
   - 브라우저 주소창에 `/archive/share/...` 같은 클라이언트 라우팅 URL을 직접 입력하거나 새로고침하면, Spring MVC의 [`SpaController.java`](file:///home/kdy987/work/sofia2/backend/src/main/java/kr/co/kalpa/sofia/controller/SpaController.java)가 해당 요청을 가로채 `forward:/index.html`로 보내주어야 React Router가 구동되어 해당 페이지 컴포넌트([`SharedArchivePage.tsx`](file:///home/kdy987/work/sofia2/frontend/src/domain/archive/SharedArchivePage.tsx))를 렌더링할 수 있습니다.
   - 현재 `SpaController`의 라우트 목록은 다음과 같이 되어 있어, `/archive/**` 및 `/about` 등이 누락되어 있었습니다:
     ```java
     @GetMapping(value = {"/login", "/folder/**", "/image/**", "/settings"})
     public String forward() {
         return "forward:/index.html";
     }
     ```
   - 매핑되는 컨트롤러가 없으므로 Spring Boot는 이를 정적 파일 요청으로 간주하고, `static/archive/share/...` 파일을 찾으려다 `NoResourceFoundException`을 발생시킵니다.

2. **Spring Security 권한 매핑 보완**:
   - 비로그인 사용자가 브라우저 주소창에 공유 링크(`/archive/share/**`)를 직접 입력했을 때뿐만 아니라 보관소 페이지(`/archive`) 직접 접속 시에도 `index.html`이 정상 서빙될 수 있도록 `WebSecurityConfig`의 `permitAll()` 패턴에 `/archive` 및 `/archive/**`를 포함해야 합니다.

3. **GlobalExceptionHandler의 정적 자원 부재 처리**:
   - 존재하지 않는 정적 자원 요청 시 `NoResourceFoundException`을 500 에러("Unexpected exception occurred")가 아닌 표준 HTTP 404 (Not Found)로 처리하도록 예외 핸들러를 추가합니다.

---

## 2. 사용자 검토 필요 항목 (User Review Required)
- **보안 및 라우팅 동작**:
  - `/archive/share/**`로 직접 접속하는 외부/비로그인 사용자는 `index.html`을 받아 React의 공개 뷰어 페이지([`SharedArchivePage.tsx`](file:///home/kdy987/work/sofia2/frontend/src/domain/archive/SharedArchivePage.tsx))로 직행합니다.
  - 로그인되지 않은 사용자가 관리용 `/archive` 주소로 접속하면, `index.html`이 로드된 후 프론트엔드의 `ProtectedLayout`이 감지하여 `/login`으로 안전하게 리다이렉트합니다.
  - API 데이터 보안: `/api/archive/public/**`만 공개되며, 일반 관리용 `/api/archive/**` API는 여전히 JWT 인증을 필수로 요구하므로 안전합니다.

---

## 3. 변경 예정 내용 (Proposed Changes)

### Backend (`backend/src/main/java/kr/co/kalpa/sofia/`)

#### [MODIFY] [`SpaController.java`](file:///home/kdy987/work/sofia2/backend/src/main/java/kr/co/kalpa/sofia/controller/SpaController.java)
- 누락된 SPA 클라이언트 라우트(`/archive`, `/archive/**`, `/about`)를 `@GetMapping` 목록에 추가

```diff
 @Controller
 public class SpaController {
 
-    @GetMapping(value = {"/login", "/folder/**", "/image/**", "/settings"})
+    @GetMapping(
+            value = {
+                "/login",
+                "/folder/**",
+                "/image/**",
+                "/settings",
+                "/about",
+                "/archive",
+                "/archive/**"
+            })
     public String forward() {
         return "forward:/index.html";
     }
 }
```

---

#### [MODIFY] [`WebSecurityConfig.java`](file:///home/kdy987/work/sofia2/backend/src/main/java/kr/co/kalpa/sofia/security/WebSecurityConfig.java)
- 정적 리소스 및 SPA 라우트에 `"/archive"`, `"/archive/**"`를 등록하여 공유 링크 및 새로고침 허용

```diff
                                 auth.requestMatchers(
                                                 "/",
                                                 "/login",
                                                 "/folder/**",
                                                 "/image/**",
                                                 "/settings",
                                                 "/about",
+                                                "/archive",
+                                                "/archive/**",
                                                 "/index.html",
                                                 "/static/**",
                                                 "/assets/**",
                                                 "/*.js",
                                                 "/*.css",
                                                 "/*.ico",
                                                 "/*.png",
                                                 "/*.svg")
                                         .permitAll()
```

---

#### [MODIFY] [`GlobalExceptionHandler.java`](file:///home/kdy987/work/sofia2/backend/src/main/java/kr/co/kalpa/sofia/core/GlobalExceptionHandler.java)
- `NoResourceFoundException` 발생 시 500이 아닌 404 상태코드 응답 처리 추가

```diff
+    @ExceptionHandler(org.springframework.web.servlet.resource.NoResourceFoundException.class)
+    public ResponseEntity<Map<String, String>> handleNoResourceFoundException(
+            org.springframework.web.servlet.resource.NoResourceFoundException ex) {
+        Map<String, String> response = new HashMap<>();
+        response.put("error", "Resource not found: " + ex.getResourcePath());
+        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
+    }
```

---

## 4. 검증 계획 (Verification Plan)

### Automated Tests & Build
1. `./bm.sh lint` 및 `./bm.sh format`: Spotless 코드 스타일 검사
2. `./bm.sh build`: 전체 Spring Boot WAR 컴파일 및 빌드 성공 확인

### Manual Verification (수동 검증)
1. 백엔드 빌드 후 배포(`deploy.sh`) 진행
2. 브라우저 새 시크릿 창(비로그인 상태)에서 공유 링크(`http://<host>/sofia/archive/share/<shareKey>`) 접속
3. `NoResourceFoundException` 없이 `SharedArchivePage`가 로드되고 파일 뷰어 및 다운로드가 정상 동작하는지 확인
4. 관리자 페이지(`/archive`)에서 F5 새로고침 시에도 404/500 에러 없이 페이지가 유지되는지 확인
