package com.crm.entity;

import com.crm.entity.enums.UserRole;
import com.crm.security.RolePermissionRegistry;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.UUID;

@Entity
@Table(name = "users", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"tenant_id", "email"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User extends AbstractEntity implements UserDetails {

    @Column(name = "first_name", length = 100)
    private String firstName;

    @Column(name = "last_name", length = 100)
    private String lastName;

    @Column(nullable = false)
    private String email;

    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserRole role = UserRole.USER;

    private String avatar;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "manager_id")
    private UUID managerId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manager_id", insertable = false, updatable = false)
    private User manager;

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;

    @Column(length = 120)
    private String territory;

    @Column(name = "quarterly_quota", precision = 19, scale = 2)
    private BigDecimal quarterlyQuota;

    @Column(name = "annual_quota", precision = 19, scale = 2)
    private BigDecimal annualQuota;

    @OneToMany(mappedBy = "manager", fetch = FetchType.LAZY)
    @Builder.Default
    private java.util.List<User> managedUsers = new java.util.ArrayList<>();

    // UserDetails implementation
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        Collection<GrantedAuthority> authorities = new ArrayList<>();
        authorities.add(new SimpleGrantedAuthority("ROLE_" + role.name()));
        RolePermissionRegistry.permissionsFor(role).forEach(permission ->
                authorities.add(new SimpleGrantedAuthority(permission.name()))
        );
        return authorities;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return isActive && !getArchived();
    }

    public String getFullName() {
        return firstName + " " + lastName;
    }
}
