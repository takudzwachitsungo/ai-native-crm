import type { TenantTier, UserRole } from "./types";

export const roleLabels: Record<UserRole, string> = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  SALES_REP: "Sales Rep",
  USER: "User",
};

export const tenantTierLabels: Record<TenantTier, string> = {
  FREE: "Free",
  PRO: "Pro",
  ENTERPRISE: "Enterprise",
};

export const canAccessRole = (role: UserRole | undefined, allowedRoles?: UserRole[]) => {
  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }

  if (!role) {
    return false;
  }

  return allowedRoles.includes(role);
};
