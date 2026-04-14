package com.crm.dto.response;

import com.crm.entity.enums.EmailFolder;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmailResponseDTO {
    
    private UUID id;
    private UUID tenantId;
    private String subject;
    private String body;
    private String fromEmail;
    private String toEmail;
    private String ccEmail;
    private String bccEmail;
    private EmailFolder folder;
    private Boolean isDraft;
    private Boolean isSent;
    private Boolean isRead;
    private LocalDateTime sentAt;
    private String relatedEntityType;
    private UUID relatedEntityId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private UUID createdBy;
    private UUID updatedBy;
}
