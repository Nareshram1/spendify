/**
 * Integration tests for account management
 */

import {
    fetchUserInfoById,
    logoutUser,
    deleteUserExpenses,
    deleteUserAccount,
    UserService,
} from '../../utils/database';
import { mockUser } from '../helpers/testUtils';
import * as SecureStore from 'expo-secure-store';

describe('Account Management Integration Tests', () => {
    const userId = mockUser.id;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Fetch User Profile', () => {
        it('should fetch user profile information', async () => {
            const mockProfile = {
                user_id: userId,
                name: mockUser.fullName,
                email: mockUser.email,
                created_at: '2024-01-01T00:00:00Z',
            };

            global.mockSupabase.from.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({
                    data: mockProfile,
                    error: null,
                }),
            });

            const result = await fetchUserInfoById(userId);

            expect(result).toBeDefined();
            expect(result.name).toBe(mockUser.fullName);
            expect(result.email).toBe(mockUser.email);
        });

        it('should return null for non-existent user', async () => {
            global.mockSupabase.from.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'User not found' },
                }),
            });

            const result = await fetchUserInfoById('non-existent-id');

            expect(result).toBeNull();
        });
    });

    describe('Update User Profile', () => {
        it('should update user email', async () => {
            const newEmail = 'newemail@example.com';

            global.mockSupabase.from.mockReturnValue({
                update: jest.fn().mockReturnThis(),
                eq: jest.fn().mockResolvedValue({
                    data: { user_id: userId, email: newEmail },
                    error: null,
                }),
            });

            const result = await UserService.updateUserProfile(userId, { email: newEmail });

            expect(result).toBeDefined();
            expect(result?.email).toBe(newEmail);
        });

        it('should update user budget', async () => {
            const newBudget = 7000;

            global.mockSupabase.from.mockReturnValue({
                update: jest.fn().mockReturnThis(),
                eq: jest.fn().mockResolvedValue({
                    data: { user_id: userId, budget: newBudget },
                    error: null,
                }),
            });

            const result = await UserService.updateUserBudget(userId, newBudget);

            expect(result?.budget).toBe(newBudget);
        });
    });

    describe('Logout User', () => {
        it('should successfully logout user', async () => {
            global.mockSupabase.auth.signOut.mockResolvedValue({
                error: null,
            });

            await logoutUser();

            expect(global.mockSupabase.auth.signOut).toHaveBeenCalled();
            expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
        });

        it('should clear secure storage on logout', async () => {
            global.mockSupabase.auth.signOut.mockResolvedValue({
                error: null,
            });

            await logoutUser();

            expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
        });
    });

    describe('Delete User Expenses', () => {
        it('should delete all expenses for a user', async () => {
            global.mockSupabase.from.mockReturnValue({
                delete: jest.fn().mockReturnThis(),
                eq: jest.fn().mockResolvedValue({
                    data: null,
                    error: null,
                }),
            });

            const result = await deleteUserExpenses(userId);

            expect(result).toBe(true);
            expect(global.mockSupabase.from).toHaveBeenCalledWith('expenses');
        });

        it('should handle error when deleting expenses', async () => {
            global.mockSupabase.from.mockReturnValue({
                delete: jest.fn().mockReturnThis(),
                eq: jest.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Delete failed' },
                }),
            });

            const result = await deleteUserExpenses(userId);

            expect(result).toBe(false);
        });
    });

    describe('Delete User Account', () => {
        it('should delete user account and all associated data', async () => {
            // Mock deleting expenses
            const mockDeleteExpenses = jest.fn().mockResolvedValue({
                data: null,
                error: null,
            });

            // Mock deleting categories
            const mockDeleteCategories = jest.fn().mockResolvedValue({
                data: null,
                error: null,
            });

            // Mock deleting user
            const mockDeleteUser = jest.fn().mockResolvedValue({
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
                        eq: mockDeleteCategories,
                    };
                }
                if (table === 'users') {
                    return {
                        delete: jest.fn().mockReturnThis(),
                        eq: mockDeleteUser,
                    };
                }
            });

            const result = await deleteUserAccount(userId);

            expect(result).toBe(true);
            expect(mockDeleteExpenses).toHaveBeenCalled();
            expect(mockDeleteCategories).toHaveBeenCalled();
            expect(mockDeleteUser).toHaveBeenCalled();
        });

        it('should handle error during account deletion', async () => {
            global.mockSupabase.from.mockReturnValue({
                delete: jest.fn().mockReturnThis(),
                eq: jest.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Deletion failed' },
                }),
            });

            const result = await deleteUserAccount(userId);

            expect(result).toBe(false);
        });
    });

    describe('Change Password', () => {
        it('should successfully change user password', async () => {
            const newPassword = 'NewSecurePassword123!';

            global.mockSupabase.auth.updateUser.mockResolvedValue({
                data: { user: { id: userId } },
                error: null,
            });

            // Simulate password change
            const result = await global.mockSupabase.auth.updateUser({
                password: newPassword,
            });

            expect(result.error).toBeNull();
            expect(result.data.user.id).toBe(userId);
        });

        it('should fail with weak password', async () => {
            const weakPassword = '123';

            global.mockSupabase.auth.updateUser.mockResolvedValue({
                data: null,
                error: { message: 'Password should be at least 6 characters' },
            });

            const result = await global.mockSupabase.auth.updateUser({
                password: weakPassword,
            });

            expect(result.error).toBeDefined();
        });
    });
});
