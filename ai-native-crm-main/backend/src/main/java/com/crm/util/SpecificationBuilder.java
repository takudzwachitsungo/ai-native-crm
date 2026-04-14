package com.crm.util;

import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Utility class for building dynamic JPA Specifications for filtering
 */
public class SpecificationBuilder {

    /**
     * Combines multiple specifications with AND logic
     */
    public static <T> Specification<T> combineWithAnd(List<Specification<T>> specifications) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();
            for (Specification<T> spec : specifications) {
                if (spec != null) {
                    Predicate predicate = spec.toPredicate(root, query, criteriaBuilder);
                    if (predicate != null) {
                        predicates.add(predicate);
                    }
                }
            }
            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }

    /**
     * Creates a LIKE specification for string fields
     */
    public static <T> Specification<T> like(String field, String value) {
        if (value == null || value.isEmpty()) {
            return null;
        }
        return (root, query, criteriaBuilder) ->
            criteriaBuilder.like(criteriaBuilder.lower(root.get(field)), "%" + value.toLowerCase() + "%");
    }

    /**
     * Creates an EQUAL specification
     */
    public static <T> Specification<T> equal(String field, Object value) {
        if (value == null) {
            return null;
        }
        return (root, query, criteriaBuilder) -> criteriaBuilder.equal(root.get(field), value);
    }

    /**
     * Creates an IN specification for multiple values
     */
    public static <T> Specification<T> in(String field, List<?> values) {
        if (values == null || values.isEmpty()) {
            return null;
        }
        return (root, query, criteriaBuilder) -> root.get(field).in(values);
    }

    /**
     * Creates a BETWEEN specification for comparable fields
     */
    public static <T, V extends Comparable<V>> Specification<T> between(String field, V min, V max) {
        if (min == null && max == null) {
            return null;
        }
        return (root, query, criteriaBuilder) -> {
            if (min != null && max != null) {
                return criteriaBuilder.between(root.get(field), min, max);
            } else if (min != null) {
                return criteriaBuilder.greaterThanOrEqualTo(root.get(field), min);
            } else {
                return criteriaBuilder.lessThanOrEqualTo(root.get(field), max);
            }
        };
    }

    /**
     * Creates a date range specification
     */
    public static <T> Specification<T> dateBetween(String field, LocalDate from, LocalDate to) {
        if (from == null && to == null) {
            return null;
        }
        return (root, query, criteriaBuilder) -> {
            if (from != null && to != null) {
                return criteriaBuilder.between(root.get(field), from, to);
            } else if (from != null) {
                return criteriaBuilder.greaterThanOrEqualTo(root.get(field), from);
            } else {
                return criteriaBuilder.lessThanOrEqualTo(root.get(field), to);
            }
        };
    }

    /**
     * Creates a datetime range specification
     */
    public static <T> Specification<T> dateTimeBetween(String field, LocalDateTime from, LocalDateTime to) {
        if (from == null && to == null) {
            return null;
        }
        return (root, query, criteriaBuilder) -> {
            if (from != null && to != null) {
                return criteriaBuilder.between(root.get(field), from, to);
            } else if (from != null) {
                return criteriaBuilder.greaterThanOrEqualTo(root.get(field), from);
            } else {
                return criteriaBuilder.lessThanOrEqualTo(root.get(field), to);
            }
        };
    }

    /**
     * Creates a greater than specification
     */
    @SuppressWarnings({"unchecked", "rawtypes"})
    public static <T> Specification<T> greaterThan(String field, Comparable value) {
        if (value == null) {
            return null;
        }
        return (root, query, criteriaBuilder) -> 
            criteriaBuilder.greaterThan(root.get(field).as(value.getClass()), value);
    }

    /**
     * Creates a less than specification
     */
    @SuppressWarnings({"unchecked", "rawtypes"})
    public static <T> Specification<T> lessThan(String field, Comparable value) {
        if (value == null) {
            return null;
        }
        return (root, query, criteriaBuilder) -> 
            criteriaBuilder.lessThan(root.get(field).as(value.getClass()), value);
    }

    /**
     * Creates a specification for archived filter
     */
    public static <T> Specification<T> notArchived() {
        return (root, query, criteriaBuilder) -> criteriaBuilder.equal(root.get("archived"), false);
    }

    /**
     * Creates a specification for tenant filter
     */
    public static <T> Specification<T> tenantEquals(Object tenantId) {
        return equal("tenantId", tenantId);
    }
}
