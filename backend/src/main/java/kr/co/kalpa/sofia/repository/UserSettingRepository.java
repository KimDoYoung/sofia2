package kr.co.kalpa.sofia.repository;

import kr.co.kalpa.sofia.domain.UserSetting;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserSettingRepository extends JpaRepository<UserSetting, Long> {
}
