import React, { useEffect, useState } from 'react';
import { View, Modal, Text, Pressable, FlatList, StyleSheet } from 'react-native';
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
  amount: number;
  created_at: string; // ISO date string
  category: String // Make category nullable
}

interface FetchExpensesForTodayResult {
  expenses: Expense[];
  total: number;
}

const Analytics: React.FC<AnalyticsProp> = ({ refresh }) => {
  const [openModal, setOpenModal] = useState(false);
  const [userID, setUserID] = useState<string>('');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [monthExpense, setMonthExpense] = useState<Number>(0);

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
      const totalMonthExpense: Number = await fetchTotalExpenseForMonth();
      setMonthExpense(totalMonthExpense);
    }
  };

  const fetchExpensesForDate = async (date: string): Promise<FetchExpensesForTodayResult> => {
    if (!userID) router.replace('/');

    const { data, error } = await supabase
      .from('expenses')
      .select(`
        amount,
        created_at,
        category:categories ( name )
      `)
      .eq('user_id', userID)
      .gte('created_at', `${date}T00:00:00.000Z`)
      .lt('created_at', `${date}T23:59:59.999Z`);

    if (error) {
      alert('Error fetching expenses for the selected date:');
      return { expenses: [], total: 0 };
    } else {
      const expenses: Expense[] = data.map((item: any) => ({
        amount: item.amount,
        created_at: item.created_at,
        category: item.category.name || 'Unknown', // Ensure category name is extracted
      }));

      const total = expenses.reduce((sum: number, expense: Expense) => sum + expense.amount, 0);
      return { expenses, total };
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
    setOpenModal(true);
  };

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={handleDataPickerModal} style={styles.datePickerContainer}>
            <Text style={styles.monthExpenseText}>This Month: ₹{monthExpense.toString()}</Text>
            <Ionicons name="calendar" size={24} color="white" />
          </Pressable>
        </View>

        <Modal visible={openModal} transparent={true} animationType="slide">
          <View style={styles.modalContainer}>
            <View style={styles.datePickerContent}>
              <DatePicker
                mode="calendar"
                onSelectedChange={handleDateChange}
                selected={date}
              />
              <Pressable onPress={() => setOpenModal(false)} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <FlatList
          data={expenses}
          keyExtractor={(item, index) => index.toString()}
          ListHeaderComponent={() => (
            <>
            {total>0 &&
              <View style={styles.listHeader}>
              <Text style={styles.listHeaderText}>Amount</Text>
              <Text style={styles.listHeaderText}>Category</Text>
            </View>
            }
            </>
          )}
          renderItem={({ item }) => (
            <View style={styles.listItem}>
              <Text style={styles.itemText}>₹{item.amount}</Text>
              <Text style={styles.itemText}>{item.category ?? 'Unknown'}</Text>
            </View>
          )}
          ListFooterComponent={() => (
            <View style={styles.footer}>
              {total>0?
              <Text style={styles.footerText}>Total: ₹{total.toFixed(0)}</Text>
              :
              <Text style={styles.footerText}>No Expense on this day</Text>
            }
            </View>
          )}
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
    marginTop:45
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  datePickerContent: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 10,
    paddingBottom:10
  },
  closeButton: {
    backgroundColor: '#0ac7b8',
    padding: 15,
    alignItems: 'center',
    borderRadius: 25,
    marginTop:20,
    width:'50%',
    alignSelf:'center'
  },
  closeButtonText: {
    fontWeight: '500',
    fontSize: 17,
    letterSpacing: 2,
  },
  datePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:'space-between',
    width:'100%'
  },
  monthExpenseText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',

  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    backgroundColor: '#D4D4D4',
  },
  listHeaderText: {
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    fontSize:16
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    backgroundColor:'white'
  },
  itemText: {
    flex: 1,
    textAlign: 'center',
    fontSize:15
  },
  footer: {
    paddingVertical: 8,
    backgroundColor: '#D4D4D4',
  },
  footerText: {
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize:15
  },
});

export default Analytics;
