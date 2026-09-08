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
    @Builder.Default private String durationPerImage = "3.0"; // "random" 또는 숫자 문자열
    @Builder.Default private String transition = "fade"; // "random" 또는 전환효과 이름
    @Builder.Default private Double transitionDuration = 0.8;
    @Builder.Default private Boolean kenBurns = true;
    @Builder.Default private String aspectRatio = "16:9"; // "16:9", "9:16", "1:1"
    private String bgmFilename;
    private String videoTitle;
    // "random"(전체 효과 중 무작위) / "oldstyle"(세피아·흑백 중 무작위) / "none"(효과 없음)
    @Builder.Default private String effectMode = "none";
}
