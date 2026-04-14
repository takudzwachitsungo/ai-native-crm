package com.crm.service.impl;

import com.crm.entity.AutomationRule;
import com.crm.entity.Deal;
import com.crm.entity.Lead;
import com.crm.entity.SupportCase;
import com.crm.entity.Task;
import com.crm.entity.enums.AutomationEventType;
import com.crm.entity.enums.AutomationExecutionMode;
import com.crm.entity.enums.TaskPriority;
import com.crm.entity.enums.TaskStatus;
import com.crm.repository.TaskRepository;
import com.crm.service.AutomationExecutionOutcome;
import com.crm.service.AutomationExecutionService;
import com.crm.service.AutomationExecutionTargets;
import com.crm.service.AutomationRuleService;
import com.crm.service.AutomationRunService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanWrapper;
import org.springframework.beans.BeanWrapperImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AutomationExecutionServiceImpl implements AutomationExecutionService {

    private static final String RUN_STATUS_SUCCESS = "SUCCESS";
    private static final String RUN_STATUS_SKIPPED = "SKIPPED";

    private final AutomationRuleService automationRuleService;
    private final AutomationRunService automationRunService;
    private final TaskRepository taskRepository;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional
    public AutomationExecutionOutcome executeRealTimeRules(
            UUID tenantId,
            AutomationEventType eventType,
            AutomationExecutionTargets targets
    ) {
        if (tenantId == null || eventType == null || targets == null) {
            return emptyOutcome();
        }

        List<AutomationRule> rules = automationRuleService.resolveActiveRules(tenantId, eventType).stream()
                .filter(rule -> rule.getExecutionMode() == AutomationExecutionMode.REAL_TIME)
                .sorted(Comparator.comparing(AutomationRule::getPriorityOrder, Comparator.nullsLast(Integer::compareTo)))
                .toList();

        if (rules.isEmpty()) {
            return emptyOutcome();
        }

        String primaryAlias = primaryAlias(eventType);
        int matchedRules = 0;
        int executedActions = 0;
        boolean mutatedTarget = false;
        List<UUID> createdTaskIds = new ArrayList<>();

        for (AutomationRule rule : rules) {
            try {
                if (!matchesConditions(readJson(rule.getConditionsJson()), primaryAlias, targets)) {
                    continue;
                }

                matchedRules++;
                ActionExecutionResult actionResult = executeActions(rule, primaryAlias, targets);
                executedActions += actionResult.actionsExecuted();
                createdTaskIds.addAll(actionResult.createdTaskIds());
                mutatedTarget = mutatedTarget || actionResult.mutatedTarget();
            } catch (Exception ex) {
                log.warn("Skipping automation rule {} for event {}: {}", rule.getId(), eventType, ex.getMessage());
            }
        }

        AutomationExecutionOutcome result = AutomationExecutionOutcome.builder()
                .reviewedRules(rules.size())
                .matchedRules(matchedRules)
                .actionsExecuted(executedActions)
                .createdTaskIds(createdTaskIds)
                .mutatedTarget(mutatedTarget)
                .build();

        automationRunService.recordRun(
                tenantId,
                "GENERIC_" + eventType.name(),
                "Generic Automation " + eventType.name(),
                "REAL_TIME",
                result.getActionsExecuted() > 0 ? RUN_STATUS_SUCCESS : RUN_STATUS_SKIPPED,
                result.getReviewedRules(),
                result.getActionsExecuted(),
                Math.max(result.getReviewedRules() - result.getMatchedRules(), 0),
                summarize(eventType, result)
        );

        return result;
    }

    private ActionExecutionResult executeActions(AutomationRule rule, String primaryAlias, AutomationExecutionTargets targets) {
        JsonNode actionsRoot = readJson(rule.getActionsJson());
        JsonNode actionsNode = actionsRoot.isArray() ? actionsRoot : actionsRoot.path("actions");
        if (!actionsNode.isArray() || actionsNode.isEmpty()) {
            return new ActionExecutionResult(0, List.of(), false);
        }

        int executedActions = 0;
        boolean mutatedTarget = false;
        List<UUID> createdTaskIds = new ArrayList<>();

        for (JsonNode actionNode : actionsNode) {
            String type = normalizeKey(actionNode.path("type").asText());
            switch (type) {
                case "CREATE_TASK" -> {
                    UUID taskId = createTask(rule, actionNode, primaryAlias, targets);
                    if (taskId != null) {
                        createdTaskIds.add(taskId);
                        executedActions++;
                    }
                }
                case "TAG" -> {
                    if (applyTag(actionNode, primaryAlias, targets)) {
                        mutatedTarget = true;
                        executedActions++;
                    }
                }
                case "UPDATE_FIELD" -> {
                    if (applyFieldUpdate(actionNode, primaryAlias, targets)) {
                        mutatedTarget = true;
                        executedActions++;
                    }
                }
                default -> log.debug("Unsupported automation action type {}", type);
            }
        }

        return new ActionExecutionResult(executedActions, createdTaskIds, mutatedTarget);
    }

    private UUID createTask(AutomationRule rule, JsonNode actionNode, String primaryAlias, AutomationExecutionTargets targets) {
        Object target = resolveTarget(aliasOrDefault(actionNode.path("target").asText(null), primaryAlias), targets);
        if (target == null) {
            return null;
        }

        UUID tenantId = extractUuidProperty(target, "tenantId");
        UUID assignedTo = resolveUuid(actionNode.path("assignedToField").asText(null), primaryAlias, targets);
        if (assignedTo == null) {
            assignedTo = extractUuidProperty(target, "ownerId");
        }

        Task task = Task.builder()
                .title(actionNode.path("title").asText(defaultTaskTitle(rule)))
                .description(actionNode.path("description").isMissingNode() ? defaultTaskDescription(rule) : asNullableText(actionNode.path("description")))
                .dueDate(LocalDate.now().plusDays(Math.max(0, actionNode.path("dueDays").asLong(1))))
                .priority(resolveTaskPriority(actionNode.path("priority").asText(null)))
                .status(TaskStatus.TODO)
                .assignedTo(assignedTo)
                .relatedEntityType(actionNode.path("relatedEntityType").asText(defaultRelatedEntityType(primaryAlias)))
                .relatedEntityId(resolveUuid(actionNode.path("relatedEntityField").asText(null), primaryAlias, targets))
                .tags(extractTags(actionNode.path("tags")))
                .build();
        if (task.getRelatedEntityId() == null) {
            task.setRelatedEntityId(extractUuidProperty(target, "id"));
        }
        task.setTenantId(tenantId);
        return taskRepository.save(task).getId();
    }

    private boolean applyTag(JsonNode actionNode, String primaryAlias, AutomationExecutionTargets targets) {
        Object target = resolveTarget(aliasOrDefault(actionNode.path("target").asText(null), primaryAlias), targets);
        if (!(target instanceof Lead lead)) {
            return false;
        }

        Set<String> tags = new LinkedHashSet<>();
        if (lead.getTags() != null) {
            tags.addAll(Arrays.asList(lead.getTags()));
        }

        if (actionNode.hasNonNull("value")) {
            tags.add(actionNode.get("value").asText());
        }
        if (actionNode.has("values") && actionNode.get("values").isArray()) {
            actionNode.get("values").forEach(value -> tags.add(value.asText()));
        }

        tags.removeIf(tag -> tag == null || tag.isBlank());
        String[] updatedTags = tags.toArray(String[]::new);
        if (Arrays.equals(updatedTags, lead.getTags())) {
            return false;
        }
        lead.setTags(updatedTags);
        return true;
    }

    private boolean applyFieldUpdate(JsonNode actionNode, String primaryAlias, AutomationExecutionTargets targets) {
        Object target = resolveTarget(aliasOrDefault(actionNode.path("target").asText(null), primaryAlias), targets);
        String field = actionNode.path("field").asText(null);
        if (target == null || field == null || field.isBlank()) {
            return false;
        }

        BeanWrapper wrapper = new BeanWrapperImpl(target);
        if (!wrapper.isWritableProperty(field)) {
            return false;
        }

        Object currentValue = wrapper.getPropertyValue(field);
        Object convertedValue = convertValue(actionNode.get("value"), wrapper.getPropertyType(field));
        if (valuesEqual(currentValue, convertedValue)) {
            return false;
        }

        wrapper.setPropertyValue(field, convertedValue);
        return true;
    }

    private boolean matchesConditions(JsonNode node, String primaryAlias, AutomationExecutionTargets targets) {
        if (node == null || node.isNull() || node.isMissingNode()) {
            return true;
        }
        if (node.isArray()) {
            for (JsonNode child : node) {
                if (!matchesConditions(child, primaryAlias, targets)) {
                    return false;
                }
            }
            return true;
        }
        if (node.has("all")) {
            for (JsonNode child : node.get("all")) {
                if (!matchesConditions(child, primaryAlias, targets)) {
                    return false;
                }
            }
            return true;
        }
        if (node.has("any")) {
            for (JsonNode child : node.get("any")) {
                if (matchesConditions(child, primaryAlias, targets)) {
                    return true;
                }
            }
            return false;
        }
        if (node.has("rules")) {
            String match = normalizeKey(node.path("match").asText("ALL"));
            return "ANY".equals(match)
                    ? matchesConditions(objectMapper.createObjectNode().set("any", node.get("rules")), primaryAlias, targets)
                    : matchesConditions(objectMapper.createObjectNode().set("all", node.get("rules")), primaryAlias, targets);
        }

        Object actual = resolveValue(node.path("field").asText(null), primaryAlias, targets);
        JsonNode expectedNode = node.get("value");
        return switch (normalizeKey(node.path("operator").asText("EQ"))) {
            case "EQ" -> compareEquals(actual, expectedNode);
            case "NE", "NEQ" -> !compareEquals(actual, expectedNode);
            case "GT" -> compareNumbers(actual, expectedNode) > 0;
            case "GTE" -> compareNumbers(actual, expectedNode) >= 0;
            case "LT" -> compareNumbers(actual, expectedNode) < 0;
            case "LTE" -> compareNumbers(actual, expectedNode) <= 0;
            case "CONTAINS" -> containsValue(actual, expectedNode);
            case "IN" -> inList(actual, expectedNode);
            case "EXISTS" -> actual != null && !(actual instanceof String string && string.isBlank());
            case "NOT_EXISTS" -> actual == null || (actual instanceof String string && string.isBlank());
            default -> false;
        };
    }

    private Object resolveValue(String fieldExpression, String primaryAlias, AutomationExecutionTargets targets) {
        if (fieldExpression == null || fieldExpression.isBlank()) {
            return null;
        }

        String alias = primaryAlias;
        String propertyPath = fieldExpression;
        if (fieldExpression.contains(".")) {
            int dotIndex = fieldExpression.indexOf('.');
            alias = fieldExpression.substring(0, dotIndex);
            propertyPath = fieldExpression.substring(dotIndex + 1);
        }

        Object target = resolveTarget(alias, targets);
        if (target == null) {
            return null;
        }

        BeanWrapper wrapper = new BeanWrapperImpl(target);
        return wrapper.isReadableProperty(propertyPath) ? wrapper.getPropertyValue(propertyPath) : null;
    }

    private Object resolveTarget(String alias, AutomationExecutionTargets targets) {
        return switch (normalizeKey(alias)) {
            case "LEAD" -> targets.getLead();
            case "DEAL" -> targets.getDeal();
            case "CASE", "SUPPORT_CASE", "SUPPORTCASE" -> targets.getSupportCase();
            default -> null;
        };
    }

    private String primaryAlias(AutomationEventType eventType) {
        return switch (eventType) {
            case LEAD_CREATED, LEAD_UPDATED, CAMPAIGN_ATTRIBUTED_LEAD -> "lead";
            case DEAL_CREATED, DEAL_UPDATED -> "deal";
            case CASE_CREATED, CASE_BREACHED -> "case";
            default -> null;
        };
    }

    private Object convertValue(JsonNode valueNode, Class<?> targetType) {
        if (targetType == null || valueNode == null || valueNode.isNull()) {
            return null;
        }
        if (targetType == String.class) {
            return valueNode.asText();
        }
        if (targetType == Integer.class || targetType == int.class) {
            return valueNode.isNumber() ? valueNode.intValue() : Integer.valueOf(valueNode.asText());
        }
        if (targetType == Long.class || targetType == long.class) {
            return valueNode.isNumber() ? valueNode.longValue() : Long.valueOf(valueNode.asText());
        }
        if (targetType == Boolean.class || targetType == boolean.class) {
            return valueNode.isBoolean() ? valueNode.booleanValue() : Boolean.valueOf(valueNode.asText());
        }
        if (targetType == BigDecimal.class) {
            return valueNode.isNumber() ? valueNode.decimalValue() : new BigDecimal(valueNode.asText());
        }
        if (targetType == UUID.class) {
            return UUID.fromString(valueNode.asText());
        }
        if (targetType == LocalDate.class) {
            return LocalDate.parse(valueNode.asText());
        }
        if (targetType == LocalDateTime.class) {
            return LocalDateTime.parse(valueNode.asText());
        }
        if (targetType.isEnum()) {
            @SuppressWarnings({"rawtypes", "unchecked"})
            Enum<?> enumValue = Enum.valueOf((Class<? extends Enum>) targetType, valueNode.asText().toUpperCase(Locale.ROOT));
            return enumValue;
        }
        if (targetType == String[].class && valueNode.isArray()) {
            return objectMapper.convertValue(valueNode, String[].class);
        }
        return objectMapper.convertValue(valueNode, targetType);
    }

    private int compareNumbers(Object actual, JsonNode expectedNode) {
        if (actual == null || expectedNode == null || expectedNode.isNull()) {
            return Integer.MIN_VALUE;
        }
        try {
            BigDecimal actualNumber = new BigDecimal(stringifyValue(actual));
            BigDecimal expectedNumber = expectedNode.isNumber() ? expectedNode.decimalValue() : new BigDecimal(expectedNode.asText());
            return actualNumber.compareTo(expectedNumber);
        } catch (NumberFormatException ex) {
            return Integer.MIN_VALUE;
        }
    }

    private boolean compareEquals(Object actual, JsonNode expectedNode) {
        if (expectedNode == null || expectedNode.isNull()) {
            return actual == null;
        }
        if (actual == null) {
            return false;
        }
        if (actual instanceof Enum<?> enumValue) {
            return enumValue.name().equalsIgnoreCase(expectedNode.asText());
        }
        if (actual instanceof Number && expectedNode.isNumber()) {
            return new BigDecimal(actual.toString()).compareTo(expectedNode.decimalValue()) == 0;
        }
        return stringifyValue(actual).equalsIgnoreCase(expectedNode.asText());
    }

    private boolean containsValue(Object actual, JsonNode expectedNode) {
        if (actual == null || expectedNode == null || expectedNode.isNull()) {
            return false;
        }
        String expected = expectedNode.asText().toLowerCase(Locale.ROOT);
        if (actual instanceof String[] values) {
            return Arrays.stream(values).anyMatch(value -> value != null && value.equalsIgnoreCase(expected));
        }
        return stringifyValue(actual).toLowerCase(Locale.ROOT).contains(expected);
    }

    private boolean inList(Object actual, JsonNode expectedNode) {
        if (actual == null || expectedNode == null || !expectedNode.isArray()) {
            return false;
        }
        for (JsonNode node : expectedNode) {
            if (compareEquals(actual, node)) {
                return true;
            }
        }
        return false;
    }

    private String stringifyValue(Object value) {
        if (value == null) {
            return "";
        }
        if (value instanceof Enum<?> enumValue) {
            return enumValue.name();
        }
        return String.valueOf(value);
    }

    private TaskPriority resolveTaskPriority(String value) {
        return value == null || value.isBlank()
                ? TaskPriority.MEDIUM
                : TaskPriority.valueOf(value.toUpperCase(Locale.ROOT));
    }

    private String[] extractTags(JsonNode tagsNode) {
        if (tagsNode == null || tagsNode.isNull()) {
            return null;
        }
        if (tagsNode.isArray()) {
            return objectMapper.convertValue(tagsNode, String[].class);
        }
        if (tagsNode.isTextual()) {
            return new String[]{tagsNode.asText()};
        }
        return null;
    }

    private String normalizeKey(String value) {
        return value == null ? "" : value.trim().replace('-', '_').replace(' ', '_').toUpperCase(Locale.ROOT);
    }

    private JsonNode readJson(String value) {
        try {
            return objectMapper.readTree(value);
        } catch (Exception ex) {
            throw new IllegalArgumentException("Invalid automation JSON payload");
        }
    }

    private String defaultTaskTitle(AutomationRule rule) {
        return "Automation follow-up: " + rule.getName();
    }

    private String defaultTaskDescription(AutomationRule rule) {
        return rule.getDescription() == null || rule.getDescription().isBlank()
                ? "Created by generic automation rule."
                : rule.getDescription();
    }

    private String defaultRelatedEntityType(String primaryAlias) {
        return primaryAlias == null ? "automation" : primaryAlias.toLowerCase(Locale.ROOT);
    }

    private String aliasOrDefault(String alias, String defaultAlias) {
        return alias == null || alias.isBlank() ? defaultAlias : alias;
    }

    private UUID resolveUuid(String fieldExpression, String primaryAlias, AutomationExecutionTargets targets) {
        Object value = resolveValue(fieldExpression, primaryAlias, targets);
        if (value instanceof UUID uuid) {
            return uuid;
        }
        if (value instanceof String string && !string.isBlank()) {
            return UUID.fromString(string);
        }
        return null;
    }

    private UUID extractUuidProperty(Object target, String field) {
        if (target == null) {
            return null;
        }
        BeanWrapper wrapper = new BeanWrapperImpl(target);
        if (!wrapper.isReadableProperty(field)) {
            return null;
        }
        Object value = wrapper.getPropertyValue(field);
        if (value instanceof UUID uuid) {
            return uuid;
        }
        if (value instanceof String string && !string.isBlank()) {
            return UUID.fromString(string);
        }
        return null;
    }

    private boolean valuesEqual(Object currentValue, Object convertedValue) {
        if (currentValue == null && convertedValue == null) {
            return true;
        }
        if (currentValue == null || convertedValue == null) {
            return false;
        }
        if (currentValue.getClass().isArray() && convertedValue.getClass().isArray()
                && currentValue instanceof Object[] left && convertedValue instanceof Object[] right) {
            return Arrays.equals(left, right);
        }
        return currentValue.equals(convertedValue);
    }

    private String summarize(AutomationEventType eventType, AutomationExecutionOutcome result) {
        return "Reviewed " + result.getReviewedRules()
                + " generic " + eventType.name() + " rule(s), matched "
                + result.getMatchedRules() + ", executed "
                + result.getActionsExecuted() + " action(s).";
    }

    private String asNullableText(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }
        String value = node.asText();
        return value == null || value.isBlank() ? null : value;
    }

    private AutomationExecutionOutcome emptyOutcome() {
        return AutomationExecutionOutcome.builder()
                .reviewedRules(0)
                .matchedRules(0)
                .actionsExecuted(0)
                .createdTaskIds(List.of())
                .mutatedTarget(false)
                .build();
    }

    private record ActionExecutionResult(int actionsExecuted, List<UUID> createdTaskIds, boolean mutatedTarget) {
    }
}
