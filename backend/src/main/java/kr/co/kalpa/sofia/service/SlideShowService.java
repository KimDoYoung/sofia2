package kr.co.kalpa.sofia.service;

import jakarta.annotation.PostConstruct;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Random;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import kr.co.kalpa.sofia.domain.ImageFile;
import kr.co.kalpa.sofia.dto.SlideShowRequest;
import kr.co.kalpa.sofia.dto.SlideShowTaskStatus;
import kr.co.kalpa.sofia.repository.ImageFileRepository;
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
    private final BgmAssetService bgmAssetService;

    @Value("${sofia.base.folder:./data}")
    private String baseFolder;

    @Value("${sofia.base.image.folder:${sofia.base.folder}/images}")
    private String baseImageFolder;

    private final Map<String, SlideShowTaskStatus> tasks = new ConcurrentHashMap<>();

    private Path tempVideoDir;

    private static final List<Double> RANDOM_DURATION_POOL = List.of(2.0, 3.0, 4.0);
    private static final List<String> ALL_TRANSITIONS =
            List.of(
                    "fade",
                    "circlecrop",
                    "slideleft",
                    "slideright",
                    "pixelize",
                    "hblur",
                    "dissolve",
                    "wipeleft");
    private static final Random RANDOM = new Random();
    private static final List<String> EFFECT_POOL =
            List.of("sunlight", "bokeh", "lightleak", "grain", "snow", "vintage", "blackwhite");
    private static final List<String> OLD_STYLE_EFFECT_POOL = List.of("vintage", "blackwhite");

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

            // 사진별 재생시간: "random"이면 각 사진마다 남은 프리셋(2/3/4초) 중 하나를 독립적으로 무작위 선택
            List<Double> durations = new ArrayList<>(n);
            String rawDuration = request.getDurationPerImage();
            boolean randomDuration =
                    "random".equalsIgnoreCase(rawDuration == null ? "" : rawDuration.trim());
            if (randomDuration) {
                for (int i = 0; i < n; i++) {
                    durations.add(
                            RANDOM_DURATION_POOL.get(RANDOM.nextInt(RANDOM_DURATION_POOL.size())));
                }
            } else {
                double fixedDuration = 3.0;
                try {
                    if (StringUtils.hasText(rawDuration)) {
                        double parsed = Double.parseDouble(rawDuration.trim());
                        if (parsed >= 1.0) {
                            fixedDuration = parsed;
                        }
                    }
                } catch (NumberFormatException ignored) {
                    // 파싱 실패 시 기본값(3.0초) 유지
                }
                for (int i = 0; i < n; i++) {
                    durations.add(fixedDuration);
                }
            }

            // 크로스페이드 길이: 가장 짧은 슬라이드보다 짧아야 하므로 그 기준으로 클램프
            double minDuration =
                    durations.stream().mapToDouble(Double::doubleValue).min().orElse(3.0);
            double transDuration =
                    (request.getTransitionDuration() != null
                                    && request.getTransitionDuration() >= 0.2)
                            ? request.getTransitionDuration()
                            : 0.8;
            if (transDuration >= minDuration) {
                transDuration = minDuration * 0.4;
            }

            // 컷별 전환 효과(n-1개): "random"이면 컷마다 8개 전환효과 중 하나를 독립적으로 무작위 선택
            String rawTransition =
                    StringUtils.hasText(request.getTransition())
                            ? request.getTransition().toLowerCase().trim()
                            : "fade";
            boolean randomTransition = "random".equals(rawTransition);
            List<String> transitions = new ArrayList<>(Math.max(0, n - 1));
            for (int i = 0; i < n - 1; i++) {
                if (randomTransition) {
                    transitions.add(ALL_TRANSITIONS.get(RANDOM.nextInt(ALL_TRANSITIONS.size())));
                } else {
                    transitions.add(
                            ALL_TRANSITIONS.contains(rawTransition) ? rawTransition : "fade");
                }
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

            double totalDuration =
                    durations.stream().mapToDouble(Double::doubleValue).sum()
                            - ((n - 1) * transDuration);

            // BGM 확인
            Path bgmPath = null;
            if (StringUtils.hasText(request.getBgmFilename())) {
                bgmPath = bgmAssetService.getBgmFilePath(request.getBgmFilename());
            }
            boolean hasAudio = (bgmPath != null && Files.exists(bgmPath));

            // 슬라이드별 효과: 모드에 따라 뽑을 풀을 결정하고, 사진마다 독립적으로 하나씩 무작위 배정
            // random: 7개 효과 전체 중 무작위 / oldstyle: 세피아·흑백 중 무작위 / none: 효과 없음
            String effectMode =
                    StringUtils.hasText(request.getEffectMode())
                            ? request.getEffectMode().trim().toLowerCase()
                            : "none";
            List<String> effectPool;
            if ("random".equals(effectMode)) {
                effectPool = EFFECT_POOL;
            } else if ("oldstyle".equals(effectMode)) {
                effectPool = OLD_STYLE_EFFECT_POOL;
            } else {
                effectPool = null;
            }
            List<String> slideEffects = new ArrayList<>(n);
            for (int i = 0; i < n; i++) {
                slideEffects.add(
                        effectPool != null
                                ? effectPool.get(RANDOM.nextInt(effectPool.size()))
                                : "none");
            }

            // geq 기반 효과(sunlight/bokeh/lightleak/snow)는 슬라이드마다 별도의 lavfi 입력이
            // 필요하다. "grain"은 ffmpeg 내장 noise/vignette 필터만 사용하므로 추가 입력이 없다.
            // 추가 입력은 반드시 이미지들 + (있다면) 오디오 "다음"에 순서대로 붙여야
            // imagePaths.size():a 오디오 매핑이 깨지지 않는다.
            int nextExtraInputIndex = n + (hasAudio ? 1 : 0);
            int[] geqInputIndexForSlide = new int[n];
            List<Double> extraLavfiDurations = new ArrayList<>();
            for (int i = 0; i < n; i++) {
                String eff = slideEffects.get(i);
                if ("sunlight".equals(eff)
                        || "bokeh".equals(eff)
                        || "lightleak".equals(eff)
                        || "snow".equals(eff)) {
                    geqInputIndexForSlide[i] = nextExtraInputIndex;
                    extraLavfiDurations.add(durations.get(i));
                    nextExtraInputIndex++;
                } else {
                    geqInputIndexForSlide[i] = -1;
                }
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

                String slideEffect = slideEffects.get(i);
                if (geqInputIndexForSlide[i] < 0 && !"none".equals(slideEffect)) {
                    // grain/vintage/blackwhite: ffmpeg 내장 필터만으로 처리, 추가 입력 불필요
                    filter.append(
                            String.format(
                                    "[bg%d][fg%d]overlay=(W-w)/2:(H-h)/2,setsar=1,fps=30%s[v%d];\n",
                                    i, i, simpleEffectFilterSuffix(slideEffect), i));
                } else if (geqInputIndexForSlide[i] >= 0) {
                    // 저해상도로 효과 패턴을 만든 뒤 확대하여 screen 블렌드로 합성
                    // (screen은 항상 밝게만 만들어 원본을 어둡게 하지 않는다)
                    filter.append(
                            String.format(
                                    "[bg%d][fg%d]overlay=(W-w)/2:(H-h)/2,setsar=1,fps=30[v%d_base];\n",
                                    i, i, i));
                    filter.append(
                            String.format(
                                    Locale.US,
                                    "[%d:v]geq=%s,gblur=sigma=2,scale=%d:%d[eff%d];\n",
                                    geqInputIndexForSlide[i],
                                    buildEffectGeq(slideEffect, i),
                                    width,
                                    height,
                                    i));
                    filter.append(
                            String.format(
                                    Locale.US,
                                    "[v%d_base][eff%d]blend=all_mode=screen:all_opacity=%.2f,format=yuv420p[v%d];\n",
                                    i,
                                    i,
                                    effectBlendOpacity(slideEffect),
                                    i));
                } else {
                    filter.append(
                            String.format(
                                    "[bg%d][fg%d]overlay=(W-w)/2:(H-h)/2,setsar=1,fps=30[v%d];\n",
                                    i, i, i));
                }
            }

            // xfade transition chain (가변 재생시간에 맞춰 누적 오프셋 계산)
            double cumulativeOffset = 0.0;
            for (int i = 1; i < n; i++) {
                cumulativeOffset += (durations.get(i - 1) - transDuration);
                String cutTransition = transitions.get(i - 1);
                String in1 = (i == 1) ? "[v0]" : String.format("[vx%d]", i - 1);
                String in2 = String.format("[v%d]", i);
                String out = (i == n - 1) ? "[vout]" : String.format("[vx%d]", i);
                filter.append(
                        String.format(
                                Locale.US,
                                "%s%sxfade=transition=%s:duration=%.2f:offset=%.2f%s;\n",
                                in1,
                                in2,
                                cutTransition,
                                transDuration,
                                cumulativeOffset,
                                out));
            }

            String filterString = filter.toString();
            outputPath = tempVideoDir.resolve(taskId + ".mp4");

            updateStatus(taskId, "PROCESSING", 15, "비디오 인코딩 시작 중...");

            // FFmpeg 실행 (1차: NVENC GPU 가속, 2차 실패 시: CPU libx264 fallback)
            // GPU->CPU 재시도 시에도 동일한 durations/transitions/slideEffects를 재사용해야
            // 재시도마다 다른 랜덤 결과가 나오지 않는다.
            boolean success =
                    executeFfmpeg(
                            taskId,
                            imagePaths,
                            bgmPath,
                            filterString,
                            outputPath,
                            durations,
                            totalDuration,
                            true,
                            extraLavfiDurations,
                            blurW,
                            blurH);

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
                                durations,
                                totalDuration,
                                false,
                                extraLavfiDurations,
                                blurW,
                                blurH);
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
            List<Double> imageDurations,
            double totalDuration,
            boolean useGpu,
            List<Double> extraLavfiDurations,
            int lavfiWidth,
            int lavfiHeight) {
        try {
            List<String> cmd = new ArrayList<>();
            cmd.add("ffmpeg");
            cmd.add("-y");

            // 이미지 입력들 (사진별로 다른 재생시간 적용)
            for (int i = 0; i < imagePaths.size(); i++) {
                cmd.add("-loop");
                cmd.add("1");
                cmd.add("-t");
                cmd.add(String.format(Locale.US, "%.2f", imageDurations.get(i)));
                cmd.add("-i");
                cmd.add(imagePaths.get(i).toAbsolutePath().toString());
            }

            // 오디오 입력
            boolean hasAudio = (bgmPath != null && Files.exists(bgmPath));
            if (hasAudio) {
                cmd.add("-stream_loop");
                cmd.add("-1");
                cmd.add("-i");
                cmd.add(bgmPath.toAbsolutePath().toString());
            }

            // 슬라이드별 효과 입력들 (반드시 오디오 "다음"에, slideEffects 배정 순서 그대로 추가
            // — imagePaths.size():a 오디오 매핑을 건드리지 않고, runGeneration에서 계산한
            // geqInputIndexForSlide와 순서가 일치해야 한다)
            for (double effectDuration : extraLavfiDurations) {
                cmd.add("-f");
                cmd.add("lavfi");
                cmd.add("-i");
                cmd.add(
                        String.format(
                                Locale.US,
                                "nullsrc=size=%dx%d:rate=30:duration=%.2f",
                                lavfiWidth,
                                lavfiHeight,
                                effectDuration));
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

    // "grain"/"vintage"처럼 추가 입력 없이 ffmpeg 내장 필터만으로 슬라이드에
    // 직접 적용하는 효과의 필터 체인 조각(맨 앞에 콤마 포함)을 반환한다.
    private static String simpleEffectFilterSuffix(String effect) {
        if ("vintage".equals(effect)) {
            // 오래된 사진 느낌: 세피아 톤 + 대비/밝기 살짝 낮춤 + 비네트 + 필름 그레인
            return ",eq=contrast=0.92:brightness=0.02,"
                    + "colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131:0,"
                    + "vignette=PI/5,noise=alls=10:allf=t";
        }
        if ("blackwhite".equals(effect)) {
            // 진짜 흑백 사진: 채도 제거 + 대비 살짝 올림 + 비네트 + 필름 그레인
            return ",eq=contrast=1.08:brightness=0.0,hue=s=0,vignette=PI/5,noise=alls=10:allf=t";
        }
        // grain (기본): 컬러는 유지한 채 필름 그레인 + 비네트만
        return ",noise=alls=20:allf=t,vignette";
    }

    // ─────────────────────────────────────────────────────────────
    // 슬라이드별 "효과"(sunlight/bokeh/lightleak/snow) geq 표현식 생성
    // 각 효과는 저해상도 nullsrc 입력 위에 geq로 패턴을 그린 뒤 blur+scale로 확대해
    // screen 블렌드로 합성한다. seedIndex(슬라이드 순번)를 위상에 섞어 슬라이드마다
    // 같은 효과라도 조금씩 다르게 보이도록 한다.
    // ─────────────────────────────────────────────────────────────

    private static String buildEffectGeq(String effect, int seedIndex) {
        switch (effect) {
            case "bokeh":
                return bokehGeq(seedIndex);
            case "lightleak":
                return lightLeakGeq(seedIndex);
            case "snow":
                return snowGeq(seedIndex);
            case "sunlight":
            default:
                return sunlightGeq(seedIndex);
        }
    }

    private static double effectBlendOpacity(String effect) {
        switch (effect) {
            case "bokeh":
                return 0.45;
            case "lightleak":
                return 0.45;
            case "snow":
                return 0.55;
            case "sunlight":
            default:
                return 0.35;
        }
    }

    private static String sunlightGeq(int seedIndex) {
        double phase = seedIndex * 1.7;
        return String.format(
                Locale.US,
                "r='200+55*sin(6*atan2(Y-H/2,X-W/2)+T*0.6+%.2f)*exp(-((X-W/2)*(X-W/2)+(Y-H/2)*(Y-H/2))/(2*(W*0.35)*(W*0.35)))':"
                    + "g='170+40*sin(6*atan2(Y-H/2,X-W/2)+T*0.6+%.2f)*exp(-((X-W/2)*(X-W/2)+(Y-H/2)*(Y-H/2))/(2*(W*0.35)*(W*0.35)))':"
                    + "b='90+20*sin(6*atan2(Y-H/2,X-W/2)+T*0.6+%.2f)*exp(-((X-W/2)*(X-W/2)+(Y-H/2)*(Y-H/2))/(2*(W*0.35)*(W*0.35)))'",
                phase,
                phase,
                phase);
    }

    // 부드러운 원형 빛방울 3개가 살짝 흔들리며 떠 있는 패턴 (보케)
    private static String bokehCore(int seedIndex) {
        double p = seedIndex * 0.9;
        double[] baseX = {0.2, 0.75, 0.5};
        double[] baseY = {0.3, 0.6, 0.85};
        double[] amp = {150, 170, 130};
        double[] rad = {0.10, 0.09, 0.08};
        StringBuilder sb = new StringBuilder("(");
        for (int k = 0; k < 3; k++) {
            if (k > 0) {
                sb.append("+");
            }
            double sway = 10 + k * 2;
            double speed = 0.4 + k * 0.1;
            sb.append(
                    String.format(
                            Locale.US,
                            "%.0f*exp(-(st(0,hypot(X-(%.3f*W+%.1f*sin(T*%.2f+%.2f)),Y-(%.3f*H+%.1f*cos(T*%.2f+%.2f))))*ld(0))/(2*%.2f*W*%.2f*W))",
                            amp[k],
                            baseX[k],
                            sway,
                            speed,
                            p,
                            baseY[k],
                            sway,
                            speed,
                            p,
                            rad[k],
                            rad[k]));
        }
        sb.append(")");
        return sb.toString();
    }

    private static String bokehGeq(int seedIndex) {
        String core = bokehCore(seedIndex);
        return "r='" + core + "':g='" + core + "*0.9':b='" + core + "*0.7'";
    }

    // 화면 모서리에서 슬며시 새어 들어와 서서히 가로지르는 컬러 빛샘 (4개 모서리 중 하나에서 시작)
    private static String lightLeakGeq(int seedIndex) {
        double[] startX = {-0.15, 1.15, -0.15, 1.15};
        double[] startY = {0.15, 0.15, 0.85, 0.85};
        double[] speedX = {0.5, -0.5, 0.5, -0.5};
        int corner = ((seedIndex % 4) + 4) % 4;
        String core =
                String.format(
                        Locale.US,
                        "200*exp(-(st(0,hypot(X-(%.2f*W+T*%.2f*W),Y-(%.2f*H)))*ld(0))/(2*0.30*W*0.30*W))",
                        startX[corner],
                        speedX[corner],
                        startY[corner]);
        return "r='" + core + "':g='" + core + "*0.55':b='" + core + "*0.2'";
    }

    // 위에서 아래로 순환하며 떨어지는 작은 눈송이/컨페티 8개
    private static String snowCore(int seedIndex) {
        int dots = 8;
        StringBuilder sb = new StringBuilder("(");
        for (int k = 0; k < dots; k++) {
            if (k > 0) {
                sb.append("+");
            }
            double xFrac = (0.08 + 0.11 * k) % 1.0;
            double yStartFrac = ((k * 47 + seedIndex * 31) % 100) / 100.0;
            double fallSpeed = 0.12 + 0.015 * (k % 4);
            sb.append(
                    String.format(
                            Locale.US,
                            "150*exp(-(st(0,hypot(X-(%.3f*W+6*sin(T*0.7+%d)),Y-mod(%.3f*H+T*%.3f*H,H)))*ld(0))/(2*0.018*W*0.018*W))",
                            xFrac,
                            k,
                            yStartFrac,
                            fallSpeed));
        }
        sb.append(")");
        return sb.toString();
    }

    private static String snowGeq(int seedIndex) {
        String core = snowCore(seedIndex);
        return "r='" + core + "':g='" + core + "':b='" + core + "'";
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
