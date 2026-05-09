package kr.co.kalpa.sofia.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TaskProgressDto {
    private String taskId;
    private int total;
    private int current;
    private String status; // IN_PROGRESS, COMPLETED, FAILED
    private String message;
}
