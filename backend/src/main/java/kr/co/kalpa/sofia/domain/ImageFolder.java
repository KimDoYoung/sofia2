package kr.co.kalpa.sofia.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "image_folders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ImageFolder {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String folderName;

    private ZonedDateTime lastLoadTime;

    private String note;

    @OneToMany(mappedBy = "folder", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    @JsonIgnore
    private List<ImageFile> imageFiles = new ArrayList<>();
}
