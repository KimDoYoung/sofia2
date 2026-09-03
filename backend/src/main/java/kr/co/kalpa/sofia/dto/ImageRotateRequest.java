package kr.co.kalpa.sofia.dto;

import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ImageRotateRequest {
    private List<Long> ids;
    private int angle;
}
