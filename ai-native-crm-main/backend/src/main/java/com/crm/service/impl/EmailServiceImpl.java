package com.crm.service.impl;

import com.crm.config.TenantContext;
import com.crm.dto.request.EmailFilterDTO;
import com.crm.dto.request.EmailRequestDTO;
import com.crm.dto.response.EmailResponseDTO;
import com.crm.entity.Email;
import com.crm.entity.enums.EmailFolder;
import com.crm.exception.BadRequestException;
import com.crm.exception.ResourceNotFoundException;
import com.crm.mapper.EmailMapper;
import com.crm.repository.EmailRepository;
import com.crm.service.EmailService;
import com.crm.util.SpecificationBuilder;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailServiceImpl implements EmailService {

    private final EmailRepository emailRepository;
    private final EmailMapper emailMapper;
    private final JavaMailSender mailSender;

    @Override
    @Transactional(readOnly = true)
    public Page<EmailResponseDTO> findAll(Pageable pageable, EmailFilterDTO filter) {
        UUID tenantId = TenantContext.getTenantId();
        
        List<Specification<Email>> specs = new ArrayList<>();
        specs.add(SpecificationBuilder.tenantEquals(tenantId));
        specs.add(SpecificationBuilder.notArchived());
        
        if (filter != null) {
            if (filter.getSearch() != null && !filter.getSearch().isBlank()) {
                String search = "%" + filter.getSearch().toLowerCase() + "%";
                specs.add((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("subject")), search),
                    cb.like(cb.lower(root.get("body")), search),
                    cb.like(cb.lower(root.get("fromEmail")), search),
                    cb.like(cb.lower(root.get("toEmail")), search)
                ));
            }
            
            if (filter.getFolder() != null) {
                specs.add(SpecificationBuilder.equal("folder", filter.getFolder()));
            }
            
            if (filter.getIsDraft() != null) {
                specs.add(SpecificationBuilder.equal("isDraft", filter.getIsDraft()));
            }
            
            if (filter.getIsSent() != null) {
                specs.add(SpecificationBuilder.equal("isSent", filter.getIsSent()));
            }
            
            if (filter.getIsRead() != null) {
                specs.add(SpecificationBuilder.equal("isRead", filter.getIsRead()));
            }
            
            if (filter.getRelatedEntityType() != null) {
                specs.add(SpecificationBuilder.equal("relatedEntityType", filter.getRelatedEntityType()));
            }
            
            if (filter.getRelatedEntityId() != null) {
                specs.add(SpecificationBuilder.equal("relatedEntityId", filter.getRelatedEntityId()));
            }
        }
        
        Specification<Email> spec = SpecificationBuilder.combineWithAnd(specs);
        Page<Email> emails = emailRepository.findAll(spec, pageable);
        
        return emails.map(emailMapper::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = "emails", key = "#id")
    public EmailResponseDTO findById(UUID id) {
        UUID tenantId = TenantContext.getTenantId();
        
        Email email = emailRepository.findById(id)
                .filter(e -> e.getTenantId().equals(tenantId) && !e.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Email", id));
        
        return emailMapper.toDto(email);
    }

    @Override
    @Transactional
    @CacheEvict(value = "emails", allEntries = true)
    public EmailResponseDTO create(EmailRequestDTO request) {
        UUID tenantId = TenantContext.getTenantId();
        
        Email email = emailMapper.toEntity(request);
        email.setTenantId(tenantId);
        
        // Set default folder if not provided
        if (email.getFolder() == null) {
            email.setFolder(Boolean.TRUE.equals(email.getIsDraft()) ? EmailFolder.DRAFTS : EmailFolder.INBOX);
        }
        
        email = emailRepository.save(email);
        log.info("Created email: {} for tenant: {}", email.getId(), tenantId);
        
        return emailMapper.toDto(email);
    }

    @Override
    @Transactional
    @CacheEvict(value = "emails", allEntries = true)
    public EmailResponseDTO update(UUID id, EmailRequestDTO request) {
        UUID tenantId = TenantContext.getTenantId();
        
        Email email = emailRepository.findById(id)
                .filter(e -> e.getTenantId().equals(tenantId) && !e.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Email", id));
        
        // Don't allow updating sent emails
        if (Boolean.TRUE.equals(email.getIsSent())) {
            throw new BadRequestException("Cannot update sent emails");
        }
        
        emailMapper.updateEntity(request, email);
        email = emailRepository.save(email);
        
        log.info("Updated email: {} for tenant: {}", id, tenantId);
        
        return emailMapper.toDto(email);
    }

    @Override
    @Transactional
    @CacheEvict(value = "emails", allEntries = true)
    public void delete(UUID id) {
        UUID tenantId = TenantContext.getTenantId();
        
        Email email = emailRepository.findById(id)
                .filter(e -> e.getTenantId().equals(tenantId) && !e.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Email", id));
        
        email.setArchived(true);
        emailRepository.save(email);
        
        log.info("Deleted (archived) email: {} for tenant: {}", id, tenantId);
    }

    @Override
    @Transactional
    @CacheEvict(value = "emails", allEntries = true)
    public void bulkDelete(List<UUID> ids) {
        UUID tenantId = TenantContext.getTenantId();
        
        List<Email> emails = emailRepository.findAllById(ids).stream()
                .filter(e -> e.getTenantId().equals(tenantId) && !e.getArchived())
                .collect(Collectors.toList());
        
        if (emails.isEmpty()) {
            throw new BadRequestException("No valid emails found for deletion");
        }
        
        emails.forEach(email -> email.setArchived(true));
        emailRepository.saveAll(emails);
        
        log.info("Bulk deleted {} emails for tenant: {}", emails.size(), tenantId);
    }

    @Override
    @Transactional
    @CacheEvict(value = "emails", allEntries = true)
    public EmailResponseDTO sendEmail(UUID id) {
        UUID tenantId = TenantContext.getTenantId();
        
        Email email = emailRepository.findById(id)
                .filter(e -> e.getTenantId().equals(tenantId) && !e.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Email", id));
        
        if (Boolean.TRUE.equals(email.getIsSent())) {
            throw new BadRequestException("Email has already been sent");
        }
        
        // Validate required fields
        if (email.getFromAddress() == null || email.getFromAddress().isBlank()) {
            throw new BadRequestException("From address is required");
        }
        if (email.getToAddresses() == null || email.getToAddresses().isBlank()) {
            throw new BadRequestException("To address is required");
        }
        
        try {
            // Send email via SMTP
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            
            helper.setFrom(email.getFromAddress());
            
            // Split comma-separated email addresses
            String[] toAddresses = email.getToAddresses().split(",\\s*");
            helper.setTo(toAddresses);
            
            if (email.getCcAddresses() != null && !email.getCcAddresses().isBlank()) {
                String[] ccAddresses = email.getCcAddresses().split(",\\s*");
                helper.setCc(ccAddresses);
            }
            
            if (email.getBccAddresses() != null && !email.getBccAddresses().isBlank()) {
                String[] bccAddresses = email.getBccAddresses().split(",\\s*");
                helper.setBcc(bccAddresses);
            }
            
            helper.setSubject(email.getSubject() != null ? email.getSubject() : "(No Subject)");
            
            // Use HTML body if available, otherwise use plain text
            if (email.getHtmlBody() != null && !email.getHtmlBody().isBlank()) {
                helper.setText(email.getBody() != null ? email.getBody() : "", email.getHtmlBody());
            } else {
                helper.setText(email.getBody() != null ? email.getBody() : "");
            }
            
            // Send the email
            mailSender.send(message);
            
            // Update email status after successful send
            email.setIsSent(true);
            email.setIsDraft(false);
            email.setSentAt(LocalDateTime.now());
            email.setFolder(EmailFolder.SENT);
            
            email = emailRepository.save(email);
            
            log.info("Successfully sent email: {} to {} for tenant: {}", 
                    id, email.getToAddresses(), tenantId);
            
            return emailMapper.toDto(email);
            
        } catch (MessagingException e) {
            log.error("Failed to send email: {} for tenant: {}", id, tenantId, e);
            throw new BadRequestException("Failed to send email: " + e.getMessage());
        }
    }

    @Override
    @Transactional
    @CacheEvict(value = "emails", allEntries = true)
    public EmailResponseDTO markAsRead(UUID id) {
        UUID tenantId = TenantContext.getTenantId();
        
        Email email = emailRepository.findById(id)
                .filter(e -> e.getTenantId().equals(tenantId) && !e.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Email", id));
        
        email.setIsRead(true);
        email = emailRepository.save(email);
        
        log.info("Marked email as read: {} for tenant: {}", id, tenantId);
        
        return emailMapper.toDto(email);
    }

    @Override
    @Transactional
    @CacheEvict(value = "emails", allEntries = true)
    public EmailResponseDTO markAsUnread(UUID id) {
        UUID tenantId = TenantContext.getTenantId();
        
        Email email = emailRepository.findById(id)
                .filter(e -> e.getTenantId().equals(tenantId) && !e.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Email", id));
        
        email.setIsRead(false);
        email = emailRepository.save(email);
        
        log.info("Marked email as unread: {} for tenant: {}", id, tenantId);
        
        return emailMapper.toDto(email);
    }

    @Override
    @Transactional
    @CacheEvict(value = "emails", allEntries = true)
    public EmailResponseDTO moveToFolder(UUID id, String folderName) {
        UUID tenantId = TenantContext.getTenantId();
        
        Email email = emailRepository.findById(id)
                .filter(e -> e.getTenantId().equals(tenantId) && !e.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Email", id));
        
        try {
            EmailFolder folder = EmailFolder.valueOf(folderName.toUpperCase());
            email.setFolder(folder);
            email = emailRepository.save(email);
            
            log.info("Moved email: {} to folder: {} for tenant: {}", id, folder, tenantId);
            
            return emailMapper.toDto(email);
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid email folder: " + folderName);
        }
    }
}
