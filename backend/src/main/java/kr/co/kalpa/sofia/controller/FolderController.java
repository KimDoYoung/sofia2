package kr.co.kalpa.sofia.controller;

import kr.co.kalpa.sofia.domain.ImageFolder;
import kr.co.kalpa.sofia.dto.FolderTreeDto;
import kr.co.kalpa.sofia.dto.TaskProgressDto;
import kr.co.kalpa.sofia.service.FolderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/folders")
@RequiredArgsConstructor
public class FolderController {

    private final FolderService folderService;

    // 전체 폴더 목록을 조회하여 반환한다
    @GetMapping
    public ResponseEntity<List<ImageFolder>> getAllFolders() {
        return ResponseEntity.ok(folderService.getAllFolders());
    }

    @GetMapping("/tree")
    public ResponseEntity<List<FolderTreeDto>> getFolderTree() throws IOException {
        return ResponseEntity.ok(folderService.getFolderTree());
    }

    // 사용 가능한 하위 폴더 목록을 조회하여 반환한다
    @GetMapping("/subfolders")
    public ResponseEntity<List<String>> getAvailableSubfolders() throws IOException {
        return ResponseEntity.ok(folderService.getAvailableSubfolders());
    }

    // 요청으로 전달된 폴더명으로 새 폴더를 생성하고 결과를 반환한다
    @PostMapping
    public ResponseEntity<ImageFolder> addFolder(@RequestBody Map<String, String> request) throws IOException {
        String folderName = request.get("folderName");
        return ResponseEntity.ok(folderService.addFolder(folderName));
    }

    @PostMapping("/async")
    public ResponseEntity<Map<String, String>> addFolderAsync(@RequestBody Map<String, String> request) {
        String folderName = request.get("folderName");
        String taskId = folderService.addFolderAsync(folderName);
        return ResponseEntity.ok(Collections.singletonMap("taskId", taskId));
    }

    @GetMapping("/progress/{taskId}")
    public ResponseEntity<TaskProgressDto> getTaskProgress(@PathVariable String taskId) {
        return ResponseEntity.ok(folderService.getTaskProgress(taskId));
    }

    @PutMapping("/{id}/note")
    public ResponseEntity<ImageFolder> updateFolderNote(@PathVariable Long id, @RequestBody Map<String, String> request) {
        String note = request.get("note");
        return ResponseEntity.ok(folderService.updateFolderNote(id, note));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFolder(@PathVariable Long id) throws IOException {
        folderService.deleteFolder(id);
        return ResponseEntity.ok().build();
    }
}
