package kr.co.kalpa.sofia.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SlideShowRequest {
    private List<Long> imageIds;
    private Long folderId;
    @Builder.Default private Double durationPerImage = 3.0;
    @Builder.Default private String transition = "fade";
    @Builder.Default private Double transitionDuration = 0.8;
    @Builder.Default private Boolean kenBurns = true;
    @Builder.Default private String aspectRatio = "16:9"; // "16:9", "9:16", "1:1"
    private String bgmFilename;
    private String videoTitle;
}
