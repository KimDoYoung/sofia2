package kr.co.kalpa.sofia.repository;

import java.util.List;
import java.util.Optional;
import kr.co.kalpa.sofia.domain.ArchivedOutput;
import kr.co.kalpa.sofia.domain.OutputType;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ArchivedOutputRepository extends JpaRepository<ArchivedOutput, Long> {
    List<ArchivedOutput> findByTypeOrderByCreatedAtDesc(OutputType type);

    List<ArchivedOutput> findAllByOrderByCreatedAtDesc();

    Optional<ArchivedOutput> findByShareKey(String shareKey);

    Optional<ArchivedOutput> findByShareKeyAndIsPublicTrue(String shareKey);
}
