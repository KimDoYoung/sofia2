package kr.co.kalpa.sofia.service;

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
import javax.imageio.ImageIO;
import kr.co.kalpa.sofia.domain.ImageFile;
import kr.co.kalpa.sofia.domain.ImageFolder;
import kr.co.kalpa.sofia.dto.ImageExportRequest;
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
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

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
        ImageFolder folder =
                imageFolderRepository
                        .findById(folderId)
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

        ImageFile imageFile =
                ImageFile.builder()
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
                throw new RuntimeException(
                        "Cannot rename image: No associated folder found for image ID " + id);
            }

            Path oldPath =
                    Paths.get(
                            baseImageFolder, image.getFolder().getFolderName(), image.getOrgName());
            Path newPath =
                    Paths.get(
                            baseImageFolder,
                            image.getFolder().getFolderName(),
                            request.getOrgName());

            try {
                if (!Files.exists(oldPath)) {
                    log.error("Original file missing on disk, cannot rename: {}", oldPath);
                    throw new RuntimeException(
                            "Original file missing on disk, cannot perform rename.");
                }

                if (Files.exists(newPath)) {
                    throw new RuntimeException(
                            "A file with the new name already exists: " + request.getOrgName());
                }

                Files.move(oldPath, newPath);
                image.setOrgName(request.getOrgName());
            } catch (IOException e) {
                log.error(
                        "Failed to rename physical file from {} to {}: {}",
                        oldPath,
                        newPath,
                        e.getMessage());
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
            Path rawPath =
                    Paths.get(
                            baseImageFolder, image.getFolder().getFolderName(), image.getOrgName());
            try {
                Files.deleteIfExists(rawPath);
                Files.deleteIfExists(getThumbnailPath(image, false));
            } catch (IOException e) {
                log.error(
                        "Failed to delete physical files for image id {}: {}", id, e.getMessage());
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
                Path rawPath =
                        Paths.get(
                                baseImageFolder,
                                image.getFolder().getFolderName(),
                                image.getOrgName());
                if (Files.exists(rawPath)) {
                    createThumbnail(rawPath.toFile(), thumbPath.toFile(), 300, 300, newAngle);
                }
            } catch (IOException e) {
                throw new RuntimeException("Failed to rotate image: " + id, e);
            }
        }
    }

    private ImageFile findImageOrThrow(Long id) {
        return imageFileRepository
                .findById(id)
                .orElseThrow(() -> new RuntimeException("Image not found: " + id));
    }

    public Path getThumbnailPath(ImageFile file) throws IOException {
        return getThumbnailPath(file, true);
    }

    public Path getThumbnailPath(ImageFile file, boolean createIfMissing) throws IOException {
        int size = 300;

        Path thumbPath =
                Paths.get(
                        baseFolder,
                        "thumbnails",
                        file.getFolder().getId().toString(),
                        file.getId() + ".jpg");

        if (createIfMissing && !Files.exists(thumbPath)) {
            Files.createDirectories(thumbPath.getParent());
            Path rawPath =
                    Paths.get(baseImageFolder, file.getFolder().getFolderName(), file.getOrgName());
            if (Files.exists(rawPath)) {
                createThumbnail(
                        rawPath.toFile(),
                        thumbPath.toFile(),
                        size,
                        size,
                        file.getRotationAngle() != null ? file.getRotationAngle() : 0);
            } else {
                // If raw file doesn't exist, we can't create thumbnail
                log.warn("Original image not found, cannot create thumbnail: {}", rawPath);
            }
        }

        return thumbPath;
    }

    public void createThumbnail(File source, File target, int width, int height, int rotationAngle)
            throws IOException {
        var builder = Thumbnails.of(source).size(width, height);
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
        if (imagesPerPage == 2) {
            cols = 1;
            rows = 2;
        } else if (imagesPerPage == 4) {
            cols = 2;
            rows = 2;
        } else if (imagesPerPage == 6) {
            cols = 2;
            rows = 3;
        }

        List<Path> tempImages = new java.util.ArrayList<>();
        try (PDDocument document = new PDDocument()) {
            int N = ids.size();
            int i = 0;

            while (i < N) {
                // Determine page size / orientation
                PDRectangle mediaBox = PDRectangle.A4;
                if ("landscape".equals(orientation)) {
                    mediaBox =
                            new PDRectangle(PDRectangle.A4.getHeight(), PDRectangle.A4.getWidth());
                } else if ("portrait".equals(orientation)) {
                    mediaBox = PDRectangle.A4;
                } else {
                    // "auto"
                    if (imagesPerPage == 1) {
                        ImageFile firstImg = findImageOrThrow(ids.get(i));
                        int rotAngle =
                                firstImg.getRotationAngle() != null
                                        ? firstImg.getRotationAngle()
                                        : 0;
                        int w = firstImg.getImageWidth();
                        int h = firstImg.getImageHeight();
                        if (rotAngle == 90 || rotAngle == 270) {
                            int temp = w;
                            w = h;
                            h = temp;
                        }
                        if (w > h) {
                            mediaBox =
                                    new PDRectangle(
                                            PDRectangle.A4.getHeight(), PDRectangle.A4.getWidth());
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

                        Path imagePath =
                                Paths.get(
                                        baseImageFolder,
                                        imageFile.getFolder().getFolderName(),
                                        imageFile.getOrgName());

                        if (!Files.exists(imagePath)) {
                            log.warn("Image file not found for PDF export: {}", imagePath);
                            cellIdx--; // don't count this cell
                            continue;
                        }

                        try {
                            int rotAngle =
                                    imageFile.getRotationAngle() != null
                                            ? imageFile.getRotationAngle()
                                            : 0;

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
                            log.error(
                                    "Error adding image {} to PDF cell: {}",
                                    imagePath,
                                    e.getMessage());
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

    private static class ImageMergeItem {
        Long id;
        Path path;
        int rotAngle;
        int origW;
        int origH;
        int slotW;
        int scaledW;
        int scaledH;
        int drawX;
        int drawY;
    }

    private java.awt.Dimension getImageDimension(Path imagePath, int rotAngle) {
        try (javax.imageio.stream.ImageInputStream in =
                ImageIO.createImageInputStream(imagePath.toFile())) {
            if (in != null) {
                java.util.Iterator<javax.imageio.ImageReader> readers = ImageIO.getImageReaders(in);
                if (readers.hasNext()) {
                    javax.imageio.ImageReader reader = readers.next();
                    try {
                        reader.setInput(in);
                        int w = reader.getWidth(0);
                        int h = reader.getHeight(0);
                        if (rotAngle == 90 || rotAngle == 270) {
                            return new java.awt.Dimension(h, w);
                        } else {
                            return new java.awt.Dimension(w, h);
                        }
                    } finally {
                        reader.dispose();
                    }
                }
            }
        } catch (Exception e) {
            log.warn(
                    "ImageReader failed for {}, falling back to ImageIO.read: {}",
                    imagePath,
                    e.getMessage());
        }

        try {
            BufferedImage bi = ImageIO.read(imagePath.toFile());
            if (bi != null) {
                int w = bi.getWidth();
                int h = bi.getHeight();
                bi.flush();
                if (rotAngle == 90 || rotAngle == 270) {
                    return new java.awt.Dimension(h, w);
                } else {
                    return new java.awt.Dimension(w, h);
                }
            }
        } catch (Exception e) {
            log.error("Failed to read image dimension for {}: {}", imagePath, e.getMessage());
        }
        return null;
    }

    public Path exportAsMergedImage(
            List<Long> ids, String mode, Integer colsParam, Integer gapParam) {
        ImageExportRequest req = new ImageExportRequest();
        req.setIds(ids);
        req.setMode(mode);
        req.setCols(colsParam);
        req.setGapX(gapParam);
        req.setGapY(gapParam);
        return exportAsMergedImage(req);
    }

    public Path exportAsMergedImage(ImageExportRequest request) {
        if (request == null || request.getIds() == null || request.getIds().isEmpty()) {
            throw new IllegalArgumentException("No images selected for merge");
        }

        List<Long> ids = request.getIds();
        int cols = request.getCols() != null ? Math.max(1, Math.min(4, request.getCols())) : 2;
        int gapX =
                request.getGapX() != null
                        ? Math.max(0, request.getGapX())
                        : (request.getGap() != null ? Math.max(0, request.getGap()) : 0);
        int gapY =
                request.getGapY() != null
                        ? Math.max(0, request.getGapY())
                        : (request.getGap() != null ? Math.max(0, request.getGap()) : 0);

        // 1. 이미지 메타데이터 및 유효 이미지 로드
        List<ImageMergeItem> items = new java.util.ArrayList<>();
        for (Long id : ids) {
            ImageFile imageFile = findImageOrThrow(id);
            if (imageFile.getFolder() == null) continue;

            Path imagePath =
                    Paths.get(
                            baseImageFolder,
                            imageFile.getFolder().getFolderName(),
                            imageFile.getOrgName());

            if (!Files.exists(imagePath)) {
                log.warn("Image file not found for merge: {}", imagePath);
                continue;
            }

            int rotAngle = imageFile.getRotationAngle() != null ? imageFile.getRotationAngle() : 0;
            java.awt.Dimension dim = getImageDimension(imagePath, rotAngle);
            if (dim == null || dim.width <= 0 || dim.height <= 0) {
                log.warn("Invalid dimensions for image: {}", imagePath);
                continue;
            }

            ImageMergeItem item = new ImageMergeItem();
            item.id = id;
            item.path = imagePath;
            item.rotAngle = rotAngle;
            item.origW = dim.width;
            item.origH = dim.height;
            items.add(item);
        }

        if (items.isEmpty()) {
            throw new IllegalArgumentException("No valid images found for merge");
        }

        // 2. Row 그룹화 (지정된 cols 개수만큼 행으로 묶음)
        List<List<ImageMergeItem>> rows = new java.util.ArrayList<>();
        for (int i = 0; i < items.size(); i += cols) {
            int end = Math.min(i + cols, items.size());
            rows.add(new java.util.ArrayList<>(items.subList(i, end)));
        }

        // 3. 기준 너비 W 결정
        String widthMode = request.getWidthMode() != null ? request.getWidthMode() : "A4";
        int canvasWidth;
        if ("original".equalsIgnoreCase(widthMode)) {
            int maxRowOrigW = 0;
            for (List<ImageMergeItem> row : rows) {
                int rowW = 0;
                for (ImageMergeItem it : row) {
                    rowW += it.origW;
                }
                rowW += (row.size() - 1) * gapX;
                if (rowW > maxRowOrigW) {
                    maxRowOrigW = rowW;
                }
            }
            canvasWidth = Math.max(200, maxRowOrigW);
        } else if ("1900".equalsIgnoreCase(widthMode)) {
            canvasWidth = 1900;
        } else if ("custom".equalsIgnoreCase(widthMode)) {
            canvasWidth =
                    (request.getCustomWidth() != null && request.getCustomWidth() > 0)
                            ? request.getCustomWidth()
                            : 2048;
        } else {
            // A4: 2048px (사용자 요구사항 명시)
            canvasWidth = 2048;
        }

        // 4. 각 Row 및 각 이미지의 크기와 위치 계산
        int currentY = 0;
        for (List<ImageMergeItem> row : rows) {
            int k = row.size();
            int availW = Math.max(k, canvasWidth - (k - 1) * gapX);
            int baseSlotW = availW / k;
            int remainder = availW % k;

            int rowH = 0;
            // 1단계: 각 이미지의 리사이즈 크기 계산
            for (int j = 0; j < k; j++) {
                ImageMergeItem it = row.get(j);
                int slotW = baseSlotW + (j < remainder ? 1 : 0);
                it.slotW = slotW;

                // 원본 너비가 슬롯 너비보다 크면 축소, 작거나 같으면 원본 유지
                if (it.origW > slotW) {
                    it.scaledW = slotW;
                    it.scaledH =
                            Math.max(1, (int) Math.round((double) it.origH * slotW / it.origW));
                } else {
                    it.scaledW = it.origW;
                    it.scaledH = it.origH;
                }
                if (it.scaledH > rowH) {
                    rowH = it.scaledH;
                }
            }

            // 2단계: 각 이미지의 X, Y 좌표 계산
            int currentSlotX = 0;
            for (int j = 0; j < k; j++) {
                ImageMergeItem it = row.get(j);
                // 슬롯 내 가로 중앙 정렬 (원본 유지 시 slotW보다 작은 경우 가운데 배치)
                it.drawX = currentSlotX + (it.slotW - it.scaledW) / 2;
                // 행 높이 내 세로 중앙 정렬
                it.drawY = currentY + (rowH - it.scaledH) / 2;

                currentSlotX += it.slotW + gapX;
            }

            currentY += rowH + gapY;
        }

        // 전체 캔버스 높이 (마지막 row 뒤의 gapY 제외)
        int canvasHeight = Math.max(10, currentY - (rows.isEmpty() ? 0 : gapY));

        // 5. 캔버스 생성 및 렌더링
        BufferedImage mergedImage =
                new BufferedImage(canvasWidth, canvasHeight, BufferedImage.TYPE_INT_RGB);
        Graphics2D g2d = mergedImage.createGraphics();

        Path tempFile;
        try {
            tempFile = Files.createTempFile("sofia_merge_", ".jpg");
        } catch (IOException e) {
            throw new RuntimeException(
                    "Failed to create temporary file for merged image export", e);
        }

        try {
            g2d.setColor(Color.WHITE);
            g2d.fillRect(0, 0, canvasWidth, canvasHeight);

            g2d.setRenderingHint(
                    RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            g2d.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            g2d.setRenderingHint(
                    RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

            boolean applyBorder = Boolean.TRUE.equals(request.getBorder());
            int bWidth =
                    (request.getBorderWidth() != null
                                    && request.getBorderWidth() >= 1
                                    && request.getBorderWidth() <= 4)
                            ? request.getBorderWidth()
                            : 1;
            Color bColor = Color.BLACK;
            if (request.getBorderColor() != null
                    && request.getBorderColor().trim().startsWith("#")) {
                try {
                    bColor = Color.decode(request.getBorderColor().trim());
                } catch (Exception ignored) {
                }
            }

            for (ImageMergeItem it : items) {
                try {
                    BufferedImage scaled =
                            Thumbnails.of(it.path.toFile())
                                    .rotate(it.rotAngle)
                                    .forceSize(it.scaledW, it.scaledH)
                                    .asBufferedImage();

                    g2d.drawImage(scaled, it.drawX, it.drawY, null);
                    scaled.flush();

                    if (applyBorder) {
                        g2d.setColor(bColor);
                        for (int b = 0; b < bWidth; b++) {
                            g2d.drawRect(
                                    it.drawX + b,
                                    it.drawY + b,
                                    it.scaledW - 1 - (2 * b),
                                    it.scaledH - 1 - (2 * b));
                        }
                    }
                } catch (Exception e) {
                    log.error("Failed to render image {} to canvas: {}", it.path, e.getMessage());
                }
            }
        } finally {
            g2d.dispose();
        }

        try {
            ImageIO.write(mergedImage, "jpg", tempFile.toFile());
            mergedImage.flush();
            return tempFile;
        } catch (IOException e) {
            log.error("Failed to save merged image: {}", e.getMessage());
            try {
                Files.deleteIfExists(tempFile);
            } catch (IOException ignored) {
            }
            throw new RuntimeException("Failed to generate merged image export", e);
        }
    }

    public byte[] getRotatedImageBytes(ImageFile file) throws IOException {
        Path rawPath =
                Paths.get(baseImageFolder, file.getFolder().getFolderName(), file.getOrgName());
        BufferedImage rotated =
                Thumbnails.of(rawPath.toFile())
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
