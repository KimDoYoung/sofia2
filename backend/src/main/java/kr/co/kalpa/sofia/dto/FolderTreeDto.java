package kr.co.kalpa.sofia.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class FolderTreeDto {
    private String name;
    private String path;
    private boolean isAlreadyAdded;
    private List<FolderTreeDto> children;
}
