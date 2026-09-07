package kr.co.kalpa.sofia.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

    private static final Logger log = LoggerFactory.getLogger(HealthController.class);

    @Value("${sofia.version:unknown}")
    private String version;

    private final ObjectMapper objectMapper;

    public HealthController(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @GetMapping({"/health", "/api/health"})
    public Map<String, String> health() {
        Map<String, String> status = new HashMap<>();
        status.put("status", "UP");
        status.put("version", version);
        status.put("time", LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
        return status;
    }

    @GetMapping({"/history", "/api/history"})
    public ResponseEntity<Object> history() {
        try {
            ClassPathResource resource = new ClassPathResource("history.json");
            if (!resource.exists()) {
                return ResponseEntity.ok(Collections.emptyList());
            }
            try (InputStream is = resource.getInputStream()) {
                JsonNode jsonNode = objectMapper.readTree(is);
                return ResponseEntity.ok(jsonNode);
            }
        } catch (Exception e) {
            log.error("Failed to load history.json", e);
            return ResponseEntity.ok(Collections.emptyList());
        }
    }
}
