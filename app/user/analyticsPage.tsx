import React, { useEffect, useState } from 'react';
import { View, StyleSheet,Text } from 'react-native';
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
let istOffset = 5.5 * 60 * 60000;
const AnalyticsPage: React.FC<AnalyticsPageProp> = ({ userID }) => {
  const [selectOptions, setSelectOptions] = useState<string>('day');
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const istOffset = 5.5 * 60 * 60000; // IST offset from UTC
    return new Date(new Date().getTime() + istOffset).toISOString().split('T')[0].replaceAll('-','/');
});
  // console.log(selectedDate.replaceAll('-','/'))
  const [openModal, setOpenModal] = useState(false);
  const [isPieData, setIsPieData] = useState(false);

  useEffect(() => {
    if (userID) {
      fetchData(selectOptions, selectedDate);
    } else {
      console.log('Invalid userID:', userID);
    }
  }, [userID, selectOptions, selectedDate]);

  const fetchData = async (period: string, date: string) => {
    if (!userID) {
      console.warn('userID is empty or invalid.');
      return;
    }

    setLoading(true);
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
      setLoading(false);
    }
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
          key = `${expenseDate.getFullYear()}-${(expenseDate.getMonth() + 1).toString().padStart(2,'0')}`;
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
      console.log(parseFloat(expense.amount))
  
      groupedData[key][category] += parseFloat(expense.amount);
    });
  
    const labels: string[] = Object.keys(groupedData);
    let lineData: { labels: string[]; datasets: { data: number[] }[] } = {
      labels,
      datasets: [{ data: [] }],
    };
  
    const formattedSelectedDate = (() => {
      if (period === 'day' || period === 'week') {
        return selectedDate.replace(/\//g, '-');
      } else if (period === 'month') {
        console.log('--',selectedDate.split('/')[1])
        // const date = new Date(selectedDate);
        return `${selectedDate.split('/')[0]}-${selectedDate.split('/')[1]}`;
      } else if (period === 'year') {
        return selectedDate.split('/')[0]; // Assuming selectedDate is in format YYYY/MM/DD
      }
      return selectedDate; // Fallback
    })();
    console.log('-/',groupedData)
    console.log(formattedSelectedDate)
    const selectedData = groupedData[formattedSelectedDate] || {};
  
    if (period === 'week') {
      const weekStart = new Date(formattedSelectedDate);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
  
      const aggregatedData: { [category: string]: number } = {};
      Object.keys(groupedData).forEach((date) => {
        const currentDate = new Date(date);
        if (currentDate >= weekStart && currentDate <= weekEnd) {
          Object.entries(groupedData[date]).forEach(([category, amount]) => {
            if (!aggregatedData[category]) {
              aggregatedData[category] = 0;
            }
            aggregatedData[category] += amount;
          });
        }
      });
  
      const pieData = Object.keys(aggregatedData).map((category) => ({
        name: category,
        amount: aggregatedData[category],
        color: getRandomColor(),
        legendFontColor: '#7F7F7F',
        legendFontSize: 15,
      }));
  
      lineData = {
        labels,
        datasets: [{ data: Object.values(groupedData).map((category) => Object.values(category).reduce((a, b) => a + b)) }],
      };
  
      return {
        pieData,
        totalSum: Object.values(aggregatedData).reduce((a, b) => a + b, 0), // Calculate total sum here
        lineData,
      };
    }
  
    const pieData = Object.keys(selectedData).map((category) => ({
      name: category,
      amount: selectedData[category],
      color: getRandomColor(),
      legendFontColor: '#7F7F7F',
      legendFontSize: 15,
    }));
  
    return {
      pieData,
      totalSum: Object.values(selectedData).reduce((a, b) => a + b, 0), // Calculate total sum here
      lineData: {
        labels,
        datasets: [{ data: labels.map((key) => Object.values(groupedData[key]).reduce((a, b) => a + b, 0)) }],
      },
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
        <CustomDate userID={userID}/>
        :
        <View style={styles.container}>
        <ChartDisplay 
        loading={loading} 
        isPieData={isPieData} 
        data={data} 
        selectOptions={selectOptions} 
        />
        <DateNavigation 
        handlePrevDay={handlePrevDay} 
        handleNextDay={handleNextDay} 
        selectedDate={selectedDate} 
        setOpenModal={setOpenModal} 
        // selectOptions={selectOptions} 
        />
        </View>
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
});
