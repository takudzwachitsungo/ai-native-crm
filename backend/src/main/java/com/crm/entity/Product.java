package com.crm.entity;

import com.crm.entity.enums.ProductCategory;
import com.crm.entity.enums.ProductStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "products", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"tenant_id", "sku"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Product extends AbstractEntity {

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, length = 100)
    private String sku;

    @Enumerated(EnumType.STRING)
    @Column(length = 100)
    private ProductCategory category;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal price;

    @Column(precision = 19, scale = 2)
    private BigDecimal cost;

    @Column(name = "stock_quantity")
    private Integer stockQuantity = 0;

    @Column(length = 50)
    private String unit;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private ProductStatus status = ProductStatus.ACTIVE;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Transient
    public BigDecimal getMargin() {
        if (price == null || cost == null) {
            return BigDecimal.ZERO;
        }
        return price.subtract(cost);
    }

    @Transient
    public BigDecimal getMarginPercent() {
        if (price == null || cost == null || price.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        return getMargin().divide(price, 4, BigDecimal.ROUND_HALF_UP)
               .multiply(BigDecimal.valueOf(100));
    }
}
