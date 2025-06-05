import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, ScrollView, RefreshControl, TouchableOpacity, Modal, ActivityIndicator, Alert } from 'react-native';
import { fetchUserExpenses } from '@/utils/database';
import TopBar from '../components/TopBar';
import DatePickerModal from '../components/DatePickerModal';
import ChartDisplay from '../components/ChartDisplay';
import DateNavigation from '../components/DateNavigation';
import CustomDate from '../components/CustomDates';
import { Ionicons } from '@expo/vector-icons';
interface AnalyticsPageProp {
  userID: string;
}

interface GroupedData {
  [key: string]: {
    [category: string]: number;
  };
}

interface AIInsight {
  userId: string;
  dateRange: { start: string; end: string };
  insights: {
    totalSpent: number;
    numberOfTransactions: number;
    averageTransactionValue: number;
    topCategories: Array<{ name: string; total: number }>;
    mostFrequentExpenseMethod: string;
    highestSingleExpense: {
      category: string;
      amount: number;
      date: string;
      method: string;
    } | null;
    daysInRange: number;
    uniqueDaysWithSpending: number;
    daysWithExpenses: Array<[string, number]>;
  };
}

const AnalyticsPage: React.FC<AnalyticsPageProp> = ({ userID }) => {
  const [selectOptions, setSelectOptions] = useState<string>('day');
  const [chartType, setChartType] = useState<'pie' | 'line'>('pie');
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const istOffset = 5.5 * 60 * 60000;
    return new Date(new Date().getTime() + istOffset).toISOString().split('T')[0].replaceAll('-', '/');
  });
  const [openModal, setOpenModal] = useState(false);
  const [isPieData, setIsPieData] = useState(false);
  
  // AI Insights states
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [aiInsights, setAiInsights] = useState<AIInsight | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (userID) {
      fetchData(selectOptions, selectedDate);
    } else {
      console.log('Invalid userID:', userID);
    }
  }, [userID, selectOptions, selectedDate]);

  const fetchData = async (period: string, date: string, isRefresh = false) => {
    if (!userID) {
      console.warn('userID is empty or invalid.');
      return;
    }

    isRefresh ? setRefreshing(true) : setLoading(true);

    try {
      const data = await fetchUserExpenses(userID);

      if (data) {
        const formattedData = formatData(data, period, date);
        setData(formattedData);
        setIsPieData(formattedData.pieData.length > 0);
      } else {
        console.warn('No data returned from the query.');
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      isRefresh ? setRefreshing(false) : setLoading(false);
    }
  };

  // AI Insights API call
  const fetchAIInsights = async () => {
    setAiLoading(true);
    try {
      const dateRange = getDateRangeForAPI();
      const requestBody = {
        userId: userID,
        startDate: dateRange.start,
        endDate: dateRange.end
      };

      const response = await fetch('https://spendify-hub.vercel.app/api/expenseInsights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const insightsData: AIInsight = await response.json();
      setAiInsights(insightsData);
      setAiModalVisible(true);
    } catch (error) {
      console.error('Error fetching AI insights:', error);
      Alert.alert('Error', 'Failed to fetch AI insights. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  // Get date range based on current selection
  const getDateRangeForAPI = () => {
    const currentDate = new Date(selectedDate.replace(/\//g, '-'));
    let startDate: string;
    let endDate: string;

    switch (selectOptions) {
      case 'day':
        startDate = endDate = currentDate.toISOString().split('T')[0];
        break;
      case 'week':
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        startDate = startOfWeek.toISOString().split('T')[0];
        endDate = endOfWeek.toISOString().split('T')[0];
        break;
      case 'month':
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        startDate = startOfMonth.toISOString().split('T')[0];
        endDate = endOfMonth.toISOString().split('T')[0];
        break;
      case 'year':
        const startOfYear = new Date(currentDate.getFullYear(), 0, 1);
        const endOfYear = new Date(currentDate.getFullYear(), 11, 31);
        startDate = startOfYear.toISOString().split('T')[0];
        endDate = endOfYear.toISOString().split('T')[0];
        break;
      default:
        startDate = endDate = currentDate.toISOString().split('T')[0];
    }

    return { start: startDate, end: endDate };
  };

  // Format AI insights into natural language
  const formatInsightsText = (insights: AIInsight) => {
    if (!insights?.insights) return '';

    const { insights: data } = insights;
    const dateRange = `${new Date(insights.dateRange.start).toLocaleDateString()} to ${new Date(insights.dateRange.end).toLocaleDateString()}`;
    
    let text = `📊 Expense Insights for ${dateRange}\n\n`;
    
    // Check if there's no spending data
    if (data.totalSpent === 0 || data.numberOfTransactions === 0) {
      text += `🎉 No Expenses Found!\n\n`;
      text += `• Total amount spent: ₹0.00\n`;
      text += `• Number of transactions: 0\n`;
      text += `• Days in range: ${data.daysInRange}\n`;
      text += `• Days with spending: 0\n\n`;
      text += `💡 Good News:\n`;
      text += `• You had no expenses during this period\n`;
      text += `• This might indicate excellent spending control\n`;
      text += `• Or perhaps you're tracking expenses in a different period\n\n`;
      text += `📅 Suggestion:\n`;
      text += `• Try selecting a different date range to see your spending patterns\n`;
      text += `• Consider if all your expenses are being recorded properly\n`;
      return text;
    }
    
    text += `💰 Overall Spending Summary:\n`;
    text += `• Total amount spent: ₹${data.totalSpent.toFixed(2)}\n`;
    text += `• Number of transactions: ${data.numberOfTransactions}\n`;
    text += `• Average transaction value: ₹${data.averageTransactionValue.toFixed(2)}\n`;
    text += `• You spent money on ${data.uniqueDaysWithSpending} out of ${data.daysInRange} days\n\n`;

    // Handle top categories
    if (data.topCategories && data.topCategories.length > 0) {
      text += `🏆 Top Spending Categories:\n`;
      data.topCategories.forEach((category, index) => {
        const percentage = data.totalSpent > 0 ? ((category.total / data.totalSpent) * 100).toFixed(1) : '0.0';
        text += `${index + 1}. ${category.name}: ₹${category.total.toFixed(2)} (${percentage}%)\n`;
      });
    } else {
      text += `🏆 Top Spending Categories:\n`;
      text += `• No category data available\n`;
    }

    text += `\n💳 Payment Method:\n`;
    text += `• Most used payment method: ${data.mostFrequentExpenseMethod || 'N/A'}\n\n`;

    // Handle highest single expense (can be null)
    if (data.highestSingleExpense && data.highestSingleExpense.category) {
      text += `🎯 Highest Single Expense:\n`;
      text += `• Category: ${data.highestSingleExpense.category}\n`;
      text += `• Amount: ₹${data.highestSingleExpense.amount.toFixed(2)}\n`;
      text += `• Date: ${new Date(data.highestSingleExpense.date).toLocaleDateString()}\n`;
      text += `• Method: ${data.highestSingleExpense.method}\n\n`;
    } else {
      text += `🎯 Highest Single Expense:\n`;
      text += `• No single expense data available\n\n`;
    }

    // Add spending pattern analysis
    const spendingRate = data.daysInRange > 0 ? (data.uniqueDaysWithSpending / data.daysInRange * 100).toFixed(1) : '0.0';
    text += `📈 Spending Pattern:\n`;
    text += `• You had expenses on ${spendingRate}% of days in this period\n`;
    
    if (parseFloat(spendingRate) > 70) {
      text += `• High spending frequency - consider tracking daily expenses more closely\n`;
    } else if (parseFloat(spendingRate) < 30) {
      text += `• Low spending frequency - good control over daily expenses\n`;
    } else {
      text += `• Moderate spending frequency - balanced expense pattern\n`;
    }

    return text;
  };

  const onRefresh = React.useCallback(() => {
    fetchData(selectOptions, selectedDate, true);
  }, [selectOptions, selectedDate, userID]);

  const getFilteredAndFormattedLabels = (labels: string[], period: string): string[] => {
    if (labels.length === 0) return [];

    let interval = 1;

    if (period === 'day' && labels.length > 7) {
      interval = Math.ceil(labels.length / 5);
    } else if (period === 'month' && labels.length > 12) {
      interval = Math.ceil(labels.length / 6);
    } else if (period === 'year' && labels.length > 5) {
      interval = Math.ceil(labels.length / 4);
    }

    return labels.map((label, index) => {
      if (index % interval === 0) {
        const date = new Date(label);
        switch (period) {
          case 'day':
            return `${date.getDate()}/${date.getMonth() + 1}`;
          case 'week':
            return `${date.getDate()}/${date.getMonth() + 1}`;
          case 'month':
            return `${date.toLocaleString('en-US', { month: 'short' })} ${date.getFullYear().toString().slice(2)}`;
          case 'year':
            return date.getFullYear().toString();
          default:
            return label;
        }
      }
      return "";
    });
  };

  const formatData = (expenses: any[], period: string, selectedDate: string) => {
    const groupedData: GroupedData = {};

    expenses.forEach((expense) => {
      const expenseDate = new Date(expense.created_at);
      let key: string;

      switch (period) {
        case 'day':
          key = expenseDate.toISOString().split('T')[0];
          break;
        case 'week':
          const startOfWeek = new Date(expenseDate);
          startOfWeek.setDate(expenseDate.getDate() - expenseDate.getDay());
          key = startOfWeek.toISOString().split('T')[0];
          break;
        case 'month':
          key = `${expenseDate.getFullYear()}-${(expenseDate.getMonth() + 1).toString().padStart(2, '0')}`;
          break;
        case 'year':
          key = `${expenseDate.getFullYear()}`;
          break;
        default:
          key = expenseDate.toISOString().split('T')[0];
      }

      const category = expense.category.name;

      if (!groupedData[key]) {
        groupedData[key] = {};
      }

      if (!groupedData[key][category]) {
        groupedData[key][category] = 0;
      }

      groupedData[key][category] += parseFloat(expense.amount);
    });

    const allKeys = Object.keys(groupedData).sort();

    const lineChartDataValues = allKeys.map((key) =>
      Object.values(groupedData[key]).reduce((a, b) => a + b, 0)
    );

    const processedLineLabels = getFilteredAndFormattedLabels(allKeys, period);

    const lineData: { labels: string[]; datasets: { data: number[] }[] } = {
      labels: processedLineLabels,
      datasets: [{ data: lineChartDataValues }],
    };

    const formattedSelectedDate = (() => {
      if (period === 'day' || period === 'week') {
        return selectedDate.replace(/\//g, '-');
      } else if (period === 'month') {
        return `${selectedDate.split('/')[0]}-${selectedDate.split('/')[1]}`;
      } else if (period === 'year') {
        return selectedDate.split('/')[0];
      }
      return selectedDate;
    })();

    let pieData: { name: string; amount: number; color: string; legendFontColor: string; legendFontSize: number; }[] = [];
    let totalSumForPie = 0;

    if (period === 'week') {
      const weekStart = new Date(formattedSelectedDate);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const aggregatedData: { [category: string]: number } = {};
      Object.keys(groupedData).forEach((dateKey) => {
        const currentDate = new Date(dateKey);
        if (currentDate >= weekStart && currentDate <= weekEnd) {
          Object.entries(groupedData[dateKey]).forEach(([category, amount]) => {
            if (!aggregatedData[category]) {
              aggregatedData[category] = 0;
            }
            aggregatedData[category] += amount;
          });
        }
      });

      pieData = Object.keys(aggregatedData).map((category) => ({
        name: category,
        amount: aggregatedData[category],
        color: getRandomColor(),
        legendFontColor: '#7F7F7F',
        legendFontSize: 15,
      }));
      totalSumForPie = Object.values(aggregatedData).reduce((a, b) => a + b, 0);

    } else {
      const selectedData = groupedData[formattedSelectedDate] || {};
      pieData = Object.entries(selectedData)
        .sort(([, amountA], [, amountB]) => amountB - amountA)
        .map(([category, amount]) => ({
          name: category,
          amount,
          color: getRandomColor(),
          legendFontColor: '#7F7F7F',
          legendFontSize: 15,
        }));
      totalSumForPie = Object.values(selectedData).reduce((a, b) => a + b, 0);
    }

    return {
      pieData,
      totalSum: totalSumForPie,
      lineData,
    };
  };

  const usedColors = new Set();

  const getRandomColor = () => {
    const colors = [
      '#FF66D4', '#FEAE65', '#E6F690', '#AADEA7', '#64C2A6', '#2D87BB',
      '#fd7f6f', '#7eb0d5', '#b2e061', '#bd7ebe', '#ffb55a', '#ffee65',
      '#beb9db', '#fdcce5', '#8bd3c7'
    ];

    const availableColors = colors.filter(color => !usedColors.has(color));

    if (availableColors.length === 0) {
      usedColors.clear();
      availableColors.push(...colors);
    }

    const randomIndex = Math.floor(Math.random() * availableColors.length);
    const selectedColor = availableColors[randomIndex];
    usedColors.add(selectedColor);

    return selectedColor;
  };

  const handleDateChange = (selectedDate: string) => {
    setSelectedDate(selectedDate);
  };

  const handlePrevDay = () => {
    const currentDate = new Date(selectedDate.replace(/\//g, '-'));
    if (selectOptions === 'week') {
      currentDate.setDate(currentDate.getDate() - 7);
    } else if (selectOptions === 'month') {
      currentDate.setMonth(currentDate.getMonth() - 1);
    } else if (selectOptions === 'year') {
      currentDate.setFullYear(currentDate.getFullYear() - 1);
    } else {
      currentDate.setDate(currentDate.getDate() - 1);
    }
    const newDate = currentDate.toISOString().split('T')[0].replace(/-/g, '/');
    setSelectedDate(newDate);
  };

  const handleNextDay = () => {
    const currentDate = new Date(selectedDate.replace(/\//g, '-'));
    if (selectOptions === 'week') {
      currentDate.setDate(currentDate.getDate() + 7);
    } else if (selectOptions === 'month') {
      currentDate.setMonth(currentDate.getMonth() + 1);
    } else if (selectOptions === 'year') {
      currentDate.setFullYear(currentDate.getFullYear() + 1);
    } else {
      currentDate.setDate(currentDate.getDate() + 1);
    }
    const newDate = currentDate.toISOString().split('T')[0].replace(/-/g, '/');
    setSelectedDate(newDate);
  };

  return (
    <View style={styles.container}>
      <TopBar selectOptions={selectOptions} setSelectOptions={setSelectOptions} />
      <DatePickerModal
        openModal={openModal}
        setOpenModal={setOpenModal}
        selectedDate={selectedDate}
        handleDateChange={handleDateChange}
      />
      {
        selectOptions === 'custom' ?
          <CustomDate userID={userID} />
          :
          <ScrollView
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#FEAE65']}
                tintColor="#FEAE65"
                title="Pull to refresh"
                titleColor="#FEAE65"
              />
            }
            showsVerticalScrollIndicator={false}
          >
            <ChartDisplay
              loading={loading}
              isPieData={isPieData}
              data={data}
              selectOptions={selectOptions}
              chartType={chartType}
              setChartType={setChartType}
            />
            <DateNavigation
              handlePrevDay={handlePrevDay}
              handleNextDay={handleNextDay}
              selectedDate={selectedDate}
              setOpenModal={setOpenModal}
            />
          </ScrollView>
      }

      {/* Floating AI Button */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={fetchAIInsights}
        disabled={aiLoading}
      >
        {aiLoading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.aiButtonText}>
           <Ionicons name="sparkles" size={26} color="white" />
          </Text>
        )}
      </TouchableOpacity>

      {/* AI Insights Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={aiModalVisible}
        onRequestClose={() => setAiModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>AI Insights</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setAiModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              {aiInsights ? (
                <Text style={styles.insightsText}>
                  {formatInsightsText(aiInsights)}
                </Text>
              ) : (
                <Text style={styles.noDataText}>No insights available</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default AnalyticsPage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#171223',
    padding: 10,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0ac7b8',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  aiButtonText: {
    fontSize: 24,
    // color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#1E1B2E',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 20,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2640',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContent: {
    padding: 20,
    maxHeight: 400,
  },
  insightsText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 22,
    fontFamily: 'monospace',
  },
  noDataText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
});