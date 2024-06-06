import React, { useEffect, useState } from 'react';
import { View, Modal, Text, Pressable } from 'react-native';
import { Button, DataTable } from 'react-native-paper';
import DatePicker from 'react-native-modern-datepicker';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { supabase } from '@/utils/supabaseClient';
import { getValueFor } from '@/utils/secureStore';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native';
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
  const [expenses, setExpenses] = useState<any[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [itemsPerPage] = useState<number>(4); // Number of items per page
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [numberOfPages, setNumberOfPages] = useState<number>(0);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [monthExpense,setMonthExpense] = useState<Number>(0)
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

  useEffect(() => {
    const totalPages = Math.ceil(expenses.length / itemsPerPage);
    setNumberOfPages(totalPages);
  }, [expenses, itemsPerPage]);

  const fetchData = async () => {
    if (userID && date) {
      // Day
      const result: FetchExpensesForTodayResult = await fetchExpensesForDate(date);
      setExpenses(result.expenses);
      setTotal(result.total);
      //Month
      const totalMonthExpense:Number = await fetchTotalExpenseForMonth();
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
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const fromIndex = currentPage * itemsPerPage;
  const toIndex = (currentPage + 1) * itemsPerPage;

  const paginatedExpenses = expenses.slice(fromIndex, toIndex);

  const handleDateChange = (selectedDate: string) => {
    // setOpenModal(false);
    setDate(selectedDate);
  };

  const handleDataPickerModal = () => {
    console.log('Modal should open');
    setOpenModal(true);
    console.log('Modal open state after setting to true:', openModal);
  };


  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <Pressable onPress={()=>{handleDataPickerModal()}} style={styles.datePickerContainer}>
          <Text style={{color:'white',fontSize:16,fontWeight:'600'}}>This Month: ₹{monthExpense.toString()}</Text>
          <Ionicons name="calendar" size={24} color="white"  />
        </Pressable>

        <Modal visible={openModal} transparent={true} animationType="slide">
          <View style={styles.modalContainer}>
            <View style={styles.datePickerContent}>
              <DatePicker
                mode="calendar"
                onSelectedChange={handleDateChange}
                selected={date}
              />
              <Pressable onPress={() => setOpenModal(false)} style={styles.closeButton}>
                <Text style={{fontWeight:'500',fontSize:17,letterSpacing:2}}>Close</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <DataTable style={{ backgroundColor: '#D4D4D4' }}>
          <DataTable.Header>
            <DataTable.Title>Amount</DataTable.Title>
            <DataTable.Title>Category</DataTable.Title>
          </DataTable.Header>

          {paginatedExpenses.map((expense, index) => (
            <DataTable.Row key={index}>
              <DataTable.Cell>${expense.amount}</DataTable.Cell>
              <DataTable.Cell>{expense.category ?? 'Unknown'}</DataTable.Cell>
            </DataTable.Row>
          ))}

          <DataTable.Pagination
            label={`Total: ₹${total.toFixed(0)}`}
            numberOfItemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            page={currentPage}
            numberOfPages={numberOfPages}
            selectPageDropdownLabel={'Rows per page'}
          />
        </DataTable>
      </View>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
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
    padding: 20,
  },
  closeButton: {
    backgroundColor:'#0ac7b8',
    // backgroundColor:'red',
    padding:15,
    alignItems:'center',
    marginHorizontal:'auto',
    borderRadius:25
  },

  datePickerContainer: {
    width: '100%',
    margin: 1,
    marginTop:100,
    // backgroundColor:'red',
    flex:1,
    flexDirection:'row',
    alignItems:'center',
    justifyContent:'space-between',
    
  },
});

export default Analytics;
