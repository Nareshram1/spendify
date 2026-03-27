/**
 * Integration tests for expense management
 */

import { ExpenseService } from '../../utils/database';
import { mockUser, mockExpense, expectValidExpense, formatDate } from '../helpers/testUtils';

describe('Expense Management Integration Tests', () => {
    const userId = mockUser.id;
    const categoryId = 'category-123';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Create Expense', () => {
        it('should successfully create an expense with all required fields', async () => {
            const expenseData = {
                user_id: userId,
                amount: 100.50,
                category_id: categoryId,
                expense_method: 'cash',
                expense_date: formatDate(new Date()),
            };

            const mockCreatedExpense = {
                id: 'expense-123',
                ...expenseData,
            };

            const mockInsert = jest.fn().mockResolvedValue({
                data: [mockCreatedExpense],
                error: null,
            });

            global.mockSupabase.from.mockReturnValue({
                insert: mockInsert,
                select: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({
                    data: mockCreatedExpense,
                    error: null,
                }),
            });

            const result = await ExpenseService.createExpense(expenseData);

            expect(result).toBeDefined();
            expect(result?.amount).toBe(expenseData.amount);
            expect(result?.category_id).toBe(categoryId);
            expect(global.mockSupabase.from).toHaveBeenCalledWith('expenses');
        });

        it('should fail to create expense with invalid amount', async () => {
            const expenseData = {
                user_id: userId,
                amount: -50, // Invalid negative amount
                category_id: categoryId,
                expense_method: 'cash',
                expense_date: formatDate(new Date()),
            };

            global.mockSupabase.from.mockReturnValue({
                insert: jest.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Amount must be positive' },
                }),
            });

            const result = await ExpenseService.createExpense(expenseData);
            expect(result).toBeNull();
        });

        it('should create expense with different payment methods', async () => {
            const paymentMethods = ['cash', 'upi', 'card'];

            for (const method of paymentMethods) {
                const expenseData = {
                    user_id: userId,
                    amount: 100,
                    category_id: categoryId,
                    expense_method: method,
                    expense_date: formatDate(new Date()),
                };

                const mockCreatedExpense = {
                    id: `expense-${method}`,
                    ...expenseData,
                };

                global.mockSupabase.from.mockReturnValue({
                    insert: jest.fn().mockResolvedValue({ data: [mockCreatedExpense], error: null }),
                    select: jest.fn().mockReturnThis(),
                    single: jest.fn().mockResolvedValue({ data: mockCreatedExpense, error: null }),
                });

                const result = await ExpenseService.createExpense(expenseData);
                expect(result?.expense_method).toBe(method);
            }
        });
    });

    describe('Fetch Expenses', () => {
        it('should fetch expenses for a specific date', async () => {
            const selectedDate = formatDate(new Date());
            const mockExpenses = [
                {
                    id: 'exp-1',
                    user_id: userId,
                    amount: 50,
                    category: 'Food',
                    category_id: categoryId,
                    expense_date: selectedDate,
                    expense_method: 'cash',
                },
                {
                    id: 'exp-2',
                    user_id: userId,
                    amount: 30,
                    category: 'Food',
                    category_id: categoryId,
                    expense_date: selectedDate,
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

            const result = await ExpenseService.fetchExpensesForDate(userId, selectedDate);

            expect(result).toBeDefined();
            expect(result.total).toBe(80);
            expect(result.expenses).toHaveLength(1); // Aggregated by category
            expect(result.expenses[0].category).toBe('Food');
            expect(result.expenses[0].totalAmount).toBe(80);
            expect(result.expenses[0].individualExpenses).toHaveLength(2);
        });

        it('should return empty result for date with no expenses', async () => {
            const selectedDate = formatDate(new Date());

            global.mockSupabase.from.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                order: jest.fn().mockResolvedValue({
                    data: [],
                    error: null,
                }),
            });

            const result = await ExpenseService.fetchExpensesForDate(userId, selectedDate);

            expect(result.expenses).toHaveLength(0);
            expect(result.total).toBe(0);
        });

        it('should fetch total monthly expenses', async () => {
            const mockMonthlyExpenses = [
                { amount: 100 },
                { amount: 200 },
                { amount: 150 },
            ];

            global.mockSupabase.from.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                gte: jest.fn().mockReturnThis(),
                lte: jest.fn().mockResolvedValue({
                    data: mockMonthlyExpenses,
                    error: null,
                }),
            });

            const total = await ExpenseService.fetchTotalExpenseForMonth(userId);

            expect(total).toBe(450);
        });
    });

    describe('Update Expense', () => {
        it('should successfully update an expense', async () => {
            const expenseId = 'expense-123';
            const updatedData = {
                amount: 150,
                category_id: 'new-category-456',
            };

            global.mockSupabase.from.mockReturnValue({
                update: jest.fn().mockReturnThis(),
                eq: jest.fn().mockResolvedValue({
                    data: null,
                    error: null,
                }),
            });

            const result = await ExpenseService.updateExpense(expenseId, updatedData);

            expect(result).toBe(true);
            expect(global.mockSupabase.from).toHaveBeenCalledWith('expenses');
        });

        it('should fail to update non-existent expense', async () => {
            const expenseId = 'non-existent';
            const updatedData = { amount: 150 };

            global.mockSupabase.from.mockReturnValue({
                update: jest.fn().mockReturnThis(),
                eq: jest.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Expense not found' },
                }),
            });

            const result = await ExpenseService.updateExpense(expenseId, updatedData);

            expect(result).toBe(false);
        });
    });

    describe('Delete Expense', () => {
        it('should successfully delete an expense', async () => {
            const expenseId = 'expense-123';

            global.mockSupabase.from.mockReturnValue({
                delete: jest.fn().mockReturnThis(),
                eq: jest.fn().mockResolvedValue({
                    data: null,
                    error: null,
                }),
            });

            const result = await ExpenseService.deleteExpense(expenseId);

            expect(result).toBe(true);
            expect(global.mockSupabase.from).toHaveBeenCalledWith('expenses');
        });

        it('should handle deletion of non-existent expense', async () => {
            const expenseId = 'non-existent';

            global.mockSupabase.from.mockReturnValue({
                delete: jest.fn().mockReturnThis(),
                eq: jest.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Expense not found' },
                }),
            });

            const result = await ExpenseService.deleteExpense(expenseId);

            expect(result).toBe(false);
        });
    });

    describe('Expense Aggregation', () => {
        it('should correctly aggregate expenses by category', async () => {
            const selectedDate = formatDate(new Date());
            const mockExpenses = [
                {
                    id: 'exp-1',
                    user_id: userId,
                    amount: 50,
                    category: 'Food',
                    category_id: 'cat-1',
                    expense_date: selectedDate,
                    expense_method: 'cash',
                },
                {
                    id: 'exp-2',
                    user_id: userId,
                    amount: 30,
                    category: 'Food',
                    category_id: 'cat-1',
                    expense_date: selectedDate,
                    expense_method: 'upi',
                },
                {
                    id: 'exp-3',
                    user_id: userId,
                    amount: 100,
                    category: 'Transport',
                    category_id: 'cat-2',
                    expense_date: selectedDate,
                    expense_method: 'card',
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

            const result = await ExpenseService.fetchExpensesForDate(userId, selectedDate);

            expect(result.expenses).toHaveLength(2); // Two categories
            expect(result.total).toBe(180);

            const foodCategory = result.expenses.find(e => e.category === 'Food');
            expect(foodCategory?.totalAmount).toBe(80);
            expect(foodCategory?.individualExpenses).toHaveLength(2);

            const transportCategory = result.expenses.find(e => e.category === 'Transport');
            expect(transportCategory?.totalAmount).toBe(100);
            expect(transportCategory?.individualExpenses).toHaveLength(1);
        });
    });
});
