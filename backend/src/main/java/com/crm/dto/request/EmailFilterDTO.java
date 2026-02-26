package com.crm.dto.request;

import com.crm.entity.enums.EmailFolder;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmailFilterDTO {
    
    private String search;
    private EmailFolder folder;
    private Boolean isDraft;
    private Boolean isSent;
    private Boolean isRead;
    private String relatedEntityType;
    private UUID relatedEntityId;
}
