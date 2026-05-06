package kr.co.kalpa.sofia.repository;

import kr.co.kalpa.sofia.domain.ImageFolder;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ImageFolderRepository extends JpaRepository<ImageFolder, Long> {
}
