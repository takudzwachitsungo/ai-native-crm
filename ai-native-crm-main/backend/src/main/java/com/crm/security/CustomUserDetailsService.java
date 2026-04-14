package com.crm.security;

import com.crm.entity.User;
import com.crm.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Custom UserDetailsService implementation for loading users from database
 */
@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmailAndArchivedFalse(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));
        
        if (!user.getIsActive()) {
            throw new UsernameNotFoundException("User account is not active: " + email);
        }
        
        return user;
    }

    public UserDetails loadUserByUsernameAndTenantId(String email, UUID tenantId) throws UsernameNotFoundException {
        User user = userRepository.findByTenantIdAndEmailAndArchivedFalse(tenantId, email)
                .orElseThrow(() -> new UsernameNotFoundException(
                        "User not found with email: " + email + " in tenant " + tenantId
                ));

        if (!user.getIsActive()) {
            throw new UsernameNotFoundException("User account is not active: " + email);
        }

        return user;
    }
}
