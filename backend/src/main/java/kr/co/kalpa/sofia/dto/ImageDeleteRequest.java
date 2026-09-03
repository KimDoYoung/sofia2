package kr.co.kalpa.sofia.dto;

import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ImageDeleteRequest {
    private List<Long> ids;
}
