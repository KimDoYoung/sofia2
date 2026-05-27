package kr.co.kalpa.sofia.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "user_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserSetting {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @Column(name = "image_transition", length = 20, nullable = false)
    @Builder.Default
    private String imageTransition = "fade";
}
