package kr.co.kalpa.sofia.controller;

import kr.co.kalpa.sofia.domain.ImageFile;
import kr.co.kalpa.sofia.repository.ImageFileRepository;
import kr.co.kalpa.sofia.service.ImageService;
import kr.co.kalpa.sofia.dto.ImageUpdateRequest;
import kr.co.kalpa.sofia.dto.ImageDeleteRequest;
import kr.co.kalpa.sofia.dto.ImageRotateRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@RestController
@RequestMapping("/api/images")
@RequiredArgsConstructor
@lombok.extern.slf4j.Slf4j
public class ImageController {

    private final ImageService imageService;
    private final ImageFileRepository fileRepository;

    @Value("${sofia.base.image.folder:./data/images}")
    private String baseImageFolder;

    @GetMapping("/folder/{folderId}")
    public ResponseEntity<List<ImageFile>> getImagesByFolder(@PathVariable Long folderId) {
        return ResponseEntity.ok(imageService.getImagesByFolder(folderId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ImageFile> getImageById(@PathVariable Long id) {
        return ResponseEntity.ok(findImageOrThrow(id));
    }

    @GetMapping("/{id}/thumb")
    public ResponseEntity<Resource> getThumbnail(@PathVariable Long id) throws IOException {
        ImageFile file = findImageOrThrow(id);
        Path path = imageService.getThumbnailPath(file, "thumb");
        
        if (!Files.exists(path)) {
            return ResponseEntity.notFound().build();
        }
        
        return serveResource(path, MediaType.IMAGE_JPEG);
    }

    @GetMapping("/{id}/raw")
    public ResponseEntity<Resource> getRawImage(@PathVariable Long id) throws IOException {
        ImageFile file = findImageOrThrow(id);
        
        if (file.getFolder() == null) {
            throw new RuntimeException("Image file has no associated folder: " + id);
        }
        
        Path path = Paths.get(baseImageFolder, file.getFolder().getFolderName(), file.getOrgName());
        
        if (!Files.exists(path)) {
            log.error("Raw image file not found on disk: {}", path);
            return ResponseEntity.notFound().build();
        }
        
        String mimeType = Files.probeContentType(path);
        MediaType contentType = MediaType.parseMediaType(mimeType != null ? mimeType : "image/jpeg");
        
        return serveResource(path, contentType);
    }

    @PostMapping("/upload")
    public ResponseEntity<ImageFile> uploadImage(
            @RequestParam("file") MultipartFile file,
            @RequestParam("folderId") Long folderId) throws IOException {
        ImageFile savedImage = imageService.saveImage(file, folderId);
        return ResponseEntity.ok(savedImage);
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ImageFile> updateImage(@PathVariable Long id, @RequestBody ImageUpdateRequest request) {
        ImageFile updatedImage = imageService.updateImage(id, request);
        return ResponseEntity.ok(updatedImage);
    }

    @DeleteMapping
    public ResponseEntity<Void> deleteImages(@RequestBody ImageDeleteRequest request) {
        imageService.deleteImages(request.getIds());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/rotate")
    public ResponseEntity<Void> rotateImages(@RequestBody ImageRotateRequest request) {
        imageService.rotateImages(request.getIds(), request.getAngle());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/export/pdf")
    public ResponseEntity<Resource> exportToPdf(@RequestBody ImageDeleteRequest request) throws IOException {
        Path pdfPath = imageService.exportAsPdf(request.getIds());
        
        String filename = "sofia_images_" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss")) + ".pdf";
        
        Resource resource = new FileSystemResource(pdfPath) {
            @Override
            public InputStream getInputStream() throws IOException {
                return new java.io.FileInputStream(pdfPath.toFile()) {
                    @Override
                    public void close() throws IOException {
                        try {
                            super.close();
                        } finally {
                            Files.deleteIfExists(pdfPath);
                        }
                    }
                };
            }
        };

        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(resource);
    }

    private ImageFile findImageOrThrow(Long id) {
        return fileRepository.findById(id).orElseThrow(() -> new RuntimeException("Image not found: " + id));
    }

    private ResponseEntity<Resource> serveResource(Path path, MediaType contentType) {
        Resource resource = new FileSystemResource(path);
        return ResponseEntity.ok()
                .contentType(contentType)
                .body(resource);
    }
}
