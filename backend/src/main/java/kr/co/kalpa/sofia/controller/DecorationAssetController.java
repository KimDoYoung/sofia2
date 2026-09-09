package kr.co.kalpa.sofia.controller;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import kr.co.kalpa.sofia.dto.DecorationAssetDto;
import kr.co.kalpa.sofia.service.DecorationAssetService;
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
@RequestMapping("/api/assets/decorations")
@RequiredArgsConstructor
public class DecorationAssetController {

    private final DecorationAssetService decorationAssetService;

    @GetMapping
    public ResponseEntity<List<DecorationAssetDto>> getDecorationList() {
        return ResponseEntity.ok(decorationAssetService.getDecorationAssets());
    }

    @PostMapping("/upload")
    public ResponseEntity<DecorationAssetDto> uploadDecoration(
            @RequestParam("file") MultipartFile file) throws IOException {
        DecorationAssetDto saved = decorationAssetService.uploadDecoration(file);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{filename}")
    public ResponseEntity<Map<String, Boolean>> deleteDecoration(@PathVariable String filename) {
        boolean deleted = decorationAssetService.deleteDecoration(filename);
        return ResponseEntity.ok(Collections.singletonMap("deleted", deleted));
    }

    @GetMapping("/image/{filename}")
    public ResponseEntity<Resource> getDecorationImage(@PathVariable String filename)
            throws IOException {
        Resource resource = decorationAssetService.getDecorationResource(filename);
        if (resource == null || !resource.exists()) {
            return ResponseEntity.notFound().build();
        }

        Path path = resource.getFile().toPath();
        String mimeType = Files.probeContentType(path);
        MediaType contentType = MediaType.parseMediaType(mimeType != null ? mimeType : "image/png");

        return ResponseEntity.ok()
                .header(HttpHeaders.CACHE_CONTROL, "max-age=3600")
                .contentType(contentType)
                .body(resource);
    }
}
