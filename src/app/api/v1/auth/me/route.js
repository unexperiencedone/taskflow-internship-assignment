import { getAuthUser } from '@/lib/auth-helper';
import { errorResponse, successResponse } from '@/lib/api-response';

export async function GET(req) {
  try {
    const user = await getAuthUser(req);
    
    if (!user) {
      return errorResponse('Unauthorized access', 401);
    }
    
    return successResponse('User profile retrieved', { user }, 200);
  } catch (error) {
    console.error('Auth Me API Error:', error);
    return errorResponse('Internal server error retrieving profile', 500);
  }
}
