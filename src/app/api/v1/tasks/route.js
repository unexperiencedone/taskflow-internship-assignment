import prisma from '@/lib/db';
import { getAuthUser } from '@/lib/auth-helper';
import { errorResponse, successResponse } from '@/lib/api-response';
import { getCache, setCache, clearCachePattern } from '@/lib/redis';

export async function GET(req) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return errorResponse('Unauthorized access', 401);
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || '';
    const priority = searchParams.get('priority') || '';
    const search = searchParams.get('search') || '';

    // Create Redis Cache Key specific to user, role, and filter state
    const cacheKey = `tasks:user:${user.id}:role:${user.role}:status:${status}:priority:${priority}:search:${search}`;
    
    // Check Cache
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      return successResponse('Tasks retrieved (cached)', cachedData, 200);
    }

    // Build DB filters
    const where = {};
    
    // Regular users can only see their own tasks. Admins see all.
    if (user.role !== 'ADMIN') {
      where.userId = user.id;
    }

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } }
      ];
    }

    // Query DB
    const tasks = await prisma.task.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Cache results (60 seconds)
    await setCache(cacheKey, tasks, 60);

    return successResponse('Tasks retrieved', tasks, 200);
  } catch (error) {
    console.error('Get Tasks API Error:', error);
    return errorResponse('Internal server error retrieving tasks', 500);
  }
}

export async function POST(req) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return errorResponse('Unauthorized access', 401);
    }

    const body = await req.json();
    const { title, description, status, priority, dueDate, userId } = body;

    // 1. Validation
    if (!title || !title.trim()) {
      return errorResponse('Title is required', 400);
    }

    const allowedStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];
    const allowedPriorities = ['LOW', 'MEDIUM', 'HIGH'];

    const taskStatus = status && allowedStatuses.includes(status) ? status : 'PENDING';
    const taskPriority = priority && allowedPriorities.includes(priority) ? priority : 'MEDIUM';

    let parsedDueDate = null;
    if (dueDate) {
      parsedDueDate = new Date(dueDate);
      if (isNaN(parsedDueDate.getTime())) {
        return errorResponse('Invalid due date format', 400);
      }
    }

    // Determine target user assignment
    let targetUserId = user.id;
    if (user.role === 'ADMIN' && userId) {
      const assignedUser = await prisma.user.findUnique({
        where: { id: userId },
      });
      if (!assignedUser) {
        return errorResponse('Assigned user not found', 404);
      }
      targetUserId = userId;
    }

    // 2. Database Insert
    const newTask = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        status: taskStatus,
        priority: taskPriority,
        dueDate: parsedDueDate,
        userId: targetUserId,
      },
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

    // 3. Cache Invalidation
    await clearCachePattern('tasks:*');

    return successResponse('Task created successfully', newTask, 201);
  } catch (error) {
    console.error('Create Task API Error:', error);
    return errorResponse('Internal server error creating task', 500);
  }
}
