package kr.co.kalpa.sofia.service;

import kr.co.kalpa.sofia.domain.ImageFile;
import kr.co.kalpa.sofia.domain.ImageFolder;
import kr.co.kalpa.sofia.dto.ImageUpdateRequest;
import kr.co.kalpa.sofia.repository.ImageFileRepository;
import kr.co.kalpa.sofia.repository.ImageFolderRepository;
import lombok.RequiredArgsConstructor;
import net.coobird.thumbnailator.Thumbnails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.Graphics2D;
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

    @org.springframework.beans.factory.annotation.Value("${sofia.base.folder:./data}")
    private String baseFolder;

    @org.springframework.beans.factory.annotation.Value("${sofia.base.image.folder:./data/images}")
    private String baseImageFolder;

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

    @Transactional
    public ImageFile updateImage(Long id, ImageUpdateRequest request) {
        ImageFile image = findImageOrThrow(id);
        if (request.getOrgName() != null) {
            image.setOrgName(request.getOrgName());
        }
        if (request.getNote() != null) {
            image.setNote(request.getNote());
        }
        return imageFileRepository.save(image);
    }

    @Transactional
    public void deleteImages(List<Long> ids) {
        for (Long id : ids) {
            ImageFile image = findImageOrThrow(id);
            Path rawPath = Paths.get(baseImageFolder, image.getFolder().getFolderName(), image.getOrgName());
            try {
                Files.deleteIfExists(rawPath);
                Path thumbPath = getThumbnailPath(image, "thumb");
                Files.deleteIfExists(thumbPath);
                Path smallThumbPath = getThumbnailPath(image, "smallThumb");
                Files.deleteIfExists(smallThumbPath);
            } catch (IOException e) {
                throw new RuntimeException("Failed to delete image files", e);
            }
            imageFileRepository.deleteById(id);
        }
    }

    @Transactional
    public void rotateImages(List<Long> ids, int angle) {
        for (Long id : ids) {
            ImageFile image = findImageOrThrow(id);
            Path rawPath = Paths.get(baseImageFolder, image.getFolder().getFolderName(), image.getOrgName());
            try {
                File sourceFile = rawPath.toFile();
                
                // Use Thumbnailator for rotation
                Thumbnails.of(sourceFile)
                        .scale(1.0)
                        .rotate(angle)
                        .toFile(sourceFile);

                // Update resolution in DB if 90 or 270 degrees
                if (angle == 90 || angle == 270 || angle == -90 || angle == -270) {
                    int oldWidth = image.getImageWidth();
                    image.setImageWidth(image.getImageHeight());
                    image.setImageHeight(oldWidth);
                    imageFileRepository.save(image);
                }

                // Recreate thumbnails
                Path thumbPath = getThumbnailPath(image, "thumb");
                createThumbnail(sourceFile, thumbPath.toFile(), 300, 300);

                Path smallThumbPath = getThumbnailPath(image, "smallThumb");
                createThumbnail(sourceFile, smallThumbPath.toFile(), 80, 80);
            } catch (IOException e) {
                throw new RuntimeException("Failed to rotate image: " + id, e);
            }
        }
    }

    private ImageFile findImageOrThrow(Long id) {
        return imageFileRepository.findById(id).orElseThrow(() -> new RuntimeException("Image not found: " + id));
    }

    public Path getThumbnailPath(ImageFile file, String type) throws IOException {
        String subFolder = type.equals("smallThumb") ? "smallThumbnails" : "thumbnails";
        int size = type.equals("smallThumb") ? 80 : 300;
        
        Path thumbPath = Paths.get(baseFolder, subFolder, file.getFolder().getId().toString(), file.getId() + ".jpg");
        
        if (!Files.exists(thumbPath)) {
            Files.createDirectories(thumbPath.getParent());
            Path rawPath = Paths.get(baseImageFolder, file.getFolder().getFolderName(), file.getOrgName());
            if (Files.exists(rawPath)) {
                createThumbnail(rawPath.toFile(), thumbPath.toFile(), size, size);
            } else {
                // If raw file doesn't exist, we can't create thumbnail
                throw new IOException("Original image not found: " + rawPath);
            }
        }
        
        return thumbPath;
    }

    public void createThumbnail(File source, File target, int width, int height) throws IOException {
        Thumbnails.of(source)
                .size(width, height)
                .toFile(target);
    }
}
