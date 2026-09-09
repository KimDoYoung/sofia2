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
import net.coobird.thumbnailator.geometry.Positions;
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

    private static class PdfCell {
        float x;
        float y;
        float w;
        float h;

        PdfCell(float x, float y, float w, float h) {
            this.x = x;
            this.y = y;
            this.w = w;
            this.h = h;
        }
    }

    private List<PdfCell> calculatePdfCells(
            String layout,
            int count,
            float availX,
            float availY,
            float availW,
            float availH,
            float gap,
            boolean isLandscape) {
        List<PdfCell> cells = new java.util.ArrayList<>();
        if ("1".equals(layout) || count == 1) {
            cells.add(new PdfCell(availX, availY, availW, availH));
        } else if ("2-v".equals(layout)) {
            // 상하 2분할 (1열 2행)
            float cellH = Math.max(10, (availH - gap) / 2.0f);
            cells.add(new PdfCell(availX, availY + cellH + gap, availW, cellH)); // 상단 (0번)
            cells.add(new PdfCell(availX, availY, availW, cellH)); // 하단 (1번)
        } else if ("2-h".equals(layout)) {
            // 좌우 2분할 (2열 1행)
            float cellW = Math.max(10, (availW - gap) / 2.0f);
            cells.add(new PdfCell(availX, availY, cellW, availH)); // 좌측 (0번)
            cells.add(new PdfCell(availX + cellW + gap, availY, cellW, availH)); // 우측 (1번)
        } else if ("3".equals(layout)) {
            if (count >= 3) {
                // 상단 2장 (좌/우) + 하단 1장 (가로 100% 꽉 채움)
                float rowH = Math.max(10, (availH - gap) / 2.0f);
                float halfW = Math.max(10, (availW - gap) / 2.0f);
                cells.add(new PdfCell(availX, availY + rowH + gap, halfW, rowH)); // 상좌 (0번)
                cells.add(
                        new PdfCell(
                                availX + halfW + gap, availY + rowH + gap, halfW, rowH)); // 상우 (1번)
                cells.add(new PdfCell(availX, availY, availW, rowH)); // 하단 전체 (2번)
            } else if (count == 2) {
                float cellH = Math.max(10, (availH - gap) / 2.0f);
                cells.add(new PdfCell(availX, availY + cellH + gap, availW, cellH));
                cells.add(new PdfCell(availX, availY, availW, cellH));
            } else {
                cells.add(new PdfCell(availX, availY, availW, availH));
            }
        } else if ("4".equals(layout)) {
            // 2 x 2 격자
            float rowH = Math.max(10, (availH - gap) / 2.0f);
            float colW = Math.max(10, (availW - gap) / 2.0f);
            cells.add(new PdfCell(availX, availY + rowH + gap, colW, rowH)); // 상좌
            cells.add(new PdfCell(availX + colW + gap, availY + rowH + gap, colW, rowH)); // 상우
            cells.add(new PdfCell(availX, availY, colW, rowH)); // 하좌
            cells.add(new PdfCell(availX + colW + gap, availY, colW, rowH)); // 하우
        } else if ("6".equals(layout)) {
            int cols = isLandscape ? 3 : 2;
            int rows = isLandscape ? 2 : 3;
            float colW = Math.max(10, (availW - (cols - 1) * gap) / (float) cols);
            float rowH = Math.max(10, (availH - (rows - 1) * gap) / (float) rows);
            for (int r = 0; r < rows; r++) {
                int pdfRow = rows - 1 - r; // 위에서 아래로
                for (int c = 0; c < cols; c++) {
                    cells.add(
                            new PdfCell(
                                    availX + c * (colW + gap),
                                    availY + pdfRow * (rowH + gap),
                                    colW,
                                    rowH));
                }
            }
        } else {
            cells.add(new PdfCell(availX, availY, availW, availH));
        }
        return cells;
    }

    public Path exportAsPdf(List<Long> ids, Integer imagesPerPageParam, String orientationParam) {
        ImageExportRequest req = new ImageExportRequest();
        req.setIds(ids);
        req.setImagesPerPage(imagesPerPageParam);
        req.setOrientation(orientationParam);
        return exportAsPdf(req);
    }

    public Path exportAsPdf(ImageExportRequest request) {
        if (request == null || request.getIds() == null || request.getIds().isEmpty()) {
            throw new IllegalArgumentException("No images selected for PDF export");
        }

        List<Long> ids = request.getIds();
        String layout = request.getPdfLayout();
        if (layout == null || layout.trim().isEmpty()) {
            if (request.getImagesPerPage() != null) {
                int p = request.getImagesPerPage();
                if (p == 2) layout = "2-v";
                else if (p == 4) layout = "4";
                else if (p == 6) layout = "6";
                else layout = "1";
            } else {
                layout = "1";
            }
        }

        String orientation = request.getOrientation() != null ? request.getOrientation() : "auto";
        String fitMode = request.getFitMode() != null ? request.getFitMode() : "contain";
        float pageMargin =
                request.getPageMargin() != null
                        ? Math.max(0, request.getPageMargin().floatValue())
                        : 10.0f;
        float gap = request.getGap() != null ? Math.max(0, request.getGap().floatValue()) : 0.0f;

        boolean applyBorder = Boolean.TRUE.equals(request.getBorder());
        float borderWidth =
                (request.getBorderWidth() != null
                                && request.getBorderWidth() >= 1
                                && request.getBorderWidth() <= 4)
                        ? request.getBorderWidth().floatValue()
                        : 1.0f;
        float r = 0.0f, g = 0.0f, b = 0.0f;
        if (request.getBorderColor() != null && request.getBorderColor().trim().startsWith("#")) {
            try {
                Color c = Color.decode(request.getBorderColor().trim());
                r = c.getRed() / 255.0f;
                g = c.getGreen() / 255.0f;
                b = c.getBlue() / 255.0f;
            } catch (Exception ignored) {
            }
        }

        // 1. 유효 이미지 수집
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
                log.warn("Image file not found for PDF export: {}", imagePath);
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
            throw new IllegalArgumentException("No valid images found for PDF export");
        }

        // 2. 페이지당 이미지 수 결정
        int itemsPerPage = 1;
        if ("2-v".equals(layout) || "2-h".equals(layout)) {
            itemsPerPage = 2;
        } else if ("3".equals(layout)) {
            itemsPerPage = 3;
        } else if ("4".equals(layout)) {
            itemsPerPage = 4;
        } else if ("6".equals(layout)) {
            itemsPerPage = 6;
        }

        // 3. 페이지 그룹 분할
        List<List<ImageMergeItem>> pages = new java.util.ArrayList<>();
        for (int i = 0; i < items.size(); i += itemsPerPage) {
            int end = Math.min(i + itemsPerPage, items.size());
            pages.add(new java.util.ArrayList<>(items.subList(i, end)));
        }

        Path tempFile;
        try {
            tempFile = Files.createTempFile("sofia_export_", ".pdf");
        } catch (IOException e) {
            throw new RuntimeException("Failed to create temporary file for PDF export", e);
        }

        try (PDDocument document = new PDDocument()) {
            for (List<ImageMergeItem> pageItems : pages) {
                // 용지 방향 결정
                boolean isLandscape;
                if ("landscape".equalsIgnoreCase(orientation)) {
                    isLandscape = true;
                } else if ("portrait".equalsIgnoreCase(orientation)) {
                    isLandscape = false;
                } else {
                    // "auto"
                    if ("2-h".equals(layout)) {
                        isLandscape = true;
                    } else if ("2-v".equals(layout) || "3".equals(layout)) {
                        isLandscape = false;
                    } else {
                        int landscapeCount = 0;
                        for (ImageMergeItem it : pageItems) {
                            if (it.origW > it.origH) landscapeCount++;
                        }
                        isLandscape = (landscapeCount * 2 >= pageItems.size());
                    }
                }

                PDRectangle mediaBox =
                        isLandscape
                                ? new PDRectangle(
                                        PDRectangle.A4.getHeight(), PDRectangle.A4.getWidth())
                                : PDRectangle.A4;

                PDPage page = new PDPage(mediaBox);
                document.addPage(page);

                float pageWidth = mediaBox.getWidth();
                float pageHeight = mediaBox.getHeight();
                float availX = pageMargin;
                float availY = pageMargin;
                float availW = Math.max(10, pageWidth - 2 * pageMargin);
                float availH = Math.max(10, pageHeight - 2 * pageMargin);

                List<PdfCell> cells =
                        calculatePdfCells(
                                layout,
                                pageItems.size(),
                                availX,
                                availY,
                                availW,
                                availH,
                                gap,
                                isLandscape);

                try (PDPageContentStream contentStream = new PDPageContentStream(document, page)) {
                    for (int idx = 0; idx < pageItems.size(); idx++) {
                        if (idx >= cells.size()) break;
                        ImageMergeItem it = pageItems.get(idx);
                        PdfCell cell = cells.get(idx);

                        try {
                            BufferedImage img =
                                    Thumbnails.of(it.path.toFile())
                                            .rotate(it.rotAngle)
                                            .scale(1.0)
                                            .asBufferedImage();

                            float drawX, drawY, drawW, drawH;
                            BufferedImage renderImg;

                            if ("cover".equalsIgnoreCase(fitMode)) {
                                int pixelTargetW = Math.max(10, Math.round(cell.w * 2));
                                int pixelTargetH = Math.max(10, Math.round(cell.h * 2));
                                renderImg =
                                        Thumbnails.of(img)
                                                .size(pixelTargetW, pixelTargetH)
                                                .crop(Positions.CENTER)
                                                .asBufferedImage();
                                drawX = cell.x;
                                drawY = cell.y;
                                drawW = cell.w;
                                drawH = cell.h;
                            } else {
                                // contain (기본값)
                                float scale =
                                        Math.min(
                                                cell.w / (float) it.origW,
                                                cell.h / (float) it.origH);
                                drawW = it.origW * scale;
                                drawH = it.origH * scale;
                                drawX = cell.x + (cell.w - drawW) / 2.0f;
                                drawY = cell.y + (cell.h - drawH) / 2.0f;
                                renderImg = img;
                            }

                            PDImageXObject pdImage =
                                    JPEGFactory.createFromImage(document, renderImg);
                            contentStream.drawImage(pdImage, drawX, drawY, drawW, drawH);

                            if (applyBorder) {
                                contentStream.setLineWidth(borderWidth);
                                contentStream.setStrokingColor(r, g, b);
                                contentStream.addRect(drawX, drawY, drawW, drawH);
                                contentStream.stroke();
                            }

                            img.flush();
                            if (renderImg != img) {
                                renderImg.flush();
                            }
                        } catch (Exception e) {
                            log.error("Failed to add image {} to PDF: {}", it.path, e.getMessage());
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
            } catch (IOException ignored) {
            }
            throw new RuntimeException("Failed to generate PDF export", e);
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

    /**
     * Thumbnailator는 기본적으로 EXIF Orientation 태그를 읽어 이미지를 자동으로 바로 세운 뒤(useExifOrientation=true)
     * 렌더링하므로, 원본 파일의 물리적 픽셀 width/height(EXIF 미반영)만으로 계산한 크기와 실제 렌더링 결과의 크기가 어긋나 병합/PDF 출력 시 이미지가
     * 늘어나 보이는 왜곡이 발생한다. Orientation이 5~8(90도 계열 회전)이면 실제 렌더링 결과는 폭/높이가 뒤바뀌므로 여기서도 동일하게 뒤바꿔 맞춰준다.
     */
    private boolean isExifOrientationSwapped(Path imagePath) {
        try {
            com.drew.metadata.Metadata metadata =
                    com.drew.imaging.ImageMetadataReader.readMetadata(imagePath.toFile());
            com.drew.metadata.exif.ExifIFD0Directory dir =
                    metadata.getFirstDirectoryOfType(
                            com.drew.metadata.exif.ExifIFD0Directory.class);
            if (dir != null
                    && dir.containsTag(com.drew.metadata.exif.ExifIFD0Directory.TAG_ORIENTATION)) {
                int orientation =
                        dir.getInt(com.drew.metadata.exif.ExifIFD0Directory.TAG_ORIENTATION);
                return orientation >= 5 && orientation <= 8;
            }
        } catch (Exception e) {
            log.debug("No EXIF orientation info for {}: {}", imagePath, e.getMessage());
        }
        return false;
    }

    private java.awt.Dimension getImageDimension(Path imagePath, int rotAngle) {
        int w = -1;
        int h = -1;

        try (javax.imageio.stream.ImageInputStream in =
                ImageIO.createImageInputStream(imagePath.toFile())) {
            if (in != null) {
                java.util.Iterator<javax.imageio.ImageReader> readers = ImageIO.getImageReaders(in);
                if (readers.hasNext()) {
                    javax.imageio.ImageReader reader = readers.next();
                    try {
                        reader.setInput(in);
                        w = reader.getWidth(0);
                        h = reader.getHeight(0);
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

        if (w <= 0 || h <= 0) {
            try {
                BufferedImage bi = ImageIO.read(imagePath.toFile());
                if (bi != null) {
                    w = bi.getWidth();
                    h = bi.getHeight();
                    bi.flush();
                }
            } catch (Exception e) {
                log.error("Failed to read image dimension for {}: {}", imagePath, e.getMessage());
            }
        }

        if (w <= 0 || h <= 0) {
            return null;
        }

        if (isExifOrientationSwapped(imagePath)) {
            int tmp = w;
            w = h;
            h = tmp;
        }
        if (rotAngle == 90 || rotAngle == 270) {
            int tmp = w;
            w = h;
            h = tmp;
        }
        return new java.awt.Dimension(w, h);
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

    public Path exportAsZip(ImageExportRequest request) throws IOException {
        List<Long> ids = request.getIds();
        if (ids == null || ids.isEmpty()) {
            throw new IllegalArgumentException("No images selected for zip export");
        }

        List<ImageFile> files = imageFileRepository.findAllById(ids);
        java.util.Map<Long, ImageFile> fileMap =
                files.stream().collect(java.util.stream.Collectors.toMap(ImageFile::getId, f -> f));

        Path tempZip = Files.createTempFile("sofia_export_", ".zip");

        try (java.util.zip.ZipOutputStream zos =
                new java.util.zip.ZipOutputStream(
                        new java.io.BufferedOutputStream(Files.newOutputStream(tempZip)))) {

            java.util.Set<String> usedNames = new java.util.HashSet<>();

            for (Long id : ids) {
                ImageFile file = fileMap.get(id);
                if (file == null || file.getFolder() == null) {
                    continue;
                }

                String baseName = file.getOrgName();
                if (baseName == null || baseName.trim().isEmpty()) {
                    baseName =
                            "image_"
                                    + file.getId()
                                    + "."
                                    + (file.getImageFormat() != null
                                            ? file.getImageFormat()
                                            : "jpg");
                }

                String entryName = baseName;
                int counter = 1;
                int dotIdx = baseName.lastIndexOf('.');
                String nameOnly = (dotIdx != -1) ? baseName.substring(0, dotIdx) : baseName;
                String extOnly = (dotIdx != -1) ? baseName.substring(dotIdx) : "";

                while (usedNames.contains(entryName)) {
                    entryName = nameOnly + " (" + counter + ")" + extOnly;
                    counter++;
                }
                usedNames.add(entryName);

                java.util.zip.ZipEntry entry = new java.util.zip.ZipEntry(entryName);
                zos.putNextEntry(entry);

                if (file.getRotationAngle() != null && file.getRotationAngle() != 0) {
                    byte[] rotated = getRotatedImageBytes(file);
                    zos.write(rotated);
                } else {
                    Path rawPath =
                            Paths.get(
                                    baseImageFolder,
                                    file.getFolder().getFolderName(),
                                    file.getOrgName());
                    if (Files.exists(rawPath)) {
                        Files.copy(rawPath, zos);
                    } else {
                        log.warn("Image file not found on disk for zip export: {}", rawPath);
                    }
                }
                zos.closeEntry();
            }
        } catch (Exception e) {
            log.error("Failed to generate zip export: {}", e.getMessage());
            try {
                Files.deleteIfExists(tempZip);
            } catch (IOException ignored) {
            }
            throw new RuntimeException("Failed to generate zip export", e);
        }

        return tempZip;
    }
}
