package kr.co.kalpa.sofia;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.servlet.support.SpringBootServletInitializer;
import org.springframework.scheduling.annotation.EnableAsync;

@EnableAsync
@SpringBootApplication
public class SofiaApplication extends SpringBootServletInitializer {

    @Override
    protected SpringApplicationBuilder configure(SpringApplicationBuilder application) {
        String mode = System.getenv("SOFIA_MODE");
        if (mode == null || mode.isEmpty()) {
            mode = System.getenv("SPRING_PROFILES_ACTIVE");
        }
        if (mode == null || mode.isEmpty()) {
            mode = "jskn";
        }
        return application.sources(SofiaApplication.class).profiles(mode);
    }

    public static void main(String[] args) {
        String mode = System.getenv("SOFIA_MODE");
        if (mode == null || mode.isEmpty()) {
            mode = "local"; // Default to local
        }
        System.setProperty("spring.profiles.active", mode);

        SpringApplication.run(SofiaApplication.class, args);
    }
}
