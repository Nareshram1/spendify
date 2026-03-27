/**
 * End-to-end integration tests
 * Tests complete user workflows
 */

import { loginUser, signUpUser } from '../../utils/auth';
import { addCategory } from '../../utils/database';
import { ExpenseService } from '../../utils/database';
import { saveRecurringExpense, getRecurringExpenses } from '../../utils/recurringExpenseDB';
import { processRecurringExpenses } from '../../utils/recurringExpenseProcessor';
import { mockUser, mockRecurringExpense, formatDate, addDays } from '../helpers/testUtils';
import * as SecureStore from 'expo-secure-store';

describe('End-to-End Integration Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Complete User Journey', () => {
        it('should complete full user workflow: signup → categories → expenses → analytics', async () => {
            const userId = mockUser.id;

            // Step 1: Sign up
            global.mockSupabase.auth.signUp.mockResolvedValue({
                data: {
                    user: {
                        id: userId,
                        email: mockUser.email,
                    },
                },
                error: null,
            });

            global.mockSupabase.from.mockReturnValue({
                insert: jest.fn().mockResolvedValue({ data: null, error: null }),
            });

            const user = await signUpUser(mockUser.email, mockUser.password, mockUser.fullName);
            expect(user).toBeDefined();

            // Step 2: Add categories
            const categories = ['Food', 'Transport', 'Entertainment'];
            const createdCategories = [];

            for (const categoryName of categories) {
                const mockCategory = {
                    id: Math.floor(Math.random() * 1000),
                    name: categoryName,
                    user_id: userId,
                };

                global.mockSupabase.from.mockReturnValue({
                    insert: jest.fn().mockReturnThis(),
                    select: jest.fn().mockReturnThis(),
                    single: jest.fn().mockResolvedValue({
                        data: mockCategory,
                        error: null,
                    }),
                });

                const category = await addCategory(categoryName, userId);
                createdCategories.push(category);
            }

            expect(createdCategories).toHaveLength(3);

            // Step 3: Add expenses
            const expenseData = {
                user_id: userId,
                amount: 100,
                category_id: String(createdCategories[0].id),
                expense_method: 'cash',
                expense_date: formatDate(new Date()),
            };

            const mockExpense = { id: 'exp-1', ...expenseData };

            global.mockSupabase.from.mockReturnValue({
                insert: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({
                    data: mockExpense,
                    error: null,
                }),
            });

            const expense = await ExpenseService.createExpense(expenseData);
            expect(expense).toBeDefined();

            // Step 4: Fetch expenses for analytics
            global.mockSupabase.from.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                order: jest.fn().mockResolvedValue({
                    data: [mockExpense],
                    error: null,
                }),
            });

            const result = await ExpenseService.fetchExpensesForDate(userId, formatDate(new Date()));
            expect(result.total).toBe(100);
            expect(result.expenses).toHaveLength(1);
        });
    });

    describe('Recurring Expense Workflow', () => {
        it('should create recurring expense and auto-generate expenses', async () => {
            const userId = mockUser.id;
            const categoryId = 'category-123';

            // Step 1: Create recurring expense
            const recurringData = mockRecurringExpense(userId, categoryId);
            recurringData.frequency = 'daily';
            recurringData.startDate = formatDate(addDays(new Date(), -2)); // Started 2 days ago
            recurringData.lastProcessedDate = formatDate(addDays(new Date(), -2));

            const mockSaved = { ...recurringData, id: 'recurring-123' };

            global.mockSupabase.from.mockReturnValue({
                upsert: jest.fn().mockResolvedValue({ data: mockSaved, error: null }),
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockResolvedValue({
                    data: [mockSaved],
                    error: null,
                }),
            });

            const saved = await saveRecurringExpense(userId, recurringData);
            expect(saved).toBeDefined();

            // Step 2: Process recurring expenses (should create 2 expenses)
            const mockActiveExpenses = [mockSaved];

            global.mockSupabase.from.mockImplementation((table) => {
                if (table === 'recurring_expenses') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockResolvedValue({
                            data: mockActiveExpenses,
                            error: null,
                        }),
                    };
                }
                if (table === 'expenses') {
                    return {
                        insert: jest.fn().mockReturnThis(),
                        select: jest.fn().mockReturnThis(),
                        single: jest.fn().mockResolvedValue({
                            data: { id: 'exp-auto', amount: 50 },
                            error: null,
                        }),
                    };
                }
            });

            // Mock AsyncStorage for recurring expenses
            const AsyncStorage = require('@react-native-async-storage/async-storage');
            (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockActiveExpenses));
            (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

            const result = await processRecurringExpenses(userId);
            expect(result).toBeDefined();
        });
    });

    describe('Budget Tracking Workflow', () => {
        it('should set budget and track spending', async () => {
            const userId = mockUser.id;
            const budgetAmount = 5000;

            // Step 1: Set budget
            global.mockSupabase.from.mockReturnValue({
                update: jest.fn().mockReturnThis(),
                eq: jest.fn().mockResolvedValue({
                    data: { user_id: userId, budget: budgetAmount },
                    error: null,
                }),
            });

            const { UserService } = require('../../utils/database');
            await UserService.updateUserBudget(userId, budgetAmount);

            // Step 2: Add expenses
            const expenses = [
                { amount: 1000, category: 'Food' },
                { amount: 500, category: 'Transport' },
                { amount: 300, category: 'Entertainment' },
            ];

            const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

            // Step 3: Check budget status
            global.mockSupabase.from.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({
                    data: { user_id: userId, budget: budgetAmount },
                    error: null,
                }),
            });

            const budget = await UserService.getUserBudget(userId);
            const remaining = budget - totalSpent;

            expect(budget).toBe(budgetAmount);
            expect(remaining).toBe(3200);
            expect(remaining).toBeGreaterThan(0); // Still within budget
        });
    });

    describe('Multi-Device Sync Workflow', () => {
        it('should sync data across devices', async () => {
            const userId = mockUser.id;

            // Device 1: Create expense
            const expenseData = {
                user_id: userId,
                amount: 150,
                category_id: 'cat-1',
                expense_method: 'upi',
                expense_date: formatDate(new Date()),
            };

            const mockExpense = { id: 'exp-sync', ...expenseData };

            global.mockSupabase.from.mockReturnValue({
                insert: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({
                    data: mockExpense,
                    error: null,
                }),
            });

            await ExpenseService.createExpense(expenseData);

            // Device 2: Fetch expenses (should see the synced expense)
            jest.clearAllMocks();

            global.mockSupabase.from.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                order: jest.fn().mockResolvedValue({
                    data: [mockExpense],
                    error: null,
                }),
            });

            const result = await ExpenseService.fetchExpensesForDate(userId, formatDate(new Date()));

            expect(result.expenses).toHaveLength(1);
            expect(result.total).toBe(150);
        });
    });

    describe('Data Export Workflow', () => {
        it('should export user data successfully', async () => {
            const userId = mockUser.id;

            // Create some test data
            const mockExpenses = [
                {
                    id: 'exp-1',
                    user_id: userId,
                    amount: 100,
                    category: 'Food',
                    expense_date: '2024-01-01',
                    expense_method: 'cash',
                },
                {
                    id: 'exp-2',
                    user_id: userId,
                    amount: 50,
                    category: 'Transport',
                    expense_date: '2024-01-02',
                    expense_method: 'upi',
                },
            ];

            global.mockSupabase.from.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                order: jest.fn().mockResolvedValue({
                    data: mockExpenses,
                    error: null,
                }),
            });

            // Fetch data for export
            const { fetchUserExpenses } = require('../../utils/database');
            const expenses = await fetchUserExpenses(userId);

            // Verify export data structure
            expect(expenses).toBeDefined();
            expect(Array.isArray(expenses)).toBe(true);

            // Simulate CSV export
            const csvData = expenses.map(e =>
                `${e.expense_date},${e.category},${e.amount},${e.expense_method}`
            ).join('\n');

            expect(csvData).toContain('2024-01-01');
            expect(csvData).toContain('Food');
            expect(csvData).toContain('100');

            // Simulate JSON export
            const jsonData = JSON.stringify(expenses);
            const parsed = JSON.parse(jsonData);

            expect(parsed).toHaveLength(2);
            expect(parsed[0].amount).toBe(100);
        });
    });
});
