package com.crm.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WebPushSubscriptionRequestDTO {

    @NotBlank
    private String endpoint;

    private Long expirationTimeEpochMs;

    private String p256dhKey;

    private String authKey;

    private String userAgent;
}
