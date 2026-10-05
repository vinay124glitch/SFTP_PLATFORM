import prisma from '@/lib/db';

export class NotificationService {
  /**
   * Dispatch a notification to a specific user
   */
  static async notifyUser(params: {
    userId: string;
    societyId?: string | null;
    type: string;
    title: string;
    message: string;
    link?: string;
  }) {
    try {
      return await prisma.notification.create({
        data: {
          userId: params.userId,
          societyId: params.societyId || null,
          type: params.type,
          title: params.title,
          message: params.message,
          link: params.link || null,
        },
      });
    } catch (err) {
      console.error('Failed to notify user:', err);
      return null;
    }
  }

  /**
   * Notify all Faculty Coordinators and Admins of a society (e.g. for pending approval)
   */
  static async notifyApprovers(params: {
    societyId: string;
    type: string;
    title: string;
    message: string;
    link?: string;
    excludeUserId?: string;
  }) {
    try {
      const approvers = await prisma.societyMember.findMany({
        where: {
          societyId: params.societyId,
          active: true,
          role: { in: ['FACULTY_COORDINATOR', 'SOCIETY_ADMIN'] },
          ...(params.excludeUserId ? { userId: { not: params.excludeUserId } } : {}),
        },
        select: { userId: true },
      });

      const promises = approvers.map((a) =>
        this.notifyUser({
          userId: a.userId,
          societyId: params.societyId,
          type: params.type,
          title: params.title,
          message: params.message,
          link: params.link,
        })
      );

      await Promise.all(promises);
    } catch (err) {
      console.error('Failed to notify approvers:', err);
    }
  }
}
