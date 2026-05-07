package kr.co.kalpa.sofia.service;

import kr.co.kalpa.sofia.domain.ImageFile;
import kr.co.kalpa.sofia.domain.ImageFolder;
import kr.co.kalpa.sofia.repository.ImageFileRepository;
import kr.co.kalpa.sofia.repository.ImageFolderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.coobird.thumbnailator.Thumbnails;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Slf4j
@Service
@RequiredArgsConstructor
public class FolderService {

    private final ImageFolderRepository folderRepository;
    private final ImageFileRepository fileRepository;
    private final MetadataService metadataService;

    @Value("${sofia.base.image.folder:./data/images}")
    private String baseImageFolder;

    @Value("${sofia.base.folder:./data}")
    private String baseFolder;

    public List<ImageFolder> getAllFolders() {
        return folderRepository.findAll();
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

        ImageFolder folder = ImageFolder.builder()
                .folderName(folderName)
                .lastLoadTime(ZonedDateTime.now())
                .build();
        folder = folderRepository.save(folder);

        Path thumbBaseDir = Paths.get(baseFolder, "thumbnails", folder.getId().toString());
        Files.createDirectories(thumbBaseDir);

        List<ImageFile> imageFiles = new ArrayList<>();
        int seq = 1;

        try (Stream<Path> stream = Files.list(folderPath)) {
            List<Path> files = stream.filter(p -> isImageFile(p))
                    .collect(Collectors.toList());

            for (Path filePath : files) {
                try {
                    String fileName = filePath.getFileName().toString();
                    String extension = fileName.substring(fileName.lastIndexOf(".") + 1).toLowerCase();
                    String hashCode = UUID.randomUUID().toString();

                    File file = filePath.toFile();
                    BufferedImage img = ImageIO.read(file);
                    if (img == null) continue;

                    ImageFile imageFile = ImageFile.builder()
                            .folder(folder)
                            .orgName(fileName)
                            .hashCode(hashCode)
                            .seq(seq++)
                            .imageFormat(extension)
                            .imageWidth(img.getWidth())
                            .imageHeight(img.getHeight())
                            .imageMode("RGB")
                            .build();

                    metadataService.extractMetadata(file, imageFile);
                    imageFile = fileRepository.save(imageFile);

                    // Generate thumbnail
                    File thumbFile = thumbBaseDir.resolve(imageFile.getId() + ".jpg").toFile();
                    Thumbnails.of(file)
                            .size(300, 300)
                            .outputFormat("jpg")
                            .toFile(thumbFile);

                    imageFiles.add(imageFile);
                } catch (Exception e) {
                    log.error("Failed to process image: {}", filePath, e);
                }
            }
        }

        folder.setImageFiles(imageFiles);
        return folder;
    }

    private boolean isImageFile(Path path) {
        String name = path.getFileName().toString().toLowerCase();
        return Files.isRegularFile(path) && 
               (name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".png") || name.endsWith(".webp") || name.endsWith(".tiff"));
    }
}
