package kr.co.kalpa.sofia.dto;

import java.time.LocalDateTime;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookmarkDto {
    private Long id;
    private Long imageId;
    private Long folderId;
    private String imageName;
    private String folderName;
    private String name;
    private LocalDateTime createdAt;
}
