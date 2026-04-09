package com.crm.security;

import com.crm.entity.enums.UserRole;

import java.util.Arrays;
import java.util.Collections;
import java.util.EnumMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;

public final class RolePermissionRegistry {

    private static final Map<UserRole, Set<Permission>> ROLE_PERMISSIONS = new EnumMap<>(UserRole.class);
    private static final Map<UserRole, Set<DataAccessScope>> ROLE_DATA_SCOPES = new EnumMap<>(UserRole.class);

    static {
        ROLE_PERMISSIONS.put(UserRole.ADMIN, immutableSet(Permission.values()));
        ROLE_PERMISSIONS.put(UserRole.MANAGER, immutableSet(
                Permission.REVENUE_VIEW,
                Permission.REVENUE_WRITE,
                Permission.REVENUE_MANAGE,
                Permission.LEADS_VIEW,
                Permission.LEADS_WRITE,
                Permission.LEADS_MANAGE,
                Permission.DEALS_VIEW,
                Permission.DEALS_WRITE,
                Permission.DEALS_MANAGE,
                Permission.ACCOUNTS_VIEW,
                Permission.ACCOUNTS_WRITE,
                Permission.ACCOUNTS_MANAGE,
                Permission.DATA_GOVERNANCE_VIEW,
                Permission.DATA_GOVERNANCE_MANAGE,
                Permission.DASHBOARD_VIEW,
                Permission.GOVERNANCE_MANAGE,
                Permission.AUTOMATION_VIEW,
                Permission.AUTOMATION_MANAGE,
                Permission.MARKETING_VIEW,
                Permission.MARKETING_MANAGE,
                Permission.SUPPORT_VIEW,
                Permission.SUPPORT_WRITE,
                Permission.SUPPORT_MANAGE,
                Permission.FIELD_SERVICE_VIEW,
                Permission.FIELD_SERVICE_WRITE,
                Permission.FIELD_SERVICE_MANAGE,
                Permission.TERRITORY_VIEW,
                Permission.TERRITORY_MANAGE
        ));
        ROLE_PERMISSIONS.put(UserRole.SALES_REP, immutableSet(
                Permission.REVENUE_VIEW,
                Permission.REVENUE_WRITE,
                Permission.LEADS_VIEW,
                Permission.LEADS_WRITE,
                Permission.DEALS_VIEW,
                Permission.DEALS_WRITE,
                Permission.ACCOUNTS_VIEW,
                Permission.ACCOUNTS_WRITE,
                Permission.DATA_GOVERNANCE_VIEW,
                Permission.DASHBOARD_VIEW,
                Permission.MARKETING_VIEW,
                Permission.SUPPORT_VIEW,
                Permission.SUPPORT_WRITE,
                Permission.FIELD_SERVICE_VIEW,
                Permission.FIELD_SERVICE_WRITE,
                Permission.TERRITORY_VIEW
        ));
        ROLE_PERMISSIONS.put(UserRole.USER, immutableSet(
                Permission.DASHBOARD_VIEW,
                Permission.SUPPORT_VIEW,
                Permission.SUPPORT_WRITE,
                Permission.FIELD_SERVICE_VIEW
        ));

        ROLE_DATA_SCOPES.put(UserRole.ADMIN, immutableSet(DataAccessScope.values()));
        ROLE_DATA_SCOPES.put(UserRole.MANAGER, immutableSet(DataAccessScope.OWN, DataAccessScope.TEAM, DataAccessScope.TERRITORY));
        ROLE_DATA_SCOPES.put(UserRole.SALES_REP, immutableSet(DataAccessScope.OWN, DataAccessScope.TERRITORY));
        ROLE_DATA_SCOPES.put(UserRole.USER, immutableSet(DataAccessScope.OWN));
    }

    private RolePermissionRegistry() {
    }

    public static Set<Permission> permissionsFor(UserRole role) {
        if (role == null) {
            return Collections.emptySet();
        }
        return ROLE_PERMISSIONS.getOrDefault(role, Collections.emptySet());
    }

    public static Set<DataAccessScope> dataScopesFor(UserRole role) {
        if (role == null) {
            return Collections.emptySet();
        }
        return ROLE_DATA_SCOPES.getOrDefault(role, Collections.emptySet());
    }

    private static <T> Set<T> immutableSet(T... values) {
        return Collections.unmodifiableSet(new LinkedHashSet<>(Arrays.asList(values)));
    }
}
