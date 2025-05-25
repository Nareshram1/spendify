import React, { useEffect, useState, useCallback } from 'react';
import { View, Modal, Text, Pressable, FlatList, StyleSheet, TouchableOpacity, Dimensions, GestureResponderEvent } from 'react-native';
import DatePicker from 'react-native-modern-datepicker';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { supabase } from '@/utils/supabaseClient';
import { getValueFor } from '@/utils/secureStore';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import ExpenseActionModal from '../components/DeleteModal';
import BudgetInputModal from '../components/BudgetInputModal';

interface AnalyticsProp {
  refresh: boolean;
}

interface Expense {
  id: string;
  amount: number;
  created_at: string; // ISO date string
  expense_method: string;
  category: string; // Make category nullable
}

interface FetchExpensesForTodayResult {
  expenses: Expense[];
  total: number;
}

const { width } = Dimensions.get('window');

const AnalyticsHome: React.FC<AnalyticsProp> = ({ refresh }) => {
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isDatePickerModalVisible, setIsDatePickerModalVisible] = useState<boolean>(false);
  const [isBudgetModalVisible, setIsBudgetPickerModalVisible] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [userID, setUserID] = useState<string>('');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [budget, setBudget] = useState<number>(0);
  const [monthExpense, setMonthExpense] = useState<number>(0);
  const [remainingBudget, setRemainingBudget] = useState(0);
  const [isOverBudget, setIsOverBudget] = useState(false);
  const [date, setDate] = useState<string>(() => {
    const istOffset = 5.5 * 60 * 60000; // IST offset from UTC
    return new Date(new Date().getTime() + istOffset).toISOString().split('T')[0];
  });
  const [tempSelectedDate, setTempSelectedDate] = useState(date);
  const handleDateSelect = (selectedDate: string) => {
    setTempSelectedDate(selectedDate); // Update temporary state
  };

  const confirmDateSelection = () => {
      setDate(tempSelectedDate); // Update actual date state
      setIsDatePickerModalVisible(false); // Close modal
  };
  // --- Initial User ID Fetch ---
  useEffect(() => {
    const getUserID = async () => {
      const storedEmail = await getValueFor('user_email');
      const storedUserId = await getValueFor('user_id');

      if (!storedEmail && !storedUserId) {
        router.replace('/');
      }
      if (storedUserId) { // Use storedUserId directly
        setUserID(storedUserId);
      }
    };
    getUserID();
  }, []);

  // --- Expense Fetching Functions (Memoized) ---
  const fetchExpensesForDate = useCallback(async (selectedDate: string): Promise<FetchExpensesForTodayResult> => {
    if (!userID) {
      console.warn('userID not set, cannot fetch expenses.');
      return { expenses: [], total: 0 };
    }

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
    } else {
      const aggregatedExpenses = data.reduce((acc: any, item: any) => {
        const existingCategory = acc.find((exp: any) => exp.category === item.category?.name); // Optional chaining
        if (existingCategory) {
          existingCategory.amount += item.amount;
        } else {
          acc.push({
            id: item.id,
            amount: item.amount,
            created_at: item.created_at,
            expense_method: item.expense_method,
            category: item.category?.name || 'Unknown', // Optional chaining
          });
        }
        return acc;
      }, []);

      const total = aggregatedExpenses.reduce((sum: number, expense: Expense) => sum + expense.amount, 0);
      return { expenses: aggregatedExpenses, total };
    }
  }, [userID]);

  const fetchTotalExpenseForMonth = useCallback(async (): Promise<number> => {
    if (!userID) {
      console.warn('userID not set, cannot fetch month expenses.');
      return 0;
    }

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
    } else {
      const total = data.reduce((sum: number, expense: { amount: number }) => sum + expense.amount, 0);
      return total;
    }
  }, [userID]);

  // --- Budget Fetching Function (Memoized) ---
  const getUserBudget = useCallback(async () => {
    if (!userID) {
      console.warn('userID not set, cannot fetch budget.');
      return;
    }
    try {
      const { data, error } = await supabase
        .from('users')
        .select('budget')
        .eq('user_id', userID); // Assuming 'id' is the primary key for user_id in 'users' table

      if (error) {
        console.error('Error fetching user budget:', error.message);
        return;
      }
      if (data && data.length > 0) {
        setBudget(data[0].budget);
      } else {
        setBudget(0); // Set to 0 if no budget is found
      }
    } catch (error) {
      console.error('Error fetching user budget:', error);
    }
  }, [userID]);

  // --- Consolidated Data Fetching Function ---
  // This function will fetch all necessary data when called
  const fetchData = useCallback(async () => {
    if (userID) {
      // Fetch daily expenses
      const result: FetchExpensesForTodayResult = await fetchExpensesForDate(date);
      setExpenses(result.expenses);
      setTotal(result.total);

      // Fetch monthly expenses
      const totalMonthExpense = await fetchTotalExpenseForMonth();
      setMonthExpense(totalMonthExpense);

      // Fetch user budget
      await getUserBudget();
    }
  }, [userID, date, fetchExpensesForDate, fetchTotalExpenseForMonth, getUserBudget]); // Dependencies for fetchData

  // --- Effect to call fetchData on initial load and when dependencies change ---
  useEffect(() => {
    fetchData();
  }, [userID, refresh, date, fetchData]); // Now fetchData is a dependency itself

  // --- Budget Calculation Effect ---
  // This effect will run whenever budget or monthExpense changes
  useEffect(() => {
    const calculatedRemainingBudget = budget - monthExpense;
    setRemainingBudget(calculatedRemainingBudget);
    setIsOverBudget(calculatedRemainingBudget < 0);
  }, [budget, monthExpense]); // Recalculate when budget or monthExpense changes

  // --- Handlers ---
  const handleDateChange = (selectedDate: string) => {
    setDate(selectedDate);
    setIsDatePickerModalVisible(false); // Close date picker after selection
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalVisible(false);
    setSelectedExpense(null);
  };

  const handleDeleteExpense = async () => {
    if (!selectedExpense) return;

    try {
      const { error } = await supabase.from('expenses').delete().eq('id', selectedExpense.id);

      if (error) {
        console.error('Error deleting expense:', error.message);
        return;
      }
      console.log('Expense deleted successfully.');
      handleCloseDeleteModal();
      fetchData(); // Call fetchData to refresh all data
    } catch (error) {
      console.error('Error deleting expense:', error);
    }
  };

  const handleUpdateExpense = async (updatedExpense: any) => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .update({
          amount: updatedExpense.amount,
          category_id: updatedExpense.category_id,
          expense_method: updatedExpense.expense_method,
          created_at: updatedExpense.expense_date, // Assuming expense_date is the correct field for the expense timestamp
        })
        .eq('id', updatedExpense.id);

      if (error) {
        console.error('Error updating expense:', error.message);
        return;
      }
      console.log('Expense updated successfully:', data);
      fetchData(); // Call fetchData to refresh all data
    } catch (error) {
      console.error('Error updating expense:', error);
    }
  };

  const handleSaveBudget = async (newBudget: number) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ budget: newBudget })
        .eq('user_id', userID); 

      if (error) {
        console.error('Error updating budget in Supabase:', error.message);
        return;
      }

      console.log('Budget successfully updated in Supabase:', data);
      setBudget(newBudget); // Update local budget state, which will trigger the budget calculation useEffect
      setIsBudgetPickerModalVisible(false); // Close the modal
    } catch (error) {
      console.error('An unexpected error occurred while saving budget:', error);
    }
  };
  useEffect(() => {
    console.log("date picker modal",isDatePickerModalVisible);
  }, [isDatePickerModalVisible])
  return (
    <SafeAreaProvider style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => setIsBudgetPickerModalVisible(true)}>
          <View>
            <Text style={styles.headerTitle}>Budget Remaining</Text>
            <Text
              style={[
                styles.budgetInfoValue,
                isOverBudget ? styles.overBudget : styles.underBudget,
              ]}
            >
              ₹{Math.abs(remainingBudget).toFixed(2)}
              {isOverBudget ? ' Over' : ' Left'}
            </Text>
          </View>
        </Pressable>
        <Pressable onPress={() => {setIsDatePickerModalVisible(true);console.log("date picker")}} style={styles.headerContent}>
          <Feather name="calendar" size={28} color="white" />
        </Pressable>
      </View>

      {/* Date Picker Modal */}
        <Modal
            visible={isDatePickerModalVisible}
            transparent={true}
            animationType="slide"
        >
            <View style={styles.modalOverlay}>
                <View style={styles.datePickerModal}>
                    <DatePicker
                        mode="calendar"
                        onSelectedChange={handleDateSelect} // Use a new handler here
                        selected={tempSelectedDate} // Use temp state for picker
                        options={{
                            backgroundColor: 'white',
                            textHeaderColor: '#6A11CB',
                            selectedTextColor: 'white',
                            mainColor: '#6A11CB',
                        }}
                    />
                    <Pressable
                        onPress={confirmDateSelection} // This button confirms and closes
                        style={styles.modalCloseButton}
                    >
                        <Text style={styles.modalCloseButtonText}>Confirm</Text>
                    </Pressable>
                    <Pressable
                        onPress={() => setIsDatePickerModalVisible(false)} // This button cancels
                        style={styles.modalCloseButton}
                    >
                        <Text style={styles.modalCloseButtonText}>Cancel</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>

      {/* Budget Input Modal */}
      <BudgetInputModal
        isVisible={isBudgetModalVisible}
        onClose={() => setIsBudgetPickerModalVisible(false)}
        currentBudget={budget}
        onSaveBudget={handleSaveBudget}
      />

      {/* Delete Expense Modal */}
      <ExpenseActionModal
        visible={isDeleteModalVisible}
        expense={selectedExpense}
        onClose={handleCloseDeleteModal}
        onDelete={handleDeleteExpense}
        onUpdate={handleUpdateExpense}
        userID={userID}
      />

      {/* Expense List */}
      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={() => (
          expenses.length > 0 && (
            <View style={styles.listHeader}>
              <Text style={styles.listHeaderText}>Amount</Text>
              <Text style={styles.listHeaderText}>Category</Text>
              <Text style={styles.listHeaderText}>Method</Text>
            </View>
          )
        )}
        renderItem={({ item }) => (
          <TouchableOpacity
            onLongPress={() => {
              setSelectedExpense(item);
              setIsDeleteModalVisible(true);
            }}
            style={styles.listItem}
          >
            <Text style={styles.itemText}>₹{item.amount.toFixed(2)}</Text>
            <Text style={styles.itemText}>{item.category ?? 'Unknown'}</Text>
            <Text style={styles.itemText}>
              {item.expense_method === 'upi' ? 'UPI' : 'CASH'}
            </Text>
          </TouchableOpacity>
        )}
        ListFooterComponent={() => (
          <View style={styles.footer}>
            {total > 0 ? (
              <Text style={styles.footerText}>Total: ₹{total.toFixed(0)}</Text>
            ) : (
              <Text style={styles.footerText}>No Expenses on this day</Text>
            )}
          </View>
        )}
        contentContainerStyle={styles.listContainer}
      />
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    container: {
        flex: 1,
        paddingTop: 50,
    },
    header: {
        paddingHorizontal: 20,
        marginBottom: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 16,
        marginBottom: 5,
    },
    budgetInfoValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
    },
    remainingText: {
        fontSize: 14,
        color: '#C0C0C0',
    },
    underBudget: {
        color: '#D4EDDA',
    },
    overBudget: {
        color: '#F8D7DA',
    },
    monthExpenseText: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    datePickerModal: {
        width: width * 0.9,
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    modalCloseButton: {
        backgroundColor: '#0ac7b8',
        padding: 12,
        borderRadius: 25,
        marginTop: 10,
        alignSelf: 'center',
    },
    modalCloseButtonText: {
        color: 'white',
        textAlign: 'center',
        fontWeight: 'bold',
    },
    deleteModal: {
        width: width * 0.85,
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 20,
        alignItems: 'center',
    },
    deleteModalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#6A11CB',
    },
    deleteModalDetails: {
        width: '100%',
        marginBottom: 20,
    },
    deleteModalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    deleteModalLabel: {
        color: '#666',
        fontSize: 16,
    },
    deleteModalValue: {
        fontWeight: 'bold',
        fontSize: 16,
    },
    deleteModalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    deleteButton: {
        backgroundColor: '#FF6B6B',
        padding: 12,
        borderRadius: 25,
        width: '48%',
        alignItems: 'center',
    },
    deleteButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    cancelButton: {
        backgroundColor: '#4ECDC4',
        padding: 12,
        borderRadius: 25,
        width: '48%',
        alignItems: 'center',
    },
    cancelButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    listContainer: {
        paddingHorizontal: 20,
    },
    listHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 10,
        marginBottom: 10,
    },
    listHeaderText: {
        flex: 1,
        textAlign: 'center',
        color: 'white',
        fontWeight: 'bold',
    },
    listItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
        backgroundColor: 'transparent',
    },
    itemText: {
        flex: 1,
        textAlign: 'center',
        color: 'white',
        fontSize: 15,
    },
    footer: {
        marginTop: 10,
        paddingVertical: 15,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 10,
    },
    footerText: {
        textAlign: 'center',
        color: 'white',
        fontWeight: 'bold',
    },
    openModalButton: {
        backgroundColor: '#6A11CB',
        padding: 15,
        borderRadius: 10,
        marginBottom: 20,
    },
    openModalButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    currentBudgetText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },

});

export default AnalyticsHome;