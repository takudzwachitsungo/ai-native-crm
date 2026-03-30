package com.crm.dto.response;

import com.crm.entity.enums.DocumentCategory;
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
public class DocumentResponseDTO {
    
    private UUID id;
    private UUID tenantId;
    private String name;
    private String description;
    private DocumentCategory category;
    private String filePath;
    private String fileUrl;
    private String fileType;
    private Long fileSize;
    private String relatedEntityType;
    private UUID relatedEntityId;
    private UUID uploadedById;
    private String uploadedByName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private UUID createdBy;
    private UUID updatedBy;
}
