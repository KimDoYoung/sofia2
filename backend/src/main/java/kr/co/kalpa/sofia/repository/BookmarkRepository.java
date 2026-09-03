package kr.co.kalpa.sofia.repository;

import java.util.List;
import kr.co.kalpa.sofia.domain.Bookmark;
import kr.co.kalpa.sofia.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BookmarkRepository extends JpaRepository<Bookmark, Long> {
    List<Bookmark> findByUserOrderByCreatedAtDesc(User user);

    void deleteByIdAndUser(Long id, User user);

    void deleteByUser(User user);
}
