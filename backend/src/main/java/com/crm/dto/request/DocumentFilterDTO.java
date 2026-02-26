package com.crm.dto.request;

import com.crm.entity.enums.DocumentCategory;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentFilterDTO {
    
    private String search;
    private DocumentCategory category;
    private String relatedEntityType;
    private UUID relatedEntityId;
    private UUID uploadedById;
}
