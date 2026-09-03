package kr.co.kalpa.sofia.dto;

import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ImageExportRequest {
    private List<Long> ids;

    // For Merge
    private String mode; // "fitPage" or "scroll"
    private Integer cols;
    private Integer gap;

    // For PDF
    private Integer imagesPerPage; // 1, 2, 4, 6
    private String orientation; // "auto", "portrait", "landscape"
}
