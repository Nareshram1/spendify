/**
 * Recurring Expense Processor
 * Core logic for calculating due dates and creating expenses from recurring templates
 */

import { RecurringExpense, ProcessingResult } from './recurringExpenseTypes';
import { getActiveRecurringExpenses, updateRecurringExpense } from './recurringExpenseDB';
import { ExpenseService } from './database';

/**
 * Calculate the next due date for a recurring expense
 */
export const calculateNextDueDate = (
    lastDate: Date,
    expense: RecurringExpense
): Date => {
    const nextDate = new Date(lastDate);

    switch (expense.recurrence_interval) {
        case 'daily':
            nextDate.setDate(nextDate.getDate() + 1);
            break;

        case 'weekly':
            nextDate.setDate(nextDate.getDate() + 7);
            break;

        case 'monthly':
            nextDate.setMonth(nextDate.getMonth() + 1);
            break;

        case 'yearly':
            nextDate.setFullYear(nextDate.getFullYear() + 1);
            break;

        case 'custom':
            if (expense.custom_interval_value && expense.custom_interval_unit) {
                const value = expense.custom_interval_value;
                switch (expense.custom_interval_unit) {
                    case 'days':
                        nextDate.setDate(nextDate.getDate() + value);
                        break;
                    case 'weeks':
                        nextDate.setDate(nextDate.getDate() + (value * 7));
                        break;
                    case 'months':
                        nextDate.setMonth(nextDate.getMonth() + value);
                        break;
                    case 'years':
                        nextDate.setFullYear(nextDate.getFullYear() + value);
                        break;
                }
            }
            break;
    }

    return nextDate;
};

/**
 * Check if a recurring expense should create a new expense
 */
export const shouldCreateExpense = (
    expense: RecurringExpense,
    currentDate: Date = new Date()
): boolean => {
    // Check if active
    if (!expense.is_active) {
        return false;
    }

    // Check end condition
    if (expense.end_condition === 'on_date' && expense.end_date) {
        const endDate = new Date(expense.end_date);
        if (currentDate > endDate) {
            return false;
        }
    }

    if (expense.end_condition === 'after_occurrences' && expense.occurrence_count) {
        if (expense.occurrences_created >= expense.occurrence_count) {
            return false;
        }
    }

    // Check if due
    const nextDueDate = expense.next_due_date
        ? new Date(expense.next_due_date)
        : new Date(expense.start_date);

    // Set time to start of day for comparison
    const currentDateStart = new Date(currentDate);
    currentDateStart.setHours(0, 0, 0, 0);

    const dueDateStart = new Date(nextDueDate);
    dueDateStart.setHours(0, 0, 0, 0);

    return dueDateStart <= currentDateStart;
};

/**
 * Create an actual expense from a recurring expense template
 */
export const createExpenseFromRecurring = async (
    recurringExpense: RecurringExpense
): Promise<boolean> => {
    try {
        const expenseDate = recurringExpense.next_due_date
            ? new Date(recurringExpense.next_due_date)
            : new Date();

        // Create the expense using ExpenseService
        const createdExpense = await ExpenseService.createExpense({
            user_id: recurringExpense.user_id,
            amount: recurringExpense.amount,
            category_id: recurringExpense.category_id,
            expense_method: 'upi', // Default method, could be made configurable
            expense_date: expenseDate.toISOString(),
        });

        if (!createdExpense) {
            console.error('Failed to create expense from recurring template');
            return false;
        }

        // Update recurring expense tracking
        const nextDueDate = calculateNextDueDate(expenseDate, recurringExpense);

        await updateRecurringExpense(
            recurringExpense.user_id,
            recurringExpense.id,
            {
                occurrences_created: recurringExpense.occurrences_created + 1,
                last_created_date: expenseDate.toISOString(),
                next_due_date: nextDueDate.toISOString(),
            }
        );

        // If this was the last occurrence, deactivate
        if (
            recurringExpense.end_condition === 'after_occurrences' &&
            recurringExpense.occurrence_count &&
            recurringExpense.occurrences_created + 1 >= recurringExpense.occurrence_count
        ) {
            await updateRecurringExpense(
                recurringExpense.user_id,
                recurringExpense.id,
                { is_active: false }
            );
        }

        return true;
    } catch (error) {
        console.error('Error creating expense from recurring:', error);
        return false;
    }
};

/**
 * Process all recurring expenses for a user
 * This should be called on app startup and periodically
 */
export const processRecurringExpenses = async (
    userId: string
): Promise<ProcessingResult> => {
    const result: ProcessingResult = {
        success: true,
        expensesCreated: 0,
        errors: [],
    };

    try {
        const recurringExpenses = await getActiveRecurringExpenses(userId);
        const currentDate = new Date();

        for (const expense of recurringExpenses) {
            try {
                // Check if we need to create multiple expenses (in case app wasn't opened for a while)
                let shouldCreate = shouldCreateExpense(expense, currentDate);
                let safetyCounter = 0;
                const MAX_ITERATIONS = 100; // Prevent infinite loops

                while (shouldCreate && safetyCounter < MAX_ITERATIONS) {
                    const created = await createExpenseFromRecurring(expense);

                    if (created) {
                        result.expensesCreated++;
                    } else {
                        result.errors.push(`Failed to create expense for recurring ID: ${expense.id}`);
                        break;
                    }

                    // Refresh the expense data to get updated next_due_date
                    const updatedExpense = await getActiveRecurringExpenses(userId);
                    const currentExpense = updatedExpense.find(e => e.id === expense.id);

                    if (!currentExpense) {
                        break;
                    }

                    shouldCreate = shouldCreateExpense(currentExpense, currentDate);
                    safetyCounter++;
                }

                if (safetyCounter >= MAX_ITERATIONS) {
                    result.errors.push(`Safety limit reached for recurring ID: ${expense.id}`);
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                result.errors.push(`Error processing recurring ID ${expense.id}: ${errorMessage}`);
            }
        }

        if (result.errors.length > 0) {
            result.success = false;
        }

        console.log('Recurring expenses processed:', result);
        return result;
    } catch (error) {
        console.error('Error in processRecurringExpenses:', error);
        return {
            success: false,
            expensesCreated: 0,
            errors: [error instanceof Error ? error.message : 'Unknown error'],
        };
    }
};

/**
 * Get a human-readable description of the recurrence pattern
 */
export const getRecurrenceDescription = (expense: RecurringExpense): string => {
    let description = '';

    switch (expense.recurrence_interval) {
        case 'daily':
            description = 'Every day';
            break;
        case 'weekly':
            description = 'Every week';
            break;
        case 'monthly':
            description = 'Every month';
            break;
        case 'yearly':
            description = 'Every year';
            break;
        case 'custom':
            if (expense.custom_interval_value && expense.custom_interval_unit) {
                const value = expense.custom_interval_value;
                const unit = expense.custom_interval_unit;
                description = `Every ${value} ${unit}`;
            }
            break;
    }

    // Add end condition
    if (expense.end_condition === 'on_date' && expense.end_date) {
        const endDate = new Date(expense.end_date);
        description += ` until ${endDate.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        })}`;
    } else if (expense.end_condition === 'after_occurrences' && expense.occurrence_count) {
        const remaining = expense.occurrence_count - expense.occurrences_created;
        description += ` (${remaining} remaining)`;
    }

    return description;
};

/**
 * Get the next due date as a formatted string
 */
export const getNextDueDateString = (expense: RecurringExpense): string => {
    if (!expense.next_due_date) {
        return 'Not scheduled';
    }

    const dueDate = new Date(expense.next_due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDateStart = new Date(dueDate);
    dueDateStart.setHours(0, 0, 0, 0);

    const diffTime = dueDateStart.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return 'Overdue';
    } else if (diffDays === 0) {
        return 'Today';
    } else if (diffDays === 1) {
        return 'Tomorrow';
    } else if (diffDays <= 7) {
        return `In ${diffDays} days`;
    } else {
        return dueDate.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    }
};
