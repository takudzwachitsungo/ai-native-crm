package com.crm.service.impl;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

class TenantCredentialCipherImplTest {

    private final SecretValueResolverImpl secretValueResolver = new SecretValueResolverImpl();

    @Test
    void encryptsAndDecryptsRoundTrip() {
        TenantCredentialCipherImpl cipher = new TenantCredentialCipherImpl("unit-test-key", secretValueResolver);

        String encrypted = cipher.encrypt("tenant-db-password");

        assertNotEquals("tenant-db-password", encrypted);
        assertEquals("tenant-db-password", cipher.decrypt(encrypted));
    }

    @Test
    void supportsSecretReferenceForKeyMaterial() {
        System.setProperty("CRM_CIPHER_KEY", "property-backed-key");
        try {
            TenantCredentialCipherImpl cipher = new TenantCredentialCipherImpl("env:CRM_CIPHER_KEY", secretValueResolver);
            String encrypted = cipher.encrypt("tenant-db-password");
            assertEquals("tenant-db-password", cipher.decrypt(encrypted));
        } finally {
            System.clearProperty("CRM_CIPHER_KEY");
        }
    }
}
