package kr.co.kalpa.sofia;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class SofiaApplication {
    public static void main(String[] args) {
        String mode = System.getenv("SOFIA_MODE");
        if (mode == null || mode.isEmpty()) {
            mode = "local"; // Default to local
        }
        System.setProperty("spring.profiles.active", mode);
        
        SpringApplication.run(SofiaApplication.class, args);
    }
}
