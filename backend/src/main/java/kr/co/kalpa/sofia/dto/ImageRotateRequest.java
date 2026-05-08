package kr.co.kalpa.sofia.dto;

import lombok.Getter;
import lombok.Setter;
import java.util.List;

@Getter
@Setter
public class ImageRotateRequest {
    private List<Long> ids;
    private int angle;
}
