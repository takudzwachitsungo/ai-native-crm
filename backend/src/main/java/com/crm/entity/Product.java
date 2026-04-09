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

    @Column(name = "minimum_price", precision = 19, scale = 2)
    private BigDecimal minimumPrice;

    @Column(name = "allow_discounting", nullable = false)
    private Boolean allowDiscounting = true;

    @Column(name = "max_discount_percent", precision = 5, scale = 2)
    private BigDecimal maxDiscountPercent = BigDecimal.valueOf(100);

    @Column(name = "is_configurable", nullable = false)
    private Boolean configurable = false;

    @Column(name = "bundle_only", nullable = false)
    private Boolean bundleOnly = false;

    @Column(name = "minimum_quantity")
    private Integer minimumQuantity;

    @Column(name = "maximum_quantity")
    private Integer maximumQuantity;

    @Column(name = "bundle_size")
    private Integer bundleSize = 1;

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
