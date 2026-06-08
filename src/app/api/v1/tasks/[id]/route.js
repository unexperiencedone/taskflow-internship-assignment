import prisma from '@/lib/db';
import { getAuthUser } from '@/lib/auth-helper';
import { errorResponse, successResponse } from '@/lib/api-response';
import { clearCachePattern } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return errorResponse('Unauthorized access', 401);
    }

    const { id } = params;

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    if (!task) {
      return errorResponse('Task not found', 404);
    }

    // Verify task ownership / ADMIN permissions
    if (user.role !== 'ADMIN' && task.userId !== user.id) {
      return errorResponse('Forbidden: You do not own this task', 403);
    }

    return successResponse('Task retrieved successfully', task, 200);
  } catch (error) {
    console.error('Get Task By ID API Error:', error);
    return errorResponse('Internal server error retrieving task', 500);
  }
}

export async function PUT(req, { params }) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return errorResponse('Unauthorized access', 401);
    }

    const { id } = params;
    const body = await req.json();
    const { title, description, status, priority, dueDate, userId } = body;

    const task = await prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      return errorResponse('Task not found', 404);
    }

    // Verify ownership / ADMIN permissions
    if (user.role !== 'ADMIN' && task.userId !== user.id) {
      return errorResponse('Forbidden: You do not own this task', 403);
    }

    // Build update object
    const updateData = {};

    if (title !== undefined) {
      if (!title || !title.trim()) {
        return errorResponse('Title cannot be empty', 400);
      }
      updateData.title = title.trim();
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }

    const allowedStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];
    if (status !== undefined) {
      if (!allowedStatuses.includes(status)) {
        return errorResponse('Invalid status value', 400);
      }
      updateData.status = status;
    }

    const allowedPriorities = ['LOW', 'MEDIUM', 'HIGH'];
    if (priority !== undefined) {
      if (!allowedPriorities.includes(priority)) {
        return errorResponse('Invalid priority value', 400);
      }
      updateData.priority = priority;
    }

    if (dueDate !== undefined) {
      if (dueDate === null) {
        updateData.dueDate = null;
      } else {
        const parsedDueDate = new Date(dueDate);
        if (isNaN(parsedDueDate.getTime())) {
          return errorResponse('Invalid due date format', 400);
        }
        updateData.dueDate = parsedDueDate;
      }
    }

    // Reassignment (Admin only)
    if (userId !== undefined && userId !== task.userId) {
      if (user.role !== 'ADMIN') {
        return errorResponse('Forbidden: Only admins can reassign tasks', 403);
      }
      const assignedUser = await prisma.user.findUnique({
        where: { id: userId },
      });
      if (!assignedUser) {
        return errorResponse('Assigned user not found', 404);
      }
      updateData.userId = userId;
    }

    // Update in DB
    const updatedTask = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    // Invalidate caches
    await clearCachePattern('tasks:*');

    return successResponse('Task updated successfully', updatedTask, 200);
  } catch (error) {
    console.error('Update Task API Error:', error);
    return errorResponse('Internal server error updating task', 500);
  }
}

export async function DELETE(req, { params }) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return errorResponse('Unauthorized access', 401);
    }

    const { id } = params;

    const task = await prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      return errorResponse('Task not found', 404);
    }

    // Verify ownership / ADMIN permissions
    if (user.role !== 'ADMIN' && task.userId !== user.id) {
      return errorResponse('Forbidden: You do not own this task', 403);
    }

    // Delete in DB
    await prisma.task.delete({
      where: { id },
    });

    // Invalidate caches
    await clearCachePattern('tasks:*');

    return successResponse('Task deleted successfully', null, 200);
  } catch (error) {
    console.error('Delete Task API Error:', error);
    return errorResponse('Internal server error deleting task', 500);
  }
}
