import React, { useEffect, useState, useCallback } from 'react';
import { View, Modal, Text, Pressable, FlatList, StyleSheet, TouchableOpacity, Dimensions, GestureResponderEvent } from 'react-native';
import DatePicker from 'react-native-modern-datepicker';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getValueFor } from '@/utils/secureStore';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import ExpenseActionModal from '../components/DeleteModal';
import BudgetInputModal from '../components/BudgetInputModal';
import { ExpenseService, UserService, type Expense, type FetchExpensesForDateResult } from '@/utils/database';

interface AnalyticsProp {
  refresh: boolean;
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
  const fetchExpensesForDate = useCallback(async (selectedDate: string): Promise<FetchExpensesForDateResult> => {
    return await ExpenseService.fetchExpensesForDate(userID, selectedDate);
  }, [userID]);

  const fetchTotalExpenseForMonth = useCallback(async (): Promise<number> => {
    return await ExpenseService.fetchTotalExpenseForMonth(userID);
  }, [userID]);

  // --- Budget Fetching Function (Memoized) ---
  const getUserBudget = useCallback(async () => {
    if (!userID) {
      console.warn('userID not set, cannot fetch budget.');
      return;
    }
    const budgetAmount = await UserService.getUserBudget(userID);
    setBudget(budgetAmount);
  }, [userID]);

  // --- Consolidated Data Fetching Function ---
  // This function will fetch all necessary data when called
  const fetchData = useCallback(async () => {
    if (userID) {
      // Fetch daily expenses
      const result: FetchExpensesForDateResult = await fetchExpensesForDate(date);
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

    const success = await ExpenseService.deleteExpense(selectedExpense.id);
    if (success) {
      handleCloseDeleteModal();
      fetchData(); // Call fetchData to refresh all data
    }
  };

  const handleUpdateExpense = async (updatedExpense: any) => {
    const success = await ExpenseService.updateExpense(updatedExpense.id, {
      amount: updatedExpense.amount,
      category_id: updatedExpense.category_id,
      expense_method: updatedExpense.expense_method,
      expense_date: updatedExpense.expense_date,
    });

    if (success) {
      fetchData(); // Call fetchData to refresh all data
    }
  };

  const handleSaveBudget = async (newBudget: number) => {
    const success = await UserService.updateUserBudget(userID, newBudget);
    if (success) {
      setBudget(newBudget); // Update local budget state, which will trigger the budget calculation useEffect
      setIsBudgetPickerModalVisible(false); // Close the modal
    }
  };

  useEffect(() => {
    console.log("date picker modal", isDatePickerModalVisible);
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
                    <View style={styles.modalButtonContainer}>
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
    modalButtonContainer: {
    flexDirection: 'row', // This makes the children (buttons) lay out horizontally
    justifyContent: 'space-around', // Distributes space evenly around items
    marginTop: 20, // Add some space above the buttons
  },
    modalCloseButton: {
        backgroundColor: '#0ac7b8',
        padding: 12,
        borderRadius: 25,
        marginTop: 10,
        alignSelf: 'center',
        flex: 1,
        marginHorizontal: 5, 
        alignItems: 'center',
    },
    modalCloseButtonText: {
        color: 'white',
        textAlign: 'center',
        fontWeight: 'bold',
        fontFamily:'InterRegular'
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