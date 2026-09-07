package kr.co.kalpa.sofia.dto;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BgmAssetDto {
    private String filename;
    private String originalName;
    private long size;
    private String formattedSize;
    private String streamUrl;
    private LocalDateTime modifiedAt;
}
