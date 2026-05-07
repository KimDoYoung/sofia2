package kr.co.kalpa.sofia.controller;

import kr.co.kalpa.sofia.domain.ImageFolder;
import kr.co.kalpa.sofia.service.FolderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/folders")
@RequiredArgsConstructor
public class FolderController {

    private final FolderService folderService;

    @GetMapping
    public ResponseEntity<List<ImageFolder>> getAllFolders() {
        return ResponseEntity.ok(folderService.getAllFolders());
    }

    @GetMapping("/subfolders")
    public ResponseEntity<List<String>> getAvailableSubfolders() throws IOException {
        return ResponseEntity.ok(folderService.getAvailableSubfolders());
    }

    @PostMapping
    public ResponseEntity<ImageFolder> addFolder(@RequestBody Map<String, String> request) throws IOException {
        String folderName = request.get("folderName");
        return ResponseEntity.ok(folderService.addFolder(folderName));
    }
}
