/**
 * Test utilities and mock data generators
 */

import { RecurringExpense } from '../../utils/recurringExpenseTypes';

// Mock data generators
export const mockUser = {
    id: 'test-user-123',
    email: 'test@example.com',
    fullName: 'Test User',
    password: 'TestPassword123!',
};

export const mockCategory = (userId: string, name: string = 'Food') => ({
    id: Math.floor(Math.random() * 10000),
    name,
    user_id: userId,
});

export const mockExpense = (userId: string, categoryId: string) => ({
    id: `expense-${Date.now()}-${Math.random()}`,
    user_id: userId,
    amount: 100.50,
    category_id: categoryId,
    expense_method: 'cash',
    expense_date: new Date().toISOString().split('T')[0],
    category: 'Food',
});

export const mockRecurringExpense = (userId: string, categoryId: string): Partial<RecurringExpense> => ({
    id: `recurring-${Date.now()}`,
    userId,
    categoryId,
    amount: 50.00,
    description: 'Monthly Subscription',
    frequency: 'monthly',
    startDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'upi',
    isActive: true,
    lastProcessedDate: null,
});

export const mockTransaction = (userId: string, type: 'lending' | 'borrowing') => ({
    id: Math.floor(Math.random() * 10000),
    user_id: userId,
    amount: 500,
    person_name: 'John Doe',
    date: new Date().toISOString().split('T')[0],
    description: `Test ${type} transaction`,
    type,
});

// Date utilities
export const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
};

export const addDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

export const addMonths = (date: Date, months: number): Date => {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
};

export const getFirstDayOfMonth = (date: Date): Date => {
    return new Date(date.getFullYear(), date.getMonth(), 1);
};

export const getLastDayOfMonth = (date: Date): Date => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
};

// Assertion helpers
export const expectValidExpense = (expense: any) => {
    expect(expense).toHaveProperty('id');
    expect(expense).toHaveProperty('user_id');
    expect(expense).toHaveProperty('amount');
    expect(expense).toHaveProperty('category_id');
    expect(expense).toHaveProperty('expense_method');
    expect(expense).toHaveProperty('expense_date');
    expect(typeof expense.amount).toBe('number');
    expect(expense.amount).toBeGreaterThan(0);
};

export const expectValidCategory = (category: any) => {
    expect(category).toHaveProperty('id');
    expect(category).toHaveProperty('name');
    expect(category).toHaveProperty('user_id');
    expect(typeof category.name).toBe('string');
    expect(category.name.length).toBeGreaterThan(0);
};

export const expectValidRecurringExpense = (expense: any) => {
    expect(expense).toHaveProperty('id');
    expect(expense).toHaveProperty('userId');
    expect(expense).toHaveProperty('categoryId');
    expect(expense).toHaveProperty('amount');
    expect(expense).toHaveProperty('frequency');
    expect(expense).toHaveProperty('startDate');
    expect(['daily', 'weekly', 'monthly', 'yearly']).toContain(expense.frequency);
};

// Mock Supabase response helpers
export const mockSupabaseSuccess = (data: any) => ({
    data,
    error: null,
});

export const mockSupabaseError = (message: string) => ({
    data: null,
    error: { message },
});

// Clean up utilities
export const clearAllMocks = () => {
    jest.clearAllMocks();
};

export const resetAllMocks = () => {
    jest.resetAllMocks();
};

// Wait utilities for async operations
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const waitForCondition = async (
    condition: () => boolean,
    timeout: number = 5000,
    interval: number = 100
): Promise<void> => {
    const startTime = Date.now();
    while (!condition()) {
        if (Date.now() - startTime > timeout) {
            throw new Error('Timeout waiting for condition');
        }
        await waitFor(interval);
    }
};
