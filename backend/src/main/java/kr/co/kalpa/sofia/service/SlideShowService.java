package kr.co.kalpa.sofia.service;

import jakarta.annotation.PostConstruct;
import java.io.BufferedReader;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import kr.co.kalpa.sofia.domain.ImageFile;
import kr.co.kalpa.sofia.domain.ImageFolder;
import kr.co.kalpa.sofia.dto.SlideShowRequest;
import kr.co.kalpa.sofia.dto.SlideShowTaskStatus;
import kr.co.kalpa.sofia.repository.ImageFileRepository;
import kr.co.kalpa.sofia.repository.ImageFolderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Slf4j
@Service
@RequiredArgsConstructor
public class SlideShowService {

    private final ImageFileRepository imageFileRepository;
    private final ImageFolderRepository imageFolderRepository;
    private final BgmAssetService bgmAssetService;

    @Value("${sofia.base.folder:./data}")
    private String baseFolder;

    @Value("${sofia.base.image.folder:${sofia.base.folder}/images}")
    private String baseImageFolder;

    private final Map<String, SlideShowTaskStatus> tasks = new ConcurrentHashMap<>();

    private Path tempVideoDir;

    @PostConstruct
    public void init() {
        try {
            tempVideoDir = Paths.get(baseFolder, "temp", "slideshow");
            if (!Files.exists(tempVideoDir)) {
                Files.createDirectories(tempVideoDir);
            }
            log.info("SlideShow temp directory: {}", tempVideoDir.toAbsolutePath());
        } catch (IOException e) {
            log.error("Failed to initialize SlideShow temp directory", e);
        }
    }

    public String generateSlideShowAsync(SlideShowRequest request) {
        if (request.getImageIds() == null || request.getImageIds().size() < 2) {
            throw new IllegalArgumentException("슬라이드 쇼를 만들려면 최소 2장 이상의 이미지를 선택해야 합니다.");
        }

        String taskId = UUID.randomUUID().toString();
        SlideShowTaskStatus initialStatus =
                SlideShowTaskStatus.builder()
                        .taskId(taskId)
                        .status("PENDING")
                        .progress(0)
                        .message("동영상 생성을 준비하고 있습니다...")
                        .folderId(request.getFolderId())
                        .build();
        tasks.put(taskId, initialStatus);

        CompletableFuture.runAsync(() -> runGeneration(taskId, request));

        return taskId;
    }

    public SlideShowTaskStatus getTaskStatus(String taskId) {
        return tasks.get(taskId);
    }

    public Resource getVideoResource(String taskId) {
        SlideShowTaskStatus status = tasks.get(taskId);
        if (status == null || !"COMPLETED".equals(status.getStatus())) {
            return null;
        }

        Path path = Paths.get(status.getFilePath());
        if (!Files.exists(path) || !Files.isRegularFile(path)) {
            return null;
        }

        return new FileSystemResource(path);
    }

    public Path getVideoPath(String taskId) {
        SlideShowTaskStatus status = tasks.get(taskId);
        if (status == null || !"COMPLETED".equals(status.getStatus())) {
            return null;
        }
        Path path = Paths.get(status.getFilePath());
        return Files.exists(path) ? path : null;
    }

    public String saveToFolder(String taskId, Long folderId, String customName) throws IOException {
        SlideShowTaskStatus status = tasks.get(taskId);
        if (status == null || !"COMPLETED".equals(status.getStatus())) {
            throw new IllegalStateException("완료된 슬라이드 쇼 동영상이 없습니다.");
        }

        Path sourcePath = Paths.get(status.getFilePath());
        if (!Files.exists(sourcePath)) {
            throw new FileNotFoundException("생성된 동영상 파일을 찾을 수 없습니다.");
        }

        Long targetFolderId = (folderId != null) ? folderId : status.getFolderId();
        if (targetFolderId == null) {
            throw new IllegalArgumentException("저장할 폴더 정보가 지정되지 않았습니다.");
        }

        ImageFolder folder =
                imageFolderRepository
                        .findById(targetFolderId)
                        .orElseThrow(
                                () ->
                                        new IllegalArgumentException(
                                                "폴더를 찾을 수 없습니다: " + targetFolderId));

        Path targetDir = Paths.get(baseImageFolder, folder.getFolderName());
        if (!Files.exists(targetDir)) {
            Files.createDirectories(targetDir);
        }

        String timestamp =
                LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        String targetFilename;
        if (StringUtils.hasText(customName)) {
            String safe = customName.replaceAll("[\\\\/:*?\"<>|]", "_").trim();
            if (!safe.toLowerCase().endsWith(".mp4")) {
                safe += ".mp4";
            }
            targetFilename = safe;
        } else {
            targetFilename = "slideshow_" + timestamp + ".mp4";
        }

        Path targetFilePath = targetDir.resolve(targetFilename);
        Files.copy(sourcePath, targetFilePath, StandardCopyOption.REPLACE_EXISTING);

        log.info(
                "SlideShow video successfully saved to folder: {}",
                targetFilePath.toAbsolutePath());
        return targetFilename;
    }

    private void runGeneration(String taskId, SlideShowRequest request) {
        Path outputPath = null;

        try {
            updateStatus(taskId, "PROCESSING", 5, "이미지 정보 확인 및 로드 중...");

            List<ImageFile> fetchedImages = imageFileRepository.findAllById(request.getImageIds());
            Map<Long, ImageFile> imageMap = new HashMap<>();
            for (ImageFile img : fetchedImages) {
                imageMap.put(img.getId(), img);
            }

            // 요청된 순서대로 정렬
            List<ImageFile> orderedImages = new ArrayList<>();
            for (Long id : request.getImageIds()) {
                ImageFile img = imageMap.get(id);
                if (img != null) {
                    orderedImages.add(img);
                }
            }

            if (orderedImages.size() < 2) {
                throw new IllegalStateException("유효한 이미지가 2장 미만입니다.");
            }

            // 이미지 실제 파일 경로 확인
            List<Path> imagePaths = new ArrayList<>();
            List<Integer> rotations = new ArrayList<>();

            for (ImageFile img : orderedImages) {
                if (img.getFolder() == null) {
                    continue;
                }
                Path p =
                        Paths.get(
                                baseImageFolder, img.getFolder().getFolderName(), img.getOrgName());
                if (Files.exists(p)) {
                    imagePaths.add(p);
                    int rot = img.getRotationAngle() != null ? img.getRotationAngle() % 360 : 0;
                    if (rot < 0) rot += 360;
                    rotations.add(rot);
                } else {
                    log.warn("Image file not found on disk: {}", p);
                }
            }

            if (imagePaths.size() < 2) {
                throw new IllegalStateException("서버 디스크에 존재하는 이미지가 2장 미만입니다.");
            }

            int n = imagePaths.size();
            double duration =
                    (request.getDurationPerImage() != null && request.getDurationPerImage() >= 1.0)
                            ? request.getDurationPerImage()
                            : 3.0;
            double transDuration =
                    (request.getTransitionDuration() != null
                                    && request.getTransitionDuration() >= 0.2)
                            ? request.getTransitionDuration()
                            : 0.8;
            if (transDuration >= duration) {
                transDuration = duration * 0.4;
            }

            String transType =
                    StringUtils.hasText(request.getTransition())
                            ? request.getTransition().toLowerCase().trim()
                            : "fade";
            // 허용된 전환 효과 검증
            Set<String> validTransitions =
                    Set.of(
                            "fade",
                            "circlecrop",
                            "slideleft",
                            "slideright",
                            "pixelize",
                            "hblur",
                            "dissolve",
                            "wipeleft");
            if (!validTransitions.contains(transType)) {
                transType = "fade";
            }

            // 해상도 결정
            int width = 1920;
            int height = 1080;
            int blurW = 160;
            int blurH = 90;

            String aspect = request.getAspectRatio() != null ? request.getAspectRatio() : "16:9";
            if ("9:16".equals(aspect)) {
                width = 1080;
                height = 1920;
                blurW = 90;
                blurH = 160;
            } else if ("1:1".equals(aspect)) {
                width = 1080;
                height = 1080;
                blurW = 120;
                blurH = 120;
            }

            double totalDuration = (n * duration) - ((n - 1) * transDuration);

            // BGM 확인
            Path bgmPath = null;
            if (StringUtils.hasText(request.getBgmFilename())) {
                bgmPath = bgmAssetService.getBgmFilePath(request.getBgmFilename());
            }

            // Filter script 생성
            StringBuilder filter = new StringBuilder();
            for (int i = 0; i < n; i++) {
                int rot = rotations.get(i);
                String rotFilter = "";
                if (rot == 90) {
                    rotFilter = "transpose=1,";
                } else if (rot == 180) {
                    rotFilter = "hflip,vflip,";
                } else if (rot == 270) {
                    rotFilter = "transpose=2,";
                }

                // Blur background + foreground fit
                filter.append(
                        String.format("[%d:v]%ssplit[bg%d_in][fg%d_in];\n", i, rotFilter, i, i));
                filter.append(
                        String.format(
                                "[bg%d_in]scale=%d:%d:force_original_aspect_ratio=increase,crop=%d:%d,boxblur=4:1,scale=%d:%d[bg%d];\n",
                                i, blurW, blurH, blurW, blurH, width, height, i));
                filter.append(
                        String.format(
                                "[fg%d_in]scale=%d:%d:force_original_aspect_ratio=decrease[fg%d];\n",
                                i, width, height, i));
                filter.append(
                        String.format(
                                "[bg%d][fg%d]overlay=(W-w)/2:(H-h)/2,setsar=1,fps=30[v%d];\n",
                                i, i, i));
            }

            // xfade transition chain
            for (int i = 1; i < n; i++) {
                double offset = i * (duration - transDuration);
                String in1 = (i == 1) ? "[v0]" : String.format("[vx%d]", i - 1);
                String in2 = String.format("[v%d]", i);
                String out = (i == n - 1) ? "[vout]" : String.format("[vx%d]", i);
                filter.append(
                        String.format(
                                Locale.US,
                                "%s%sxfade=transition=%s:duration=%.2f:offset=%.2f%s;\n",
                                in1,
                                in2,
                                transType,
                                transDuration,
                                offset,
                                out));
            }

            String filterString = filter.toString();
            outputPath = tempVideoDir.resolve(taskId + ".mp4");

            updateStatus(taskId, "PROCESSING", 15, "비디오 인코딩 시작 중...");

            // FFmpeg 실행 (1차: NVENC GPU 가속, 2차 실패 시: CPU libx264 fallback)
            boolean success =
                    executeFfmpeg(
                            taskId,
                            imagePaths,
                            bgmPath,
                            filterString,
                            outputPath,
                            duration,
                            totalDuration,
                            true);

            if (!success) {
                log.warn(
                        "GPU NVENC encoding failed for task {}, falling back to CPU libx264...",
                        taskId);
                updateStatus(taskId, "PROCESSING", 20, "CPU 소프트웨어 인코더로 안전하게 전환하여 재시도 중...");
                success =
                        executeFfmpeg(
                                taskId,
                                imagePaths,
                                bgmPath,
                                filterString,
                                outputPath,
                                duration,
                                totalDuration,
                                false);
            }

            if (success && Files.exists(outputPath) && Files.size(outputPath) > 0) {
                SlideShowTaskStatus status = tasks.get(taskId);
                status.setStatus("COMPLETED");
                status.setProgress(100);
                status.setMessage("슬라이드 쇼 동영상이 성공적으로 완성되었습니다!");
                status.setFilePath(outputPath.toAbsolutePath().toString());
                status.setStreamUrl("/sofia/api/slideshow/stream/" + taskId);
                status.setDownloadUrl("/sofia/api/slideshow/download/" + taskId);
                log.info("SlideShow video generation completed: {}", outputPath);
            } else {
                updateStatus(taskId, "FAILED", 0, "동영상 인코딩에 실패하였습니다.");
            }

        } catch (Exception e) {
            log.error("Error generating slideshow for task {}", taskId, e);
            updateStatus(taskId, "FAILED", 0, "오류 발생: " + e.getMessage());
        }
    }

    private boolean executeFfmpeg(
            String taskId,
            List<Path> imagePaths,
            Path bgmPath,
            String filterString,
            Path outputPath,
            double imageDuration,
            double totalDuration,
            boolean useGpu) {
        try {
            List<String> cmd = new ArrayList<>();
            cmd.add("ffmpeg");
            cmd.add("-y");

            // 이미지 입력들
            for (Path imgPath : imagePaths) {
                cmd.add("-loop");
                cmd.add("1");
                cmd.add("-t");
                cmd.add(String.format(Locale.US, "%.2f", imageDuration));
                cmd.add("-i");
                cmd.add(imgPath.toAbsolutePath().toString());
            }

            // 오디오 입력
            boolean hasAudio = (bgmPath != null && Files.exists(bgmPath));
            if (hasAudio) {
                cmd.add("-stream_loop");
                cmd.add("-1");
                cmd.add("-i");
                cmd.add(bgmPath.toAbsolutePath().toString());
            }

            // 필터 지정 (-filter_complex 직접 전달, FFmpeg 9 호환)
            cmd.add("-filter_complex");
            cmd.add(filterString);

            // 비디오 맵
            cmd.add("-map");
            cmd.add("[vout]");

            // 비디오 코덱
            if (useGpu) {
                cmd.add("-c:v");
                cmd.add("h264_nvenc");
                cmd.add("-preset");
                cmd.add("p4");
            } else {
                cmd.add("-c:v");
                cmd.add("libx264");
                cmd.add("-preset");
                cmd.add("veryfast");
            }

            cmd.add("-pix_fmt");
            cmd.add("yuv420p");

            // 오디오 믹싱 및 페이드아웃
            if (hasAudio) {
                cmd.add("-map");
                cmd.add(imagePaths.size() + ":a");
                cmd.add("-af");
                double fadeStart = Math.max(0.0, totalDuration - 2.0);
                cmd.add(
                        String.format(
                                Locale.US, "afade=t=out:st=%.2f:d=2.0,volume=0.85", fadeStart));
                cmd.add("-c:a");
                cmd.add("aac");
                cmd.add("-b:a");
                cmd.add("192k");
                cmd.add("-t");
                cmd.add(String.format(Locale.US, "%.2f", totalDuration));
                cmd.add("-shortest");
            } else {
                cmd.add("-t");
                cmd.add(String.format(Locale.US, "%.2f", totalDuration));
            }

            cmd.add(outputPath.toAbsolutePath().toString());

            log.info("Executing FFmpeg (GPU: {}): {}", useGpu, String.join(" ", cmd));

            ProcessBuilder pb = new ProcessBuilder(cmd);
            pb.redirectErrorStream(true);
            Process process = pb.start();

            // 진행률 파싱 및 에러 디버깅을 위한 최근 로그 보관
            Pattern timePattern = Pattern.compile("time=(\\d{2}):(\\d{2}):(\\d{2}\\.\\d+)");
            List<String> recentLogs = new ArrayList<>();

            try (BufferedReader reader =
                    new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    if (recentLogs.size() >= 30) {
                        recentLogs.remove(0);
                    }
                    recentLogs.add(line);

                    Matcher m = timePattern.matcher(line);
                    if (m.find()) {
                        int hours = Integer.parseInt(m.group(1));
                        int mins = Integer.parseInt(m.group(2));
                        double secs = Double.parseDouble(m.group(3));
                        double currentSeconds = (hours * 3600) + (mins * 60) + secs;
                        int progress =
                                (int)
                                        Math.min(
                                                98,
                                                Math.round(
                                                        (currentSeconds / totalDuration) * 80.0
                                                                + 15.0));
                        updateStatus(
                                taskId,
                                "PROCESSING",
                                progress,
                                String.format("동영상 렌더링 중... (%d%%)", progress));
                    }
                }
            }

            int exitCode = process.waitFor();
            if (exitCode != 0) {
                log.error(
                        "FFmpeg exited with code {}. Recent output:\n{}",
                        exitCode,
                        String.join("\n", recentLogs));
                return false;
            }

            log.info("FFmpeg process completed successfully with exit code 0");
            return true;

        } catch (Exception e) {
            log.error("FFmpeg execution error (GPU: {})", useGpu, e);
            return false;
        }
    }

    private void updateStatus(String taskId, String status, int progress, String message) {
        SlideShowTaskStatus task = tasks.get(taskId);
        if (task != null) {
            task.setStatus(status);
            task.setProgress(progress);
            task.setMessage(message);
        }
    }
}
