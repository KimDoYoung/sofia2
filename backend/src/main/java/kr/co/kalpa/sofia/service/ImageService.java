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
            try {
                // Update rotation angle virtually
                int currentAngle = image.getRotationAngle() != null ? image.getRotationAngle() : 0;
                int newAngle = (currentAngle + angle) % 360;
                if (newAngle < 0) {
                    newAngle += 360;
                }
                image.setRotationAngle(newAngle);
                imageFileRepository.save(image);

                // Delete the cached thumbnail file to trigger recreation
                Path thumbPath = getThumbnailPath(image, false);
                Files.deleteIfExists(thumbPath);

                // Recreate thumbnail with the new rotation angle
                Path rawPath = Paths.get(baseImageFolder, image.getFolder().getFolderName(), image.getOrgName());
                if (Files.exists(rawPath)) {
                    createThumbnail(rawPath.toFile(), thumbPath.toFile(), 300, 300, newAngle);
                }
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
                createThumbnail(rawPath.toFile(), thumbPath.toFile(), size, size, file.getRotationAngle() != null ? file.getRotationAngle() : 0);
            } else {
                // If raw file doesn't exist, we can't create thumbnail
                log.warn("Original image not found, cannot create thumbnail: {}", rawPath);
            }
        }

        return thumbPath;
    }

    public void createThumbnail(File source, File target, int width, int height, int rotationAngle) throws IOException {
        var builder = Thumbnails.of(source)
                .size(width, height);
        if (rotationAngle != 0) {
            builder = builder.rotate(rotationAngle);
        }
        builder.toFile(target);
    }


    public Path exportAsPdf(List<Long> ids, Integer imagesPerPageParam, String orientationParam) {
        Path tempFile;
        try {
            tempFile = Files.createTempFile("sofia_export_", ".pdf");
        } catch (IOException e) {
            throw new RuntimeException("Failed to create temporary file for PDF export", e);
        }

        int imagesPerPage = imagesPerPageParam != null ? imagesPerPageParam : 1;
        String orientation = orientationParam != null ? orientationParam : "auto";

        int cols = 1;
        int rows = 1;
        if (imagesPerPage == 2) { cols = 1; rows = 2; }
        else if (imagesPerPage == 4) { cols = 2; rows = 2; }
        else if (imagesPerPage == 6) { cols = 2; rows = 3; }

        List<Path> tempImages = new java.util.ArrayList<>();
        try (PDDocument document = new PDDocument()) {
            int N = ids.size();
            int i = 0;

            while (i < N) {
                // Determine page size / orientation
                PDRectangle mediaBox = PDRectangle.A4;
                if ("landscape".equals(orientation)) {
                    mediaBox = new PDRectangle(PDRectangle.A4.getHeight(), PDRectangle.A4.getWidth());
                } else if ("portrait".equals(orientation)) {
                    mediaBox = PDRectangle.A4;
                } else {
                    // "auto"
                    if (imagesPerPage == 1) {
                        ImageFile firstImg = findImageOrThrow(ids.get(i));
                        int rotAngle = firstImg.getRotationAngle() != null ? firstImg.getRotationAngle() : 0;
                        int w = firstImg.getImageWidth();
                        int h = firstImg.getImageHeight();
                        if (rotAngle == 90 || rotAngle == 270) {
                            int temp = w;
                            w = h;
                            h = temp;
                        }
                        if (w > h) {
                            mediaBox = new PDRectangle(PDRectangle.A4.getHeight(), PDRectangle.A4.getWidth());
                        }
                    } else {
                        mediaBox = PDRectangle.A4;
                    }
                }

                PDPage page = new PDPage(mediaBox);
                document.addPage(page);

                try (PDPageContentStream contentStream = new PDPageContentStream(document, page)) {
                    float pageWidth = mediaBox.getWidth();
                    float pageHeight = mediaBox.getHeight();
                    float cellWidth = pageWidth / cols;
                    float cellHeight = pageHeight / rows;

                    // 5% margin
                    float marginX = cellWidth * 0.05f;
                    float marginY = cellHeight * 0.05f;
                    float maxWidth = cellWidth - 2 * marginX;
                    float maxHeight = cellHeight - 2 * marginY;

                    for (int cellIdx = 0; cellIdx < imagesPerPage && i < N; cellIdx++, i++) {
                        Long id = ids.get(i);
                        ImageFile imageFile = findImageOrThrow(id);
                        if (imageFile.getFolder() == null) {
                            cellIdx--; // don't count this cell
                            continue;
                        }

                        Path imagePath = Paths.get(baseImageFolder, imageFile.getFolder().getFolderName(),
                                imageFile.getOrgName());

                        if (!Files.exists(imagePath)) {
                            log.warn("Image file not found for PDF export: {}", imagePath);
                            cellIdx--; // don't count this cell
                            continue;
                        }

                        try {
                            int rotAngle = imageFile.getRotationAngle() != null ? imageFile.getRotationAngle() : 0;

                            // 1. Create a scaled temporary image file in tmp
                            Path scaledTempFile = Files.createTempFile("sofia_scaled_", ".jpg");
                            tempImages.add(scaledTempFile);

                            // Scale keeping aspect ratio (contain)
                            Thumbnails.of(imagePath.toFile())
                                    .size((int) maxWidth, (int) maxHeight)
                                    .rotate(rotAngle)
                                    .outputFormat("jpg")
                                    .toFile(scaledTempFile.toFile());

                            // 2. Load the scaled temporary image into PDFBox
                            PDImageXObject pdImage;
                            try (java.io.InputStream is = Files.newInputStream(scaledTempFile)) {
                                pdImage = JPEGFactory.createFromStream(document, is);
                            }

                            float imgWidth = pdImage.getWidth();
                            float imgHeight = pdImage.getHeight();

                            // Place centered in cell
                            int col = cellIdx % cols;
                            int row = cellIdx / cols;
                            int pdfRow = rows - 1 - row; 

                            float x = col * cellWidth + (cellWidth - imgWidth) / 2;
                            float y = pdfRow * cellHeight + (cellHeight - imgHeight) / 2;

                            contentStream.drawImage(pdImage, x, y, imgWidth, imgHeight);
                        } catch (Exception e) {
                            log.error("Error adding image {} to PDF cell: {}", imagePath, e.getMessage());
                            cellIdx--;
                        }
                    }
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
        } finally {
            // Clean up temporary scaled images
            for (Path p : tempImages) {
                try {
                    Files.deleteIfExists(p);
                } catch (IOException ex) {
                    log.warn("Failed to delete temporary scaled image: {}", p, ex);
                }
            }
        }
    }

    public Path exportAsMergedImage(List<Long> ids, String mode, Integer colsParam, Integer gapParam) {
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
        String activeMode = mode != null ? mode : "fitPage";
        int cols, rows;
        int canvasWidth, canvasHeight;
        int cellWidth, cellHeight;

        if ("scroll".equals(activeMode)) {
            cols = colsParam != null && colsParam > 0 ? colsParam : 1;
            rows = (int) Math.ceil((double) N / cols);
            cellWidth = 1240;
            cellHeight = 1754;
            canvasWidth = cols * cellWidth;
            canvasHeight = rows * cellHeight;
        } else {
            // fitPage
            canvasWidth = 2480;
            canvasHeight = 3508;
            if (colsParam != null && colsParam > 0) {
                cols = colsParam;
            } else {
                if (N == 1) { cols = 1; }
                else if (N == 2) { cols = 1; }
                else if (N <= 4) { cols = 2; }
                else if (N <= 6) { cols = 2; }
                else if (N <= 9) { cols = 3; }
                else if (N <= 12) { cols = 3; }
                else if (N <= 16) { cols = 4; }
                else if (N <= 20) { cols = 4; }
                else if (N <= 25) { cols = 5; }
                else if (N <= 30) { cols = 5; }
                else {
                    cols = (int) Math.ceil(Math.sqrt(N / 1.414));
                }
            }
            rows = (int) Math.ceil((double) N / cols);
            cellWidth = canvasWidth / cols;
            cellHeight = rows > 0 ? canvasHeight / rows : canvasHeight;
        }

        int gap = gapParam != null ? gapParam : 2;
        int padding = gap / 2;

        BufferedImage mergedImage = new BufferedImage(canvasWidth, canvasHeight, BufferedImage.TYPE_INT_RGB);
        Graphics2D g2d = mergedImage.createGraphics();
        List<Path> tempImages = new java.util.ArrayList<>();

        try {
            // Fill background with white
            g2d.setColor(Color.WHITE);
            g2d.fillRect(0, 0, canvasWidth, canvasHeight);

            // High-quality rendering settings
            g2d.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            g2d.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

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
                    int colIdx = i % cols;
                    int rowIdx = i / cols;

                    int x = colIdx * cellWidth + padding;
                    int y = rowIdx * cellHeight + padding;
                    int w = cellWidth - 2 * padding;
                    int h = cellHeight - 2 * padding;

                    int rotAngle = imageFile.getRotationAngle() != null ? imageFile.getRotationAngle() : 0;

                    // 1. Create a scaled temporary image file in tmp
                    Path scaledTempFile = Files.createTempFile("sofia_scaled_merge_", ".jpg");
                    tempImages.add(scaledTempFile);

                    // Scale keeping aspect ratio (contain)
                    Thumbnails.of(imagePath.toFile())
                            .size(w, h)
                            .rotate(rotAngle)
                            .outputFormat("jpg")
                            .toFile(scaledTempFile.toFile());

                    // 2. Read the scaled temporary image
                    BufferedImage img = ImageIO.read(scaledTempFile.toFile());
                    if (img == null) {
                        log.warn("Could not read scaled image for merge: {}", scaledTempFile);
                        continue;
                    }

                    // Draw centered inside the cell (no crop, no distortion)
                    int drawX = x + (w - img.getWidth()) / 2;
                    int drawY = y + (h - img.getHeight()) / 2;

                    g2d.drawImage(img, drawX, drawY, null);
                } catch (Exception e) {
                    log.error("Error drawing image {} to merged canvas: {}", imagePath, e.getMessage());
                }
            }
        } finally {
            g2d.dispose();
            // Clean up temporary scaled images
            for (Path p : tempImages) {
                try {
                    Files.deleteIfExists(p);
                } catch (IOException ex) {
                    log.warn("Failed to delete temporary scaled image: {}", p, ex);
                }
            }
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

    public byte[] getRotatedImageBytes(ImageFile file) throws IOException {
        Path rawPath = Paths.get(baseImageFolder, file.getFolder().getFolderName(), file.getOrgName());
        BufferedImage rotated = Thumbnails.of(rawPath.toFile())
                .scale(1.0)
                .rotate(file.getRotationAngle() != null ? file.getRotationAngle() : 0)
                .asBufferedImage();
        
        java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
        String format = file.getImageFormat();
        if (format == null || format.trim().isEmpty()) {
            format = "jpg";
        }
        ImageIO.write(rotated, format, baos);
        return baos.toByteArray();
    }
}
