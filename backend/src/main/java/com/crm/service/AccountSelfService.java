package com.crm.service;

import com.crm.dto.request.AccountProfileUpdateRequestDTO;
import com.crm.dto.request.NotificationPreferenceUpdateRequestDTO;
import com.crm.dto.request.PasswordChangeRequestDTO;
import com.crm.dto.request.TwoFactorDisableRequestDTO;
import com.crm.dto.request.TwoFactorVerificationRequestDTO;
import com.crm.dto.request.WebPushSubscriptionRequestDTO;
import com.crm.dto.response.AccountProfileResponseDTO;
import com.crm.dto.response.BillingPortalResponseDTO;
import com.crm.dto.response.NotificationPreferenceResponseDTO;
import com.crm.dto.response.TwoFactorSetupResponseDTO;
import com.crm.dto.response.TwoFactorStatusResponseDTO;
import com.crm.dto.response.UserSessionResponseDTO;
import com.crm.dto.response.WebPushConfigResponseDTO;
import com.crm.dto.response.WebPushSubscriptionResponseDTO;

import java.util.List;
import java.util.UUID;

public interface AccountSelfService {

    AccountProfileResponseDTO getProfile();

    AccountProfileResponseDTO updateProfile(AccountProfileUpdateRequestDTO request);

    NotificationPreferenceResponseDTO getNotificationPreferences();

    NotificationPreferenceResponseDTO updateNotificationPreferences(NotificationPreferenceUpdateRequestDTO request);

    void changePassword(PasswordChangeRequestDTO request);

    List<UserSessionResponseDTO> getSessions();

    void revokeSession(UUID sessionId);

    void revokeOtherSessions();

    BillingPortalResponseDTO getBillingPortal();

    TwoFactorStatusResponseDTO getTwoFactorStatus();

    TwoFactorSetupResponseDTO beginTwoFactorSetup();

    TwoFactorStatusResponseDTO enableTwoFactor(TwoFactorVerificationRequestDTO request);

    TwoFactorStatusResponseDTO disableTwoFactor(TwoFactorDisableRequestDTO request);

    WebPushConfigResponseDTO getPushConfig();

    WebPushSubscriptionResponseDTO registerPushSubscription(WebPushSubscriptionRequestDTO request);

    void removePushSubscription(String endpoint);
}
