import React, { useEffect, useState } from 'react';
import { View, Modal, Text, Pressable, FlatList, StyleSheet, TouchableOpacity,Dimensions } from 'react-native';
import DatePicker from 'react-native-modern-datepicker';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { supabase } from '@/utils/supabaseClient';
import { getValueFor } from '@/utils/secureStore';
import { router } from 'expo-router';
import { Ionicons,Feather } from '@expo/vector-icons';
import ExpenseActionModal from '../components/DeleteModal';

interface AnalyticsProp {
  refresh: Boolean;
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
  const [isDatePickerModalVisible, setIsDatePickerModalVisible] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [userID, setUserID] = useState<string>('');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [date, setDate] = useState<string>(() => {
    const istOffset = 5.5 * 60 * 60000; // IST offset from UTC
    return new Date(new Date().getTime() + istOffset).toISOString().split('T')[0];
  });

  const [monthExpense, setMonthExpense] = useState<number>(0);

  useEffect(() => {
    const getUserID = async () => {
      const storedEmail = await getValueFor('user_email');
      const storedUserId = await getValueFor('user_id');

      if (!storedEmail && !storedUserId) {
        router.replace('/');
      }
      if (storedEmail) {
        setUserID(storedUserId ?? '');
      }
    };
    getUserID();
  }, []);

  useEffect(() => {
    fetchData();
  }, [userID, refresh, date]);

  const fetchData = async () => {
    if (userID && date) {
      // Day
      const result: FetchExpensesForTodayResult = await fetchExpensesForDate(date);
      setExpenses(result.expenses);
      setTotal(result.total);
      // Month
      const totalMonthExpense: number = await fetchTotalExpenseForMonth();
      setMonthExpense(totalMonthExpense);
    }
  };

  const fetchExpensesForDate = async (date: string): Promise<FetchExpensesForTodayResult> => {
    if (!userID) router.replace('/');
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
      .gte('created_at', `${date}T00:00:00.000Z`)
      .lt('created_at', `${date}T23:59:59.999Z`);

    if (error) {
      alert('Error fetching expenses for the selected date:');
      return { expenses: [], total: 0 };
    } else {
      // Aggregate expenses by category
      const aggregatedExpenses = data.reduce((acc: any, item: any) => {
        const existingCategory = acc.find((exp: any) => exp.category === item.category.name);
        if (existingCategory) {
          existingCategory.amount += item.amount;
        } else {
          acc.push({
            id: item.id,
            amount: item.amount,
            created_at: item.created_at,
            expense_method: item.expense_method,
            category: item.category.name || 'Unknown',
          });
        }
        return acc;
      }, []);

      const total = aggregatedExpenses.reduce((sum: number, expense: Expense) => sum + expense.amount, 0);
      return { expenses: aggregatedExpenses, total };
    }
  };

  const fetchTotalExpenseForMonth = async (): Promise<number> => {
    if (!userID) router.replace('/');

    // Calculate the start and end dates for the current month
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString();

    const { data, error } = await supabase
      .from('expenses')
      .select('amount')
      .eq('user_id', userID)
      .gte('created_at', startOfMonth)
      .lt('created_at', endOfMonth);

    if (error) {
      alert('Error fetching total expenses for the current month:');
      return 0;
    } else {
      const total = data.reduce((sum: number, expense: { amount: number }) => sum + expense.amount, 0);
      return total;
    }
  };

  const handleDateChange = (selectedDate: string) => {
    setDate(selectedDate);
  };

  const handleDataPickerModal = () => {
    setIsDatePickerModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsDeleteModalVisible(false);
    setSelectedExpense(null);
  };

  const handleDeleteExpense = async () => {
    if (!selectedExpense) return;

    try {
      // Perform deletion operation using Supabase client or your backend API
      const { data, error } = await supabase.from('expenses').delete().eq('id', selectedExpense.id);

      if (error) {
        console.error('Error deleting expense:', error.message);
        // Handle error display or notification
        return;
      }

      console.log('Expense deleted successfully:', data);
      // Close the modal after deletion
      handleCloseModal();
      // Refetch data to update the expense list
      fetchData();
    } catch (error) {
      console.error('Error deleting expense:', error);
      // Handle error display or notification
    }
  };
  const handleUpdateExpense = async (updatedExpense:any) => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .update({
          amount: updatedExpense.amount,
          category_id: updatedExpense.category_id,
          expense_method: updatedExpense.expense_method
        })
        .eq('id', updatedExpense.id);
  
      if (error) {
        console.error('Error updating expense:', error.message);
        return;
      }
  
      console.log('Expense updated successfully:', data);
      // Refetch data to update the expense list
      fetchData();
    } catch (error) {
      console.error('Error updating expense:', error);
    }
  };
  return (
    <SafeAreaProvider style={styles.safeArea}>

        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => setIsDatePickerModalVisible(true)} style={styles.headerContent}>
            <View>
              <Text style={styles.headerTitle}>This month</Text>
              <Text style={styles.monthExpenseText}>₹{monthExpense.toFixed(2)}</Text>
            </View>
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
                onSelectedChange={handleDateChange}
                selected={date}
                options={{
                  backgroundColor: 'white',
                  textHeaderColor: '#6A11CB',
                  selectedTextColor: 'white',
                  mainColor: '#6A11CB',
                }}
              />
              <Pressable 
                onPress={() => setIsDatePickerModalVisible(false)} 
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseButtonText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* Delete Expense Modal */}
        <ExpenseActionModal
            visible={isDeleteModalVisible}
            expense={selectedExpense}
            onClose={() => setIsDeleteModalVisible(false)}
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
});

export default AnalyticsHome;
