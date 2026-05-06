package kr.co.kalpa.sofia.controller;

import kr.co.kalpa.sofia.domain.ImageFile;
import kr.co.kalpa.sofia.service.ImageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/api/images")
@RequiredArgsConstructor
public class ImageController {

    private final ImageService imageService;

    @PostMapping("/upload")
    public ResponseEntity<ImageFile> uploadImage(
            @RequestParam("file") MultipartFile file,
            @RequestParam("folderId") Long folderId) throws IOException {
        ImageFile savedImage = imageService.saveImage(file, folderId);
        return ResponseEntity.ok(savedImage);
    }
}
