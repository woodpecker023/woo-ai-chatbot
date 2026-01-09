import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { getDbClient } from '@woo-ai/database';
import { users } from '@woo-ai/database';
import { eq } from 'drizzle-orm';
import { registerSchema, loginSchema } from '@woo-ai/shared';
import { generateToken, authenticateUser } from '../middleware/auth.js';
import { ZodError } from 'zod';
import { z } from 'zod';

const updateProfileSchema = z.object({
  name: z.string().min(1).max(255),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function authRoutes(server: FastifyInstance) {
  // Register
  server.post('/register', async (request, reply) => {
    try {
      const body = registerSchema.parse(request.body);

      const db = getDbClient();

      // Check if user exists
      const existing = await db.query.users.findFirst({
        where: eq(users.email, body.email),
      });

      if (existing) {
        return reply.status(400).send({ error: 'Email already registered' });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(body.password, 10);

      // Create user
      const [newUser] = await db
        .insert(users)
        .values({
          email: body.email,
          passwordHash,
          name: body.name,
        })
        .returning({ id: users.id, email: users.email, name: users.name });

      // Generate token
      const token = generateToken({
        userId: newUser.id,
        email: newUser.email,
      });

      return {
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
        },
        token,
      };
    } catch (error) {
      if (error instanceof ZodError) {
        const message = error.errors.map(e => e.message).join(', ');
        return reply.status(400).send({ error: message, details: error.errors });
      }
      throw error;
    }
  });

  // Login
  server.post('/login', async (request, reply) => {
    try {
      const body = loginSchema.parse(request.body);

      const db = getDbClient();

      // Find user
      const user = await db.query.users.findFirst({
        where: eq(users.email, body.email),
      });

      if (!user) {
        return reply.status(401).send({ error: 'Invalid credentials' });
      }

      // Verify password
      const valid = await bcrypt.compare(body.password, user.passwordHash);

      if (!valid) {
        return reply.status(401).send({ error: 'Invalid credentials' });
      }

      // Generate token
      const token = generateToken({
        userId: user.id,
        email: user.email,
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        token,
      };
    } catch (error) {
      if (error instanceof ZodError) {
        const message = error.errors.map(e => e.message).join(', ');
        return reply.status(400).send({ error: message, details: error.errors });
      }
      throw error;
    }
  });

  // Google OAuth
  server.post('/google', async (request, reply) => {
    try {
      const body = request.body as { credential: string };

      if (!body.credential) {
        return reply.status(400).send({ error: 'Missing credential' });
      }

      // Verify Google token
      const ticket = await googleClient.verifyIdToken({
        idToken: body.credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();

      if (!payload || !payload.email) {
        return reply.status(400).send({ error: 'Invalid Google token' });
      }

      const db = getDbClient();

      // Check if user exists
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, payload.email),
      });

      let userId: string;
      let userEmail: string;
      let userName: string;

      if (existingUser) {
        userId = existingUser.id;
        userEmail = existingUser.email;
        userName = existingUser.name;
      } else {
        // Create new user
        const [newUser] = await db
          .insert(users)
          .values({
            email: payload.email,
            passwordHash: '', // No password for OAuth users
            name: payload.name || payload.email.split('@')[0],
          })
          .returning({ id: users.id, email: users.email, name: users.name });

        userId = newUser.id;
        userEmail = newUser.email;
        userName = newUser.name;
      }

      // Generate token
      const token = generateToken({
        userId,
        email: userEmail,
      });

      return {
        user: {
          id: userId,
          email: userEmail,
          name: userName,
        },
        token,
      };
    } catch (error) {
      server.log.error(error);
      return reply.status(401).send({ error: 'Google authentication failed' });
    }
  });

  // Get current user profile
  server.get('/me', {
    preHandler: [authenticateUser],
    handler: async (request, reply) => {
      const db = getDbClient();

      const user = await db.query.users.findFirst({
        where: eq(users.id, request.user!.userId),
        columns: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
        },
      });

      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      // Check if user signed up with Google (empty password hash)
      const fullUser = await db.query.users.findFirst({
        where: eq(users.id, request.user!.userId),
      });
      const isGoogleUser = fullUser?.passwordHash === '';

      return {
        user: {
          ...user,
          isGoogleUser,
        },
      };
    },
  });

  // Update profile
  server.patch('/profile', {
    preHandler: [authenticateUser],
    handler: async (request, reply) => {
      try {
        const body = updateProfileSchema.parse(request.body);
        const db = getDbClient();

        const [updated] = await db
          .update(users)
          .set({
            name: body.name,
            updatedAt: new Date(),
          })
          .where(eq(users.id, request.user!.userId))
          .returning({ id: users.id, email: users.email, name: users.name });

        return { user: updated };
      } catch (error) {
        if (error instanceof ZodError) {
          const message = error.errors.map(e => e.message).join(', ');
          return reply.status(400).send({ error: message, details: error.errors });
        }
        throw error;
      }
    },
  });

  // Change password
  server.patch('/password', {
    preHandler: [authenticateUser],
    handler: async (request, reply) => {
      try {
        const body = changePasswordSchema.parse(request.body);
        const db = getDbClient();

        // Get current user
        const user = await db.query.users.findFirst({
          where: eq(users.id, request.user!.userId),
        });

        if (!user) {
          return reply.status(404).send({ error: 'User not found' });
        }

        // Google users can't change password (they don't have one)
        if (user.passwordHash === '') {
          return reply.status(400).send({
            error: 'Cannot change password for Google-authenticated accounts'
          });
        }

        // Verify current password
        const valid = await bcrypt.compare(body.currentPassword, user.passwordHash);
        if (!valid) {
          return reply.status(400).send({ error: 'Current password is incorrect' });
        }

        // Hash new password
        const newPasswordHash = await bcrypt.hash(body.newPassword, 10);

        // Update password
        await db
          .update(users)
          .set({
            passwordHash: newPasswordHash,
            updatedAt: new Date(),
          })
          .where(eq(users.id, request.user!.userId));

        return { success: true, message: 'Password changed successfully' };
      } catch (error) {
        if (error instanceof ZodError) {
          const message = error.errors.map(e => e.message).join(', ');
          return reply.status(400).send({ error: message, details: error.errors });
        }
        throw error;
      }
    },
  });

  // Delete account
  server.delete('/account', {
    preHandler: [authenticateUser],
    handler: async (request) => {
      const db = getDbClient();

      // Delete user (cascade will delete stores, products, etc.)
      await db
        .delete(users)
        .where(eq(users.id, request.user!.userId));

      return { success: true, message: 'Account deleted successfully' };
    },
  });
}
