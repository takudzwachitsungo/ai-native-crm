package com.crm.mapper;

import com.crm.dto.request.EmailRequestDTO;
import com.crm.dto.response.EmailResponseDTO;
import com.crm.entity.Email;
import org.mapstruct.*;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface EmailMapper {
    
    @Mapping(source = "fromAddress", target = "fromEmail")
    @Mapping(source = "toAddresses", target = "toEmail")
    @Mapping(source = "ccAddresses", target = "ccEmail")
    @Mapping(source = "bccAddresses", target = "bccEmail")
    EmailResponseDTO toDto(Email email);
    
    @Mapping(source = "fromEmail", target = "fromAddress")
    @Mapping(source = "toEmail", target = "toAddresses")
    @Mapping(source = "ccEmail", target = "ccAddresses")
    @Mapping(source = "bccEmail", target = "bccAddresses")
    @Mapping(target = "sentAt", ignore = true)
    Email toEntity(EmailRequestDTO dto);
    
    @Mapping(source = "fromEmail", target = "fromAddress")
    @Mapping(source = "toEmail", target = "toAddresses")
    @Mapping(source = "ccEmail", target = "ccAddresses")
    @Mapping(source = "bccEmail", target = "bccAddresses")
    @Mapping(target = "sentAt", ignore = true)
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updateEntity(EmailRequestDTO dto, @MappingTarget Email email);
}
