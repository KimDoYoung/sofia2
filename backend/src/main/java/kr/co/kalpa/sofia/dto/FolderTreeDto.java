package kr.co.kalpa.sofia.dto;

import java.util.List;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class FolderTreeDto {
    private String name;
    private String path;
    private boolean isAlreadyAdded;
    private List<FolderTreeDto> children;
}
