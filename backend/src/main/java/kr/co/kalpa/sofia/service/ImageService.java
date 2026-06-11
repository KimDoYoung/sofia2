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
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
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

    public Path exportAsMergedImage(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            throw new IllegalArgumentException("No images selected for merge");
        }

        Path tempFile;
        try {
            tempFile = Files.createTempFile("sofia_merge_", ".jpg");
        } catch (IOException e) {
            throw new RuntimeException("Failed to create temporary file for merged image export", e);
        }

        int N = ids.size();
        int cols, rows;
        if (N == 1) { cols = 1; rows = 1; }
        else if (N == 2) { cols = 1; rows = 2; }
        else if (N <= 4) { cols = 2; rows = 2; }
        else if (N <= 6) { cols = 2; rows = 3; }
        else if (N <= 9) { cols = 3; rows = 3; }
        else if (N <= 12) { cols = 3; rows = 4; }
        else if (N <= 16) { cols = 4; rows = 4; }
        else if (N <= 20) { cols = 4; rows = 5; }
        else if (N <= 25) { cols = 5; rows = 5; }
        else if (N <= 30) { cols = 5; rows = 6; }
        else {
            cols = (int) Math.ceil(Math.sqrt(N / 1.414));
            rows = (int) Math.ceil((double) N / cols);
        }

        // A4 Portrait dimensions: 2480 x 3508 pixels
        int canvasWidth = 2480;
        int canvasHeight = 3508;

        BufferedImage mergedImage = new BufferedImage(canvasWidth, canvasHeight, BufferedImage.TYPE_INT_RGB);
        Graphics2D g2d = mergedImage.createGraphics();

        try {
            // Fill background with white
            g2d.setColor(Color.WHITE);
            g2d.fillRect(0, 0, canvasWidth, canvasHeight);

            // High-quality rendering settings
            g2d.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            g2d.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

            int cellWidth = canvasWidth / cols;
            int cellHeight = canvasHeight / rows;
            
            // 5% margin
            int marginX = (int) (cellWidth * 0.05);
            int marginY = (int) (cellHeight * 0.05);
            int maxWidth = cellWidth - 2 * marginX;
            int maxHeight = cellHeight - 2 * marginY;

            for (int i = 0; i < N; i++) {
                Long id = ids.get(i);
                ImageFile imageFile = findImageOrThrow(id);
                if (imageFile.getFolder() == null) continue;

                Path imagePath = Paths.get(baseImageFolder, imageFile.getFolder().getFolderName(),
                        imageFile.getOrgName());

                if (!Files.exists(imagePath)) {
                    log.warn("Image file not found for merge: {}", imagePath);
                    continue;
                }

                try {
                    BufferedImage img = ImageIO.read(imagePath.toFile());
                    if (img == null) {
                        log.warn("Could not read image for merge: {}", imagePath);
                        continue;
                    }

                    double scale = Math.min((double) maxWidth / img.getWidth(), (double) maxHeight / img.getHeight());
                    int drawWidth = (int) (img.getWidth() * scale);
                    int drawHeight = (int) (img.getHeight() * scale);

                    int colIdx = i % cols;
                    int rowIdx = i / cols;

                    int x = colIdx * cellWidth + (cellWidth - drawWidth) / 2;
                    int y = rowIdx * cellHeight + (cellHeight - drawHeight) / 2;

                    g2d.drawImage(img, x, y, drawWidth, drawHeight, null);
                } catch (Exception e) {
                    log.error("Error drawing image {} to merged canvas: {}", imagePath, e.getMessage());
                }
            }
        } finally {
            g2d.dispose();
        }

        try {
            // Write output as JPEG
            ImageIO.write(mergedImage, "jpg", tempFile.toFile());
            return tempFile;
        } catch (IOException e) {
            log.error("Failed to save merged image: {}", e.getMessage());
            try {
                Files.deleteIfExists(tempFile);
            } catch (IOException ex) {
                // Ignore
            }
            throw new RuntimeException("Failed to generate merged image export", e);
        }
    }
}
