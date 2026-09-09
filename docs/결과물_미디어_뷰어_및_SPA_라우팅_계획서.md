# [계획서] 보관소 결과물(MP4, PDF, PNG) 브라우저 뷰어 및 SPA 라우팅 개선 계획

## 1. 개요 (Goal Description)
1. **공개 링크 브라우저 접속 오류 해결**: 운영 서버(`jskn`)에서 `/sofia/archive/share/<shareKey>` 주소를 브라우저 주소창에 입력했을 때 발생하는 `NoResourceFoundException`을 해결하여, 비로그인/외부 사용자도 공유 페이지에 정상 진입할 수 있도록 합니다.
2. **모든 포맷(MP4, PDF, PNG/JPG) 브라우저 뷰어 지원**:
   - **MP4 (슬라이드쇼)**: 브라우저 내장 비디오 플레이어(`<video>`)로 끊김 없이 스트리밍 및 재생.
   - **PDF (문서)**: `<iframe>` 임베드 뷰어 및 모바일/환경 호환성을 위한 '새 탭에서 열기' 지원.
   - **PNG / JPG (병합, 콜라쥬, 효과 이미지)**: 정확한 MIME Type (`image/png`, `image/jpeg`) 판별 및 반환으로 브라우저에서 선명하게 렌더링.
   - 보관소 미리보기 모달([`ArchivePreviewModal.tsx`](file:///home/kdy987/work/sofia2/frontend/src/domain/archive/ArchivePreviewModal.tsx))과 공개 뷰어 페이지([`SharedArchivePage.tsx`](file:///home/kdy987/work/sofia2/frontend/src/domain/archive/SharedArchivePage.tsx)) 양쪽 모두에 최적화된 뷰어 UI 적용.

---

## 2. 사용자 검토 필요 항목 (User Review Required)
- **미디어 MIME 타입 감지**: 파일 확장자(`.png`, `.jpg`, `.pdf`, `.mp4`)에 따라 백엔드 응답의 `Content-Type`을 정밀하게 반환 (`image/png`, `image/jpeg`, `application/pdf`, `video/mp4`).
- **새 탭에서 열기 버튼 추가**: 브라우저나 디바이스 특성에 따라 PDF 또는 비디오 iframe 렌더링에 제약이 있는 경우를 대비하여 상단에 '새 탭에서 원본 보기' 버튼을 제공합니다.
- 기존 데이터와의 호환성: 이미 생성된 보관소 항목들도 확장자에 맞춰 정상적으로 MIME 타입이 자동 매핑됩니다.

---

## 3. 변경 예정 내용 (Proposed Changes)

### 백엔드 (Backend)

#### [MODIFY] [`SpaController.java`](file:///home/kdy987/work/sofia2/backend/src/main/java/kr/co/kalpa/sofia/controller/SpaController.java)
- 누락된 SPA 클라이언트 라우트(`/archive`, `/archive/**`, `/about`) 추가하여 브라우저 직접 접속/새로고침 시 `index.html` 포워딩

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
- `permitAll()` 목록에 `"/archive"`, `"/archive/**"` 등록

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
- 누락된 정적 자원 요청 시 500이 아닌 404를 반환하도록 `NoResourceFoundException` 핸들러 추가

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

#### [MODIFY] [`ArchivedOutputService.java`](file:///home/kdy987/work/sofia2/backend/src/main/java/kr/co/kalpa/sofia/service/ArchivedOutputService.java)
- 파일 저장 시 업로드된 파일의 확장자(PNG 여부 등)를 인식하여 저장
- `resolveMediaType(ArchivedOutput meta)` 오버로드 추가: `fileExtension`을 기반으로 `image/png`, `image/jpeg`, `application/pdf`, `video/mp4`를 정확히 판별

```diff
+    private String resolveExtension(OutputType type, String filename, String contentType) {
+        if (type == OutputType.PDF) return "pdf";
+        if (type == OutputType.SLIDESHOW) return "mp4";
+        if (StringUtils.hasText(filename)) {
+            int dot = filename.lastIndexOf('.');
+            if (dot > 0 && dot < filename.length() - 1) {
+                String ext = filename.substring(dot + 1).toLowerCase();
+                if (ext.equals("png") || ext.equals("jpg") || ext.equals("jpeg") || ext.equals("webp")) {
+                    return ext.equals("jpeg") ? "jpg" : ext;
+                }
+            }
+        }
+        if (StringUtils.hasText(contentType)) {
+            if (contentType.equalsIgnoreCase("image/png")) return "png";
+            if (contentType.equalsIgnoreCase("image/webp")) return "webp";
+        }
+        return "jpg";
+    }

+    public MediaType resolveMediaType(ArchivedOutput meta) {
+        String ext = meta.getFileExtension();
+        if (ext == null && meta.getStoredFilename() != null) {
+            int dot = meta.getStoredFilename().lastIndexOf('.');
+            if (dot >= 0) ext = meta.getStoredFilename().substring(dot + 1);
+        }
+        if (ext != null) {
+            switch (ext.toLowerCase()) {
+                case "png": return MediaType.IMAGE_PNG;
+                case "jpg":
+                case "jpeg": return MediaType.IMAGE_JPEG;
+                case "gif": return MediaType.IMAGE_GIF;
+                case "webp": return MediaType.parseMediaType("image/webp");
+                case "mp4": return MediaType.parseMediaType("video/mp4");
+                case "pdf": return MediaType.APPLICATION_PDF;
+            }
+        }
+        return resolveMediaType(meta.getType());
+    }
```

---

#### [MODIFY] [`ArchivedOutputController.java`](file:///home/kdy987/work/sofia2/backend/src/main/java/kr/co/kalpa/sofia/controller/ArchivedOutputController.java)
- `/view` 및 `/public/{shareKey}/view` 엔드포인트에서 `archivedOutputService.resolveMediaType(meta)` 호출로 변경하여 PNG/MP4/PDF 정확한 Content-Type 전달

---

### 프론트엔드 (Frontend)

#### [MODIFY] [`ArchivePreviewModal.tsx`](file:///home/kdy987/work/sofia2/frontend/src/domain/archive/ArchivePreviewModal.tsx)
- 모달 너비를 `max-w-4xl` ➔ `max-w-5xl`로 확장하여 PDF 및 고화질 이미지/영상 가시성 향상
- 모달 상단 헤더에 **'새 탭에서 열기' (`ExternalLink`)** 버튼 추가
- 미디어 타입 판별 조건 강화 (`type === 'SLIDESHOW' || fileExtension === 'mp4'`, `type === 'PDF' || fileExtension === 'pdf'`)

#### [MODIFY] [`SharedArchivePage.tsx`](file:///home/kdy987/work/sofia2/frontend/src/domain/archive/SharedArchivePage.tsx)
- 뷰어 상단에 '새 탭에서 열기' 버튼 추가
- PDF 뷰어 하단에 새 탭 열기 바로가기 보조 안내 추가
- MP4 비디오 태그에 `playsInline`, `preload="auto"` 적용

---

## 4. 검증 계획 (Verification Plan)

### Automated Tests & Build
1. `./bm.sh format` & `./bm.sh lint`: Spotless 코드 포맷 검사
2. `./fm.sh lint` & `./fm.sh build`: 프론트엔드 린트 및 빌드
3. `./bm.sh build`: 백엔드 전체 WAR 빌드

### Manual Verification
1. 브라우저 주소창에 `/sofia/archive/share/<shareKey>` 직접 입력 시 에러 없이 페이지가 열리는지 확인
2. **MP4 결과물**: 비디오 플레이어 재생, 음성/영상 싱크 확인
3. **PDF 결과물**: 브라우저 내 PDF 뷰어 렌더링 및 '새 탭에서 열기' 정상 작동 확인
4. **PNG/JPG 이미지**: 왜곡 없이 원본 비율로 선명하게 표시되는지 확인
5. 보관소 관리자 그리드의 `미리보기` 모달에서도 3가지 포맷이 동일하게 잘 보이는지 확인
