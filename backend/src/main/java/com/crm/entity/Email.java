package com.crm.entity;

import com.crm.entity.enums.EmailFolder;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "emails")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Email extends AbstractEntity {

    @Column(name = "from_address")
    private String fromAddress;

    @Column(name = "to_addresses", nullable = false, columnDefinition = "TEXT")
    private String toAddresses;

    @Column(name = "cc_addresses", columnDefinition = "TEXT")
    private String ccAddresses;

    @Column(name = "bcc_addresses", columnDefinition = "TEXT")
    private String bccAddresses;

    @Column(nullable = false, length = 500)
    private String subject;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String body;

    @Column(name = "html_body", columnDefinition = "TEXT")
    private String htmlBody;

    @Column(name = "is_draft", nullable = false)
    @Builder.Default
    private Boolean isDraft = false;

    @Column(name = "is_sent", nullable = false)
    @Builder.Default
    private Boolean isSent = false;

    @Column(name = "is_read", nullable = false)
    @Builder.Default
    private Boolean isRead = false;

    @Column(columnDefinition = "TEXT[]")
    private String[] attachments;

    @Enumerated(EnumType.STRING)
    @Column(length = 50)
    private EmailFolder folder = EmailFolder.INBOX;

    @Column(name = "sent_at")
    private LocalDateTime sentAt;
}
