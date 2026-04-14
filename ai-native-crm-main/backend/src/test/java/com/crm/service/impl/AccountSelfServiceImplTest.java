package com.crm.service.impl;

import com.crm.config.TenantContext;
import com.crm.dto.response.NotificationPreferenceResponseDTO;
import com.crm.dto.response.TwoFactorSetupResponseDTO;
import com.crm.entity.User;
import com.crm.entity.UserNotificationPreference;
import com.crm.entity.enums.UserRole;
import com.crm.repository.TenantRepository;
import com.crm.repository.UserNotificationPreferenceRepository;
import com.crm.repository.UserRepository;
import com.crm.repository.UserSessionRepository;
import com.crm.security.JwtTokenProvider;
import com.crm.security.TwoFactorTotpService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AccountSelfServiceImplTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private TenantRepository tenantRepository;
    @Mock
    private UserNotificationPreferenceRepository notificationPreferenceRepository;
    @Mock
    private UserSessionRepository userSessionRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtTokenProvider jwtTokenProvider;

    private final TwoFactorTotpService twoFactorTotpService = new TwoFactorTotpService("Cicosy CRM");

    private AccountSelfServiceImpl accountSelfService;

    private User currentUser;

    @BeforeEach
    void setUp() {
        currentUser = User.builder()
                .firstName("QA")
                .lastName("User")
                .email("qa@example.com")
                .password("encoded-password")
                .role(UserRole.ADMIN)
                .build();
        currentUser.setId(UUID.randomUUID());
        currentUser.setTenantId(UUID.randomUUID());
        TenantContext.setTenantId(currentUser.getTenantId());
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(currentUser, null, java.util.List.of())
        );
        accountSelfService = new AccountSelfServiceImpl(
                userRepository,
                tenantRepository,
                notificationPreferenceRepository,
                userSessionRepository,
                passwordEncoder,
                jwtTokenProvider,
                twoFactorTotpService
        );
        when(userRepository.findByIdAndTenantIdAndArchivedFalse(currentUser.getId(), currentUser.getTenantId()))
                .thenReturn(Optional.of(currentUser));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
        TenantContext.clear();
    }

    @Test
    void getNotificationPreferencesCreatesDefaultPreferencesWhenMissing() {
        when(notificationPreferenceRepository.findByTenantIdAndUserIdAndArchivedFalse(currentUser.getTenantId(), currentUser.getId()))
                .thenReturn(Optional.empty());
        when(notificationPreferenceRepository.save(any(UserNotificationPreference.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        NotificationPreferenceResponseDTO response = accountSelfService.getNotificationPreferences();

        assertTrue(response.getEmailNotificationsEnabled());
        assertTrue(response.getPushNotificationsEnabled());
        assertTrue(response.getWeeklyReportsEnabled());
        verify(notificationPreferenceRepository).save(any(UserNotificationPreference.class));
    }

    @Test
    void beginTwoFactorSetupPersistsPendingSecret() {
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TwoFactorSetupResponseDTO response = accountSelfService.beginTwoFactorSetup();

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        User savedUser = userCaptor.getValue();

        assertFalse(response.getEnabled());
        assertTrue(response.getPendingVerification());
        assertNotNull(response.getManualEntryKey());
        assertNotNull(response.getOtpauthUri());
        assertNotNull(savedUser.getTwoFactorSecret());
        assertFalse(Boolean.TRUE.equals(savedUser.getTwoFactorEnabled()));
    }
}
