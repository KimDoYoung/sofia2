package kr.co.kalpa.sofia.controller;

import kr.co.kalpa.sofia.domain.ImageFile;
import kr.co.kalpa.sofia.service.ImageService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
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
    private final kr.co.kalpa.sofia.repository.ImageFileRepository fileRepository;

    @Value("${sofia.base.folder:./data}")
    private String baseFolder;

    @Value("${sofia.base.image.folder:./data/images}")
    private String baseImageFolder;

    @GetMapping("/folder/{folderId}")
    public ResponseEntity<List<ImageFile>> getImagesByFolder(@PathVariable Long folderId) {
        return ResponseEntity.ok(imageService.getImagesByFolder(folderId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ImageFile> getImageById(@PathVariable Long id) {
        return ResponseEntity.ok(fileRepository.findById(id).orElseThrow());
    }

    @GetMapping("/{id}/thumb")
    public ResponseEntity<org.springframework.core.io.Resource> getThumbnail(@PathVariable Long id) throws IOException {
        ImageFile file = fileRepository.findById(id).orElseThrow();
        Path path = Paths.get(baseFolder, "thumbnails", file.getFolder().getId().toString(), id + ".jpg");
        org.springframework.core.io.Resource resource = new org.springframework.core.io.FileSystemResource(path);
        return ResponseEntity.ok()
                .contentType(org.springframework.http.MediaType.IMAGE_JPEG)
                .body(resource);
    }

    @GetMapping("/{id}/raw")
    public ResponseEntity<org.springframework.core.io.Resource> getRawImage(@PathVariable Long id) throws IOException {
        ImageFile file = fileRepository.findById(id).orElseThrow();
        Path path = Paths.get(baseImageFolder, file.getFolder().getFolderName(), file.getOrgName());
        org.springframework.core.io.Resource resource = new org.springframework.core.io.FileSystemResource(path);
        
        String mimeType = Files.probeContentType(path);
        return ResponseEntity.ok()
                .contentType(org.springframework.http.MediaType.parseMediaType(mimeType != null ? mimeType : "image/jpeg"))
                .body(resource);
    }

    @PostMapping("/upload")
    public ResponseEntity<ImageFile> uploadImage(
            @RequestParam("file") MultipartFile file,
            @RequestParam("folderId") Long folderId) throws IOException {
        ImageFile savedImage = imageService.saveImage(file, folderId);
        return ResponseEntity.ok(savedImage);
    }
}
