import React from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator, ScrollView } from 'react-native';
import { PieChart } from 'react-native-chart-kit';

interface ChartDisplayProps {
  loading: boolean;
  isPieData: boolean;
  data: any;
  selectOptions: string;
}

const LegendItem = ({ label }: { label: string }) => (
  <View style={styles.legendItem}>
    <Text style={styles.legendText}>{label}</Text>
  </View>
);

const ChartDisplay: React.FC<ChartDisplayProps> = ({ loading, isPieData, data, selectOptions }) => {
  const renderLegend = () => {
    // Sort pieData by amount in descending order
    const sortedPieData = [...data.pieData].sort((a, b) => b.amount - a.amount);

    return (
      <ScrollView horizontal style={styles.legendContainer}>
        {sortedPieData.map((item: any, index: number) => (
          <LegendItem key={index} label={`${item.name}: ₹${item.amount.toFixed(0)} (${((item.amount / data.totalSum) * 100).toFixed(2)}%)`} />
        ))}
      </ScrollView>
    );
  };

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
                width={Dimensions.get('window').width} // Adjust width here
                height={275} // Adjust height here
                chartConfig={{
                  backgroundColor: '#171223',
                  backgroundGradientFrom: '#171223',
                  backgroundGradientTo: '#171223',
                  color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                }}
                accessor="amount"
                backgroundColor="transparent"
                paddingLeft="20"
                style={styles.chartText}
                absolute
              />
              <Text style={styles.totalExpense}>Total Expense: ₹{data.totalSum.toFixed(0)}</Text>
              {renderLegend()}
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
    fontFamily:'cool',
  },
  totalExpense: {
    color: 'white',
    fontSize: 18,
    marginTop: 10,
    // fontWeight: 'bold',
    fontFamily:'cool',
  },
  noDataText: {
    color: 'white',
    fontSize: 18,
    fontFamily:'cool',
  },
  legendContainer: {
    marginTop: 20,
    maxHeight: 100, 
    // backgroundColor:'red',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 5,
    marginRight: 10,
  },
  legendText: {
    color: 'white',
    fontSize: 15,
    // fontWeight:'bold'
    fontFamily:'cool',
  },
  chartText:{
    // backgroundColor:'red',
    // padding:5,
    borderRadius:5,
    width:'100%'
  },
});
