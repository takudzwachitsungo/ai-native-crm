package com.crm.mapper;

import com.crm.dto.request.DocumentRequestDTO;
import com.crm.dto.response.DocumentResponseDTO;
import com.crm.entity.Document;
import org.mapstruct.*;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface DocumentMapper {
    
    @Mapping(target = "uploadedByName", expression = "java(getUploadedByName(document))")
    DocumentResponseDTO toDto(Document document);
    
    @Mapping(target = "uploader", ignore = true)
    Document toEntity(DocumentRequestDTO dto);
    
    @Mapping(target = "uploader", ignore = true)
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updateEntity(DocumentRequestDTO dto, @MappingTarget Document document);
    
    default String getUploadedByName(Document document) {
        if (document.getUploader() == null) {
            return null;
        }
        return document.getUploader().getFirstName() + " " + document.getUploader().getLastName();
    }
}
