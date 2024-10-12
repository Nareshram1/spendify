import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, FlatList, Modal, Button, Alert } from 'react-native';
import { supabase } from '../../utils/supabaseClient'; // Assuming you have supabase configured

interface Transaction {
  id: number;
  amount: number;
  person_name: string;
  date: string;
  user_id?: string; // Optional user_id field
}

interface LendingsAndBorrowingsPageProp {
  userID: string;
}

const LendingsAndBorrowingsPage: React.FC<LendingsAndBorrowingsPageProp> = ({ userID }) => {
  const [amount, setAmount] = useState<string>('');
  const [personName, setPersonName] = useState<string>('');
  const [type, setType] = useState<'lending' | 'borrowing'>('lending'); // Default to lending
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);

  useEffect(() => {
    fetchTransactions();
  }, [type,userID]); // Update transactions when type changes

  const fetchTransactions = async () => {
    try {
      console.log('---',userID)
      let { data, error } = await supabase
        .from(type === 'lending' ? 'lendings' : 'borrowings')
        .select('*')
        .eq('user_id', userID)
        .order('date', { ascending: false });

      if (error) {
        throw error;
      }

      if (data) {
        setTransactions(data);
      }
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

      if (error) {
        throw error;
      }

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

      if (error) {
        throw error;
      }

      // Remove deleted transaction from the local state
      setTransactions(prevTransactions =>
        prevTransactions.filter(transaction => transaction.id !== transactionId)
      );

    //   Alert.alert('Success', 'Transaction deleted successfully');
    } catch (error) {
      console.error('Error deleting transaction:', error);
      Alert.alert('Error', 'Failed to delete transaction');
    }
  };
  const handleMod=()=>{
    // todo have to add a modification like add extra amount 
  }
  const renderTransactionItem = ({ item }: { item: Transaction }) => (
    <TouchableOpacity
    onLongPress={handleMod}
    >
    <View style={styles.transactionItem}>
      <View style={{width:'10%',flex:1,flexDirection:'row',justifyContent:'space-between',padding:13}}>
        <Text style={styles.listText}>{item.person_name}</Text>
        <Text style={styles.listText}>{item.amount}</Text>
      </View>
      <TouchableOpacity style={styles.deleteButton} onPress={() => deleteTransaction(item.id)}>
        <Text style={styles.deleteButtonText}>Delete</Text>
      </TouchableOpacity>
    </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {
        type=='lending'?
        <Text style={styles.title}>Most Probably won't come</Text>:
      <Text style={styles.title}>Most Probably won't give</Text>
      }
      
      {/* Modal for adding new transaction */}
      <Modal visible={isModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{type === 'lending' ? 'Add Lending' : 'Add Borrowing'}</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter amount"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />
            <TextInput
              style={styles.input}
              placeholder="Enter person's name"
              value={personName}
              onChangeText={setPersonName}
            />
            <View style={styles.modalButtons}>
              <Button title="Cancel" onPress={() => setIsModalVisible(false)} color="red" />
              <Button title="Add" onPress={addTransaction} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Buttons to toggle between lending and borrowing */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={[styles.button, type === 'lending' && styles.activeButton]} onPress={() => setType('lending')}>
          <Text style={styles.buttonText}>Lend</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, type === 'borrowing' && styles.activeButton]} onPress={() => setType('borrowing')}>
          <Text style={styles.buttonText}>Borrow</Text>
        </TouchableOpacity>
      </View>

      {/* List of transactions */}
      <FlatList
        data={transactions}
        renderItem={renderTransactionItem}
        keyExtractor={(item) => item.id.toString()}
        style={styles.transactionList}
        
      />

      {/* Button to add new transaction */}
      <TouchableOpacity style={styles.addButton} onPress={() => setIsModalVisible(true)}>
        <Text style={styles.buttonText}>Add New {type === 'lending' ? 'Lending' : 'Borrowing'}</Text>
      </TouchableOpacity>
    </View>
  );
};

export default LendingsAndBorrowingsPage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#171223',
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 24,
    // fontWeight: 'bold',
    fontFamily:'cool',
    marginBottom: 20,
    color:'white',
    alignSelf:'center'
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#0a95c7',
    borderRadius: 10,
    marginHorizontal: 10,
  },
  activeButton: {
    backgroundColor: '#0ac7b8',
  },
  buttonText: {
    color: '#ffffff',
    // fontWeight: 'bold',
    fontSize: 16,
    fontFamily:'cool',
  },
  transactionList: {
    flexGrow: 1,
    marginTop: 10,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#cccccc',
    color:'white',
    fontFamily:'cool',
  },
  listText:{
    color:'white',
    fontSize:19,
    fontFamily:'cool',
  },
  addButton: {
    backgroundColor: '#0ac7b8',
    paddingVertical: 15,
    alignItems: 'center',
    borderRadius: 10,
    marginTop: 20,
    fontFamily:'cool',
    marginBottom:25,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 20,
    fontFamily:'cool',
  },
  modalTitle: {
    fontSize: 20,
    // fontWeight: 'bold',
    marginBottom: 10,
    fontFamily:'cool',
  },
  input: {
    backgroundColor: '#f2f2f2',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
    fontFamily:'cool',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  deleteButton: {
    backgroundColor: '#ff6347',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 50,
  },
  deleteButtonText: {
    color: '#ffffff',
    // fontWeight: 'bold',
    fontFamily:'cool',

  },
});
