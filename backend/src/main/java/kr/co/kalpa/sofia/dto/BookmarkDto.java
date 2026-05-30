package kr.co.kalpa.sofia.dto;

import lombok.*;
import java.time.LocalDateTime;

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
