import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Dimensions,
  Alert,
} from 'react-native';
import { ExpenseService, type Expense } from '@/utils/database'; // Adjust path
import ExpenseActionModal from './ExpenseActionModal'; // Re-use your existing action modal
import { Ionicons } from '@expo/vector-icons'; // Changed import for Expo

const { width } = Dimensions.get('window');

interface IndividualExpensesModalProps {
  visible: boolean;
  category: string;
  individualExpenses: Expense[];
  onClose: () => void;
  onRefresh: () => void; // Callback to refresh data in AnalyticsHome
  userID: string;
}

const IndividualExpensesModal: React.FC<IndividualExpensesModalProps> = ({
  visible,
  category,
  individualExpenses,
  onClose,
  onRefresh,
  userID,
}) => {
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isActionModalVisible, setIsActionModalVisible] = useState(false);
  const [currentIndividualExpenses, setCurrentIndividualExpenses] =
    useState<Expense[]>(individualExpenses);

  // Update currentIndividualExpenses when prop changes from parent
  useEffect(() => {
    setCurrentIndividualExpenses(individualExpenses);
  }, [individualExpenses]);

  const handleEdit = (expense: Expense) => {
    setSelectedExpense(expense);
    setIsActionModalVisible(true);
  };

  const handleDelete = async () => {
    if (selectedExpense) {
      Alert.alert(
        'Delete Expense',
        `Are you sure you want to delete the expense of ₹${selectedExpense.amount.toFixed(2)}?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Delete',
            onPress: async () => {
              const success = await ExpenseService.deleteExpense(selectedExpense.id);
              if (success) {
                setCurrentIndividualExpenses(prevExpenses =>
                  prevExpenses.filter(exp => exp.id !== selectedExpense.id)
                );
                setIsActionModalVisible(false);
                setSelectedExpense(null);
                onRefresh(); // Refresh parent component's data (AnalyticsHome)
                Alert.alert('Success', 'Expense deleted successfully!');
              } else {
                Alert.alert('Error', 'Failed to delete expense. Please try again.');
              }
            },
            style: 'destructive',
          },
        ],
        { cancelable: true }
      );
    }
  };

  const handleUpdate = async (updatedExpense: Expense) => {
    const success = await ExpenseService.updateExpense(updatedExpense.id, {
      amount: updatedExpense.amount,
      category_id: updatedExpense.category_id,
      expense_method: updatedExpense.expense_method,
      expense_date: updatedExpense.created_at, // Use created_at or new date field if available
    });

    if (success) {
      // Update the local state with the modified expense
      setCurrentIndividualExpenses(prevExpenses =>
        prevExpenses.map(exp => (exp.id === updatedExpense.id ? updatedExpense : exp))
      );
      setIsActionModalVisible(false);
      setSelectedExpense(null);
      onRefresh(); // Refresh parent component's data (AnalyticsHome)
      Alert.alert('Success', 'Expense updated successfully!');
    } else {
      Alert.alert('Error', 'Failed to update expense. Please try again.');
    }
  };

  const handleCloseActionModal = () => {
    setIsActionModalVisible(false);
    setSelectedExpense(null);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Expenses for {category}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeIcon}>
              {/* Used Ionicons directly */}
              <Ionicons name="close-circle-outline" size={26} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {currentIndividualExpenses.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              {/* Used Ionicons directly */}
              <Ionicons name="information-circle-outline" size={50} color="#E0E0E0" />
              <Text style={styles.noExpensesText}>No individual expenses found for this category.</Text>
              <Text style={styles.noExpensesSubText}>Start adding expenses to see them here!</Text>
            </View>
          ) : (
            <FlatList
              data={currentIndividualExpenses}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.listItem} onPress={() => handleEdit(item)}>
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemAmount}>₹{item.amount.toFixed(2)}</Text>
                    <Text style={styles.itemMethod}>{item.expense_method.toUpperCase()}</Text>
                  </View>
                  <View style={styles.itemDateContainer}>
                    <Text style={styles.itemDate}>
                      {new Date(item.created_at).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Text>
                    {/* Used Ionicons directly */}
                    <Ionicons name="chevron-forward-outline" size={24} color="#999" />
                  </View>
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.flatListContent}
            />
          )}
        </View>
      </TouchableOpacity>

      <ExpenseActionModal
        visible={isActionModalVisible}
        expense={selectedExpense}
        onClose={handleCloseActionModal}
        onDelete={handleDelete}
        onUpdate={handleUpdate}
        userID={userID}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.9,
    backgroundColor: '#2C2C2E',
    borderRadius: 15,
    padding: 20,
    maxHeight: '80%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'left',
  },
  closeIcon: {
    padding: 5,
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  noExpensesText: {
    color: '#E0E0E0',
    textAlign: 'center',
    marginTop: 15,
    fontSize: 16,
  },
  noExpensesSubText: {
    color: '#B0B0B0',
    textAlign: 'center',
    marginTop: 5,
    fontSize: 14,
  },
  flatListContent: {
    paddingBottom: 10,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
    backgroundColor: '#3A3A3C',
    borderRadius: 10,
    marginBottom: 8,
  },
  itemDetails: {
    flex: 2,
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  itemAmount: {
    color: '#A9FDD8',
    fontSize: 18,
    fontWeight: 'bold',
  },
  itemMethod: {
    color: '#B0B0B0',
    fontSize: 13,
    marginTop: 2,
  },
  itemDateContainer: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  itemDate: {
    color: '#E0E0E0',
    fontSize: 14,
    marginRight: 5,
  },
});

export default IndividualExpensesModal;