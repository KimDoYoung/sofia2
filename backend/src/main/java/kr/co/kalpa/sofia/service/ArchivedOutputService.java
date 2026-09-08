package kr.co.kalpa.sofia.service;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;
import kr.co.kalpa.sofia.domain.ArchivedOutput;
import kr.co.kalpa.sofia.domain.OutputType;
import kr.co.kalpa.sofia.dto.SlideShowTaskStatus;
import kr.co.kalpa.sofia.repository.ArchivedOutputRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@Service
@RequiredArgsConstructor
public class ArchivedOutputService {

    private final ArchivedOutputRepository archivedOutputRepository;
    private final SlideShowService slideShowService;

    @Value("${sofia.base.archive.folder:${sofia.base.folder}/archive}")
    private String archiveFolderPath;

    private Path archiveDir;

    @PostConstruct
    public void init() {
        archiveDir = Paths.get(archiveFolderPath);
        try {
            if (!Files.exists(archiveDir)) {
                Files.createDirectories(archiveDir);
            }
            log.info("Archive directory: {}", archiveDir.toAbsolutePath());
        } catch (IOException e) {
            log.error("Failed to initialize archive directory", e);
        }
    }

    public ArchivedOutput saveUpload(MultipartFile file, OutputType type, String displayFilename,
                                     String note, Long sourceFolderId, Integer elapsedMs) throws IOException {
        String extension = resolveExtension(type);
        String storedFilename = UUID.randomUUID() + "." + extension;
        Path target = archiveDir.resolve(storedFilename);
        Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);

        String finalName = normalizeDisplayFilename(
                StringUtils.hasText(displayFilename) ? displayFilename : file.getOriginalFilename(), extension);

        return archivedOutputRepository.save(ArchivedOutput.builder()
                .type(type).storedFilename(storedFilename).displayFilename(finalName)
                .note(note).sourceFolderId(sourceFolderId)
                .fileSize(Files.size(target)).fileExtension(extension).elapsedMs(elapsedMs)
                .build());
    }

    public ArchivedOutput saveFromSlideshowTask(String taskId, String displayFilename,
                                                String note, Integer elapsedMs) throws IOException {
        Path source = slideShowService.getVideoPath(taskId);
        if (source == null) throw new IllegalStateException("완료된 슬라이드 쇼 동영상을 찾을 수 없습니다.");

        String storedFilename = UUID.randomUUID() + ".mp4";
        Path target = archiveDir.resolve(storedFilename);
        Files.copy(source, target, StandardCopyOption.REPLACE_EXISTING);

        String finalName = normalizeDisplayFilename(
                StringUtils.hasText(displayFilename) ? displayFilename : "slideshow", "mp4");

        SlideShowTaskStatus status = slideShowService.getTaskStatus(taskId);

        return archivedOutputRepository.save(ArchivedOutput.builder()
                .type(OutputType.SLIDESHOW).storedFilename(storedFilename).displayFilename(finalName)
                .note(note).sourceFolderId(status != null ? status.getFolderId() : null)
                .fileSize(Files.size(target)).fileExtension("mp4").elapsedMs(elapsedMs)
                .build());
    }

    public List<ArchivedOutput> list(OutputType typeFilter) {
        return typeFilter != null
                ? archivedOutputRepository.findByTypeOrderByCreatedAtDesc(typeFilter)
                : archivedOutputRepository.findAllByOrderByCreatedAtDesc();
    }

    public ArchivedOutput updateMeta(Long id, String note, String displayFilename) {
        ArchivedOutput item = getMeta(id);
        if (note != null) item.setNote(note);
        if (StringUtils.hasText(displayFilename)) {
            item.setDisplayFilename(normalizeDisplayFilename(displayFilename, item.getFileExtension()));
        }
        return archivedOutputRepository.save(item);
    }

    public void delete(Long id) {
        ArchivedOutput item = getMeta(id);
        try {
            Files.deleteIfExists(archiveDir.resolve(item.getStoredFilename()));
        } catch (IOException e) {
            log.warn("보관 파일 삭제 실패: {}", item.getStoredFilename(), e);
        }
        archivedOutputRepository.delete(item);
    }

    public Resource getFileForDownload(Long id) {
        Path path = archiveDir.resolve(getMeta(id).getStoredFilename());
        return Files.exists(path) ? new FileSystemResource(path) : null;
    }

    public ArchivedOutput getMeta(Long id) {
        return archivedOutputRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("항목을 찾을 수 없습니다: " + id));
    }

    private String resolveExtension(OutputType type) {
        return switch (type) {
            case PDF -> "pdf";
            case MERGE, COLLAGE, EFFECT -> "jpg";
            case SLIDESHOW -> "mp4";
        };
    }

    private String normalizeDisplayFilename(String raw, String extension) {
        if (!StringUtils.hasText(raw)) return "output." + extension;
        String base = raw.replaceAll("[\\\\/:*?\"<>|]", "_").trim();
        int dot = base.lastIndexOf('.');
        if (dot > 0) base = base.substring(0, dot);
        return base + "." + extension;
    }
}
