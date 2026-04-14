package com.crm.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

/**
 * Service for interacting with OpenAI API
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class OpenAIService {

    @Value("${openai.api-key}")
    private String apiKey;

    @Value("${openai.api-url}")
    private String apiUrl;

    @Value("${openai.model}")
    private String model;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Generate embeddings for text using OpenAI API
     */
    public float[] generateEmbedding(String text) {
        try {
            String url = apiUrl + "/embeddings";
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);
            
            Map<String, Object> requestBody = Map.of(
                "model", "text-embedding-3-small",
                "input", text,
                "dimensions", 512
            );
            
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
            
            ResponseEntity<String> response = restTemplate.exchange(
                url, 
                HttpMethod.POST, 
                entity, 
                String.class
            );
            
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode embeddingNode = root.path("data").get(0).path("embedding");
                
                float[] embedding = new float[512];
                for (int i = 0; i < 512; i++) {
                    embedding[i] = (float) embeddingNode.get(i).asDouble();
                }
                
                log.debug("Generated embedding for text of length: {}", text.length());
                return embedding;
            }
            
            throw new RuntimeException("Failed to generate embedding: " + response.getStatusCode());
            
        } catch (Exception e) {
            log.error("Error generating embedding: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to generate embedding", e);
        }
    }

    /**
     * Generate chat completion using OpenAI API
     */
    public String generateChatCompletion(List<Map<String, String>> messages, Double temperature) {
        try {
            String url = apiUrl + "/chat/completions";
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);
            
            Map<String, Object> requestBody = Map.of(
                "model", model,
                "messages", messages,
                "temperature", temperature != null ? temperature : 0.7
            );
            
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
            
            ResponseEntity<String> response = restTemplate.exchange(
                url, 
                HttpMethod.POST, 
                entity, 
                String.class
            );
            
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                String content = root.path("choices").get(0).path("message").path("content").asText();
                
                log.debug("Generated chat completion with {} tokens", 
                    root.path("usage").path("total_tokens").asInt());
                return content;
            }
            
            throw new RuntimeException("Failed to generate chat completion: " + response.getStatusCode());
            
        } catch (Exception e) {
            log.error("Error generating chat completion: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to generate chat completion", e);
        }
    }
}
