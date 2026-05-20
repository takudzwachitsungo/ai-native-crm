package com.crm.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WebPushSubscriptionResponseDTO {

    private String deviceToken;

    private String endpoint;

    private LocalDateTime registeredAt;

    private LocalDateTime lastSeenAt;

    private Boolean lastPushSucceeded;

    private String lastPushStatus;
}
