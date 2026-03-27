/**
 * Integration tests for category management
 */

import {
    addCategory,
    deleteCategory,
    deleteExpensesByCategory,
    fetchAndSaveCategories,
    loadStoredCategories,
} from '../../utils/database';
import { mockUser, mockCategory, expectValidCategory } from '../helpers/testUtils';
import * as SecureStore from 'expo-secure-store';

describe('Category Management Integration Tests', () => {
    const userId = mockUser.id;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Create Category', () => {
        it('should successfully create a new category', async () => {
            const categoryName = 'Food';
            const mockNewCategory = mockCategory(userId, categoryName);

            global.mockSupabase.from.mockReturnValue({
                insert: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({
                    data: mockNewCategory,
                    error: null,
                }),
            });

            const result = await addCategory(categoryName, userId);

            expect(result).toBeDefined();
            expect(result.name).toBe(categoryName);
            expect(result.user_id).toBe(userId);
            expectValidCategory(result);
        });

        it('should create multiple categories for the same user', async () => {
            const categories = ['Food', 'Transport', 'Entertainment'];

            for (const categoryName of categories) {
                const mockNewCategory = mockCategory(userId, categoryName);

                global.mockSupabase.from.mockReturnValue({
                    insert: jest.fn().mockReturnThis(),
                    select: jest.fn().mockReturnThis(),
                    single: jest.fn().mockResolvedValue({
                        data: mockNewCategory,
                        error: null,
                    }),
                });

                const result = await addCategory(categoryName, userId);
                expect(result.name).toBe(categoryName);
            }
        });
    });

    describe('Fetch and Save Categories', () => {
        it('should fetch categories from Supabase and save to secure storage', async () => {
            const mockCategories = [
                mockCategory(userId, 'Food'),
                mockCategory(userId, 'Transport'),
                mockCategory(userId, 'Entertainment'),
            ];

            (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(userId);

            global.mockSupabase.from.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockResolvedValue({
                    data: mockCategories,
                    error: null,
                }),
            });

            const result = await fetchAndSaveCategories();

            expect(result).toHaveLength(3);
            expect(result).toEqual(mockCategories);
            expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
                `categories_${userId}`,
                JSON.stringify(mockCategories)
            );
        });

        it('should return null if user is not logged in', async () => {
            (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

            const result = await fetchAndSaveCategories();

            expect(result).toBeNull();
            expect(global.mockSupabase.from).not.toHaveBeenCalled();
        });

        it('should handle fetch error gracefully', async () => {
            (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(userId);

            global.mockSupabase.from.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Network error' },
                }),
            });

            const result = await fetchAndSaveCategories();

            expect(result).toBeNull();
        });
    });

    describe('Load Stored Categories', () => {
        it('should load categories from secure storage', async () => {
            const mockCategories = [
                mockCategory(userId, 'Food'),
                mockCategory(userId, 'Transport'),
            ];

            (SecureStore.getItemAsync as jest.Mock)
                .mockResolvedValueOnce(userId)
                .mockResolvedValueOnce(JSON.stringify(mockCategories));

            const result = await loadStoredCategories();

            expect(result).toHaveLength(2);
            expect(result).toEqual(mockCategories);
        });

        it('should return null if no categories are stored', async () => {
            (SecureStore.getItemAsync as jest.Mock)
                .mockResolvedValueOnce(userId)
                .mockResolvedValueOnce(null);

            const result = await loadStoredCategories();

            expect(result).toBeNull();
        });

        it('should return null if user is not logged in', async () => {
            (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

            const result = await loadStoredCategories();

            expect(result).toBeNull();
        });
    });

    describe('Delete Category', () => {
        it('should successfully delete a category', async () => {
            const categoryId = 123;

            global.mockSupabase.from.mockReturnValue({
                delete: jest.fn().mockReturnThis(),
                eq: jest.fn().mockResolvedValue({
                    data: null,
                    error: null,
                }),
            });

            await deleteCategory(categoryId);

            expect(global.mockSupabase.from).toHaveBeenCalledWith('categories');
        });

        it('should delete all expenses associated with category before deleting category', async () => {
            const categoryId = 123;

            const mockDeleteExpenses = jest.fn().mockResolvedValue({
                data: null,
                error: null,
            });

            const mockDeleteCategory = jest.fn().mockResolvedValue({
                data: null,
                error: null,
            });

            global.mockSupabase.from.mockImplementation((table) => {
                if (table === 'expenses') {
                    return {
                        delete: jest.fn().mockReturnThis(),
                        eq: mockDeleteExpenses,
                    };
                }
                if (table === 'categories') {
                    return {
                        delete: jest.fn().mockReturnThis(),
                        eq: mockDeleteCategory,
                    };
                }
            });

            await deleteExpensesByCategory(categoryId);
            await deleteCategory(categoryId);

            expect(mockDeleteExpenses).toHaveBeenCalled();
            expect(mockDeleteCategory).toHaveBeenCalled();
        });
    });

    describe('Category Persistence', () => {
        it('should persist categories across sessions', async () => {
            const mockCategories = [
                mockCategory(userId, 'Food'),
                mockCategory(userId, 'Transport'),
            ];

            // First session: fetch and save
            (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(userId);

            global.mockSupabase.from.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockResolvedValue({
                    data: mockCategories,
                    error: null,
                }),
            });

            await fetchAndSaveCategories();

            expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
                `categories_${userId}`,
                JSON.stringify(mockCategories)
            );

            // Second session: load from storage
            jest.clearAllMocks();
            (SecureStore.getItemAsync as jest.Mock)
                .mockResolvedValueOnce(userId)
                .mockResolvedValueOnce(JSON.stringify(mockCategories));

            const result = await loadStoredCategories();

            expect(result).toEqual(mockCategories);
            expect(global.mockSupabase.from).not.toHaveBeenCalled(); // No network call
        });
    });
});
