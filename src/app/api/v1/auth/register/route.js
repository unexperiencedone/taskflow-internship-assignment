import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import { errorResponse, successResponse } from '@/lib/api-response';

export async function POST(req) {
  try {
    const body = await req.json();
    const { name, email, password, role } = body;

    // 1. Input Validation
    if (!name || !name.trim()) {
      return errorResponse('Name is required', 400);
    }
    if (!email || !email.trim()) {
      return errorResponse('Email is required', 400);
    }
    if (!password || password.length < 6) {
      return errorResponse('Password must be at least 6 characters long', 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return errorResponse('Invalid email address format', 400);
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 2. Check conflict
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return errorResponse('User with this email already exists', 409);
    }

    // 3. Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Set Role (Default to USER; allow ADMIN if specified for easier testing)
    const userRole = role === 'ADMIN' ? 'ADMIN' : 'USER';

    // 5. Save User
    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: userRole,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return successResponse('User registered successfully', newUser, 201);
  } catch (error) {
    console.error('Registration API Error:', error);
    return errorResponse('Internal server error during registration', 500);
  }
}
