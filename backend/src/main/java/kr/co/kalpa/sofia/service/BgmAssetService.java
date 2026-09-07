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
import kr.co.kalpa.sofia.dto.BgmAssetDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@Service
public class BgmAssetService {

    @Value("${sofia.base.assets.bgm.folder:${sofia.base.folder}/assets/bgm}")
    private String bgmFolderPath;

    private static final Set<String> SUPPORTED_EXTENSIONS =
            Set.of(".mp3", ".m4a", ".wav", ".aac", ".ogg", ".flac", ".wma");

    @PostConstruct
    public void init() {
        try {
            Path path = Paths.get(bgmFolderPath);
            if (!Files.exists(path)) {
                Files.createDirectories(path);
                log.info("Created BGM asset directory: {}", path.toAbsolutePath());
            }
        } catch (IOException e) {
            log.error("Failed to initialize BGM asset directory: {}", bgmFolderPath, e);
        }
    }

    public Path getBgmFolderPath() {
        return Paths.get(bgmFolderPath);
    }

    public List<BgmAssetDto> getBgmAssets() {
        Path folder = getBgmFolderPath();
        if (!Files.exists(folder) || !Files.isDirectory(folder)) {
            return new ArrayList<>();
        }

        try (Stream<Path> stream = Files.list(folder)) {
            return stream.filter(Files::isRegularFile)
                    .filter(this::isAudioFile)
                    .map(this::toDto)
                    .filter(Objects::nonNull)
                    .sorted(Comparator.comparing(BgmAssetDto::getModifiedAt).reversed())
                    .collect(Collectors.toList());
        } catch (IOException e) {
            log.error("Error reading BGM assets from: {}", folder, e);
            return new ArrayList<>();
        }
    }

    public BgmAssetDto uploadBgm(MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("업로드할 파일이 비어 있습니다.");
        }

        String originalFilename = file.getOriginalFilename();
        if (!StringUtils.hasText(originalFilename)) {
            throw new IllegalArgumentException("올바른 파일명이 아닙니다.");
        }

        String extension = getExtension(originalFilename).toLowerCase();
        if (!SUPPORTED_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException(
                    "지원되지 않는 오디오 형식입니다. (지원: MP3, M4A, WAV, AAC, OGG, FLAC)");
        }

        // 경로 조작(Path traversal) 방지
        String safeFilename = Paths.get(originalFilename).getFileName().toString();
        safeFilename = safeFilename.replaceAll("[\\\\/:*?\"<>|]", "_");

        Path targetPath = getBgmFolderPath().resolve(safeFilename);

        // 동일 파일명 존재 시 번호 부여
        if (Files.exists(targetPath)) {
            String baseName = safeFilename.substring(0, safeFilename.lastIndexOf('.'));
            String ext = safeFilename.substring(safeFilename.lastIndexOf('.'));
            int counter = 1;
            while (Files.exists(targetPath)) {
                safeFilename = String.format("%s_%d%s", baseName, counter++, ext);
                targetPath = getBgmFolderPath().resolve(safeFilename);
            }
        }

        Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
        log.info("Uploaded BGM asset saved to: {}", targetPath.toAbsolutePath());

        return toDto(targetPath);
    }

    public boolean deleteBgm(String filename) {
        if (!StringUtils.hasText(filename)) {
            return false;
        }

        // 경로 조작 방지
        String safeFilename = Paths.get(filename).getFileName().toString();
        Path targetPath = getBgmFolderPath().resolve(safeFilename);

        try {
            if (Files.exists(targetPath) && Files.isRegularFile(targetPath)) {
                Files.delete(targetPath);
                log.info("Deleted BGM asset: {}", targetPath.toAbsolutePath());
                return true;
            }
        } catch (IOException e) {
            log.error("Failed to delete BGM asset: {}", targetPath, e);
        }
        return false;
    }

    public Resource getBgmResource(String filename) {
        String safeFilename = Paths.get(filename).getFileName().toString();
        Path targetPath = getBgmFolderPath().resolve(safeFilename);

        if (!Files.exists(targetPath) || !Files.isRegularFile(targetPath)) {
            return null;
        }
        return new FileSystemResource(targetPath);
    }

    public Path getBgmFilePath(String filename) {
        if (!StringUtils.hasText(filename)) {
            return null;
        }
        String safeFilename = Paths.get(filename).getFileName().toString();
        Path targetPath = getBgmFolderPath().resolve(safeFilename);
        return Files.exists(targetPath) && Files.isRegularFile(targetPath) ? targetPath : null;
    }

    private boolean isAudioFile(Path path) {
        String ext = getExtension(path.getFileName().toString()).toLowerCase();
        return SUPPORTED_EXTENSIONS.contains(ext);
    }

    private String getExtension(String filename) {
        int dotIndex = filename.lastIndexOf('.');
        return (dotIndex == -1) ? "" : filename.substring(dotIndex);
    }

    private BgmAssetDto toDto(Path path) {
        try {
            String filename = path.getFileName().toString();
            long size = Files.size(path);
            Instant instant = Files.getLastModifiedTime(path).toInstant();
            LocalDateTime modifiedAt = LocalDateTime.ofInstant(instant, ZoneId.systemDefault());

            return BgmAssetDto.builder()
                    .filename(filename)
                    .originalName(filename)
                    .size(size)
                    .formattedSize(formatFileSize(size))
                    .streamUrl("/sofia/api/assets/bgm/stream/" + filename)
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
