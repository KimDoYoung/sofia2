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
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

@RestController
@RequestMapping("/api/images")
@RequiredArgsConstructor
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
        return serveThumbnail(id, "thumb");
    }

    @GetMapping("/{id}/raw")
    public ResponseEntity<Resource> getRawImage(@PathVariable Long id) throws IOException {
        ImageFile file = findImageOrThrow(id);
        Path path = Paths.get(baseImageFolder, file.getFolder().getFolderName(), file.getOrgName());
        
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

    private ImageFile findImageOrThrow(Long id) {
        return fileRepository.findById(id).orElseThrow(() -> new RuntimeException("Image not found: " + id));
    }

    private ResponseEntity<Resource> serveThumbnail(Long id, String type) throws IOException {
        ImageFile file = findImageOrThrow(id);
        Path path = imageService.getThumbnailPath(file, type);
        return serveResource(path, MediaType.IMAGE_JPEG);
    }

    private ResponseEntity<Resource> serveResource(Path path, MediaType contentType) {
        Resource resource = new FileSystemResource(path);
        return ResponseEntity.ok()
                .contentType(contentType)
                .body(resource);
    }
}
