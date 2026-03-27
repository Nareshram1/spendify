/**
 * Integration tests for budget management
 */

import { UserService } from '../../utils/database';
import { mockUser } from '../helpers/testUtils';

describe('Budget Management Integration Tests', () => {
    const userId = mockUser.id;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Set Budget', () => {
        it('should successfully set user budget', async () => {
            const budgetAmount = 5000;

            global.mockSupabase.from.mockReturnValue({
                update: jest.fn().mockReturnThis(),
                eq: jest.fn().mockResolvedValue({
                    data: { user_id: userId, budget: budgetAmount },
                    error: null,
                }),
            });

            const result = await UserService.updateUserBudget(userId, budgetAmount);

            expect(result).toBeDefined();
            expect(result?.budget).toBe(budgetAmount);
        });

        it('should update existing budget', async () => {
            const oldBudget = 3000;
            const newBudget = 6000;

            // First set
            global.mockSupabase.from.mockReturnValue({
                update: jest.fn().mockReturnThis(),
                eq: jest.fn().mockResolvedValue({
                    data: { user_id: userId, budget: oldBudget },
                    error: null,
                }),
            });

            await UserService.updateUserBudget(userId, oldBudget);

            // Update
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

    describe('Fetch Budget', () => {
        it('should fetch user budget', async () => {
            const budgetAmount = 5000;

            global.mockSupabase.from.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({
                    data: { user_id: userId, budget: budgetAmount },
                    error: null,
                }),
            });

            const result = await UserService.getUserBudget(userId);

            expect(result).toBe(budgetAmount);
        });

        it('should return null for user without budget', async () => {
            global.mockSupabase.from.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({
                    data: { user_id: userId, budget: null },
                    error: null,
                }),
            });

            const result = await UserService.getUserBudget(userId);

            expect(result).toBeNull();
        });
    });

    describe('Budget Persistence', () => {
        it('should persist budget across sessions', async () => {
            const budgetAmount = 4500;

            // Set budget
            global.mockSupabase.from.mockReturnValue({
                update: jest.fn().mockReturnThis(),
                eq: jest.fn().mockResolvedValue({
                    data: { user_id: userId, budget: budgetAmount },
                    error: null,
                }),
            });

            await UserService.updateUserBudget(userId, budgetAmount);

            // Fetch in new session
            jest.clearAllMocks();

            global.mockSupabase.from.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({
                    data: { user_id: userId, budget: budgetAmount },
                    error: null,
                }),
            });

            const result = await UserService.getUserBudget(userId);

            expect(result).toBe(budgetAmount);
        });
    });

    describe('Budget Validation', () => {
        it('should accept positive budget values', async () => {
            const validBudgets = [100, 1000, 10000, 50000];

            for (const budget of validBudgets) {
                global.mockSupabase.from.mockReturnValue({
                    update: jest.fn().mockReturnThis(),
                    eq: jest.fn().mockResolvedValue({
                        data: { user_id: userId, budget },
                        error: null,
                    }),
                });

                const result = await UserService.updateUserBudget(userId, budget);
                expect(result?.budget).toBe(budget);
            }
        });

        it('should handle zero budget', async () => {
            global.mockSupabase.from.mockReturnValue({
                update: jest.fn().mockReturnThis(),
                eq: jest.fn().mockResolvedValue({
                    data: { user_id: userId, budget: 0 },
                    error: null,
                }),
            });

            const result = await UserService.updateUserBudget(userId, 0);
            expect(result?.budget).toBe(0);
        });
    });
});
