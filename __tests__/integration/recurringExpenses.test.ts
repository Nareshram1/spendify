/**
 * Integration tests for recurring expenses
 */

import {
    saveRecurringExpense,
    getRecurringExpenses,
    deleteRecurringExpense,
    updateRecurringExpense,
    toggleRecurringExpenseStatus,
    getActiveRecurringExpenses,
} from '../../utils/recurringExpenseDB';
import {
    calculateNextDueDate,
    shouldCreateExpense,
    processRecurringExpenses,
    getRecurrenceDescription,
} from '../../utils/recurringExpenseProcessor';
import { mockUser, mockRecurringExpense, formatDate, addDays, addMonths } from '../helpers/testUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('Recurring Expenses Integration Tests', () => {
    const userId = mockUser.id;
    const categoryId = 'category-123';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Create Recurring Expense', () => {
        it('should create a daily recurring expense', async () => {
            const expenseData = mockRecurringExpense(userId, categoryId);
            expenseData.frequency = 'daily';

            const mockSaved = { ...expenseData, id: 'recurring-123' };

            (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify([]));
            (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

            global.mockSupabase.from.mockReturnValue({
                upsert: jest.fn().mockResolvedValue({ data: mockSaved, error: null }),
            });

            const result = await saveRecurringExpense(userId, expenseData);

            expect(result).toBeDefined();
            expect(result.frequency).toBe('daily');
            expect(result.userId).toBe(userId);
        });

        it('should create a weekly recurring expense', async () => {
            const expenseData = mockRecurringExpense(userId, categoryId);
            expenseData.frequency = 'weekly';
            expenseData.dayOfWeek = 1; // Monday

            const mockSaved = { ...expenseData, id: 'recurring-124' };

            (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify([]));
            (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

            global.mockSupabase.from.mockReturnValue({
                upsert: jest.fn().mockResolvedValue({ data: mockSaved, error: null }),
            });

            const result = await saveRecurringExpense(userId, expenseData);

            expect(result.frequency).toBe('weekly');
            expect(result.dayOfWeek).toBe(1);
        });

        it('should create a monthly recurring expense', async () => {
            const expenseData = mockRecurringExpense(userId, categoryId);
            expenseData.frequency = 'monthly';
            expenseData.dayOfMonth = 15;

            const mockSaved = { ...expenseData, id: 'recurring-125' };

            (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify([]));
            (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

            global.mockSupabase.from.mockReturnValue({
                upsert: jest.fn().mockResolvedValue({ data: mockSaved, error: null }),
            });

            const result = await saveRecurringExpense(userId, expenseData);

            expect(result.frequency).toBe('monthly');
            expect(result.dayOfMonth).toBe(15);
        });

        it('should create a yearly recurring expense', async () => {
            const expenseData = mockRecurringExpense(userId, categoryId);
            expenseData.frequency = 'yearly';
            expenseData.monthOfYear = 6; // June
            expenseData.dayOfMonth = 15;

            const mockSaved = { ...expenseData, id: 'recurring-126' };

            (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify([]));
            (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

            global.mockSupabase.from.mockReturnValue({
                upsert: jest.fn().mockResolvedValue({ data: mockSaved, error: null }),
            });

            const result = await saveRecurringExpense(userId, expenseData);

            expect(result.frequency).toBe('yearly');
            expect(result.monthOfYear).toBe(6);
        });
    });

    describe('Calculate Next Due Date', () => {
        it('should calculate next due date for daily frequency', () => {
            const expense: any = {
                frequency: 'daily',
                startDate: formatDate(new Date()),
            };

            const lastDate = new Date();
            const nextDate = calculateNextDueDate(lastDate, expense);

            expect(nextDate.getDate()).toBe(addDays(lastDate, 1).getDate());
        });

        it('should calculate next due date for weekly frequency', () => {
            const expense: any = {
                frequency: 'weekly',
                dayOfWeek: 1, // Monday
                startDate: formatDate(new Date()),
            };

            const lastDate = new Date();
            const nextDate = calculateNextDueDate(lastDate, expense);

            // Should be 7 days later
            const expected = new Date(lastDate);
            expected.setDate(expected.getDate() + 7);
            expect(nextDate.getDate()).toBe(expected.getDate());
        });

        it('should calculate next due date for monthly frequency', () => {
            const expense: any = {
                frequency: 'monthly',
                dayOfMonth: 15,
                startDate: formatDate(new Date()),
            };

            const lastDate = new Date(2024, 0, 15); // Jan 15
            const nextDate = calculateNextDueDate(lastDate, expense);

            expect(nextDate.getMonth()).toBe(1); // February
            expect(nextDate.getDate()).toBe(15);
        });

        it('should calculate next due date for yearly frequency', () => {
            const expense: any = {
                frequency: 'yearly',
                monthOfYear: 6, // June
                dayOfMonth: 15,
                startDate: formatDate(new Date()),
            };

            const lastDate = new Date(2024, 5, 15); // June 15, 2024
            const nextDate = calculateNextDueDate(lastDate, expense);

            expect(nextDate.getFullYear()).toBe(2025);
            expect(nextDate.getMonth()).toBe(5); // June
            expect(nextDate.getDate()).toBe(15);
        });
    });

    describe('Should Create Expense', () => {
        it('should return true when expense is due', () => {
            const yesterday = addDays(new Date(), -1);
            const expense: any = {
                frequency: 'daily',
                startDate: formatDate(addDays(new Date(), -10)),
                lastProcessedDate: formatDate(yesterday),
                isActive: true,
            };

            const result = shouldCreateExpense(expense);
            expect(result).toBe(true);
        });

        it('should return false when expense is not due yet', () => {
            const today = new Date();
            const expense: any = {
                frequency: 'daily',
                startDate: formatDate(today),
                lastProcessedDate: formatDate(today),
                isActive: true,
            };

            const result = shouldCreateExpense(expense);
            expect(result).toBe(false);
        });

        it('should return false when expense is inactive', () => {
            const yesterday = addDays(new Date(), -1);
            const expense: any = {
                frequency: 'daily',
                startDate: formatDate(addDays(new Date(), -10)),
                lastProcessedDate: formatDate(yesterday),
                isActive: false,
            };

            const result = shouldCreateExpense(expense);
            expect(result).toBe(false);
        });
    });

    describe('Fetch Recurring Expenses', () => {
        it('should fetch all recurring expenses for a user', async () => {
            const mockExpenses = [
                { ...mockRecurringExpense(userId, categoryId), id: 'rec-1' },
                { ...mockRecurringExpense(userId, categoryId), id: 'rec-2' },
            ];

            global.mockSupabase.from.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockResolvedValue({
                    data: mockExpenses,
                    error: null,
                }),
            });

            (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

            const result = await getRecurringExpenses(userId);

            expect(result).toHaveLength(2);
            expect(result[0].id).toBe('rec-1');
            expect(result[1].id).toBe('rec-2');
        });

        it('should fetch only active recurring expenses', async () => {
            const mockExpenses = [
                { ...mockRecurringExpense(userId, categoryId), id: 'rec-1', isActive: true },
                { ...mockRecurringExpense(userId, categoryId), id: 'rec-2', isActive: false },
            ];

            (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockExpenses));

            const result = await getActiveRecurringExpenses(userId);

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('rec-1');
            expect(result[0].isActive).toBe(true);
        });
    });

    describe('Update Recurring Expense', () => {
        it('should successfully update a recurring expense', async () => {
            const expenseId = 'recurring-123';
            const updates = {
                amount: 75.00,
                description: 'Updated subscription',
            };

            const existingExpense = { ...mockRecurringExpense(userId, categoryId), id: expenseId };
            const updatedExpense = { ...existingExpense, ...updates };

            (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify([existingExpense]));
            (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

            global.mockSupabase.from.mockReturnValue({
                upsert: jest.fn().mockResolvedValue({ data: updatedExpense, error: null }),
            });

            const result = await updateRecurringExpense(userId, expenseId, updates);

            expect(result).toBeDefined();
            expect(result?.amount).toBe(75.00);
            expect(result?.description).toBe('Updated subscription');
        });
    });

    describe('Delete Recurring Expense', () => {
        it('should successfully delete a recurring expense', async () => {
            const expenseId = 'recurring-123';
            const existingExpense = { ...mockRecurringExpense(userId, categoryId), id: expenseId };

            (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify([existingExpense]));
            (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

            global.mockSupabase.from.mockReturnValue({
                delete: jest.fn().mockReturnThis(),
                eq: jest.fn().mockResolvedValue({ data: null, error: null }),
            });

            const result = await deleteRecurringExpense(userId, expenseId);

            expect(result).toBe(true);
        });
    });

    describe('Toggle Recurring Expense Status', () => {
        it('should toggle expense from active to inactive', async () => {
            const expenseId = 'recurring-123';
            const activeExpense = { ...mockRecurringExpense(userId, categoryId), id: expenseId, isActive: true };

            (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify([activeExpense]));
            (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

            global.mockSupabase.from.mockReturnValue({
                upsert: jest.fn().mockResolvedValue({ data: { ...activeExpense, isActive: false }, error: null }),
            });

            const result = await toggleRecurringExpenseStatus(userId, expenseId);

            expect(result).toBe(true);
        });
    });

    describe('Recurrence Description', () => {
        it('should generate correct description for daily recurrence', () => {
            const expense: any = {
                frequency: 'daily',
            };

            const description = getRecurrenceDescription(expense);
            expect(description).toContain('Daily');
        });

        it('should generate correct description for weekly recurrence', () => {
            const expense: any = {
                frequency: 'weekly',
                dayOfWeek: 1,
            };

            const description = getRecurrenceDescription(expense);
            expect(description).toContain('Weekly');
        });

        it('should generate correct description for monthly recurrence', () => {
            const expense: any = {
                frequency: 'monthly',
                dayOfMonth: 15,
            };

            const description = getRecurrenceDescription(expense);
            expect(description).toContain('Monthly');
            expect(description).toContain('15');
        });
    });
});
