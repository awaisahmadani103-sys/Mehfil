/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * MEHFIL DATA STORES
 * -------------------
 * All dummy and fake data has been purged.
 * The application operates strictly with real user data from signup,
 * creation, and real-time Firestore persistence.
 */

import { User, Post, Story, NotificationItem, Conversation } from '../types';

// The primary administrator email (from AI Studio runtime metadata)
export const DEFAULT_ADMIN_EMAIL = "alihassan123346600ll@gmail.com";

// Empty initial state: only real users who sign up will exist
export const INITIAL_USERS: User[] = [];

// Empty initial posts: only real user created posts exist
export const INITIAL_POSTS: Post[] = [];

// Empty initial stories: only real user created stories exist
export const INITIAL_STORIES: Story[] = [];

// Empty initial conversations: only real user messages exist
export const INITIAL_CONVERSATIONS: Conversation[] = [];

// Empty initial notifications: only real user notifications exist
export const INITIAL_NOTIFICATIONS: NotificationItem[] = [];

export const TRENDING_TAGS: { tag: string; count: string }[] = [];
