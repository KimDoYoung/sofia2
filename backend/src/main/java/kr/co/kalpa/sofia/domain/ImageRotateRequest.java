package kr.co.kalpa.sofia.domain;

import lombok.Data;
import java.util.List;

@Data
public class ImageRotateRequest {
    private List<Long> ids;
    private int angle; // 90 or 180
}
