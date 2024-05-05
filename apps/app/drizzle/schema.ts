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
} from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(),
    username: text('username').notNull(),
    createdAt: timestamp('createdAt').defaultNow(),
  },
  (users) => {
    return {
      uniqueIdx: uniqueIndex('unique_idx').on(users.username),
    };
  },
);

export const clips = pgTable('clips', {
  id: serial('id').primaryKey(),
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
});

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
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    clipId: integer('clip_id')
      .notNull()
      .references(() => clips.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (likes) => {
    return {
      clipIdIndex: index('likes_clip_id_idx').on(likes.clipId),
    };
  },
);
