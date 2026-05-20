package com.crm.security;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertTrue;

class TenantIsolationStaticGuardTest {

    private static final Pattern ID_CACHEABLE = Pattern.compile("@Cacheable\\([^\\n]*key\\s*=\\s*\"([^\"]*#id[^\"]*)\"");

    @Test
    void idBasedCacheKeysIncludeTenantContext() throws IOException {
        Path serviceRoot = Path.of("src/main/java/com/crm/service/impl");

        try (Stream<Path> paths = Files.walk(serviceRoot)) {
            List<String> unsafeCacheKeys = paths
                    .filter(path -> path.toString().endsWith(".java"))
                    .flatMap(TenantIsolationStaticGuardTest::unsafeIdCacheKeys)
                    .toList();

            assertTrue(unsafeCacheKeys.isEmpty(), () -> "Tenant-scoped ID cache keys must include TenantContext: " + unsafeCacheKeys);
        }
    }

    private static Stream<String> unsafeIdCacheKeys(Path path) {
        try {
            Matcher matcher = ID_CACHEABLE.matcher(Files.readString(path));
            Stream.Builder<String> unsafe = Stream.builder();
            while (matcher.find()) {
                String key = matcher.group(1);
                if (!key.contains("TenantContext")) {
                    unsafe.add(path + " -> " + key);
                }
            }
            return unsafe.build();
        } catch (IOException ex) {
            throw new IllegalStateException("Unable to scan " + path, ex);
        }
    }
}
