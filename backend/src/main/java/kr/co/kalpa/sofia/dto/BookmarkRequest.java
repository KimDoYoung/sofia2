package kr.co.kalpa.sofia.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookmarkRequest {
    private Long imageId;
    private String name;
}
