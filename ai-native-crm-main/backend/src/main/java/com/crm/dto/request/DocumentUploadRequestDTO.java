package com.crm.dto.request;

import com.crm.entity.enums.DocumentCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentUploadRequestDTO {

    @NotBlank(message = "Document name is required")
    @Size(max = 200, message = "Name must be less than 200 characters")
    private String name;

    private String description;

    @NotNull(message = "Category is required")
    private DocumentCategory category;

    private String relatedEntityType;

    private UUID relatedEntityId;

    private UUID uploadedById;

    @NotNull(message = "A file is required")
    private MultipartFile file;
}
