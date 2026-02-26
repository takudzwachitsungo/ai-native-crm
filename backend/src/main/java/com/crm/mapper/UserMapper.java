package com.crm.mapper;

import com.crm.dto.request.UserCreateRequestDTO;
import com.crm.dto.response.UserResponseDTO;
import com.crm.entity.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface UserMapper {

    UserResponseDTO toDto(User user);

    @Mapping(target = "password", ignore = true)
    User toEntity(UserCreateRequestDTO dto);
}
