package kr.co.kalpa.sofia.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "image_files")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ImageFile {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String orgName;

    @Column(nullable = false)
    private String hashCode;

    @Column(nullable = false)
    private Integer seq;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "folder_id")
    private ImageFolder folder;

    @Column(nullable = false)
    private String imageFormat;

    @Column(nullable = false)
    private Integer imageWidth;

    @Column(nullable = false)
    private Integer imageHeight;

    @Column(nullable = false)
    private String imageMode;

    private String colorPalette;

    private String cameraManufacturer;

    private String cameraModel;

    private LocalDateTime captureDateTime;

    private Double shutterSpeed;

    private Double apertureValue;

    private Integer isoSpeed;

    private Double focalLength;

    private Double gpsLatitude;

    private Double gpsLongitude;

    private String imageOrientation;
}
