package com.crm.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WebPushPendingNotificationResponseDTO {

    private UUID id;

    private String category;

    private String title;

    private String body;

    private String targetUrl;

    private LocalDateTime createdAt;
}
