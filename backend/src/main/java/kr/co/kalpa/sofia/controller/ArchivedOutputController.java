package kr.co.kalpa.sofia.controller;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import kr.co.kalpa.sofia.domain.ArchivedOutput;
import kr.co.kalpa.sofia.domain.OutputType;
import kr.co.kalpa.sofia.dto.ArchivedOutputUpdateRequest;
import kr.co.kalpa.sofia.dto.SlideshowArchiveRequest;
import kr.co.kalpa.sofia.service.ArchivedOutputService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/archive")
@RequiredArgsConstructor
public class ArchivedOutputController {

    private final ArchivedOutputService archivedOutputService;

    @PostMapping("/upload")
    public ResponseEntity<ArchivedOutput> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam("type") OutputType type,
            @RequestParam(required = false) String displayFilename,
            @RequestParam(required = false) String note,
            @RequestParam(required = false) Long sourceFolderId,
            @RequestParam(required = false) Integer elapsedMs)
            throws IOException {
        return ResponseEntity.ok(
                archivedOutputService.saveUpload(
                        file, type, displayFilename, note, sourceFolderId, elapsedMs));
    }

    @PostMapping("/from-slideshow/{taskId}")
    public ResponseEntity<ArchivedOutput> fromSlideshow(
            @PathVariable String taskId, @RequestBody SlideshowArchiveRequest request)
            throws IOException {
        return ResponseEntity.ok(
                archivedOutputService.saveFromSlideshowTask(
                        taskId,
                        request.getDisplayFilename(),
                        request.getNote(),
                        request.getElapsedMs()));
    }

    @GetMapping
    public ResponseEntity<List<ArchivedOutput>> list(
            @RequestParam(required = false) OutputType type) {
        return ResponseEntity.ok(archivedOutputService.list(type));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ArchivedOutput> updateMeta(
            @PathVariable Long id, @RequestBody ArchivedOutputUpdateRequest request) {
        return ResponseEntity.ok(
                archivedOutputService.updateMeta(
                        id,
                        request.getNote(),
                        request.getDisplayFilename(),
                        request.getIsPublic()));
    }

    @PostMapping("/{id}/reissue-share-key")
    public ResponseEntity<ArchivedOutput> reissueShareKey(@PathVariable Long id) {
        return ResponseEntity.ok(archivedOutputService.reissueShareKey(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        archivedOutputService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> download(@PathVariable Long id) {
        ArchivedOutput meta = archivedOutputService.getMeta(id);
        Resource resource = archivedOutputService.getFileForDownload(id);
        if (resource == null) return ResponseEntity.notFound().build();
        ContentDisposition disposition =
                ContentDisposition.attachment()
                        .filename(meta.getDisplayFilename(), StandardCharsets.UTF_8)
                        .build();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .body(resource);
    }

    @GetMapping("/{id}/view")
    public ResponseEntity<Resource> view(@PathVariable Long id) {
        ArchivedOutput meta = archivedOutputService.getMeta(id);
        Resource resource = archivedOutputService.getFileForDownload(id);
        if (resource == null) return ResponseEntity.notFound().build();
        ContentDisposition disposition =
                ContentDisposition.inline()
                        .filename(meta.getDisplayFilename(), StandardCharsets.UTF_8)
                        .build();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .header(HttpHeaders.ACCEPT_RANGES, "bytes")
                .contentType(archivedOutputService.resolveMediaType(meta.getType()))
                .body(resource);
    }

    @GetMapping("/public/{shareKey}")
    public ResponseEntity<ArchivedOutput> getPublicMeta(@PathVariable String shareKey) {
        return ResponseEntity.ok(archivedOutputService.getPublicMeta(shareKey));
    }

    @GetMapping("/public/{shareKey}/view")
    public ResponseEntity<Resource> viewPublic(@PathVariable String shareKey) {
        ArchivedOutput meta = archivedOutputService.getPublicMeta(shareKey);
        Resource resource = archivedOutputService.getPublicFile(shareKey);
        if (resource == null) return ResponseEntity.notFound().build();
        ContentDisposition disposition =
                ContentDisposition.inline()
                        .filename(meta.getDisplayFilename(), StandardCharsets.UTF_8)
                        .build();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .header(HttpHeaders.ACCEPT_RANGES, "bytes")
                .contentType(archivedOutputService.resolveMediaType(meta.getType()))
                .body(resource);
    }

    @GetMapping("/public/{shareKey}/download")
    public ResponseEntity<Resource> downloadPublic(@PathVariable String shareKey) {
        ArchivedOutput meta = archivedOutputService.getPublicMeta(shareKey);
        Resource resource = archivedOutputService.getPublicFile(shareKey);
        if (resource == null) return ResponseEntity.notFound().build();
        ContentDisposition disposition =
                ContentDisposition.attachment()
                        .filename(meta.getDisplayFilename(), StandardCharsets.UTF_8)
                        .build();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .body(resource);
    }
}
