package com.crm.service.impl;

import com.crm.dto.response.DocumentDownloadDTO;
import com.crm.exception.BadRequestException;
import com.crm.exception.ResourceNotFoundException;
import com.crm.service.DocumentStorageService;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.UUID;

@Service
@Slf4j
public class DocumentStorageServiceImpl implements DocumentStorageService {

    private final Path uploadRoot;

    public DocumentStorageServiceImpl(@Value("${file-storage.local.upload-dir:./uploads}") String uploadDir) {
        this.uploadRoot = Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    @PostConstruct
    void ensureUploadRootExists() {
        try {
            Files.createDirectories(uploadRoot);
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to initialize document upload directory", ex);
        }
    }

    @Override
    public String store(UUID tenantId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("A non-empty file is required");
        }

        String sanitizedOriginalName = sanitizeFileName(file.getOriginalFilename());
        String extension = extractExtension(sanitizedOriginalName);
        String storedFileName = UUID.randomUUID() + extension;

        Path tenantDirectory = uploadRoot.resolve(tenantId.toString()).normalize();
        Path targetPath = tenantDirectory.resolve(storedFileName).normalize();
        ensurePathWithinRoot(targetPath);

        try {
            Files.createDirectories(tenantDirectory);
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException ex) {
            log.error("Failed to store document for tenant {}", tenantId, ex);
            throw new BadRequestException("Failed to store uploaded document");
        }

        return uploadRoot.relativize(targetPath).toString().replace('\\', '/');
    }

    @Override
    public DocumentDownloadDTO load(UUID tenantId, String storedPath, String documentName, String fallbackContentType) {
        if (storedPath == null || storedPath.isBlank()) {
            throw new ResourceNotFoundException("Document file path is missing");
        }

        Path resolvedPath = uploadRoot.resolve(storedPath).normalize();
        ensurePathWithinRoot(resolvedPath);

        Path tenantDirectory = uploadRoot.resolve(tenantId.toString()).normalize();
        if (!resolvedPath.startsWith(tenantDirectory)) {
            throw new BadRequestException("Document file is not stored in the current tenant workspace");
        }

        if (!Files.exists(resolvedPath) || !Files.isRegularFile(resolvedPath)) {
            throw new ResourceNotFoundException("Document file not found");
        }

        try {
            Resource resource = new FileSystemResource(resolvedPath);
            String contentType = Files.probeContentType(resolvedPath);
            if (contentType == null || contentType.isBlank()) {
                contentType = (fallbackContentType == null || fallbackContentType.isBlank())
                        ? "application/octet-stream"
                        : fallbackContentType;
            }

            return DocumentDownloadDTO.builder()
                    .resource(resource)
                    .filename(buildDownloadFilename(documentName, resolvedPath.getFileName().toString()))
                    .contentType(contentType)
                    .contentLength(Files.size(resolvedPath))
                    .build();
        } catch (IOException ex) {
            log.error("Failed to load document file {} for tenant {}", storedPath, tenantId, ex);
            throw new BadRequestException("Failed to load document file");
        }
    }

    private void ensurePathWithinRoot(Path targetPath) {
        if (!targetPath.startsWith(uploadRoot)) {
            throw new BadRequestException("Invalid document storage path");
        }
    }

    private String sanitizeFileName(String originalFilename) {
        String candidate = originalFilename == null ? "document" : originalFilename.trim();
        if (candidate.isBlank()) {
            candidate = "document";
        }

        candidate = Paths.get(candidate).getFileName().toString();
        candidate = candidate.replaceAll("[^A-Za-z0-9._-]", "_");
        return candidate.isBlank() ? "document" : candidate;
    }

    private String extractExtension(String filename) {
        int extensionIndex = filename.lastIndexOf('.');
        if (extensionIndex < 0 || extensionIndex == filename.length() - 1) {
            return "";
        }
        return filename.substring(extensionIndex).toLowerCase(Locale.ROOT);
    }

    private String buildDownloadFilename(String documentName, String storedFileName) {
        String safeName = sanitizeFileName(documentName);
        String extension = extractExtension(storedFileName);
        if (safeName.toLowerCase(Locale.ROOT).endsWith(extension)) {
            return safeName;
        }
        return safeName + extension;
    }
}
