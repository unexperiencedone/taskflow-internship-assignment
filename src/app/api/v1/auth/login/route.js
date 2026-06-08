import { cookies } from 'next/headers';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/jwt';
import { errorResponse, successResponse } from '@/lib/api-response';

export async function POST(req) {
  try {
    const body = await req.json();
    const { email, password } = body;

    // 1. Validation
    if (!email || !password) {
      return errorResponse('Email and password are required', 400);
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 2. Query User
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return errorResponse('Invalid email or password', 401);
    }

    // 3. Verify Password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return errorResponse('Invalid email or password', 401);
    }

    // 4. Create Token
    const token = signToken({ id: user.id, email: user.email, role: user.role });

    // 5. Save in Cookie
    const cookieStore = cookies();
    cookieStore.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    const userClaims = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    return successResponse('Login successful', { user: userClaims, token }, 200);
  } catch (error) {
    console.error('Login API Error:', error);
    return errorResponse('Internal server error during login', 500);
  }
}
