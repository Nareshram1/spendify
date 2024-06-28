import React from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { PieChart } from 'react-native-chart-kit';

interface ChartDisplayProps {
  loading: boolean;
  isPieData: boolean;
  data: any;
  selectOptions: string;
}

const ChartDisplay: React.FC<ChartDisplayProps> = ({ loading, isPieData, data, selectOptions }) => {
  return (
    <View style={styles.chartContainer}>
      {loading ? (
        <ActivityIndicator size="large" color="#fff" />
      ) : (
        <>
          {isPieData ? (
            <>
              <Text style={styles.chartTitle}>Category wise</Text>
              <PieChart
                data={data.pieData}
                width={Dimensions.get('window').width - 16}
                height={220}
                chartConfig={{
                  backgroundColor: '#171223',
                  backgroundGradientFrom: '#171223',
                  backgroundGradientTo: '#171223',
                  color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                }}
                accessor="amount"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
              />
              <Text style={styles.totalExpense}>Total Expense: ₹{data.totalSum.toFixed(2)}</Text>
            </>
          ) : (
            <Text style={styles.noDataText}>No Data on this {selectOptions}</Text>
          )}
        </>
      )}
    </View>
  );
};

export default ChartDisplay;

const styles = StyleSheet.create({
  chartContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartTitle: {
    color: 'white',
    fontSize: 18,
    marginBottom: 10,
  },
  totalExpense: {
    color: 'white',
    fontSize: 18,
    marginTop: 10,
    fontWeight:'bold'
  },
  noDataText: {
    color: 'white',
    fontSize: 18,
  },
});
