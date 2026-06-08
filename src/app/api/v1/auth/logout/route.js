import { cookies } from 'next/headers';
import { successResponse, errorResponse } from '@/lib/api-response';

export async function POST(req) {
  try {
    const cookieStore = cookies();
    cookieStore.delete('token');
    
    // Explicitly overwrite token cookie with maxAge: 0 to force client-side expiration
    cookieStore.set('token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/',
    });

    return successResponse('Logout successful', null, 200);
  } catch (error) {
    console.error('Logout API Error:', error);
    return errorResponse('Internal server error during logout', 500);
  }
}
