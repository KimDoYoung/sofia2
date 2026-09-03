package kr.co.kalpa.sofia.repository;

import java.util.List;
import kr.co.kalpa.sofia.domain.ImageFile;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ImageFileRepository extends JpaRepository<ImageFile, Long> {
    List<ImageFile> findByFolderIdOrderByOrgNameAsc(Long folderId);

    List<ImageFile> findByFolderIdOrderBySeqAsc(Long folderId);

    long countByFolderId(Long folderId);
}
