package kr.co.kalpa.sofia.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.*;

@Entity
@Table(name = "archived_outputs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ArchivedOutput {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OutputType type;

    @Column(nullable = false, unique = true)
    private String storedFilename;

    @Column(nullable = false)
    private String displayFilename;

    @Column(columnDefinition = "text")
    private String note;

    private Long sourceFolderId;

    @Column(nullable = false)
    private Long fileSize;

    @Column(nullable = false, length = 10)
    private String fileExtension;

    private Integer elapsedMs;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
