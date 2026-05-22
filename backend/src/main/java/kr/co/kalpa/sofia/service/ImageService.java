package kr.co.kalpa.sofia.service;

import kr.co.kalpa.sofia.domain.ImageFile;
import kr.co.kalpa.sofia.domain.ImageFolder;
import kr.co.kalpa.sofia.dto.ImageUpdateRequest;
import kr.co.kalpa.sofia.repository.ImageFileRepository;
import kr.co.kalpa.sofia.repository.ImageFolderRepository;
import lombok.RequiredArgsConstructor;
import net.coobird.thumbnailator.Thumbnails;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.graphics.image.JPEGFactory;
import org.apache.pdfbox.pdmodel.graphics.image.LosslessFactory;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
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
@lombok.extern.slf4j.Slf4j
public class ImageService {

    private final ImageFileRepository imageFileRepository;
    private final ImageFolderRepository imageFolderRepository;
    private final MetadataService metadataService;

    @org.springframework.beans.factory.annotation.Value("${sofia.base.folder:./data}")
    private String baseFolder;

    @org.springframework.beans.factory.annotation.Value("${sofia.base.image.folder:./data/images}")
    private String baseImageFolder;

    public List<ImageFile> getImagesByFolder(Long folderId) {
        return imageFileRepository.findByFolderIdOrderByOrgNameAsc(folderId);
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

        if (request.getOrgName() != null && !request.getOrgName().equals(image.getOrgName())) {
            if (image.getFolder() == null) {
                throw new RuntimeException("Cannot rename image: No associated folder found for image ID " + id);
            }

            Path oldPath = Paths.get(baseImageFolder, image.getFolder().getFolderName(), image.getOrgName());
            Path newPath = Paths.get(baseImageFolder, image.getFolder().getFolderName(), request.getOrgName());

            try {
                if (!Files.exists(oldPath)) {
                    log.error("Original file missing on disk, cannot rename: {}", oldPath);
                    throw new RuntimeException("Original file missing on disk, cannot perform rename.");
                }

                if (Files.exists(newPath)) {
                    throw new RuntimeException("A file with the new name already exists: " + request.getOrgName());
                }

                Files.move(oldPath, newPath);
                image.setOrgName(request.getOrgName());
            } catch (IOException e) {
                log.error("Failed to rename physical file from {} to {}: {}", oldPath, newPath, e.getMessage());
                throw new RuntimeException("Failed to rename file on disk: " + e.getMessage());
            }
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
                Files.deleteIfExists(getThumbnailPath(image, false));
            } catch (IOException e) {
                log.error("Failed to delete physical files for image id {}: {}", id, e.getMessage());
                // Continue with database deletion even if physical file deletion fails
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
                Path thumbPath = getThumbnailPath(image, false);
                Files.createDirectories(thumbPath.getParent());
                createThumbnail(sourceFile, thumbPath.toFile(), 300, 300);
            } catch (IOException e) {
                throw new RuntimeException("Failed to rotate image: " + id, e);
            }
        }
    }

    private ImageFile findImageOrThrow(Long id) {
        return imageFileRepository.findById(id).orElseThrow(() -> new RuntimeException("Image not found: " + id));
    }

    public Path getThumbnailPath(ImageFile file) throws IOException {
        return getThumbnailPath(file, true);
    }

    public Path getThumbnailPath(ImageFile file, boolean createIfMissing) throws IOException {
        int size = 300;

        Path thumbPath = Paths.get(baseFolder, "thumbnails", file.getFolder().getId().toString(),
                file.getId() + ".jpg");

        if (createIfMissing && !Files.exists(thumbPath)) {
            Files.createDirectories(thumbPath.getParent());
            Path rawPath = Paths.get(baseImageFolder, file.getFolder().getFolderName(), file.getOrgName());
            if (Files.exists(rawPath)) {
                createThumbnail(rawPath.toFile(), thumbPath.toFile(), size, size);
            } else {
                // If raw file doesn't exist, we can't create thumbnail
                log.warn("Original image not found, cannot create thumbnail: {}", rawPath);
            }
        }

        return thumbPath;
    }

    public void createThumbnail(File source, File target, int width, int height) throws IOException {
        Thumbnails.of(source)
                .size(width, height)
                .toFile(target);
    }

    public Path exportAsPdf(List<Long> ids) {
        Path tempFile;
        try {
            tempFile = Files.createTempFile("sofia_export_", ".pdf");
        } catch (IOException e) {
            throw new RuntimeException("Failed to create temporary file for PDF export", e);
        }

        try (PDDocument document = new PDDocument()) {
            for (Long id : ids) {
                ImageFile imageFile = findImageOrThrow(id);
                if (imageFile.getFolder() == null)
                    continue;

                Path imagePath = Paths.get(baseImageFolder, imageFile.getFolder().getFolderName(),
                        imageFile.getOrgName());

                if (!Files.exists(imagePath)) {
                    log.warn("Image file not found for PDF export: {}", imagePath);
                    continue;
                }

                try {
                    PDImageXObject pdImage;
                    String ext = imageFile.getImageFormat().toLowerCase();
                    if (ext.equals("jpg") || ext.equals("jpeg")) {
                        pdImage = JPEGFactory.createFromStream(document, Files.newInputStream(imagePath));
                    } else {
                        BufferedImage bim = ImageIO.read(imagePath.toFile());
                        if (bim == null) {
                            log.warn("Could not read image for PDF export: {}", imagePath);
                            continue;
                        }
                        pdImage = LosslessFactory.createFromImage(document, bim);
                    }

                    // Scale to fit A4
                    PDRectangle mediaBox = PDRectangle.A4;
                    // Handle landscape images by rotating page if width > height
                    if (pdImage.getWidth() > pdImage.getHeight()) {
                        mediaBox = new PDRectangle(PDRectangle.A4.getHeight(), PDRectangle.A4.getWidth());
                    }

                    PDPage page = new PDPage(mediaBox);
                    document.addPage(page);

                    try (PDPageContentStream contentStream = new PDPageContentStream(document, page)) {
                        float pageWidth = mediaBox.getWidth();
                        float pageHeight = mediaBox.getHeight();
                        float imgWidth = pdImage.getWidth();
                        float imgHeight = pdImage.getHeight();

                        float scale = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
                        float dw = imgWidth * scale;
                        float dh = imgHeight * scale;
                        float x = (pageWidth - dw) / 2;
                        float y = (pageHeight - dh) / 2;

                        contentStream.drawImage(pdImage, x, y, dw, dh);
                    }
                } catch (Exception e) {
                    log.error("Error adding image {} to PDF: {}", imagePath, e.getMessage());
                }
            }
            document.save(tempFile.toFile());
            return tempFile;
        } catch (IOException e) {
            log.error("Failed to generate PDF: {}", e.getMessage());
            try {
                Files.deleteIfExists(tempFile);
            } catch (IOException ex) {
                // Ignore
            }
            throw new RuntimeException("Failed to generate PDF export", e);
        }
    }
}
