package kr.co.kalpa.sofia.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ArchivedOutputUpdateRequest {
    private String note;
    private String displayFilename;
    private Boolean isPublic;
}
