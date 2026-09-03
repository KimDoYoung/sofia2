package kr.co.kalpa.sofia.controller;

import java.util.Map;
import java.util.Set;
import kr.co.kalpa.sofia.domain.UserSetting;
import kr.co.kalpa.sofia.repository.UserSettingRepository;
import kr.co.kalpa.sofia.security.UserDetailsImpl;
import kr.co.kalpa.sofia.security.UserDetailsServiceImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserDetailsServiceImpl userDetailsService;
    private final UserSettingRepository userSettingRepository;

    private static final Set<String> VALID_TRANSITIONS = Set.of("none", "fade", "slide", "zoom");

    @PutMapping("/password")
    public ResponseEntity<?> updatePassword(@RequestBody Map<String, String> request) {
        UserDetailsImpl userDetails =
                (UserDetailsImpl)
                        SecurityContextHolder.getContext().getAuthentication().getPrincipal();

        String currentPassword = request.get("currentPassword");
        String newPassword = request.get("newPassword");

        try {
            userDetailsService.updatePassword(userDetails.getId(), currentPassword, newPassword);
            return ResponseEntity.ok("비밀번호가 성공적으로 변경되었습니다.");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/settings")
    public ResponseEntity<UserSetting> getSettings() {
        UserDetailsImpl userDetails =
                (UserDetailsImpl)
                        SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        UserSetting setting =
                userSettingRepository
                        .findById(userDetails.getId())
                        .orElseGet(() -> UserSetting.builder().userId(userDetails.getId()).build());
        return ResponseEntity.ok(setting);
    }

    @PutMapping("/settings")
    public ResponseEntity<?> updateSettings(@RequestBody Map<String, String> request) {
        UserDetailsImpl userDetails =
                (UserDetailsImpl)
                        SecurityContextHolder.getContext().getAuthentication().getPrincipal();

        String transition = request.get("imageTransition");
        if (transition == null || !VALID_TRANSITIONS.contains(transition)) {
            return ResponseEntity.badRequest().body("유효하지 않은 값입니다.");
        }

        UserSetting setting =
                userSettingRepository
                        .findById(userDetails.getId())
                        .orElseGet(() -> UserSetting.builder().userId(userDetails.getId()).build());
        setting.setImageTransition(transition);
        userSettingRepository.save(setting);
        return ResponseEntity.ok(setting);
    }
}
