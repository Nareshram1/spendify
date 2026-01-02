/**
 * Database utilities for recurring expenses
 * Uses AsyncStorage for local storage with optional Supabase sync
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabaseClient';
import { RecurringExpense } from './recurringExpenseTypes';

const RECURRING_EXPENSES_KEY = 'recurring_expenses_';

/**
 * Generate a unique ID for recurring expenses
 */
const generateId = (): string => {
    return `recurring_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Get storage key for user's recurring expenses
 */
const getStorageKey = (userId: string): string => {
    return `${RECURRING_EXPENSES_KEY}${userId}`;
};

/**
 * Save a recurring expense (create or update)
 */
export const saveRecurringExpense = async (
    userId: string,
    expense: Partial<RecurringExpense>
): Promise<RecurringExpense> => {
    try {
        const storageKey = getStorageKey(userId);
        const existingData = await AsyncStorage.getItem(storageKey);
        const expenses: RecurringExpense[] = existingData ? JSON.parse(existingData) : [];

        const now = new Date().toISOString();

        if (expense.id) {
            // Update existing
            const index = expenses.findIndex(e => e.id === expense.id);
            if (index !== -1) {
                expenses[index] = {
                    ...expenses[index],
                    ...expense,
                    updated_at: now,
                };
                await AsyncStorage.setItem(storageKey, JSON.stringify(expenses));

                // Optional: Sync to Supabase
                await syncToSupabase(expenses[index]);

                return expenses[index];
            }
        }

        // Create new
        const newExpense: RecurringExpense = {
            id: generateId(),
            user_id: userId,
            amount: expense.amount || 0,
            category_id: expense.category_id || '',
            description: expense.description || '',
            recurrence_interval: expense.recurrence_interval || 'monthly',
            custom_interval_value: expense.custom_interval_value,
            custom_interval_unit: expense.custom_interval_unit,
            start_date: expense.start_date || new Date().toISOString(),
            end_condition: expense.end_condition || 'never',
            end_date: expense.end_date,
            occurrence_count: expense.occurrence_count,
            occurrences_created: 0,
            is_active: expense.is_active !== undefined ? expense.is_active : true,
            last_created_date: undefined,
            next_due_date: expense.next_due_date || expense.start_date || new Date().toISOString(),
            created_at: now,
            updated_at: now,
        };

        expenses.push(newExpense);
        await AsyncStorage.setItem(storageKey, JSON.stringify(expenses));

        // Optional: Sync to Supabase
        await syncToSupabase(newExpense);

        return newExpense;
    } catch (error) {
        console.error('Error saving recurring expense:', error);
        throw error;
    }
};

/**
 * Get all recurring expenses for a user
 * Always syncs with Supabase to support multi-device usage
 */
export const getRecurringExpenses = async (userId: string): Promise<RecurringExpense[]> => {
    try {
        const storageKey = getStorageKey(userId);

        // Get local data
        const localData = await AsyncStorage.getItem(storageKey);
        const localExpenses: RecurringExpense[] = localData ? JSON.parse(localData) : [];

        // Try to fetch from Supabase
        const remoteExpenses = await fetchFromSupabase(userId);

        // If no remote data, return local data
        if (remoteExpenses.length === 0) {
            return localExpenses;
        }

        // If no local data, save remote data and return it
        if (localExpenses.length === 0) {
            await AsyncStorage.setItem(storageKey, JSON.stringify(remoteExpenses));
            return remoteExpenses;
        }

        // Merge local and remote data
        // Strategy: Remote is source of truth, but keep local changes if they're newer
        const mergedMap = new Map<string, RecurringExpense>();

        // Start with remote expenses (source of truth)
        remoteExpenses.forEach(remoteExpense => {
            mergedMap.set(remoteExpense.id, remoteExpense);
        });

        // Check local expenses - only keep if they're newer than remote or don't exist in remote
        localExpenses.forEach(localExpense => {
            const remoteExpense = remoteExpenses.find(r => r.id === localExpense.id);

            if (!remoteExpense) {
                // This local expense doesn't exist in remote
                // It was either:
                // 1. Just created locally and not yet synced
                // 2. Deleted on another device

                // Check if it was recently created/updated (within last 5 minutes)
                const localUpdated = new Date(localExpense.updated_at).getTime();
                const now = Date.now();
                const fiveMinutes = 5 * 60 * 1000;

                if (now - localUpdated < fiveMinutes) {
                    // Recently modified locally - keep it (probably not synced yet)
                    mergedMap.set(localExpense.id, localExpense);
                }
                // else: It was deleted on another device, don't add it back
            } else {
                // Exists in both - compare timestamps
                const localUpdated = new Date(localExpense.updated_at).getTime();
                const remoteUpdated = new Date(remoteExpense.updated_at).getTime();

                if (localUpdated > remoteUpdated) {
                    // Local is newer - use local version
                    mergedMap.set(localExpense.id, localExpense);
                }
                // else: Remote is newer or same - already in map
            }
        });

        const mergedExpenses = Array.from(mergedMap.values());

        // Save merged data to local storage
        await AsyncStorage.setItem(storageKey, JSON.stringify(mergedExpenses));

        return mergedExpenses;
    } catch (error) {
        console.error('Error getting recurring expenses:', error);
        // Fallback to local data if sync fails
        try {
            const storageKey = getStorageKey(userId);
            const data = await AsyncStorage.getItem(storageKey);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    }
};

/**
 * Get a single recurring expense by ID
 */
export const getRecurringExpenseById = async (
    userId: string,
    expenseId: string
): Promise<RecurringExpense | null> => {
    try {
        const expenses = await getRecurringExpenses(userId);
        return expenses.find(e => e.id === expenseId) || null;
    } catch (error) {
        console.error('Error getting recurring expense by ID:', error);
        return null;
    }
};

/**
 * Delete a recurring expense
 */
export const deleteRecurringExpense = async (
    userId: string,
    expenseId: string
): Promise<boolean> => {
    try {
        const storageKey = getStorageKey(userId);
        const expenses = await getRecurringExpenses(userId);
        const filteredExpenses = expenses.filter(e => e.id !== expenseId);

        await AsyncStorage.setItem(storageKey, JSON.stringify(filteredExpenses));

        // Optional: Delete from Supabase
        await deleteFromSupabase(expenseId);

        return true;
    } catch (error) {
        console.error('Error deleting recurring expense:', error);
        return false;
    }
};

/**
 * Update a recurring expense
 */
export const updateRecurringExpense = async (
    userId: string,
    expenseId: string,
    updates: Partial<RecurringExpense>
): Promise<RecurringExpense | null> => {
    try {
        const expense = await getRecurringExpenseById(userId, expenseId);
        if (!expense) {
            throw new Error('Recurring expense not found');
        }

        return await saveRecurringExpense(userId, {
            ...expense,
            ...updates,
            id: expenseId,
        });
    } catch (error) {
        console.error('Error updating recurring expense:', error);
        return null;
    }
};

/**
 * Toggle active status of a recurring expense
 */
export const toggleRecurringExpenseStatus = async (
    userId: string,
    expenseId: string
): Promise<boolean> => {
    try {
        const expense = await getRecurringExpenseById(userId, expenseId);
        if (!expense) {
            return false;
        }

        await updateRecurringExpense(userId, expenseId, {
            is_active: !expense.is_active,
        });

        return true;
    } catch (error) {
        console.error('Error toggling recurring expense status:', error);
        return false;
    }
};

/**
 * Get active recurring expenses only
 */
export const getActiveRecurringExpenses = async (userId: string): Promise<RecurringExpense[]> => {
    try {
        const expenses = await getRecurringExpenses(userId);
        return expenses.filter(e => e.is_active);
    } catch (error) {
        console.error('Error getting active recurring expenses:', error);
        return [];
    }
};

// ============================================================================
// Optional Supabase Sync Functions
// ============================================================================

/**
 * Sync recurring expense to Supabase (optional)
 */
const syncToSupabase = async (expense: RecurringExpense): Promise<void> => {
    try {
        // Check if table exists, if not, skip sync
        const { data, error } = await supabase
            .from('recurring_expenses')
            .upsert(expense, { onConflict: 'id' });

        if (error && !error.message.includes('does not exist')) {
            console.warn('Supabase sync warning:', error.message);
        }
    } catch (error) {
        // Silently fail if table doesn't exist
        console.log('Supabase sync skipped (table may not exist)');
    }
};

/**
 * Fetch recurring expenses from Supabase (optional)
 */
const fetchFromSupabase = async (userId: string): Promise<RecurringExpense[]> => {
    try {
        const { data, error } = await supabase
            .from('recurring_expenses')
            .select('*')
            .eq('user_id', userId);

        if (error) {
            console.warn('Supabase fetch warning:', error.message);
            return [];
        }

        // Save to local storage
        if (data && data.length > 0) {
            const storageKey = getStorageKey(userId);
            await AsyncStorage.setItem(storageKey, JSON.stringify(data));
        }

        return data || [];
    } catch (error) {
        console.log('Supabase fetch skipped (table may not exist)');
        return [];
    }
};

/**
 * Delete from Supabase (optional)
 */
const deleteFromSupabase = async (expenseId: string): Promise<void> => {
    try {
        const { error } = await supabase
            .from('recurring_expenses')
            .delete()
            .eq('id', expenseId);

        if (error && !error.message.includes('does not exist')) {
            console.warn('Supabase delete warning:', error.message);
        }
    } catch (error) {
        console.log('Supabase delete skipped (table may not exist)');
    }
};
