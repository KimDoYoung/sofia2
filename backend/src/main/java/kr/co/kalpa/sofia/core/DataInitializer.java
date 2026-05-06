package kr.co.kalpa.sofia.core;

import kr.co.kalpa.sofia.domain.ImageFolder;
import kr.co.kalpa.sofia.domain.User;
import kr.co.kalpa.sofia.repository.ImageFolderRepository;
import kr.co.kalpa.sofia.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.ZonedDateTime;
import java.util.Set;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final ImageFolderRepository imageFolderRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (userRepository.findByUsername("admin").isEmpty()) {
            User admin = User.builder()
                    .username("admin")
                    .password(passwordEncoder.encode("admin123"))
                    .roles(Set.of("ROLE_ADMIN", "ROLE_USER"))
                    .build();
            userRepository.save(admin);
        }

        if (imageFolderRepository.findAll().isEmpty()) {
            ImageFolder defaultFolder = ImageFolder.builder()
                    .folderName("Default Folder")
                    .lastLoadTime(ZonedDateTime.now())
                    .note("Initial default folder")
                    .build();
            imageFolderRepository.save(defaultFolder);
        }
    }
}
