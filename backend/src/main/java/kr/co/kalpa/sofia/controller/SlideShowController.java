package kr.co.kalpa.sofia.controller;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.Map;
import kr.co.kalpa.sofia.dto.SlideShowRequest;
import kr.co.kalpa.sofia.dto.SlideShowTaskStatus;
import kr.co.kalpa.sofia.service.SlideShowService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/slideshow")
@RequiredArgsConstructor
public class SlideShowController {

    private final SlideShowService slideShowService;

    @PostMapping("/generate")
    public ResponseEntity<Map<String, String>> generateSlideShow(
            @RequestBody SlideShowRequest request) {
        String taskId = slideShowService.generateSlideShowAsync(request);
        return ResponseEntity.ok(Collections.singletonMap("taskId", taskId));
    }

    @GetMapping("/progress/{taskId}")
    public ResponseEntity<SlideShowTaskStatus> getProgress(@PathVariable String taskId) {
        SlideShowTaskStatus status = slideShowService.getTaskStatus(taskId);
        if (status == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(status);
    }

    @GetMapping("/stream/{taskId}")
    public ResponseEntity<Resource> streamVideo(@PathVariable String taskId) {
        Resource resource = slideShowService.getVideoResource(taskId);
        if (resource == null || !resource.exists()) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok()
                .header(HttpHeaders.ACCEPT_RANGES, "bytes")
                .contentType(MediaType.parseMediaType("video/mp4"))
                .body(resource);
    }

    @GetMapping("/download/{taskId}")
    public ResponseEntity<Resource> downloadVideo(@PathVariable String taskId) {
        Resource resource = slideShowService.getVideoResource(taskId);
        if (resource == null || !resource.exists()) {
            return ResponseEntity.notFound().build();
        }

        String timestamp =
                LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        String filename = "sofia_slideshow_" + timestamp + ".mp4";

        ContentDisposition disposition =
                ContentDisposition.attachment().filename(filename, StandardCharsets.UTF_8).build();

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .contentType(MediaType.parseMediaType("video/mp4"))
                .body(resource);
    }

    @PostMapping("/save/{taskId}")
    public ResponseEntity<Map<String, String>> saveVideoToFolder(
            @PathVariable String taskId, @RequestBody(required = false) Map<String, Object> body)
            throws IOException {
        Long folderId = null;
        String customName = null;

        if (body != null) {
            if (body.get("folderId") != null) {
                folderId = Long.valueOf(body.get("folderId").toString());
            }
            if (body.get("customName") != null) {
                customName = body.get("customName").toString();
            }
        }

        String savedFilename = slideShowService.saveToFolder(taskId, folderId, customName);
        return ResponseEntity.ok(Collections.singletonMap("filename", savedFilename));
    }
}
