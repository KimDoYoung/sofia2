package kr.co.kalpa.sofia.repository;

import kr.co.kalpa.sofia.domain.ImageFile;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ImageFileRepository extends JpaRepository<ImageFile, Long> {
    List<ImageFile> findByFolderIdOrderBySeqAsc(Long folderId);
    long countByFolderId(Long folderId);
}
