package kr.co.kalpa.sofia.service;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import kr.co.kalpa.sofia.dto.DecorationAssetDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@Service
public class DecorationAssetService {

    @Value("${sofia.base.assets.decorations.folder:${sofia.base.folder}/assets/decorations}")
    private String decorationFolderPath;

    private static final Set<String> SUPPORTED_EXTENSIONS =
            Set.of(".png", ".jpg", ".jpeg", ".webp");

    @PostConstruct
    public void init() {
        try {
            Path path = Paths.get(decorationFolderPath);
            if (!Files.exists(path)) {
                Files.createDirectories(path);
                log.info("Created decoration asset directory: {}", path.toAbsolutePath());
            }
        } catch (IOException e) {
            log.error(
                    "Failed to initialize decoration asset directory: {}", decorationFolderPath, e);
        }
    }

    public Path getDecorationFolderPath() {
        return Paths.get(decorationFolderPath);
    }

    public List<Path> getDecorationPaths() {
        Path folder = getDecorationFolderPath();
        if (!Files.exists(folder) || !Files.isDirectory(folder)) {
            return new ArrayList<>();
        }
        try (Stream<Path> stream = Files.list(folder)) {
            return stream.filter(Files::isRegularFile)
                    .filter(this::isImageFile)
                    .collect(Collectors.toList());
        } catch (IOException e) {
            log.error("Error reading decoration paths from: {}", folder, e);
            return new ArrayList<>();
        }
    }

    public List<DecorationAssetDto> getDecorationAssets() {
        Path folder = getDecorationFolderPath();
        if (!Files.exists(folder) || !Files.isDirectory(folder)) {
            return new ArrayList<>();
        }

        try (Stream<Path> stream = Files.list(folder)) {
            return stream.filter(Files::isRegularFile)
                    .filter(this::isImageFile)
                    .map(this::toDto)
                    .filter(Objects::nonNull)
                    .sorted(Comparator.comparing(DecorationAssetDto::getModifiedAt).reversed())
                    .collect(Collectors.toList());
        } catch (IOException e) {
            log.error("Error reading decoration assets from: {}", folder, e);
            return new ArrayList<>();
        }
    }

    public DecorationAssetDto uploadDecoration(MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("업로드할 파일이 비어 있습니다.");
        }

        String originalFilename = file.getOriginalFilename();
        if (!StringUtils.hasText(originalFilename)) {
            throw new IllegalArgumentException("올바른 파일명이 아닙니다.");
        }

        String extension = getExtension(originalFilename).toLowerCase();
        if (!SUPPORTED_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException("지원되지 않는 이미지 형식입니다. (지원: PNG, JPG, WEBP)");
        }

        String safeFilename = Paths.get(originalFilename).getFileName().toString();
        safeFilename = safeFilename.replaceAll("[\\\\/:*?\"<>|]", "_");

        Path targetPath = getDecorationFolderPath().resolve(safeFilename);

        if (Files.exists(targetPath)) {
            String baseName = safeFilename.substring(0, safeFilename.lastIndexOf('.'));
            String ext = safeFilename.substring(safeFilename.lastIndexOf('.'));
            int counter = 1;
            while (Files.exists(targetPath)) {
                safeFilename = String.format("%s_%d%s", baseName, counter++, ext);
                targetPath = getDecorationFolderPath().resolve(safeFilename);
            }
        }

        Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
        log.info("Uploaded decoration asset saved to: {}", targetPath.toAbsolutePath());

        return toDto(targetPath);
    }

    public boolean deleteDecoration(String filename) {
        if (!StringUtils.hasText(filename)) {
            return false;
        }

        String safeFilename = Paths.get(filename).getFileName().toString();
        Path targetPath = getDecorationFolderPath().resolve(safeFilename);

        try {
            if (Files.exists(targetPath) && Files.isRegularFile(targetPath)) {
                Files.delete(targetPath);
                log.info("Deleted decoration asset: {}", targetPath.toAbsolutePath());
                return true;
            }
        } catch (IOException e) {
            log.error("Failed to delete decoration asset: {}", targetPath, e);
        }
        return false;
    }

    public Resource getDecorationResource(String filename) {
        String safeFilename = Paths.get(filename).getFileName().toString();
        Path targetPath = getDecorationFolderPath().resolve(safeFilename);

        if (!Files.exists(targetPath) || !Files.isRegularFile(targetPath)) {
            return null;
        }
        return new FileSystemResource(targetPath);
    }

    private boolean isImageFile(Path path) {
        String ext = getExtension(path.getFileName().toString()).toLowerCase();
        return SUPPORTED_EXTENSIONS.contains(ext);
    }

    private String getExtension(String filename) {
        int dotIndex = filename.lastIndexOf('.');
        return (dotIndex == -1) ? "" : filename.substring(dotIndex);
    }

    private DecorationAssetDto toDto(Path path) {
        try {
            String filename = path.getFileName().toString();
            long size = Files.size(path);
            Instant instant = Files.getLastModifiedTime(path).toInstant();
            LocalDateTime modifiedAt = LocalDateTime.ofInstant(instant, ZoneId.systemDefault());

            return DecorationAssetDto.builder()
                    .filename(filename)
                    .originalName(filename)
                    .size(size)
                    .formattedSize(formatFileSize(size))
                    .imageUrl("/sofia/api/assets/decorations/image/" + filename)
                    .modifiedAt(modifiedAt)
                    .build();
        } catch (IOException e) {
            log.warn("Failed to get file info for: {}", path, e);
            return null;
        }
    }

    private String formatFileSize(long bytes) {
        if (bytes < 1024) {
            return bytes + " B";
        }
        int exp = (int) (Math.log(bytes) / Math.log(1024));
        String pre = "KMGTPE".charAt(exp - 1) + "";
        return String.format("%.1f %sB", bytes / Math.pow(1024, exp), pre);
    }
}
