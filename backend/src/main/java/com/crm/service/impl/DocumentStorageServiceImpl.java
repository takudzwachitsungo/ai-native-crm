package com.crm.service.impl;

import com.crm.dto.response.DocumentDownloadDTO;
import com.crm.exception.BadRequestException;
import com.crm.exception.ResourceNotFoundException;
import com.crm.service.DocumentStorageService;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.exception.SdkClientException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3ClientBuilder;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.CreateBucketRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

import java.io.IOException;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.UUID;

@Service
@Slf4j
public class DocumentStorageServiceImpl implements DocumentStorageService {

    private static final String STORAGE_TYPE_LOCAL = "local";
    private static final String STORAGE_TYPE_S3 = "s3";
    private static final String STORAGE_TYPE_MINIO = "minio";

    private final String storageType;
    private final Path uploadRoot;
    private final String bucket;
    private final String region;
    private final String endpoint;
    private final String accessKey;
    private final String secretKey;
    private final boolean pathStyleAccess;
    private final boolean createBucket;
    private S3Client s3Client;

    public DocumentStorageServiceImpl(
            @Value("${file-storage.type:local}") String storageType,
            @Value("${file-storage.local.upload-dir:./uploads}") String uploadDir,
            @Value("${file-storage.s3.bucket:}") String bucket,
            @Value("${file-storage.s3.region:us-east-1}") String region,
            @Value("${file-storage.s3.endpoint:}") String endpoint,
            @Value("${file-storage.s3.access-key:}") String accessKey,
            @Value("${file-storage.s3.secret-key:}") String secretKey,
            @Value("${file-storage.s3.path-style-access:false}") boolean pathStyleAccess,
            @Value("${file-storage.s3.create-bucket:false}") boolean createBucket
    ) {
        this.storageType = normalizeStorageType(storageType);
        this.uploadRoot = Paths.get(uploadDir).toAbsolutePath().normalize();
        this.bucket = bucket;
        this.region = region;
        this.endpoint = endpoint;
        this.accessKey = accessKey;
        this.secretKey = secretKey;
        this.pathStyleAccess = pathStyleAccess;
        this.createBucket = createBucket;
    }

    @PostConstruct
    void initializeStorage() {
        if (usesObjectStorage()) {
            initializeS3Client();
            return;
        }

        if (STORAGE_TYPE_LOCAL.equals(storageType)) {
            try {
                Files.createDirectories(uploadRoot);
            } catch (IOException ex) {
                throw new IllegalStateException("Failed to initialize document upload directory", ex);
            }
            return;
        }

        throw new IllegalStateException("Unsupported file storage type: " + storageType);
    }

    @Override
    public String store(UUID tenantId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("A non-empty file is required");
        }

        if (usesObjectStorage()) {
            return storeInObjectStorage(tenantId, file);
        }

        return storeLocally(tenantId, file);
    }

    @Override
    public DocumentDownloadDTO load(UUID tenantId, String storedPath, String documentName, String fallbackContentType) {
        if (storedPath == null || storedPath.isBlank()) {
            throw new ResourceNotFoundException("Document file path is missing");
        }

        if (usesObjectStorage()) {
            return loadFromObjectStorage(tenantId, storedPath, documentName, fallbackContentType);
        }

        return loadFromLocalStorage(tenantId, storedPath, documentName, fallbackContentType);
    }

    private String storeLocally(UUID tenantId, MultipartFile file) {
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

    private String storeInObjectStorage(UUID tenantId, MultipartFile file) {
        String sanitizedOriginalName = sanitizeFileName(file.getOriginalFilename());
        String extension = extractExtension(sanitizedOriginalName);
        String objectKey = "tenants/%s/documents/%s%s".formatted(tenantId, UUID.randomUUID(), extension);
        String contentType = file.getContentType();
        if (contentType == null || contentType.isBlank()) {
            contentType = "application/octet-stream";
        }

        try {
            PutObjectRequest request = PutObjectRequest.builder()
                    .bucket(bucket)
                    .key(objectKey)
                    .contentType(contentType)
                    .contentLength(file.getSize())
                    .metadata(java.util.Map.of("original-filename", sanitizedOriginalName))
                    .build();
            s3Client.putObject(request, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));
            return objectKey;
        } catch (IOException | S3Exception | SdkClientException ex) {
            log.error("Failed to store document in object storage for tenant {}", tenantId, ex);
            throw new BadRequestException("Failed to store uploaded document");
        }
    }

    private DocumentDownloadDTO loadFromLocalStorage(UUID tenantId, String storedPath, String documentName, String fallbackContentType) {
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

    private DocumentDownloadDTO loadFromObjectStorage(UUID tenantId, String storedPath, String documentName, String fallbackContentType) {
        String normalizedStoredPath = normalizeObjectKey(storedPath);
        String tenantPrefix = "tenants/" + tenantId + "/documents/";
        if (!normalizedStoredPath.startsWith(tenantPrefix)) {
            throw new BadRequestException("Document file is not stored in the current tenant workspace");
        }

        try {
            GetObjectRequest request = GetObjectRequest.builder()
                    .bucket(bucket)
                    .key(normalizedStoredPath)
                    .build();
            ResponseInputStream<GetObjectResponse> response = s3Client.getObject(request);
            long contentLength = response.response().contentLength() == null ? -1L : response.response().contentLength();
            String contentType = response.response().contentType();
            if (contentType == null || contentType.isBlank()) {
                contentType = (fallbackContentType == null || fallbackContentType.isBlank())
                        ? "application/octet-stream"
                        : fallbackContentType;
            }

            Resource resource = new InputStreamResource(response) {
                @Override
                public long contentLength() {
                    return contentLength;
                }

                @Override
                public String getFilename() {
                    return buildDownloadFilename(documentName, normalizedStoredPath);
                }
            };

            return DocumentDownloadDTO.builder()
                    .resource(resource)
                    .filename(buildDownloadFilename(documentName, normalizedStoredPath))
                    .contentType(contentType)
                    .contentLength(contentLength)
                    .build();
        } catch (NoSuchKeyException ex) {
            throw new ResourceNotFoundException("Document file not found");
        } catch (S3Exception | SdkClientException ex) {
            log.error("Failed to load document object {} for tenant {}", storedPath, tenantId, ex);
            throw new BadRequestException("Failed to load document file");
        }
    }

    private void initializeS3Client() {
        if (bucket == null || bucket.isBlank()) {
            throw new IllegalStateException("S3 document storage requires file-storage.s3.bucket");
        }
        if (accessKey == null || accessKey.isBlank() || secretKey == null || secretKey.isBlank()) {
            throw new IllegalStateException("S3 document storage requires access key and secret key");
        }

        S3ClientBuilder builder = S3Client.builder()
                .region(Region.of(region == null || region.isBlank() ? "us-east-1" : region))
                .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKey, secretKey)))
                .serviceConfiguration(S3Configuration.builder()
                        .pathStyleAccessEnabled(pathStyleAccess || STORAGE_TYPE_MINIO.equals(storageType))
                        .build());

        if (endpoint != null && !endpoint.isBlank()) {
            builder.endpointOverride(URI.create(endpoint));
        }

        s3Client = builder.build();
        if (createBucket) {
            ensureBucketExists();
        }
    }

    private void ensureBucketExists() {
        try {
            s3Client.headBucket(HeadBucketRequest.builder().bucket(bucket).build());
        } catch (S3Exception ex) {
            if (ex.statusCode() != 404) {
                throw ex;
            }
            s3Client.createBucket(CreateBucketRequest.builder().bucket(bucket).build());
            log.info("Created document storage bucket {}", bucket);
        }
    }

    private boolean usesObjectStorage() {
        return STORAGE_TYPE_S3.equals(storageType) || STORAGE_TYPE_MINIO.equals(storageType);
    }

    private String normalizeStorageType(String value) {
        return value == null || value.isBlank() ? STORAGE_TYPE_LOCAL : value.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeObjectKey(String storedPath) {
        if (storedPath.startsWith("s3://")) {
            String withoutScheme = storedPath.substring("s3://".length());
            int keyStart = withoutScheme.indexOf('/');
            if (keyStart < 0 || keyStart == withoutScheme.length() - 1) {
                throw new BadRequestException("Invalid document storage path");
            }
            return withoutScheme.substring(keyStart + 1);
        }
        if (storedPath.startsWith("/") || storedPath.contains("://")) {
            throw new BadRequestException("Document file is not managed by object storage");
        }
        return storedPath;
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
