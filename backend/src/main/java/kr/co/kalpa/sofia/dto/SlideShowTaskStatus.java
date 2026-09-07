package kr.co.kalpa.sofia.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SlideShowTaskStatus {
    private String taskId;
    @Builder.Default private String status = "PENDING"; // PENDING, PROCESSING, COMPLETED, FAILED
    @Builder.Default private int progress = 0;
    private String message;
    private String streamUrl;
    private String downloadUrl;
    private String filePath;
    private Long folderId;
    private String error;
}
