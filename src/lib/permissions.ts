import { UserRole, SystemRole } from './types';

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  PUBLIC: 0,
  MEMBER: 1,
  TREASURER: 2,
  FACULTY_COORDINATOR: 3,
  SOCIETY_ADMIN: 4,
  SUPER_ADMIN: 5,
};

export interface PermissionContext {
  userId: string;
  systemRole: SystemRole;
  societyRole?: UserRole;
  societyId?: string;
}

export class Permissions {
  /**
   * Checks if user has Super Admin platform-wide privileges
   */
  static isSuperAdmin(ctx: PermissionContext): boolean {
    return ctx.systemRole === 'SUPER_ADMIN' || ctx.societyRole === 'SUPER_ADMIN';
  }

  /**
   * Checks if user has access to a specific society
   */
  static canAccessSociety(ctx: PermissionContext, targetSocietyId: string): boolean {
    if (this.isSuperAdmin(ctx)) return true;
    return ctx.societyId === targetSocietyId && !!ctx.societyRole && ctx.societyRole !== 'PUBLIC';
  }

  /**
   * Checks if user can view financial dashboard and approved transactions
   */
  static canViewFinancials(ctx: PermissionContext, targetSocietyId: string): boolean {
    if (this.isSuperAdmin(ctx)) return true;
    if (!this.canAccessSociety(ctx, targetSocietyId)) return false;
    return ['MEMBER', 'TREASURER', 'FACULTY_COORDINATOR', 'SOCIETY_ADMIN'].includes(ctx.societyRole || '');
  }

  /**
   * Checks if user can create income/expense transactions
   */
  static canCreateTransaction(ctx: PermissionContext, targetSocietyId: string): boolean {
    if (this.isSuperAdmin(ctx)) return true;
    if (!this.canAccessSociety(ctx, targetSocietyId)) return false;
    return ['TREASURER', 'SOCIETY_ADMIN'].includes(ctx.societyRole || '');
  }

  /**
   * Checks if user can approve or reject a transaction.
   * Crucial Business Rule: User CANNOT approve their own transaction (anti-fraud separation of duties)
   * unless they are a Super Admin.
   */
  static canApproveTransaction(ctx: PermissionContext, targetSocietyId: string, createdById: string): boolean {
    if (this.isSuperAdmin(ctx)) return true;
    if (!this.canAccessSociety(ctx, targetSocietyId)) return false;

    // Faculty Coordinator and Society Admin can approve
    const isEligibleRole = ['FACULTY_COORDINATOR', 'SOCIETY_ADMIN'].includes(ctx.societyRole || '');
    if (!isEligibleRole) return false;

    // Separation of duties: Creator cannot approve their own transaction
    if (ctx.userId === createdById) {
      return false;
    }

    return true;
  }

  /**
   * Checks if user can void an approved transaction
   */
  static canVoidTransaction(ctx: PermissionContext, targetSocietyId: string): boolean {
    if (this.isSuperAdmin(ctx)) return true;
    if (!this.canAccessSociety(ctx, targetSocietyId)) return false;
    return ['FACULTY_COORDINATOR', 'SOCIETY_ADMIN'].includes(ctx.societyRole || '');
  }

  /**
   * Checks if user can manage budgets (create/update)
   */
  static canManageBudgets(ctx: PermissionContext, targetSocietyId: string): boolean {
    if (this.isSuperAdmin(ctx)) return true;
    if (!this.canAccessSociety(ctx, targetSocietyId)) return false;
    return ['TREASURER', 'SOCIETY_ADMIN'].includes(ctx.societyRole || '');
  }

  /**
   * Checks if user can manage events
   */
  static canManageEvents(ctx: PermissionContext, targetSocietyId: string): boolean {
    if (this.isSuperAdmin(ctx)) return true;
    if (!this.canAccessSociety(ctx, targetSocietyId)) return false;
    return ['TREASURER', 'SOCIETY_ADMIN'].includes(ctx.societyRole || '');
  }

  /**
   * Checks if user can manage categories
   */
  static canManageCategories(ctx: PermissionContext, targetSocietyId?: string): boolean {
    if (this.isSuperAdmin(ctx)) return true;
    if (!targetSocietyId) return false;
    if (!this.canAccessSociety(ctx, targetSocietyId)) return false;
    return ['SOCIETY_ADMIN'].includes(ctx.societyRole || '');
  }

  /**
   * Checks if user can configure transparency settings
   */
  static canManageTransparencySettings(ctx: PermissionContext, targetSocietyId: string): boolean {
    if (this.isSuperAdmin(ctx)) return true;
    if (!this.canAccessSociety(ctx, targetSocietyId)) return false;
    return ['SOCIETY_ADMIN'].includes(ctx.societyRole || '');
  }

  /**
   * Checks if user can view audit logs
   */
  static canViewAuditLogs(ctx: PermissionContext, targetSocietyId: string): boolean {
    if (this.isSuperAdmin(ctx)) return true;
    if (!this.canAccessSociety(ctx, targetSocietyId)) return false;
    return ['FACULTY_COORDINATOR', 'SOCIETY_ADMIN'].includes(ctx.societyRole || '');
  }

  /**
   * Checks if user can manage members and user roles within the society
   */
  static canManageMembers(ctx: PermissionContext, targetSocietyId: string): boolean {
    if (this.isSuperAdmin(ctx)) return true;
    if (!this.canAccessSociety(ctx, targetSocietyId)) return false;
    return ['SOCIETY_ADMIN'].includes(ctx.societyRole || '');
  }

  /**
   * Checks if user can generate and publish official reports
   */
  static canManageReports(ctx: PermissionContext, targetSocietyId: string): boolean {
    if (this.isSuperAdmin(ctx)) return true;
    if (!this.canAccessSociety(ctx, targetSocietyId)) return false;
    return ['TREASURER', 'FACULTY_COORDINATOR', 'SOCIETY_ADMIN'].includes(ctx.societyRole || '');
  }
}
