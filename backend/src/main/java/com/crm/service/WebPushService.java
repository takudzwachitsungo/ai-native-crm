package com.crm.service;

import com.crm.dto.request.WebPushSubscriptionRequestDTO;
import com.crm.dto.response.WebPushConfigResponseDTO;
import com.crm.dto.response.WebPushPendingNotificationResponseDTO;
import com.crm.dto.response.WebPushSubscriptionResponseDTO;
import com.crm.entity.Task;

import java.util.List;
import java.util.UUID;

public interface WebPushService {

    WebPushConfigResponseDTO getCurrentUserPushConfig();

    WebPushSubscriptionResponseDTO registerCurrentUserSubscription(WebPushSubscriptionRequestDTO request);

    void removeCurrentUserSubscription(String endpoint);

    List<WebPushPendingNotificationResponseDTO> fetchPendingNotifications(String deviceToken);

    void notifyTaskAssigned(UUID tenantId, UUID userId, Task task);
}
