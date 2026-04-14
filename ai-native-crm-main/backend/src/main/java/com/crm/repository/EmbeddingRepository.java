package com.crm.repository;

import com.crm.entity.Embedding;
import com.pgvector.PGvector;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EmbeddingRepository extends JpaRepository<Embedding, UUID> {
    
    Optional<Embedding> findByTenantIdAndEntityTypeAndEntityId(UUID tenantId, String entityType, UUID entityId);
    
    @Query(value = "SELECT * FROM embeddings WHERE tenant_id = :tenantId AND entity_type = :entityType " +
            "ORDER BY embedding <-> CAST(:queryVector AS vector) LIMIT :limit", nativeQuery = true)
    List<Embedding> findSimilar(
        @Param("tenantId") UUID tenantId,
        @Param("entityType") String entityType,
        @Param("queryVector") String queryVector,
        @Param("limit") int limit
    );
    
    void deleteByTenantIdAndEntityTypeAndEntityId(UUID tenantId, String entityType, UUID entityId);
}
