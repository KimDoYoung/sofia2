package kr.co.kalpa.sofia.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SlideshowArchiveRequest {
    private String displayFilename;
    private String note;
    private Integer elapsedMs;
}
