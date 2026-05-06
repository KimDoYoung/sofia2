package kr.co.kalpa.sofia.repository;

import kr.co.kalpa.sofia.domain.ImageFile;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ImageFileRepository extends JpaRepository<ImageFile, Long> {
}
