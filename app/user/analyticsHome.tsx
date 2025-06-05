import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Modal,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  GestureResponderEvent,
} from 'react-native';
import DatePicker from 'react-native-modern-datepicker';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getValueFor } from '@/utils/secureStore';
import { router } from 'expo-router';
import { Feather, MaterialIcons } from '@expo/vector-icons'; // Import MaterialIcons for the aggregation icon
import ExpenseActionModal from '../components/ExpenseActionModal';
import BudgetInputModal from '../components/BudgetInputModal';
import IndividualExpensesModal from '../components/IndividualExpensesModal';
import {
  ExpenseService,
  UserService,
  type AggregatedExpense,
  type Expense,
  type FetchExpensesForDateResult,
} from '@/utils/database';

interface AnalyticsProp {
  refresh: boolean;
}

const { width } = Dimensions.get('window');

const AnalyticsHome: React.FC<AnalyticsProp> = ({ refresh }) => {
  const [isDatePickerModalVisible, setIsDatePickerModalVisible] = useState<boolean>(false);
  const [isBudgetModalVisible, setIsBudgetPickerModalVisible] = useState(false);
  const [isIndividualExpensesModalVisible, setIsIndividualExpensesModalVisible] = useState(false);
  const [selectedAggregatedExpense, setSelectedAggregatedExpense] =
    useState<AggregatedExpense | null>(null);

  const [userID, setUserID] = useState<string>('');
  const [aggregatedExpenses, setAggregatedExpenses] = useState<AggregatedExpense[]>([]);
  const [totalDailyExpense, setTotalDailyExpense] = useState<number>(0);
  const [budget, setBudget] = useState<number>(0);
  const [monthExpense, setMonthExpense] = useState<number>(0);
  const [remainingBudget, setRemainingBudget] = useState(0);
  const [isOverBudget, setIsOverBudget] = useState(false);
  const [date, setDate] = useState<string>(() => {
    const istOffset = 5.5 * 60 * 60000;
    return new Date(new Date().getTime() + istOffset).toISOString().split('T')[0];
  });
  const [tempSelectedDate, setTempSelectedDate] = useState(date);

  const handleDateSelect = (selectedDate: string) => {
    setTempSelectedDate(selectedDate);
  };

  const confirmDateSelection = () => {
    setDate(tempSelectedDate);
    setIsDatePickerModalVisible(false);
  };

  // --- Initial User ID Fetch ---
  useEffect(() => {
    const getUserID = async () => {
      const storedEmail = await getValueFor('user_email');
      const storedUserId = await getValueFor('user_id');

      if (!storedEmail && !storedUserId) {
        router.replace('/');
      }
      if (storedUserId) {
        setUserID(storedUserId);
      }
    };
    getUserID();
  }, []);

  // --- Expense Fetching Functions (Memoized) ---
  const fetchExpensesForDate = useCallback(
    async (selectedDate: string): Promise<FetchExpensesForDateResult> => {
      return await ExpenseService.fetchExpensesForDate(userID, selectedDate);
    },
    [userID]
  );

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
  const fetchData = useCallback(async () => {
    if (userID) {
      const result: FetchExpensesForDateResult = await fetchExpensesForDate(date);
      setAggregatedExpenses(result.expenses);
      setTotalDailyExpense(result.total);

      const totalMonthExpense = await fetchTotalExpenseForMonth();
      setMonthExpense(totalMonthExpense);

      await getUserBudget();
    }
  }, [userID, date, fetchExpensesForDate, fetchTotalExpenseForMonth, getUserBudget]);

  // --- Effect to call fetchData on initial load and when dependencies change ---
  useEffect(() => {
    fetchData();
  }, [userID, refresh, date, fetchData]);

  // --- Budget Calculation Effect ---
  useEffect(() => {
    const calculatedRemainingBudget = budget - monthExpense;
    setRemainingBudget(calculatedRemainingBudget);
    setIsOverBudget(calculatedRemainingBudget < 0);
  }, [budget, monthExpense]);

  // --- Handlers ---
  const handleCloseIndividualExpensesModal = () => {
    setIsIndividualExpensesModalVisible(false);
    setSelectedAggregatedExpense(null);
    fetchData();
  };

  const handleLongPressAggregatedExpense = (aggregatedExpense: AggregatedExpense) => {
    setSelectedAggregatedExpense(aggregatedExpense);
    setIsIndividualExpensesModalVisible(true);
  };

  useEffect(() => {
    console.log('date picker modal', isDatePickerModalVisible);
  }, [isDatePickerModalVisible]);

  const handleSaveBudget = async (newBudget: number) => {
    const success = await UserService.updateUserBudget(userID, newBudget);
    if (success) {
      setBudget(newBudget); 
      setIsBudgetPickerModalVisible(false); 
    }
  };

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
        <Pressable
          onPress={() => {
            setIsDatePickerModalVisible(true);
            console.log('date picker');
          }}
          style={styles.headerContent}
        >
          <Feather name="calendar" size={28} color="white" />
        </Pressable>
      </View>

      {/* Date Picker Modal */}
      <Modal visible={isDatePickerModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.datePickerModal}>
            <DatePicker
              mode="calendar"
              onSelectedChange={handleDateSelect}
              selected={tempSelectedDate}
              options={{
                backgroundColor: 'white',
                textHeaderColor: '#6A11CB',
                selectedTextColor: 'white',
                mainColor: '#6A11CB',
              }}
            />
            <View style={styles.modalButtonContainer}>
              <Pressable onPress={confirmDateSelection} style={styles.modalCloseButton}>
                <Text style={styles.modalCloseButtonText}>Confirm</Text>
              </Pressable>
              <Pressable
                onPress={() => setIsDatePickerModalVisible(false)}
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

      {/* Individual Expenses Modal - NEW */}
      {selectedAggregatedExpense && (
        <IndividualExpensesModal
          visible={isIndividualExpensesModalVisible}
          category={selectedAggregatedExpense.category}
          individualExpenses={selectedAggregatedExpense.individualExpenses}
          onClose={handleCloseIndividualExpensesModal}
          onRefresh={fetchData}
          userID={userID}
        />
      )}

      {/* Expense List (now showing aggregated items) */}
      <FlatList
        data={aggregatedExpenses}
        keyExtractor={(item) => item.category}
        ListHeaderComponent={() =>
          aggregatedExpenses.length > 0 && (
            <View style={styles.listHeader}>
              <Text style={styles.listHeaderText}>Category</Text>
              <Text style={styles.listHeaderText}>Total Amount</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onLongPress={() => handleLongPressAggregatedExpense(item)}
            style={styles.listItem}
          >
            <View style={styles.itemCategoryContainer}>
              <Text style={styles.itemText}>
                {item.category ?? 'Unknown'}
                </Text>
                {item.individualExpenses && item.individualExpenses.length > 1 && (
                  <MaterialIcons name="layers" size={16} color="rgba(255,255,255,0.7)" style={styles.aggregatedIcon} />
                )}
            </View>
            <Text style={styles.itemText}>₹{item.totalAmount.toFixed(2)}</Text>
          </TouchableOpacity>
        )}
        ListFooterComponent={() => (
          <View style={styles.footer}>
            {totalDailyExpense > 0 ? (
              <Text style={styles.footerText}>Total: ₹{totalDailyExpense.toFixed(0)}</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
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
    fontFamily: 'InterRegular',
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
  itemCategoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center', // Center the text and icon
  },
  itemText: {
    flex: 1, // Removed flex: 1 from here to allow icon to sit next to text
    textAlign: 'center',
    color: 'white',
    fontFamily:'InterRegular',
    fontSize: 15,
  },
  aggregatedIcon: {
    // marginHorizontal:2,
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