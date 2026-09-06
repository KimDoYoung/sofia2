# Implementation Plan - 썸네일 뷰(Big & Small) 배경 Context Menu 구현 계획서

ImageListPage에서 썸네일 뷰 모드(`thumb` - Big, `smallThumb` - Small)로 이미지를 조회할 때, 썸네일 카드가 아닌 **배경 및 여백 공간에서 마우스 오른쪽 클릭(ContextMenu)**을 했을 때 나타나는 커스텀 컨텍스트 메뉴를 추가합니다.

## Goal Description
1. 썸네일 뷰 모드 2가지(`thumb` 큰 썸네일, `smallThumb` 작은 썸네일) 모두에서 썸네일 카드가 아닌 곳(여백, 그리드 배경)을 오른쪽 마우스로 클릭하면 custom Context Menu가 동일하게 동작하도록 구현합니다.
2. 컨텍스트 메뉴 주요 기능:
   - **선택 상태 토글**: 선택된 이미지가 있을 경우 **'전체 해제'**, 없을 경우 **'전체 선택'** 표시 및 작동.
   - **ListToolbar 연동 기능**:
     - 90° 시계방향 회전 (`onBulkRotate(90)`)
     - 90° 반시계방향 회전 (`onBulkRotate(-90)`)
     - 삭제 (`onBulkDelete`)
     - PDF 다운로드 (`onExportPdf`)
     - Merge 이미지 다운로드 (`onExportMerge`)
   - **'맨 위로 가기'**: 페이지 맨 위로 스크롤 (`scrollToTop`).
3. 썸네일 카드 내부에서 오른쪽 마우스 클릭 시에는 이벤트 전파를 차단(`e.stopPropagation()`)하여 배경 메뉴가 중복 출력되는 것을 방지합니다.

---

## User Review Required

> [!NOTE]
> - `thumb` (Big 모드)와 `smallThumb` (Small 모드) 모두 `ImageGridView` 내에서 렌더링되며, 뷰 모드 상관없이 동일하게 동작합니다.
> - 마우스 좌표 `(x, y)`는 브라우저 화면 경계를 넘지 않도록 자동 보정 계산됩니다.
> - 메뉴 바깥 클릭, ESC 키 입력, 스크롤 발생 시 컨텍스트 메뉴는 자동으로 닫깁니다.

---

## Proposed Changes

### 1. `frontend/src/domain/folder/components/GridContextMenu.tsx` [NEW]
- Context Menu UI 전용 컴포넌트 추가
- 클릭 메뉴 구성:
  1. **전체 선택 / 전체 해제** (선택 개수 > 0 일 때 '전체 해제', 0 일 때 '전체 선택')
  2. **90° 회전** (선택 항목 0개 시 disabled)
  3. **90° 반시계 회전** (선택 항목 0개 시 disabled)
  4. **삭제** (선택 항목 0개 시 disabled)
  5. **PDF 다운로드** (선택 항목 0개이거나 처리 중 시 disabled)
  6. **Merge 이미지** (선택 항목 0개이거나 처리 중 시 disabled)
  7. **맨 위로 가기** (항상 활성화, `scrollToTop` 실행)

### 2. `frontend/src/shared/components/ImageThumbCard1.tsx` & `ImageThumbCard2.tsx` [MODIFY]
- Small 썸네일(`ImageThumbCard1`) 및 Big 썸네일(`ImageThumbCard2`) 카드 최상위 Element에 `onContextMenu={(e) => e.stopPropagation()}` 적용.
- 카드 위 우클릭 시 배경 메뉴가 노출되지 않도록 전파 차단.

### 3. `frontend/src/domain/folder/components/ImageGridView.tsx` [MODIFY]
- Big(`thumb`) / Small(`smallThumb`) 그리드 Container 영역 전체에 `onContextMenu` 이벤트 등록.
- 카드 수가 적은 경우에도 배경 우클릭이 용이하도록 그리드 영역의 최소 높이(`min-h-[70vh]`) 설정.

### 4. `frontend/src/domain/folder/ImageListPage.tsx` [MODIFY]
- 컨텍스트 메뉴 위치 및 상태 `contextMenu: { x: number, y: number } | null` 관리.
- `handleContextMenu(e: React.MouseEvent)` 핸들러 구현.
- 화면 이탈 방지 좌표 보정 logic 적용.
- 스크롤/바깥 클릭/ESC 이벤트 발생 시 메뉴 닫기 처리.
- `GridContextMenu` 컴포넌트 조건부 렌더링.

---

## Verification Plan

### Automated Tests
- `./fm.sh lint`: ESLint 코드 품질 및 문법 검사.
- `./fm.sh build`: 프론트엔드 프로덕션 빌드 성공 여부 검증.

### Manual Verification
1. `SOFIA_MODE=local ./fm.sh dev`로 개발 서버 실행 (`http://localhost:5173`).
2. 특정 폴더의 이미지 목록 페이지(`ImageListPage`) 접속.
3. **Big 썸네일(`thumb`) 모드에서 검증**:
   - 카드 이외의 배경/여백 영역 마우스 오른쪽 클릭 -> 컨텍스트 메뉴 노출 확인.
   - 선택 항목 0개일 때 '전체 선택' 표시 -> 클릭 시 전체 선택 동작 확인.
   - 선택 항목 존재 시 '전체 해제' 표시 -> 클릭 시 선택 해제 동작 확인.
   - 90° 회전, -90° 회전, 삭제, PDF, Merge 기능 클릭 시 정상 작동 확인.
   - '맨 위로 가기' 클릭 시 화면 최상단 이동 확인.
4. **Small 썸네일(`smallThumb`) 모드에서 검증**:
   - Small 모드로 변경 후 여백 오른쪽 마우스 클릭 -> 동일하게 컨텍스트 메뉴 동작 확인.
5. **카드 위 오른쪽 마우스 클릭 검증**:
   - Big / Small 카드 위 우클릭 시 배경 컨텍스트 메뉴가 실행되지 않는지 확인.
