package kr.co.kalpa.sofia.service;

import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.ZonedDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import javax.imageio.ImageIO;
import kr.co.kalpa.sofia.domain.ImageFile;
import kr.co.kalpa.sofia.domain.ImageFolder;
import kr.co.kalpa.sofia.dto.FolderTreeDto;
import kr.co.kalpa.sofia.dto.TaskProgressDto;
import kr.co.kalpa.sofia.repository.ImageFileRepository;
import kr.co.kalpa.sofia.repository.ImageFolderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.coobird.thumbnailator.Thumbnails;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.Sort;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.util.FileSystemUtils;

@Slf4j
@Service
@RequiredArgsConstructor
public class FolderService {

    private final ImageFolderRepository folderRepository;
    private final ImageFileRepository fileRepository;
    private final MetadataService metadataService;
    private final TransactionTemplate transactionTemplate;

    @Autowired @Lazy private FolderService self;

    @Value("${sofia.base.image.folder:./data/images}")
    private String baseImageFolder;

    @Value("${sofia.base.folder:./data}")
    private String baseFolder;

    private final Map<String, TaskProgressDto> taskProgressMap = new ConcurrentHashMap<>();

    public List<ImageFolder> getAllFolders() {
        return folderRepository.findAll(Sort.by(Sort.Direction.DESC, "id"));
    }

    public List<FolderTreeDto> getFolderTree() throws IOException {
        Path basePath = Paths.get(baseImageFolder).toAbsolutePath().normalize();
        if (!Files.exists(basePath)) {
            Files.createDirectories(basePath);
        }

        Set<String> addedFolders =
                folderRepository.findAll().stream()
                        .map(ImageFolder::getFolderName)
                        .collect(Collectors.toSet());

        return buildTree(basePath, "", addedFolders);
    }

    private List<FolderTreeDto> buildTree(
            Path currentPath, String relativePath, Set<String> addedFolders) throws IOException {
        List<FolderTreeDto> tree = new ArrayList<>();
        try (Stream<Path> stream = Files.list(currentPath)) {
            List<Path> directories =
                    stream.filter(Files::isDirectory)
                            .filter(p -> !p.getFileName().toString().startsWith("."))
                            .sorted()
                            .collect(Collectors.toList());

            for (Path dir : directories) {
                String dirName = dir.getFileName().toString();
                String fullRelativePath =
                        relativePath.isEmpty() ? dirName : relativePath + "/" + dirName;

                List<FolderTreeDto> children = buildTree(dir, fullRelativePath, addedFolders);

                tree.add(
                        FolderTreeDto.builder()
                                .name(dirName)
                                .path(fullRelativePath)
                                .isAlreadyAdded(addedFolders.contains(fullRelativePath))
                                .children(children)
                                .build());
            }
        }
        return tree;
    }

    public String addFolderAsync(String folderName) {
        String taskId = UUID.randomUUID().toString();
        taskProgressMap.put(
                taskId,
                TaskProgressDto.builder()
                        .taskId(taskId)
                        .status("IN_PROGRESS")
                        .current(0)
                        .total(0)
                        .build());

        // Start async processing
        self.processFolderInternal(taskId, folderName);

        return taskId;
    }

    @Async
    public void processFolderInternal(String taskId, String folderName) {
        try {
            Path folderPath = Paths.get(baseImageFolder, folderName);
            if (!Files.exists(folderPath) || !Files.isDirectory(folderPath)) {
                updateTaskError(taskId, "Folder does not exist: " + folderName);
                return;
            }

            List<Path> imageFilesPaths;
            try (Stream<Path> stream = Files.list(folderPath)) {
                imageFilesPaths = stream.filter(this::isImageFile).collect(Collectors.toList());
            }

            int total = imageFilesPaths.size();
            updateTaskProgress(taskId, 0, total);

            final ImageFolder folder =
                    transactionTemplate.execute(
                            status -> {
                                ImageFolder f =
                                        ImageFolder.builder()
                                                .folderName(folderName)
                                                .lastLoadTime(ZonedDateTime.now())
                                                .build();
                                return folderRepository.save(f);
                            });

            Path thumbBaseDir = Paths.get(baseFolder, "thumbnails", folder.getId().toString());
            Files.createDirectories(thumbBaseDir);

            int current = 0;
            for (Path filePath : imageFilesPaths) {
                final int seq = current + 1;
                try {
                    transactionTemplate.executeWithoutResult(
                            status -> {
                                try {
                                    processSingleImage(folder.getId(), filePath, thumbBaseDir, seq);
                                } catch (IOException e) {
                                    throw new RuntimeException(e);
                                }
                            });
                    current++;
                    updateTaskProgress(taskId, current, total);
                } catch (Exception e) {
                    log.error("Failed to process image: {}", filePath, e);
                }
            }

            TaskProgressDto progress = taskProgressMap.get(taskId);
            progress.setStatus("COMPLETED");
            progress.setMessage("Successfully processed " + current + " images.");
        } catch (Exception e) {
            log.error("Error in async folder processing", e);
            updateTaskError(taskId, e.getMessage());
        }
    }

    @Transactional
    protected void processSingleImage(Long folderId, Path filePath, Path thumbBaseDir, int seq)
            throws IOException {
        String fileName = filePath.getFileName().toString();
        String extension = fileName.substring(fileName.lastIndexOf(".") + 1).toLowerCase();
        String hashCode = UUID.randomUUID().toString();

        File file = filePath.toFile();
        BufferedImage img = ImageIO.read(file);
        if (img == null) return;

        ImageFolder folder = folderRepository.getReferenceById(folderId);

        ImageFile imageFile =
                ImageFile.builder()
                        .folder(folder)
                        .orgName(fileName)
                        .hashCode(hashCode)
                        .seq(seq)
                        .imageFormat(extension)
                        .imageWidth(img.getWidth())
                        .imageHeight(img.getHeight())
                        .imageMode("RGB")
                        .fileSize(file.length())
                        .build();

        metadataService.extractMetadata(file, imageFile);
        imageFile = fileRepository.save(imageFile);

        // Generate thumbnail
        File thumbFile = thumbBaseDir.resolve(imageFile.getId() + ".jpg").toFile();
        Thumbnails.of(file).size(300, 300).outputFormat("jpg").toFile(thumbFile);
    }

    private void updateTaskProgress(String taskId, int current, int total) {
        TaskProgressDto progress = taskProgressMap.get(taskId);
        if (progress != null) {
            progress.setCurrent(current);
            progress.setTotal(total);
        }
    }

    private void updateTaskError(String taskId, String message) {
        TaskProgressDto progress = taskProgressMap.get(taskId);
        if (progress != null) {
            progress.setStatus("FAILED");
            progress.setMessage(message);
        }
    }

    public TaskProgressDto getTaskProgress(String taskId) {
        return taskProgressMap.get(taskId);
    }

    public List<String> getAvailableSubfolders() throws IOException {
        Path basePath = Paths.get(baseImageFolder);
        if (!Files.exists(basePath)) {
            Files.createDirectories(basePath);
        }

        try (Stream<Path> stream = Files.list(basePath)) {
            return stream.filter(Files::isDirectory)
                    .map(p -> p.getFileName().toString())
                    .collect(Collectors.toList());
        }
    }

    @Transactional
    public ImageFolder addFolder(String folderName) throws IOException {
        Path folderPath = Paths.get(baseImageFolder, folderName);
        if (!Files.exists(folderPath) || !Files.isDirectory(folderPath)) {
            throw new IllegalArgumentException("Folder does not exist: " + folderName);
        }

        ImageFolder folder =
                ImageFolder.builder()
                        .folderName(folderName)
                        .lastLoadTime(ZonedDateTime.now())
                        .build();
        folder = folderRepository.save(folder);

        Path thumbBaseDir = Paths.get(baseFolder, "thumbnails", folder.getId().toString());
        Files.createDirectories(thumbBaseDir);

        List<ImageFile> imageFiles = new ArrayList<>();
        int seq = 1;

        try (Stream<Path> stream = Files.list(folderPath)) {
            List<Path> files = stream.filter(p -> isImageFile(p)).collect(Collectors.toList());

            for (Path filePath : files) {
                try {
                    String fileName = filePath.getFileName().toString();
                    String extension =
                            fileName.substring(fileName.lastIndexOf(".") + 1).toLowerCase();
                    String hashCode = UUID.randomUUID().toString();

                    File file = filePath.toFile();
                    BufferedImage img = ImageIO.read(file);
                    if (img == null) continue;

                    ImageFile imageFile =
                            ImageFile.builder()
                                    .folder(folder)
                                    .orgName(fileName)
                                    .hashCode(hashCode)
                                    .seq(seq++)
                                    .imageFormat(extension)
                                    .imageWidth(img.getWidth())
                                    .imageHeight(img.getHeight())
                                    .imageMode("RGB")
                                    .fileSize(file.length())
                                    .build();

                    metadataService.extractMetadata(file, imageFile);
                    imageFile = fileRepository.save(imageFile);

                    // Generate thumbnail
                    File thumbFile = thumbBaseDir.resolve(imageFile.getId() + ".jpg").toFile();
                    Thumbnails.of(file).size(300, 300).outputFormat("jpg").toFile(thumbFile);

                    imageFiles.add(imageFile);
                } catch (Exception e) {
                    log.error("Failed to process image: {}", filePath, e);
                }
            }
        }

        folder.setImageFiles(imageFiles);
        return folder;
    }

    @Transactional
    public ImageFolder updateFolderNote(Long id, String note) {
        ImageFolder folder =
                folderRepository
                        .findById(id)
                        .orElseThrow(
                                () ->
                                        new IllegalArgumentException(
                                                "Folder not found with id: " + id));
        folder.setNote(note);
        return folderRepository.save(folder);
    }

    @Transactional
    public void deleteFolder(Long id) throws IOException {
        ImageFolder folder =
                folderRepository
                        .findById(id)
                        .orElseThrow(
                                () ->
                                        new IllegalArgumentException(
                                                "Folder not found with id: " + id));

        // Delete from database (cascades to image files)
        folderRepository.delete(folder);

        // Delete thumbnails folder
        Path thumbBaseDir = Paths.get(baseFolder, "thumbnails", id.toString());
        if (Files.exists(thumbBaseDir)) {
            FileSystemUtils.deleteRecursively(thumbBaseDir);
        }
    }

    private boolean isImageFile(Path path) {
        String name = path.getFileName().toString().toLowerCase();
        return Files.isRegularFile(path)
                && (name.endsWith(".jpg")
                        || name.endsWith(".jpeg")
                        || name.endsWith(".png")
                        || name.endsWith(".webp")
                        || name.endsWith(".tiff"));
    }
}
