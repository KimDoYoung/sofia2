package kr.co.kalpa.sofia.dto;

import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ImageExportRequest {
    private List<Long> ids;

    // For Merge
    private Boolean border; // 테두리 적용 여부
    private Integer borderWidth; // 테두리 두께: 1, 2, 3, 4
    private String borderColor; // 테두리 색깔 (default: "#000000")
    private Integer cols; // row당 갯수: 1, 2, 3, 4
    private String widthMode; // "A4", "original", "1900", "custom"
    private Integer customWidth; // 사용자 입력 width (px)
    private Integer gapX; // x축 간격 (0, 1, 2, 3, 4, 5, or 사용자입력)
    private Integer gapY; // y축 간격 (0, 1, 2, 3, 4, 5, or 사용자입력)

    // Legacy fields for backward compatibility
    private String mode;
    private Integer gap;

    // For PDF
    private Integer imagesPerPage; // 1, 2, 4, 6
    private String orientation; // "auto", "portrait", "landscape"
}
