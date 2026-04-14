package com.crm.ai;

import com.crm.config.TenantContext;
import com.crm.entity.Lead;
import com.crm.entity.enums.LeadStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * AI-powered lead scoring service
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LeadScoringService {

    private final OpenAIService openAIService;

    /**
     * Calculate lead score using rule-based and AI analysis
     */
    public int calculateLeadScore(Lead lead) {
        int score = 50; // Base score
        
        // Rule-based scoring
        score += scoreByStatus(lead.getStatus());
        score += scoreByLastContact(lead.getLastContactDate() != null ? lead.getLastContactDate().toLocalDate() : null);
        score += scoreByEstimatedValue(lead.getEstimatedValue());
        score += scoreByCompleteness(lead);
        
        // Ensure score is between 0 and 100
        score = Math.max(0, Math.min(100, score));
        
        log.debug("Calculated lead score: {} for lead: {}", score, lead.getId());
        return score;
    }

    /**
     * Generate AI-powered lead insights
     */
    public String generateLeadInsights(Lead lead) {
        try {
            String prompt = buildLeadInsightPrompt(lead);
            
            List<Map<String, String>> messages = List.of(
                Map.of("role", "system", "content", "You are a sales intelligence assistant that provides actionable insights about leads."),
                Map.of("role", "user", "content", prompt)
            );
            
            String insights = openAIService.generateChatCompletion(messages, 0.7);
            log.info("Generated AI insights for lead: {}", lead.getId());
            
            return insights;
            
        } catch (Exception e) {
            log.error("Failed to generate lead insights: {}", e.getMessage(), e);
            return "Unable to generate insights at this time.";
        }
    }

    private int scoreByStatus(LeadStatus status) {
        return switch (status) {
            case NEW -> 0;
            case CONTACTED -> 10;
            case QUALIFIED -> 20;
            case UNQUALIFIED -> -20;
            case CONVERTED -> 0;
            case LOST -> -50;
        };
    }

    private int scoreByLastContact(LocalDate lastContactDate) {
        if (lastContactDate == null) {
            return -10;
        }
        
        long daysSinceContact = ChronoUnit.DAYS.between(lastContactDate, LocalDate.now());
        
        if (daysSinceContact <= 7) return 15;
        if (daysSinceContact <= 14) return 10;
        if (daysSinceContact <= 30) return 5;
        if (daysSinceContact <= 60) return 0;
        return -10;
    }

    private int scoreByEstimatedValue(java.math.BigDecimal estimatedValue) {
        if (estimatedValue == null) {
            return 0;
        }
        
        double value = estimatedValue.doubleValue();
        
        if (value >= 100000) return 15;
        if (value >= 50000) return 10;
        if (value >= 10000) return 5;
        return 0;
    }

    private int scoreByCompleteness(Lead lead) {
        int completeness = 0;
        int total = 0;
        
        if (lead.getFirstName() != null) completeness++;
        total++;
        
        if (lead.getLastName() != null) completeness++;
        total++;
        
        if (lead.getEmail() != null) completeness++;
        total++;
        
        if (lead.getPhone() != null) completeness++;
        total++;
        
        if (lead.getCompany() != null) completeness++;
        total++;
        
        if (lead.getTitle() != null) completeness++;
        total++;
        
        if (lead.getNotes() != null && !lead.getNotes().isBlank()) completeness++;
        total++;
        
        double ratio = (double) completeness / total;
        return (int) (ratio * 10); // 0-10 points
    }

    private String buildLeadInsightPrompt(Lead lead) {
        return String.format("""
            Analyze this lead and provide 3 actionable insights:
            
            Name: %s %s
            Company: %s
            Title: %s
            Status: %s
            Score: %d
            Estimated Value: %s
            Last Contact: %s
            Notes: %s
            
            Provide:
            1. Key strengths/opportunities
            2. Potential concerns/risks
            3. Recommended next action
            
            Keep response concise and actionable (max 200 words).
            """,
            lead.getFirstName(),
            lead.getLastName(),
            lead.getCompany() != null ? lead.getCompany() : "N/A",
            lead.getTitle() != null ? lead.getTitle() : "N/A",
            lead.getStatus(),
            lead.getScore() != null ? lead.getScore() : 0,
            lead.getEstimatedValue() != null ? lead.getEstimatedValue().toString() : "N/A",
            lead.getLastContactDate() != null ? lead.getLastContactDate().toString() : "N/A",
            lead.getNotes() != null ? lead.getNotes() : "N/A"
        );
    }
}
