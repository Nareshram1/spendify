import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  Modal, 
  Alert, 
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Keyboard
} from 'react-native';
import {
  fetchTransactions as fetchTransactionsFromDB,
  addTransaction as addTransactionToDB,
  deleteTransaction as deleteTransactionFromDB,
} from '../../utils/database';
import { Ionicons } from '@expo/vector-icons';

interface Transaction {
  id: number;
  amount: number;
  person_name: string;
  date: string;
  user_id?: string;
  description?: string;
}

interface LendingsAndBorrowingsPageProp {
  userID: string;
}

const LendingsAndBorrowingsPage: React.FC<LendingsAndBorrowingsPageProp> = ({ userID }) => {
  const [amount, setAmount] = useState<string>('');
  const [personName, setPersonName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [type, setType] = useState<'lending' | 'borrowing'>('lending');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isAddingTransaction, setIsAddingTransaction] = useState<boolean>(false);

  useEffect(() => {
    fetchTransactions();
  }, [type, userID]);

  const fetchTransactions = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setIsLoading(true);
      const data = await fetchTransactionsFromDB(userID, type);
      setTransactions(data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [type, userID]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchTransactions(false);
  }, [fetchTransactions]);

  const handleTypeChange = (newType: 'lending' | 'borrowing') => {
    if (newType !== type) {
      setType(newType);
      setIsLoading(true);
    }
  };

  const validateInput = (): boolean => {
    if (!amount.trim()) {
      Alert.alert('Validation Error', 'Please enter an amount');
      return false;
    }
    
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid positive amount');
      return false;
    }
    
    if (!personName.trim()) {
      Alert.alert('Validation Error', 'Please enter person\'s name');
      return false;
    }
    
    return true;
  };

const addTransaction = async () => {
  if (!validateInput()) return;

  try {
    setIsAddingTransaction(true);
    Keyboard.dismiss();

    const transactionData = {
      amount: parseFloat(amount),
      person_name: personName.trim(),
      description: description.trim() ? description.trim() : undefined,
    };

    await addTransactionToDB(userID, type, transactionData);
    setAmount('');
    setPersonName('');
    setDescription('');
    setIsModalVisible(false);
    await fetchTransactions(false);
  } catch (error) {
    console.error('Error adding transaction:', error);
  } finally {
    setIsAddingTransaction(false);
  }
};


const deleteTransaction = async (transactionId: number, personName: string) => {
  Alert.alert(
    'Confirm Delete',
    `Are you sure you want to delete the transaction with ${personName}?`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTransactionFromDB(type, transactionId);
            setTransactions(prev =>
              prev.filter(transaction => transaction.id !== transactionId)
            );
            Alert.alert('Success', 'Transaction deleted successfully');
          } catch (error) {
            console.error('Error deleting transaction:', error);
            Alert.alert('Error', 'Failed to delete transaction');
          }
        },
      },
    ]
  );
};


  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getTotalAmount = (): number => {
    return transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  };

  const renderTransactionItem = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionCard}>
      <View style={styles.transactionContent}>
        <View style={styles.transactionInfo}>
          <Text style={styles.personName}>{item.person_name}</Text>
          {item.description && (
            <Text style={styles.descriptionText}>{item.description}</Text>
          )}
          <Text style={styles.dateText}>{formatDate(item.date)}</Text>
        </View>
        <View style={styles.amountContainer}>
          <Text style={[
            styles.amountText,
            { color: type === 'lending' ? '#4CAF50' : '#FF6B6B' }
          ]}>
            {type === 'lending' ? '+' : '-'}₹{item.amount.toFixed(2)}
          </Text>
        </View>
      </View>
      <TouchableOpacity 
        style={styles.deleteIconContainer} 
        onPress={() => deleteTransaction(item.id, item.person_name)}
      >
        <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
      </TouchableOpacity>
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#0ac7b8" />
      <Text style={styles.loadingText}>Loading transactions...</Text>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyListContainer}>
      <Ionicons 
        name={type === 'lending' ? 'cash-outline' : 'card-outline'} 
        size={64} 
        color="rgba(255,255,255,0.3)" 
      />
      <Text style={styles.emptyListText}>
        No {type === 'lending' ? 'lending' : 'borrowing'} transactions yet
      </Text>
      <Text style={styles.emptyListSubtext}>
        Tap the button below to add your first transaction
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>
        {type === 'lending' ? 'Money You Lent' : 'Money You Borrowed'}
      </Text>

      <View style={styles.toggleContainer}>
        <TouchableOpacity 
          style={[
            styles.toggleButton, 
            type === 'lending' && styles.activeToggleButton
          ]} 
          onPress={() => handleTypeChange('lending')}
        >
          <Text style={[
            styles.toggleButtonText,
            type === 'lending' && styles.activeToggleButtonText
          ]}>Lend</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[
            styles.toggleButton, 
            type === 'borrowing' && styles.activeToggleButton
          ]} 
          onPress={() => handleTypeChange('borrowing')}
        >
          <Text style={[
            styles.toggleButtonText,
            type === 'borrowing' && styles.activeToggleButtonText
          ]}>Borrow</Text>
        </TouchableOpacity>
      </View>

      {/* Total Amount Summary */}
      {transactions.length > 0 && (
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryLabel}>
            Total {type === 'lending' ? 'Lent' : 'Borrowed'}:
          </Text>
          <Text style={[
            styles.summaryAmount,
            { color: type === 'lending' ? '#4CAF50' : '#FF6B6B' }
          ]}>
            ₹{getTotalAmount().toFixed(2)}
          </Text>
        </View>
      )}

      {isLoading ? (
        renderLoadingState()
      ) : (
        <FlatList
          data={transactions}
          renderItem={renderTransactionItem}
          keyExtractor={(item) => item.id.toString()}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={styles.flatListContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={['#0ac7b8']}
              tintColor="#0ac7b8"
            />
          }
        />
      )}

      <TouchableOpacity 
        style={styles.addTransactionButton} 
        onPress={() => setIsModalVisible(true)}
      >
        <Ionicons name="add-circle" size={24} color="white" />
        <Text style={styles.addTransactionButtonText}>
          Add {type === 'lending' ? 'Lending' : 'Borrowing'}
        </Text>
      </TouchableOpacity>

      <Modal 
        visible={isModalVisible} 
        transparent={true} 
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {type === 'lending' ? 'Add Lending' : 'Add Borrowing'}
            </Text>
            
            <TextInput
              style={styles.inputField}
              placeholder="Amount (₹)"
              placeholderTextColor="#888"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
              editable={!isAddingTransaction}
            />
            
            <TextInput
              style={styles.inputField}
              placeholder="Person's Name"
              placeholderTextColor="#888"
              value={personName}
              onChangeText={setPersonName}
              editable={!isAddingTransaction}
            />
            
            <TextInput
              style={[styles.inputField, styles.descriptionInput]}
              placeholder="Description (optional)"
              placeholderTextColor="#888"
              value={description}
              onChangeText={setDescription}
              multiline={true}
              numberOfLines={3}
              textAlignVertical="top"
              editable={!isAddingTransaction}
            />
            
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setIsModalVisible(false)}
                disabled={isAddingTransaction}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.addButton]} 
                onPress={addTransaction}
                disabled={isAddingTransaction}
              >
                {isAddingTransaction ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.modalButtonText}>Add</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#171223',
    padding: 10,
  },
  headerTitle: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    padding: 5,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeToggleButton: {
    backgroundColor: 'white',
  },
  toggleButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  activeToggleButtonText: {
    color: 'black',
  },
  summaryContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  summaryAmount: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    marginTop: 10,
    fontSize: 16,
  },
  flatListContainer: {
    paddingBottom: 20,
    flexGrow: 1,
  },
  transactionCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    marginBottom: 10,
  },
  transactionContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionInfo: {
    flex: 1,
  },
  personName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  descriptionText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 2,
  },
  dateText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 4,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  deleteIconContainer: {
    marginLeft: 15,
    padding: 5,
  },
  emptyListContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyListText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 15,
    textAlign: 'center',
  },
  emptyListSubtext: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginTop: 5,
    textAlign: 'center',
  },
  addTransactionButton: {
    backgroundColor: '#0ac7b8',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 20,
    marginBottom: 20,
    width: "70%",
    marginHorizontal: "15%",
  },
  addTransactionButtonText: {
    color: 'white',
    marginLeft: 10,
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  inputField: {
    width: '100%',
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  descriptionInput: {
    height: 80,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#E0E0E0',
  },
  cancelButtonText: {
    fontWeight: 'bold',
    color: '#666',
  },
  addButton: {
    backgroundColor: '#0ac7b8',
  },
  modalButtonText: {
    fontWeight: 'bold',
    color: 'white',
  },
});

export default LendingsAndBorrowingsPage;