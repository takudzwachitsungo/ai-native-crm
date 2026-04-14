package com.crm.controller;

import com.crm.ai.HybridSearchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/search")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Search", description = "AI-powered hybrid search endpoints")
public class SearchController {

    private final HybridSearchService hybridSearchService;

    @GetMapping("/hybrid")
    @Operation(summary = "Hybrid search", description = "Search using semantic similarity and keyword matching")
    public ResponseEntity<List<Map<String, Object>>> hybridSearch(
            @RequestParam String query,
            @RequestParam String entityType,
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(defaultValue = "0.6") double vectorWeight,
            @RequestParam(defaultValue = "0.4") double textWeight
    ) {
        List<Map<String, Object>> results = hybridSearchService.hybridSearch(
                entityType, query, limit, vectorWeight, textWeight
        );
        return ResponseEntity.ok(results);
    }
}
