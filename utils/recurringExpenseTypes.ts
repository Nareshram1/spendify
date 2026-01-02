/**
 * Types and interfaces for recurring expense functionality
 */

/**
 * Recurrence interval types
 */
export type RecurrenceInterval = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

/**
 * Custom interval units for custom recurrence
 */
export type CustomIntervalUnit = 'days' | 'weeks' | 'months' | 'years';

/**
 * End condition types for recurring expenses
 */
export type EndCondition = 'never' | 'on_date' | 'after_occurrences';

/**
 * Main recurring expense interface
 */
export interface RecurringExpense {
  id: string;
  user_id: string;
  amount: number;
  category_id: string;
  description: string;

  // Recurrence settings
  recurrence_interval: RecurrenceInterval;
  custom_interval_value?: number; // e.g., 2 for "every 2 weeks"
  custom_interval_unit?: CustomIntervalUnit;
  start_date: string; // ISO date string - when to start creating expenses

  // End condition settings
  end_condition: EndCondition;
  end_date?: string; // ISO date string
  occurrence_count?: number; // Total number of times to create
  occurrences_created: number; // How many have been created so far

  // Status and tracking
  is_active: boolean;
  last_created_date?: string; // ISO date string of last expense created
  next_due_date?: string; // ISO date string of next expense to create

  // Metadata
  created_at: string;
  updated_at: string;
}

/**
 * Form data for creating/editing recurring expenses
 */
export interface RecurringExpenseFormData {
  amount: string;
  category_id: string;
  description: string;
  start_date: string; // YYYY-MM-DD format
  recurrence_interval: RecurrenceInterval;
  custom_interval_value: string;
  custom_interval_unit: CustomIntervalUnit;
  end_condition: EndCondition;
  end_date: string;
  occurrence_count: string;
}

/**
 * Props for RecurringExpenseModal component
 */
export interface RecurringExpenseModalProps {
  visible: boolean;
  recurringExpense?: RecurringExpense | null;
  onClose: () => void;
  onSave: (expense: Partial<RecurringExpense>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  userID: string;
}

/**
 * Result of processing recurring expenses
 */
export interface ProcessingResult {
  success: boolean;
  expensesCreated: number;
  errors: string[];
}
