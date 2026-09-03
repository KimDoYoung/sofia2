package kr.co.kalpa.sofia.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, unique = true)
    private String username;

    @Column(name = "user_pw", nullable = false)
    private String password;

    @Column(name = "user_nm")
    private String name;
}
