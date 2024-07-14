import React, { useEffect, useState } from 'react';
import { View, Modal, Text, Pressable, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import DatePicker from 'react-native-modern-datepicker';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { supabase } from '@/utils/supabaseClient';
import { getValueFor } from '@/utils/secureStore';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

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

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={handleDataPickerModal} style={styles.datePickerContainer}>
            <Text style={styles.monthExpenseText}>This Month: ₹{monthExpense.toFixed(2).toString()}</Text>
            <Ionicons name="calendar" size={24} color="white" />
          </Pressable>
        </View>
        <Modal visible={isDatePickerModalVisible} transparent={true} animationType="slide">
          <View style={styles.modalContainer}>
            <View style={styles.datePickerContent}>
              <DatePicker
                mode="calendar"
                onSelectedChange={handleDateChange}
                selected={date}
              />
              <Pressable onPress={() => setIsDatePickerModalVisible(false)} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
        <Modal visible={isDeleteModalVisible} transparent={true} animationType="slide">
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Delete Expense</Text>
              <Text style={styles.modalText}>Amount: ₹{selectedExpense?.amount}</Text>
              <Text style={styles.modalText}>Category: {selectedExpense?.category ?? 'Unknown'}</Text>
              <Text style={styles.modalText}>
                Expense Method: {selectedExpense?.expense_method === 'upi' ? 'UPI' : 'CASH'}
              </Text>
              <View style={styles.modalButtons}>
                <Pressable style={styles.deleteButton} onPress={handleDeleteExpense}>
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </Pressable>
                <Pressable onPress={handleCloseModal} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        <FlatList
          data={expenses}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={() => (
            <>
              {total > 0 && (
                <View style={styles.listHeader}>
                  <Text style={styles.listHeaderText}>Amount</Text>
                  <Text style={styles.listHeaderText}>Category</Text>
                  <Text style={styles.listHeaderText}>Acc</Text>
                </View>
              )}
            </>
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
                <Text style={styles.footerText}>No Expense on this day</Text>
              )}
            </View>
          )}
          style={styles.flatList}
        />
      </View>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    marginTop: 45,
  },
  datePickerContent: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 10,
    paddingBottom: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  modalContent: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 10,
    paddingVertical: 20,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    marginBottom: 10,
    fontFamily: 'cool',
  },
  modalText: {
    fontSize: 16,
    marginBottom: 10,
    fontFamily: 'cool',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
  },
  deleteButton: {
    backgroundColor: '#e84a5f',
    padding: 15,
    borderRadius: 25,
    width: '40%',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontWeight: '500',
    fontSize: 17,
    letterSpacing: 2,
    color: 'white',
    fontFamily: 'cool',
  },
  closeButton: {
    backgroundColor: '#0ac7b8',
    padding: 15,
    borderRadius: 25,
    width: '40%',
    alignItems: 'center',
    alignSelf: 'center',
  },
  closeButtonText: {
    fontWeight: '500',
    fontSize: 17,
    letterSpacing: 2,
    color: 'white',
    fontFamily: 'cool',
  },
  datePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  monthExpenseText: {
    color: 'white',
    fontSize: 20,
    fontFamily: 'cool',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    backgroundColor: '#D4D4D4',
  },
  listHeaderText: {
    fontFamily: 'cool',
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    backgroundColor: 'white',
  },
  itemText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontFamily: 'cool',
  },
  footer: {
    paddingVertical: 8,
    backgroundColor: '#D4D4D4',
  },
  footerText: {
    textAlign: 'center',
    fontSize: 15,
    fontFamily: 'cool',
  },
  flatList: {
    flex: 1,
    minHeight: '100%',
  },
});

export default AnalyticsHome;
