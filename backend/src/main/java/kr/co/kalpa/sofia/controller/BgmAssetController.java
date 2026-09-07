package kr.co.kalpa.sofia.controller;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import kr.co.kalpa.sofia.dto.BgmAssetDto;
import kr.co.kalpa.sofia.service.BgmAssetService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@RestController
@RequestMapping("/api/assets/bgm")
@RequiredArgsConstructor
public class BgmAssetController {

    private final BgmAssetService bgmAssetService;

    @GetMapping
    public ResponseEntity<List<BgmAssetDto>> getBgmList() {
        return ResponseEntity.ok(bgmAssetService.getBgmAssets());
    }

    @PostMapping("/upload")
    public ResponseEntity<BgmAssetDto> uploadBgm(
            @RequestParam("file") MultipartFile file) throws IOException {
        BgmAssetDto saved = bgmAssetService.uploadBgm(file);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{filename}")
    public ResponseEntity<Map<String, Boolean>> deleteBgm(
            @PathVariable String filename) {
        boolean deleted = bgmAssetService.deleteBgm(filename);
        return ResponseEntity.ok(Collections.singletonMap("deleted", deleted));
    }

    @GetMapping("/stream/{filename}")
    public ResponseEntity<Resource> streamBgm(
            @PathVariable String filename) throws IOException {
        Resource resource = bgmAssetService.getBgmResource(filename);
        if (resource == null || !resource.exists()) {
            return ResponseEntity.notFound().build();
        }

        Path path = resource.getFile().toPath();
        String mimeType = Files.probeContentType(path);
        MediaType contentType =
                MediaType.parseMediaType(
                        mimeType != null ? mimeType : "audio/mpeg");

        return ResponseEntity.ok()
                .header(HttpHeaders.ACCEPT_RANGES, "bytes")
                .contentType(contentType)
                .body(resource);
    }
}
