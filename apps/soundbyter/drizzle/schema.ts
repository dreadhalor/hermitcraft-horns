import {
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    image: text('image').notNull(),
    createdAt: timestamp('createdAt').defaultNow(),
  },
  (users) => {
    return {
      uniqueIdx: uniqueIndex('unique_idx').on(users.email),
    };
  },
);

export const clips = pgTable('clips', {
  id: serial('id').primaryKey(),
  user: serial('user').notNull(),
  video: text('video').notNull(),
  start: numeric('start').notNull(),
  end: numeric('end').notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  clipUrl: text('clipUrl'),
});
