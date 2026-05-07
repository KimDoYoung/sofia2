package kr.co.kalpa.sofia.service;

import kr.co.kalpa.sofia.domain.ImageFile;
import kr.co.kalpa.sofia.domain.ImageFolder;
import kr.co.kalpa.sofia.repository.ImageFileRepository;
import kr.co.kalpa.sofia.repository.ImageFolderRepository;
import lombok.RequiredArgsConstructor;
import net.coobird.thumbnailator.Thumbnails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ImageService {

    private final ImageFileRepository imageFileRepository;
    private final ImageFolderRepository imageFolderRepository;
    private final MetadataService metadataService;

    public List<ImageFile> getImagesByFolder(Long folderId) {
        return imageFileRepository.findByFolderIdOrderBySeqAsc(folderId);
    }

    private final String uploadDir = "uploads/";

    @Transactional
    public ImageFile saveImage(MultipartFile file, Long folderId) throws IOException {
        ImageFolder folder = imageFolderRepository.findById(folderId)
                .orElseThrow(() -> new RuntimeException("Folder not found"));

        String originalFilename = file.getOriginalFilename();
        String extension = originalFilename.substring(originalFilename.lastIndexOf(".") + 1);
        String hashCode = UUID.randomUUID().toString(); // Placeholder for actual hash if needed

        Path copyLocation = Paths.get(uploadDir + hashCode + "." + extension);
        if (!Files.exists(copyLocation.getParent())) {
            Files.createDirectories(copyLocation.getParent());
        }
        Files.copy(file.getInputStream(), copyLocation);

        File savedFile = copyLocation.toFile();
        BufferedImage image = ImageIO.read(savedFile);

        ImageFile imageFile = ImageFile.builder()
                .orgName(originalFilename)
                .hashCode(hashCode)
                .seq(folder.getImageFiles().size() + 1)
                .folder(folder)
                .imageFormat(extension)
                .imageWidth(image.getWidth())
                .imageHeight(image.getHeight())
                .imageMode("RGB") // Simplified
                .build();

        metadataService.extractMetadata(savedFile, imageFile);

        return imageFileRepository.save(imageFile);
    }

    public void createThumbnail(File source, File target, int width, int height) throws IOException {
        Thumbnails.of(source)
                .size(width, height)
                .toFile(target);
    }
}
