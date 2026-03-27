/**
 * Integration tests for lending and borrowing transactions
 */

import {
    addTransaction,
    fetchTransactions,
    deleteTransaction,
} from '../../utils/database';
import { mockUser, mockTransaction } from '../helpers/testUtils';

describe('Lending & Borrowing Integration Tests', () => {
    const userId = mockUser.id;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Add Transaction', () => {
        it('should successfully add a lending transaction', async () => {
            const transactionData = {
                user_id: userId,
                amount: 500,
                person_name: 'John Doe',
                date: new Date().toISOString().split('T')[0],
                description: 'Loan to friend',
                type: 'lending' as const,
            };

            const mockCreated = { id: 1, ...transactionData };

            global.mockSupabase.from.mockReturnValue({
                insert: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({
                    data: mockCreated,
                    error: null,
                }),
            });

            const result = await addTransaction(transactionData);

            expect(result).toBeDefined();
            expect(result.type).toBe('lending');
            expect(result.amount).toBe(500);
            expect(result.person_name).toBe('John Doe');
        });

        it('should successfully add a borrowing transaction', async () => {
            const transactionData = {
                user_id: userId,
                amount: 300,
                person_name: 'Jane Smith',
                date: new Date().toISOString().split('T')[0],
                description: 'Borrowed from colleague',
                type: 'borrowing' as const,
            };

            const mockCreated = { id: 2, ...transactionData };

            global.mockSupabase.from.mockReturnValue({
                insert: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({
                    data: mockCreated,
                    error: null,
                }),
            });

            const result = await addTransaction(transactionData);

            expect(result).toBeDefined();
            expect(result.type).toBe('borrowing');
            expect(result.amount).toBe(300);
        });

        it('should add multiple transactions for the same person', async () => {
            const personName = 'John Doe';

            for (let i = 0; i < 3; i++) {
                const transactionData = {
                    user_id: userId,
                    amount: 100 * (i + 1),
                    person_name: personName,
                    date: new Date().toISOString().split('T')[0],
                    type: 'lending' as const,
                };

                const mockCreated = { id: i + 1, ...transactionData };

                global.mockSupabase.from.mockReturnValue({
                    insert: jest.fn().mockReturnThis(),
                    select: jest.fn().mockReturnThis(),
                    single: jest.fn().mockResolvedValue({
                        data: mockCreated,
                        error: null,
                    }),
                });

                const result = await addTransaction(transactionData);
                expect(result.person_name).toBe(personName);
            }
        });
    });

    describe('Fetch Transactions', () => {
        it('should fetch all lending transactions', async () => {
            const mockLendings = [
                { id: 1, user_id: userId, amount: 500, person_name: 'John', type: 'lending', date: '2024-01-01' },
                { id: 2, user_id: userId, amount: 300, person_name: 'Jane', type: 'lending', date: '2024-01-02' },
            ];

            global.mockSupabase.from.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                order: jest.fn().mockResolvedValue({
                    data: mockLendings,
                    error: null,
                }),
            });

            const result = await fetchTransactions(userId, 'lending');

            expect(result).toHaveLength(2);
            expect(result[0].type).toBe('lending');
            expect(result[1].type).toBe('lending');
        });

        it('should fetch all borrowing transactions', async () => {
            const mockBorrowings = [
                { id: 3, user_id: userId, amount: 200, person_name: 'Bob', type: 'borrowing', date: '2024-01-03' },
            ];

            global.mockSupabase.from.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                order: jest.fn().mockResolvedValue({
                    data: mockBorrowings,
                    error: null,
                }),
            });

            const result = await fetchTransactions(userId, 'borrowing');

            expect(result).toHaveLength(1);
            expect(result[0].type).toBe('borrowing');
        });

        it('should return empty array when no transactions exist', async () => {
            global.mockSupabase.from.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                order: jest.fn().mockResolvedValue({
                    data: [],
                    error: null,
                }),
            });

            const result = await fetchTransactions(userId, 'lending');

            expect(result).toHaveLength(0);
        });
    });

    describe('Delete Transaction', () => {
        it('should successfully delete a transaction', async () => {
            const transactionId = 1;

            global.mockSupabase.from.mockReturnValue({
                delete: jest.fn().mockReturnThis(),
                eq: jest.fn().mockResolvedValue({
                    data: null,
                    error: null,
                }),
            });

            const result = await deleteTransaction(transactionId);

            expect(result).toBe(true);
            expect(global.mockSupabase.from).toHaveBeenCalledWith('transactions');
        });

        it('should handle deletion of non-existent transaction', async () => {
            const transactionId = 999;

            global.mockSupabase.from.mockReturnValue({
                delete: jest.fn().mockReturnThis(),
                eq: jest.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Transaction not found' },
                }),
            });

            const result = await deleteTransaction(transactionId);

            expect(result).toBe(false);
        });
    });

    describe('Calculate Totals', () => {
        it('should calculate total lending amount', async () => {
            const mockLendings = [
                { id: 1, amount: 500, type: 'lending' },
                { id: 2, amount: 300, type: 'lending' },
                { id: 3, amount: 200, type: 'lending' },
            ];

            global.mockSupabase.from.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                order: jest.fn().mockResolvedValue({
                    data: mockLendings,
                    error: null,
                }),
            });

            const result = await fetchTransactions(userId, 'lending');
            const total = result.reduce((sum, t) => sum + t.amount, 0);

            expect(total).toBe(1000);
        });

        it('should calculate total borrowing amount', async () => {
            const mockBorrowings = [
                { id: 4, amount: 150, type: 'borrowing' },
                { id: 5, amount: 250, type: 'borrowing' },
            ];

            global.mockSupabase.from.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                order: jest.fn().mockResolvedValue({
                    data: mockBorrowings,
                    error: null,
                }),
            });

            const result = await fetchTransactions(userId, 'borrowing');
            const total = result.reduce((sum, t) => sum + t.amount, 0);

            expect(total).toBe(400);
        });
    });

    describe('Transaction Validation', () => {
        it('should validate transaction has required fields', async () => {
            const transactionData = {
                user_id: userId,
                amount: 500,
                person_name: 'John Doe',
                date: new Date().toISOString().split('T')[0],
                type: 'lending' as const,
            };

            const mockCreated = { id: 1, ...transactionData };

            global.mockSupabase.from.mockReturnValue({
                insert: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({
                    data: mockCreated,
                    error: null,
                }),
            });

            const result = await addTransaction(transactionData);

            expect(result).toHaveProperty('id');
            expect(result).toHaveProperty('user_id');
            expect(result).toHaveProperty('amount');
            expect(result).toHaveProperty('person_name');
            expect(result).toHaveProperty('date');
            expect(result).toHaveProperty('type');
        });
    });
});
