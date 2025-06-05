// ChartDisplay.tsx
import React from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { PieChart, LineChart } from 'react-native-chart-kit';

interface ChartDisplayProps {
  loading: boolean;
  isPieData: boolean;
  data: {
    pieData?: { name: string; amount: number; color: string; legendFontColor: string; legendFontSize: number; }[];
    lineData?: { labels: string[]; datasets: { data: number[] }[] };
    totalSum: number;
  };
  selectOptions: string;
  chartType: 'pie' | 'line';
  setChartType: (type: 'pie' | 'line') => void;
}

const LegendItem = ({ label, color }: { label: string, color: string }) => (
  <View style={[styles.legendItem, { backgroundColor: color + '20' }]}>
    <View style={[styles.legendDot, { backgroundColor: color }]} />
    <Text style={styles.legendText}>{label}</Text>
  </View>
);

const ChartDisplay: React.FC<ChartDisplayProps> = ({ loading, isPieData, data, selectOptions, chartType, setChartType }) => {
  const renderLegend = () => {
    // Ensure data.pieData exists and is an array before sorting
    const sortedPieData = data.pieData ? [...data.pieData].sort((a, b) => b.amount - a.amount) : [];

    return (
      <ScrollView horizontal style={styles.legendContainer}>
        {sortedPieData.map((item: any, index: number) => (
          <LegendItem
            key={index}
            color={item.color}
            // Keep the full detailed label for the legend
            label={`${item.name}: ₹${item.amount.toFixed(0)} (${((item.amount / data.totalSum) * 100).toFixed(2)}%)`}
          />
        ))}
      </ScrollView>
    );
  };

  const chartConfig = {
    backgroundColor: '#171223',
    backgroundGradientFrom: '#171223',
    backgroundGradientTo: '#171223',
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#ffa726',
    },
  };

  return (
    <View style={styles.chartContainer}>
      {loading ? (
        <ActivityIndicator size="large" color="#fff" />
      ) : (
        <>
          {isPieData ? (
            <>
              <View style={styles.toggleContainer}>
                <TouchableOpacity
                  style={[styles.toggleButton, chartType === 'pie' && styles.activeButton]}
                  onPress={() => setChartType('pie')}
                >
                  <Text style={styles.toggleButtonText}>Category Breakdown</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleButton, chartType === 'line' && styles.activeButton]}
                  onPress={() => setChartType('line')}
                >
                  <Text style={styles.toggleButtonText}>Spending Dynamics</Text>
                </TouchableOpacity>
              </View>

              {chartType === 'pie' ? (
                <>
                  <Text style={styles.chartTitle}>Category wise expense</Text>
                  {data.pieData && data.pieData.length > 0 ? (
                    <PieChart
                      // **THIS IS THE KEY CHANGE:**
                      // Map over the pieData to shorten the 'name' property
                      // This 'name' is what gets displayed directly on the pie slices.
                      data={data.pieData.map(item => ({
                        ...item,
                        // Option 1: Just the category name (most concise)
                        name: item.name,
                        // Option 2: Category name + percentage (if space allows and useful)
                        // name: `${item.name} (${((item.amount / data.totalSum) * 100).toFixed(0)}%)`,
                        // Option 3: Shorten long names if they still squash
                        // name: item.name.length > 10 ? `${item.name.substring(0, 7)}...` : item.name,
                      }))}
                      width={Dimensions.get('window').width - 32}
                      height={250}
                      chartConfig={chartConfig}
                      accessor="amount"
                      backgroundColor="transparent"
                      paddingLeft="15"
                      absolute // Keeps labels outside slices if space is an issue, but inside if possible
                      // You can also consider setting a fixed legendFontSize in chartConfig if you want to explicitly control it
                      // but for on-slice labels, `react-native-chart-kit` manages it based on space.
                    />
                  ) : (
                    <View style={styles.noDataContainer}>
                      <Text style={styles.noDataText}>No pie chart data available.</Text>
                    </View>
                  )}
                  <Text style={styles.totalExpense}>Total Expense: ₹{data.totalSum.toFixed(0)}</Text>
                  {renderLegend()}
                </>
              ) : (
                <>
                  <Text style={styles.chartTitle}>Spending Dynamics Over Time</Text>
                  {data.lineData && data.lineData.labels.length > 0 && data.lineData.datasets[0].data.length > 0 ? (
                    <LineChart
                      data={data.lineData}
                      width={Dimensions.get('window').width - 32}
                      height={250}
                      chartConfig={chartConfig}
                      bezier
                      // style={{ marginLeft: -20, marginRight: -20 }} // Uncomment if line chart labels overlap
                    />
                  ) : (
                    <View style={styles.noDataContainer}>
                      <Text style={styles.noDataText}>No line chart data available.</Text>
                    </View>
                  )}
                </>
              )}
            </>
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No expenses logged for this {selectOptions}.</Text>
              <Text style={styles.noDataSubText}>Try selecting a different date or add a new expense!</Text>
            </View>
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
  toggleContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#2c2c44',
    borderRadius: 10,
  },
  toggleButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
  },
  activeButton: {
    backgroundColor: '#5A4E8E',
  },
  toggleButtonText: {
    color: 'white',
    fontFamily: 'InterSemiBold',
    fontSize: 14,
  },
  chartTitle: {
    color: 'white',
    fontSize: 18,
    marginBottom: 10,
    fontFamily: 'InterBold',
  },
  totalExpense: {
    color: 'white',
    fontSize: 18,
    marginTop: 10,
    fontFamily: 'cool',
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#2c2c44',
    borderRadius: 15,
  },
  noDataText: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'InterSemiBold',
    textAlign: 'center',
  },
  noDataSubText: {
    color: '#a9a9a9',
    fontSize: 14,
    fontFamily: 'InterSemiBold',
    marginTop: 10,
    textAlign: 'center',
  },
  legendContainer: {
    marginTop: 20,
    maxHeight: 100,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginRight: 10,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    color: 'white',
    fontSize: 15,
    fontFamily: 'InterSemiBold',
  },
  chartText: {
    borderRadius: 5,
    width: '100%',
  },
});