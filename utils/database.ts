import { supabase } from './supabaseClient';
import { getValueFor, saveCategory, deleteValueFor } from './secureStore';


/**
 * Adds a new category for the user.
 * @param name - The category name.
 * @param userID - The user's ID.
 * @returns The newly created category.
 */
export async function addCategory(name: string, userID: string) {
  const { data, error } = await supabase
    .from('categories')
    .insert([{ name, user_id: userID }])
    .select('*');

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Adds an expense for the user.
 * @param expense - The expense data to insert.
 * @returns Success or throws error.
 */
export async function addExpense(expense: any) {
  const { error } = await supabase
    .from('expenses')
    .insert([expense]);

  if (error) throw new Error(error.message);
}

/**
 * Deletes all expenses for a given category ID.
 * @param categoryID - The category ID to delete expenses from.
 */
export async function deleteExpensesByCategory(categoryID: number) {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('category_id', categoryID);

  if (error) throw new Error(error.message);
}

/**
 * Deletes a category by its ID.
 * @param categoryID - The ID of the category to delete.
 */
export async function deleteCategory(categoryID: number) {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', categoryID);

  if (error) throw new Error(error.message);
}

/**
 * Fetches categories from Supabase for the logged-in user and
 * saves them securely.
 * 
 * @returns {Promise<any[] | null>} - Array of categories or null on error.
 */
export async function fetchAndSaveCategories(): Promise<any[] | null> {
  const user_id = await getValueFor('user_id');

  const { data, error } = await supabase
    .from('categories')
    .select('id, name')
    .eq('user_id', user_id);

  if (error) {
    console.error('Error fetching categories:', error);
    return null;
  }

  if (data) {
    await saveCategory('categories', data);
    return data;
  }

  return null;
}

/**
 * Loads categories from secure storage.
 * 
 * @returns {Promise<any[] | null>} - Array of categories or null if not found.
 */
export async function loadStoredCategories(): Promise<any[] | null> {
  const storedCategories = await getValueFor('categories');
  if (storedCategories) {
    return JSON.parse(storedCategories);
  }
  return null;
}

/**
 * Syncs locally stored expense data to Supabase and clears it from storage if successful.
 * 
 * @returns {Promise<void>}
 */
export async function syncLocalExpenses(): Promise<void> {
  try {
    const localData = await getValueFor('expense');
    if (localData) {
      const data = JSON.parse(localData);

      for (const item of data) {
        await supabase.from('expenses').insert([item]);
      }

      await deleteValueFor('expense');
      alert('Local Data synced.');
    }
  } catch (error) {
    alert('Error in syncing.');
    console.error('Error syncing data with Supabase:', error);
  }
}

/**
 * Interface definitions for database operations
 */
export interface Expense {
  id: string;
  amount: number;
  created_at: string;
  expense_method: string;
  category: string;
}

export interface FetchExpensesForDateResult {
  expenses: Expense[];
  total: number;
}

export interface User {
  user_id: string;
  budget: number;
}

/**
 * Expense-related database operations
 */
export class ExpenseService {
  
  /**
   * Fetches expenses for a specific date and user
   * @param userID - The user's unique identifier
   * @param selectedDate - Date in YYYY-MM-DD format
   * @returns Promise containing aggregated expenses and total amount
   */
  static async fetchExpensesForDate(
    userID: string, 
    selectedDate: string
  ): Promise<FetchExpensesForDateResult> {
    if (!userID) {
      console.warn('userID not provided, cannot fetch expenses.');
      return { expenses: [], total: 0 };
    }

    try {
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          id,
          amount,
          created_at,
          expense_method,
          category:categories ( name )
        `)
        .eq('user_id', userID)
        .gte('created_at', `${selectedDate}T00:00:00.000Z`)
        .lt('created_at', `${selectedDate}T23:59:59.999Z`);

      if (error) {
        console.error('Error fetching expenses for the selected date:', error.message);
        return { expenses: [], total: 0 };
      }

      // Aggregate expenses by category
      const aggregatedExpenses = data.reduce((acc: any, item: any) => {
        const existingCategory = acc.find((exp: any) => exp.category === item.category?.name);
        if (existingCategory) {
          existingCategory.amount += item.amount;
        } else {
          acc.push({
            id: item.id,
            amount: item.amount,
            created_at: item.created_at,
            expense_method: item.expense_method,
            category: item.category?.name || 'Unknown',
          });
        }
        return acc;
      }, []);

      const total = aggregatedExpenses.reduce(
        (sum: number, expense: Expense) => sum + expense.amount, 
        0
      );

      return { expenses: aggregatedExpenses, total };
    } catch (error) {
      console.error('Unexpected error fetching expenses for date:', error);
      return { expenses: [], total: 0 };
    }
  }

  /**
   * Fetches total expenses for the current month for a specific user
   * @param userID - The user's unique identifier
   * @returns Promise containing the total monthly expense amount
   */
  static async fetchTotalExpenseForMonth(userID: string): Promise<number> {
    if (!userID) {
      console.warn('userID not provided, cannot fetch month expenses.');
      return 0;
    }

    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString();

      const { data, error } = await supabase
        .from('expenses')
        .select('amount')
        .eq('user_id', userID)
        .gte('created_at', startOfMonth)
        .lt('created_at', endOfMonth);

      if (error) {
        console.error('Error fetching total expenses for the current month:', error.message);
        return 0;
      }

      const total = data.reduce(
        (sum: number, expense: { amount: number }) => sum + expense.amount, 
        0
      );

      return total;
    } catch (error) {
      console.error('Unexpected error fetching monthly expenses:', error);
      return 0;
    }
  }

  /**
   * Deletes an expense by ID
   * @param expenseId - The expense ID to delete
   * @returns Promise indicating success or failure
   */
  static async deleteExpense(expenseId: string): Promise<boolean> {
    if (!expenseId) {
      console.warn('Expense ID not provided, cannot delete expense.');
      return false;
    }

    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId);

      if (error) {
        console.error('Error deleting expense:', error.message);
        return false;
      }

      console.log('Expense deleted successfully.');
      return true;
    } catch (error) {
      console.error('Unexpected error deleting expense:', error);
      return false;
    }
  }

  /**
   * Updates an existing expense
   * @param expenseId - The expense ID to update
   * @param updatedData - Object containing updated expense data
   * @returns Promise indicating success or failure
   */
  static async updateExpense(
    expenseId: string,
    updatedData: {
      amount?: number;
      category_id?: string;
      expense_method?: string;
      expense_date?: string;
    }
  ): Promise<boolean> {
    if (!expenseId) {
      console.warn('Expense ID not provided, cannot update expense.');
      return false;
    }

    try {
      const updateObject: any = {};
      
      if (updatedData.amount !== undefined) updateObject.amount = updatedData.amount;
      if (updatedData.category_id !== undefined) updateObject.category_id = updatedData.category_id;
      if (updatedData.expense_method !== undefined) updateObject.expense_method = updatedData.expense_method;
      if (updatedData.expense_date !== undefined) updateObject.created_at = updatedData.expense_date;

      const { data, error } = await supabase
        .from('expenses')
        .update(updateObject)
        .eq('id', expenseId);

      if (error) {
        console.error('Error updating expense:', error.message);
        return false;
      }

      console.log('Expense updated successfully:', data);
      return true;
    } catch (error) {
      console.error('Unexpected error updating expense:', error);
      return false;
    }
  }

  /**
   * Creates a new expense
   * @param expenseData - Object containing expense data
   * @returns Promise containing the created expense or null if failed
   */
  static async createExpense(expenseData: {
    user_id: string;
    amount: number;
    category_id: string;
    expense_method: string;
    created_at?: string;
  }): Promise<Expense | null> {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .insert([{
          user_id: expenseData.user_id,
          amount: expenseData.amount,
          category_id: expenseData.category_id,
          expense_method: expenseData.expense_method,
          created_at: expenseData.created_at || new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating expense:', error.message);
        return null;
      }

      console.log('Expense created successfully:', data);
      return data;
    } catch (error) {
      console.error('Unexpected error creating expense:', error);
      return null;
    }
  }
}

/**
 * User-related database operations
 */
export class UserService {
  
  /**
   * Fetches user budget by user ID
   * @param userID - The user's unique identifier
   * @returns Promise containing the user's budget amount
   */
  static async getUserBudget(userID: string): Promise<number> {
    if (!userID) {
      console.warn('userID not provided, cannot fetch budget.');
      return 0;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('budget')
        .eq('user_id', userID);

      if (error) {
        console.error('Error fetching user budget:', error.message);
        return 0;
      }

      if (data && data.length > 0) {
        return data[0].budget || 0;
      } else {
        console.warn('No budget found for user');
        return 0;
      }
    } catch (error) {
      console.error('Unexpected error fetching user budget:', error);
      return 0;
    }
  }

  /**
   * Updates user budget
   * @param userID - The user's unique identifier
   * @param newBudget - The new budget amount
   * @returns Promise indicating success or failure
   */
  static async updateUserBudget(userID: string, newBudget: number): Promise<boolean> {
    if (!userID) {
      console.warn('userID not provided, cannot update budget.');
      return false;
    }

    if (newBudget < 0) {
      console.warn('Budget cannot be negative.');
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .update({ budget: newBudget })
        .eq('user_id', userID);

      if (error) {
        console.error('Error updating budget in Supabase:', error.message);
        return false;
      }

      console.log('Budget successfully updated in Supabase:', data);
      return true;
    } catch (error) {
      console.error('Unexpected error updating budget:', error);
      return false;
    }
  }

  /**
   * Creates a new user
   * @param userData - Object containing user data
   * @returns Promise containing the created user or null if failed
   */
  static async createUser(userData: {
    user_id: string;
    email?: string;
    budget?: number;
  }): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert([{
          user_id: userData.user_id,
          email: userData.email,
          budget: userData.budget || 0,
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating user:', error.message);
        return null;
      }

      console.log('User created successfully:', data);
      return data;
    } catch (error) {
      console.error('Unexpected error creating user:', error);
      return null;
    }
  }

  /**
   * Fetches user profile by user ID
   * @param userID - The user's unique identifier
   * @returns Promise containing user data or null if not found
   */
  static async getUserProfile(userID: string): Promise<User | null> {
    if (!userID) {
      console.warn('userID not provided, cannot fetch user profile.');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', userID)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error.message);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Unexpected error fetching user profile:', error);
      return null;
    }
  }
}

/**
 * Category-related database operations
 */
export class CategoryService {
  
  /**
   * Fetches all categories
   * @returns Promise containing array of categories
   */
  static async getAllCategories(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching categories:', error.message);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Unexpected error fetching categories:', error);
      return [];
    }
  }

  /**
   * Creates a new category
   * @param categoryName - The name of the category
   * @returns Promise containing the created category or null if failed
   */
  static async createCategory(categoryName: string): Promise<any | null> {
    if (!categoryName?.trim()) {
      console.warn('Category name not provided or empty.');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('categories')
        .insert([{ name: categoryName.trim() }])
        .select()
        .single();

      if (error) {
        console.error('Error creating category:', error.message);
        return null;
      }

      console.log('Category created successfully:', data);
      return data;
    } catch (error) {
      console.error('Unexpected error creating category:', error);
      return null;
    }
  }
}


export interface Transaction {
  id: number;
  amount: number;
  person_name: string;
  date: string;
  user_id?: string;
  description?: string;
}

type TransactionType = 'lending' | 'borrowing';

/**
 * Fetches transactions for a given user and type.
 * @param userID - The user's ID.
 * @param type - 'lending' or 'borrowing'.
 * @returns Array of transactions.
 */
export const fetchTransactions = async (
  userID: string,
  type: TransactionType
): Promise<Transaction[]> => {
  const { data, error } = await supabase
    .from(type === 'lending' ? 'lendings' : 'borrowings')
    .select('*')
    .eq('user_id', userID)
    .order('date', { ascending: false });

  if (error) throw error;
  return data || [];
};

/**
 * Adds a new transaction.
 * @param userID - The user's ID.
 * @param type - 'lending' or 'borrowing'.
 * @param transactionData - The transaction details.
 * @returns The newly added transaction.
 */
export const addTransaction = async (
  userID: string,
  type: TransactionType,
  transactionData: Omit<Transaction, 'id' | 'date'>
): Promise<Transaction> => {
  const { data, error } = await supabase
    .from(type === 'lending' ? 'lendings' : 'borrowings')
    .insert([{ ...transactionData, user_id: userID }])
    .select('*');

  if (error) throw error;
  return data?.[0];
};

/**
 * Deletes a transaction by ID.
 * @param type - 'lending' or 'borrowing'.
 * @param transactionId - The transaction ID.
 */
export const deleteTransaction = async (
  type: TransactionType,
  transactionId: number
): Promise<void> => {
  const { error } = await supabase
    .from(type === 'lending' ? 'lendings' : 'borrowings')
    .delete()
    .eq('id', transactionId);

  if (error) throw error;
};

/**
 * Fetches expenses for a specific user.
 *
 * @param userID - The ID of the user whose expenses are to be fetched.
 * @returns A Promise resolving to the fetched data or throwing an error.
 */
export async function fetchUserExpenses(userID: string) {
  if (!userID) {
    throw new Error('Invalid or missing userID.');
  }

  const { data, error } = await supabase
    .from('expenses')
    .select(`
      amount,
      created_at,
      category:categories ( name )
    `)
    .eq('user_id', userID);

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Fetches expenses for a user within a given date range.
 *
 * @param userID - The ID of the user
 * @param startDate - Start date string (YYYY-MM-DD)
 * @param endDate - End date string (YYYY-MM-DD)
 * @returns Promise resolving to array of expenses or throws an error
 */
export async function fetchExpensesBetweenDates(userID: string, startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('expenses')
    .select('amount, category:categories ( name )')
    .eq('user_id', userID)
    .gte('expense_date', startDate)
    .lte('expense_date', endDate);

  if (error) {
    console.error('Supabase fetch error:', error.message);
    throw error;
  }

  return data;
}

/**
 * Fetches all categories for a given user.
 *
 * @param userID - The ID of the user
 * @returns Promise resolving to array of category objects
 */
export async function getCategoriesForUser(userID: string) {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', userID);

  if (error) {
    console.error('Supabase getCategoriesForUser error:', error.message);
    throw error;
  }

  return data || [];
}

/**
 * Fetch user info from the 'users' table based on user ID.
 * @param userId - The user's unique identifier.
 * @returns User data or error.
 */
export async function fetchUserInfoById(userId: string) {
  return await supabase
    .from('users')
    .select('name, email, created_at')
    .eq('user_id', userId)
    .single();
}

/**
 * Logs out the current user from Supabase.
 * @returns Error if any during sign-out.
 */
export async function logoutUser() {
  return await supabase.auth.signOut();
}

/**
 * Delete all expense records for a specific user.
 * @param userId - The user's unique identifier.
 * @returns Error if any during deletion.
 */
export async function deleteUserExpenses(userId: string) {
  return await supabase
    .from('expenses')
    .delete()
    .eq('user_id', userId);
}

/**
 * Delete a user from the 'users' table.
 * @param userId - The user's unique identifier.
 * @returns Error if any during deletion.
 */
export async function deleteUserAccount(userId: string) {
  return await supabase
    .from('users')
    .delete()
    .eq('user_id', userId);
}

export async function exportUserExpenses(userId: string) {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .select('description, amount, expense_date, expense_method, categories(name)') // Select desired columns and join with categories
      .eq('user_id', userId)
      .csv(); // Request data as CSV

    if (error) {
      console.error('Error exporting expenses:', error.message);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Unexpected error during expenses export:', err);
    return { data: null, error: new Error('An unexpected error occurred during expenses export.') };
  }
}

export async function exportUserBorrowings(userId: string) {
  try {
    const { data, error } = await supabase
      .from('borrowings')
      .select('person_name, amount, date, description')
      .eq('user_id', userId)
      .csv();

    if (error) {
      console.error('Error exporting borrowings:', error.message);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Unexpected error during borrowings export:', err);
    return { data: null, error: new Error('An unexpected error occurred during borrowings export.') };
  }
}

export async function exportUserLendings(userId: string) {
  try {
    const { data, error } = await supabase
      .from('lendings')
      .select('person_name, amount, date, description')
      .eq('user_id', userId)
      .csv();

    if (error) {
      console.error('Error exporting lendings:', error.message);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Unexpected error during lendings export:', err);
    return { data: null, error: new Error('An unexpected error occurred during lendings export.') };
  }
}