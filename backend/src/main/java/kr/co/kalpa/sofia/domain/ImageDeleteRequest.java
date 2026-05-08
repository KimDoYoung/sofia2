package kr.co.kalpa.sofia.domain;

import lombok.Data;
import java.util.List;

@Data
public class ImageDeleteRequest {
    private List<Long> ids;
}
