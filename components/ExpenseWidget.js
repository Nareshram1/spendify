import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { openURL } from 'expo-linking';

const ExpenseWidget = ({ widgetSize }) => {
  const handleAddExpense = () => {
    // Deep link to your app with a specific route
    openURL('spendify://add-expense');
  };

  return (
    <View style={{
      flex: 1,
      backgroundColor: '#4CAF50',
      borderRadius: 16,
      padding: 16,
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <TouchableOpacity 
        onPress={handleAddExpense}
        style={{
          backgroundColor: 'white',
          padding: 12,
          borderRadius: 8,
          width: '100%',
          alignItems: 'center'
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#4CAF50' }}>
          + Add Expense
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default ExpenseWidget;