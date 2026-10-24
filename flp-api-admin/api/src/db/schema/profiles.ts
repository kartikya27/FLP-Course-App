import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { authUsers } from 'drizzle-orm/supabase';

export const profileRole = pgEnum('profile_role', ['student', 'admin']);
export const profileStatus = pgEnum('profile_status', ['active', 'blocked']);

export const profiles = pgTable('profiles', {
  id: uuid('id')
    .primaryKey()
    .references(() => authUsers.id, { onDelete: 'cascade' }),
  role: profileRole('role').notNull().default('student'),
  fullName: text('full_name'),
  phone: text('phone').unique(),
  email: text('email'),
  status: profileStatus('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}).enableRLS();

export type Profile = typeof profiles.$inferSelect;
export type ProfileRole = (typeof profileRole.enumValues)[number];
