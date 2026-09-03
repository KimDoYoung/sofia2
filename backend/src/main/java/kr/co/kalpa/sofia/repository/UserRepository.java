package kr.co.kalpa.sofia.repository;

import java.util.Optional;
import kr.co.kalpa.sofia.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
}
