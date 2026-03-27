/**
 * Jest setup file to load environment variables and mock Supabase
 * This runs BEFORE any other test setup
 */

const path = require('path');

// Load environment variables from .env.local FIRST
const result = require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

// Ensure environment variables are set BEFORE any imports
if (!process.env.EXPO_PUBLIC_SUPABASE_URL) {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
}

if (!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key-12345';
}

// Mock the root supabaseClient.js module BEFORE it gets imported
jest.mock('../supabaseClient.js', () => {
    const mockClient = {
        auth: {
            signUp: jest.fn(),
            signInWithPassword: jest.fn(),
            signOut: jest.fn(),
            getUser: jest.fn(),
            updateUser: jest.fn(),
        },
        from: jest.fn(() => ({
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            delete: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            single: jest.fn(),
            upsert: jest.fn(),
        })),
    };

    return {
        supabase: mockClient,
    };
});
