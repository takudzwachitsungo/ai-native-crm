package com.crm.dto.request;

import com.crm.entity.enums.EmailFolder;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmailRequestDTO {
    
    @NotBlank(message = "Subject is required")
    @Size(max = 500, message = "Subject must be less than 500 characters")
    private String subject;
    
    @NotBlank(message = "Body is required")
    private String body;
    
    @NotBlank(message = "From email is required")
    @Email(message = "Invalid from email format")
    private String fromEmail;
    
    @NotBlank(message = "To email is required")
    @Email(message = "Invalid to email format")
    private String toEmail;
    
    @Email(message = "Invalid CC email format")
    private String ccEmail;
    
    @Email(message = "Invalid BCC email format")
    private String bccEmail;
    
    private EmailFolder folder;
    
    private Boolean isDraft;
    
    private Boolean isSent;
    
    private Boolean isRead;
    
    private String relatedEntityType;
    
    private UUID relatedEntityId;
}
