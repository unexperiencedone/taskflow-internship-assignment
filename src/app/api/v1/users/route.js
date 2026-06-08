import prisma from '@/lib/db';
import { getAuthUser } from '@/lib/auth-helper';
import { errorResponse, successResponse } from '@/lib/api-response';

export async function GET(req) {
  try {
    const user = await getAuthUser(req);
    
    if (!user) {
      return errorResponse('Unauthorized access', 401);
    }
    
    if (user.role !== 'ADMIN') {
      return errorResponse('Forbidden: Admins only', 403);
    }
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
    
    return successResponse('Users list retrieved', { users }, 200);
  } catch (error) {
    console.error('Get Users API Error:', error);
    return errorResponse('Internal server error retrieving users', 500);
  }
}
