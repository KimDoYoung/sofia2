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
        // User data already exists in DB (kdy987/1111)
    }
}
