import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  Modal, 
  Alert, 
  SafeAreaView 
} from 'react-native';
import { supabase } from '../../utils/supabaseClient';
import { Ionicons } from '@expo/vector-icons'; // Recommended to install @expo/vector-icons

interface Transaction {
  id: number;
  amount: number;
  person_name: string;
  date: string;
  user_id?: string;
}

interface LendingsAndBorrowingsPageProp {
  userID: string;
}

const LendingsAndBorrowingsPage: React.FC<LendingsAndBorrowingsPageProp> = ({ userID }) => {
  const [amount, setAmount] = useState<string>('');
  const [personName, setPersonName] = useState<string>('');
  const [type, setType] = useState<'lending' | 'borrowing'>('lending');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);

  useEffect(() => {
    fetchTransactions();
  }, [type, userID]);

  const fetchTransactions = async () => {
    try {
      let { data, error } = await supabase
        .from(type === 'lending' ? 'lendings' : 'borrowings')
        .select('*')
        .eq('user_id', userID)
        .order('date', { ascending: false });

      if (error) throw error;
      if (data) setTransactions(data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const addTransaction = async () => {
    if (!amount || !personName) {
      Alert.alert('Error', 'Please enter amount and person name');
      return;
    }

    try {
      const { data, error } = await supabase
        .from(type === 'lending' ? 'lendings' : 'borrowings')
        .insert([{ user_id: userID, amount: parseFloat(amount), person_name: personName }])
        .select("*");

      if (error) throw error;
      if (data) {
        setAmount('');
        setPersonName('');
        setIsModalVisible(false);
        fetchTransactions();
      }
    } catch (error) {
      console.error('Error adding transaction:', error);
      Alert.alert('Error', 'Failed to add transaction');
    }
  };

  const deleteTransaction = async (transactionId: number) => {
    try {
      const { error } = await supabase
        .from(type === 'lending' ? 'lendings' : 'borrowings')
        .delete()
        .eq('id', transactionId)
        .single();

      if (error) throw error;

      setTransactions(prevTransactions =>
        prevTransactions.filter(transaction => transaction.id !== transactionId)
      );
    } catch (error) {
      console.error('Error deleting transaction:', error);
      Alert.alert('Error', 'Failed to delete transaction');
    }
  };

  const renderTransactionItem = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionCard}>
      <View style={styles.transactionContent}>
        <Text style={styles.personName}>{item.person_name}</Text>
        <Text style={styles.amountText}>
          {type === 'lending' ? '+ ' : '- '}
          ${item.amount.toFixed(2)}
        </Text>
      </View>
      <TouchableOpacity 
        style={styles.deleteIconContainer} 
        onPress={() => deleteTransaction(item.id)}
      >
        <Ionicons name="trash-outline" size={24} color="#FF6B6B" />
      </TouchableOpacity>
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
            onPress={() => setType('lending')}
          >
            <Text style={styles.toggleButtonText}>Lend</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.toggleButton, 
              type === 'borrowing' && styles.activeToggleButton
            ]} 
            onPress={() => setType('borrowing')}
          >
            <Text style={styles.toggleButtonText}>Borrow</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={transactions}
          renderItem={renderTransactionItem}
          keyExtractor={(item) => item.id.toString()}
          ListEmptyComponent={
            <View style={styles.emptyListContainer}>
              <Text style={styles.emptyListText}>
                No {type === 'lending' ? 'Lending' : 'Borrowing'} Transactions
              </Text>
            </View>
          }
          contentContainerStyle={styles.flatListContainer}
        />

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
              placeholder="Amount"
              placeholderTextColor="#888"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />
            <TextInput
              style={styles.inputField}
              placeholder="Person's Name"
              placeholderTextColor="#888"
              value={personName}
              onChangeText={setPersonName}
            />
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setIsModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.addButton]} 
                onPress={addTransaction}
              >
                <Text style={styles.modalButtonText}>Add</Text>
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
  gradientBackground: {
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: 20,
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
    color: 'black',
    fontWeight: 'bold',
  },
  flatListContainer: {
    paddingBottom: 20,
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
  },
  personName: {
    color: 'white',
    fontSize: 16,
  },
  amountText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  deleteIconContainer: {
    marginLeft: 10,
  },
  emptyListContainer: {
    alignItems: 'center',
    marginTop: 50,
  },
  emptyListText: {
    color: 'white',
    fontSize: 16,
  },
  addTransactionButton: {
    backgroundColor: '#0ac7b8',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 20,
    marginBottom: 20,
    width:"70%",
    marginHorizontal:"15%"
  },
  addTransactionButtonText: {
    color: 'white',
    marginLeft: 10,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  inputField: {
    width: '100%',
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
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
  addButton: {
    backgroundColor: '#0ac7b8',
  },
  modalButtonText: {
    fontWeight: 'bold',
    color: 'white',
  },
});

export default LendingsAndBorrowingsPage;