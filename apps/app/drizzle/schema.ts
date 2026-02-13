import {
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  boolean,
  integer,
  index,
  uuid,
  json,
} from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(),
    username: text('username').unique().notNull(),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
  },
  (users) => {
    return {
      uniqueIdx: uniqueIndex('unique_idx').on(users.username),
    };
  },
);

export const clips = pgTable(
  'clips',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user: text('user')
      .notNull()
      .references(() => users.id),
    video: text('video').notNull(),
    start: numeric('start').notNull(),
    end: numeric('end').notNull(),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    clipUrl: text('clipUrl'),
    hermit: text('hermit').references(() => hermitcraftChannels.ChannelID),
    season: text('season'),
    tagline: text('tagline'),
    downloads: integer('downloads').default(0).notNull(),
  },
  (clips) => {
    return {
      createdAtIndex: index('clips_createdAt_idx').on(clips.createdAt),
      hermitIndex: index('clips_hermit_idx').on(clips.hermit),
      taglineIndex: index('clips_tagline_idx').on(clips.tagline),
    };
  },
);

export const hermitcraftChannels = pgTable(
  'hermitcraftChannels',
  {
    id: text('id'),
    ChannelID: text('ChannelID').primaryKey(),
    ChannelName: text('ChannelName').notNull(),
    DisplayName: text('DisplayName').notNull(),
    ProfilePicture: text('ProfilePicture').notNull(),
    GooglePlusLink: text('GooglePlusLink'),
    TwitterName: text('TwitterName'),
    TwitchName: text('TwitchName'),
    WebsiteURL: text('WebsiteURL'),
    Active: boolean('Active').notNull(),
    Streaming: boolean('Streaming').notNull(),
    YTStreaming: boolean('YTStreaming').notNull(),
    UploadPlaylistID: text('UploadPlaylistID').notNull(),
  },
  (hermitChannels) => {
    return {
      uniqueIdx: uniqueIndex('hermit_idx').on(hermitChannels.ChannelID),
    };
  },
);

export const likes = pgTable(
  'likes',
  {
    id: serial('id').primaryKey(),
    user: text('user')
      .references(() => users.id)
      .notNull(),
    clip: uuid('clip')
      .references(() => clips.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
  },
  (likes) => {
    return {
      clipIndex: index('likes_clip_idx').on(likes.clip),
      userClipUnique: uniqueIndex('likes_user_clip_unique_idx').on(
        likes.user,
        likes.clip,
      ),
    };
  },
);

export const newUsernames = pgTable('newUsernames', {
  username: text('username').primaryKey(),
});

export const cachedHermitcraftVideos = pgTable('cachedHermitcraftVideos', {
  id: uuid('id').primaryKey().defaultRandom(),
  data: json('data').notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

export const generationLogs = pgTable(
  'generationLogs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('userId').references(() => users.id), // Nullable for CLI requests
    videoUrl: text('videoUrl').notNull(),
    start: numeric('start').notNull(),
    end: numeric('end').notNull(),
    status: text('status').notNull(), // 'initiated', 'completed', 'failed', 'active'
    errorMessage: text('errorMessage'),
    taskId: text('taskId'),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    completedAt: timestamp('completedAt'),
  },
  (logs) => {
    return {
      userIdIndex: index('generation_logs_userId_idx').on(logs.userId),
      createdAtIndex: index('generation_logs_createdAt_idx').on(logs.createdAt),
      statusIndex: index('generation_logs_status_idx').on(logs.status),
    };
  },
);
