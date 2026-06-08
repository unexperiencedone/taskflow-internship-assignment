import { verifyToken } from './jwt';
import prisma from './db';
import { cookies } from 'next/headers';

export async function getAuthUser(req) {
  try {
    // 1. Try to extract from Authorization Bearer header
    let token = null;
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    // 2. Fallback: try to extract from cookies
    if (!token) {
      const cookieStore = cookies();
      token = cookieStore.get('token')?.value;
    }

    if (!token) return null;

    // Verify cryptographic signature
    const payload = verifyToken(token);
    if (!payload || !payload.id) return null;

    // Retrieve user from DB to verify they still exist and check latest role
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    return user;
  } catch (error) {
    console.error('getAuthUser Error:', error);
    return null;
  }
}
