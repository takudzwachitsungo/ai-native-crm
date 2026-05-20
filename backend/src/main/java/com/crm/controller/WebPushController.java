package com.crm.controller;

import com.crm.dto.response.WebPushPendingNotificationResponseDTO;
import com.crm.service.WebPushService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/push")
@RequiredArgsConstructor
@Tag(name = "Web Push", description = "Device-facing web push notification endpoints")
public class WebPushController {

    private final WebPushService webPushService;

    @GetMapping("/devices/{deviceToken}/notifications")
    @Operation(summary = "Fetch queued notifications for a registered push device")
    public ResponseEntity<List<WebPushPendingNotificationResponseDTO>> getPendingNotifications(
            @PathVariable String deviceToken
    ) {
        return ResponseEntity.ok(webPushService.fetchPendingNotifications(deviceToken));
    }
}
