import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, ScrollView, RefreshControl } from 'react-native';
import { supabase } from '@/utils/supabaseClient';
import TopBar from '../components/TopBar';
import DatePickerModal from '../components/DatePickerModal';
import ChartDisplay from '../components/ChartDisplay';
import DateNavigation from '../components/DateNavigation';
import CustomDate from '../components/CustomDates';

interface AnalyticsPageProp {
  userID: string;
}

interface GroupedData {
  [key: string]: {
    [category: string]: number;
  };
}

const AnalyticsPage: React.FC<AnalyticsPageProp> = ({ userID }) => {
  const [selectOptions, setSelectOptions] = useState<string>('day');
  const [chartType, setChartType] = useState<'pie' | 'line'>('pie');
  const [data, setData] = useState<any>({}); // Consider a more specific type for 'data'
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false); // Add refreshing state
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const istOffset = 5.5 * 60 * 60000; // IST offset from UTC
    return new Date(new Date().getTime() + istOffset).toISOString().split('T')[0].replaceAll('-', '/');
  });
  const [openModal, setOpenModal] = useState(false);
  const [isPieData, setIsPieData] = useState(false);

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

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
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
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  // Pull-to-refresh handler
  const onRefresh = React.useCallback(() => {
    fetchData(selectOptions, selectedDate, true);
  }, [selectOptions, selectedDate, userID]);

  /**
   * Helper function to format and filter labels for the line chart's X-axis.
   * This helps prevent label overlapping by skipping some labels.
   * @param labels The original array of date labels.
   * @param period The selected period ('day', 'week', 'month', 'year').
   * @returns An array of formatted labels, with empty strings for skipped labels.
   */
  const getFilteredAndFormattedLabels = (labels: string[], period: string): string[] => {
    if (labels.length === 0) return [];

    let interval = 1; // Default to showing all labels

    // Adjust interval based on the number of labels or period
    if (period === 'day' && labels.length > 7) { // If showing more than a week of daily data
      interval = Math.ceil(labels.length / 5); // Show approx 5 labels
    } else if (period === 'month' && labels.length > 12) { // If showing more than a year of monthly data
        interval = Math.ceil(labels.length / 6); // Show approx 6 labels
    } else if (period === 'year' && labels.length > 5) { // If showing more than 5 years
        interval = Math.ceil(labels.length / 4); // Show approx 4 labels
    }

    return labels.map((label, index) => {
      if (index % interval === 0) {
        // Format label based on period for better readability
        const date = new Date(label);
        switch (period) {
          case 'day':
            return `${date.getDate()}/${date.getMonth() + 1}`; // e.g., 3/6 for June 3rd
          case 'week':
            // For weekly aggregation, labels might already be start-of-week dates
            // You might want to display the week number or just the start date
            return `${date.getDate()}/${date.getMonth() + 1}`;
          case 'month':
            return `${date.toLocaleString('en-US', { month: 'short' })} ${date.getFullYear().toString().slice(2)}`; // e.g., Jun 24
          case 'year':
            return date.getFullYear().toString(); // e.g., 2024
          default:
            return label; // Fallback to original label
        }
      }
      return ""; // Return empty string to skip this label
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

    const allKeys = Object.keys(groupedData).sort(); // Sort keys to ensure correct chronological order

    // Calculate total expenses per key for the line chart dataset
    const lineChartDataValues = allKeys.map((key) =>
      Object.values(groupedData[key]).reduce((a, b) => a + b, 0)
    );

    // Apply filtering and formatting to labels
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
      return selectedDate; // Fallback
    })();

    let pieData: { name: string; amount: number; color: string; legendFontColor: string; legendFontSize: number; }[] = [];
    let totalSumForPie = 0;

    if (period === 'week') {
      const weekStart = new Date(formattedSelectedDate);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Adjust to Sunday (or start of week)
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6); // End of week

      const aggregatedData: { [category: string]: number } = {};
      Object.keys(groupedData).forEach((dateKey) => {
        const currentDate = new Date(dateKey);
        // Compare dates without time part for accurate week range check
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
      lineData, // Use the processed lineData here
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
                colors={['#FEAE65']} // Android
                tintColor="#FEAE65" // iOS
                title="Pull to refresh" // iOS
                titleColor="#FEAE65" // iOS
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
});