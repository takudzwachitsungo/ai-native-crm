package com.crm.service;

import com.crm.dto.response.DocumentDownloadDTO;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

public interface DocumentStorageService {

    String store(UUID tenantId, MultipartFile file);

    DocumentDownloadDTO load(UUID tenantId, String storedPath, String documentName, String fallbackContentType);
}
