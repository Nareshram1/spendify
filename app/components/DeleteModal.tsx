import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Dimensions,
  Pressable
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '@/utils/supabaseClient';

const { width } = Dimensions.get('window');
type Category = {
    id: number;
    name: string;
    user_id: string;
  };
const ExpenseActionModal = ({ 
  visible, 
  expense, 
  onClose, 
  onDelete, 
  onUpdate,
  userID
}:any) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    amount: '',
    category_id: '',
    expense_method: ''
  });

  useEffect(() => {
    if (expense) {
      setFormData({
        amount: expense.amount.toString(),
        category_id: expense.category || '',
        expense_method: expense.expense_method
      });
    }
  }, [expense]);
  useEffect(() => {
    
    const getCategories = async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', userID);

      if (error) {
        alert(error.message);
      } else if (data) {
        setCategories(data);

      }
    };

    if (userID) {
      getCategories();
      console.log("edit data c",categories);
    }
  }, [userID]);
  const handleUpdate = async () => {
    try {
      const updatedExpense = {
        ...expense,
        amount: parseFloat(formData.amount),
        category_id: formData.category_id,
        expense_method: formData.expense_method
      };
      await onUpdate(updatedExpense);
      onClose();
    } catch (error) {
      console.error('Error updating expense:', error);
    }
  };

  const renderViewMode = () => (
    <>
      <Text style={styles.modalTitle}>Expense Details</Text>
      <View style={styles.modalDetails}>
        <View style={styles.modalRow}>
          <Text style={styles.modalLabel}>Amount:</Text>
          <Text style={styles.modalValue}>₹{expense?.amount}</Text>
        </View>
        <View style={styles.modalRow}>
          <Text style={styles.modalLabel}>Category:</Text>
          <Text style={styles.modalValue}>{expense?.category ?? 'Unknown'}</Text>
        </View>
        <View style={styles.modalRow}>
          <Text style={styles.modalLabel}>Method:</Text>
          <Text style={styles.modalValue}>
            {expense?.expense_method === 'upi' ? 'UPI' : 'CASH'}
          </Text>
        </View>
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.editButton} 
          onPress={() => setIsEditMode(true)}
        >
          <Text style={styles.buttonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.deleteButton} 
          onPress={onDelete}
        >
          <Text style={styles.buttonText}>Delete</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity 
        style={styles.cancelButton} 
        onPress={onClose}
      >
        <Text style={styles.buttonText}>Cancel</Text>
      </TouchableOpacity>
    </>
  );

  const renderEditMode = () => (
    <>
      <Text style={styles.modalTitle}>Edit Expense</Text>
      <View style={styles.modalDetails}>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Amount:</Text>
          <TextInput
            style={styles.input}
            value={formData.amount}
            onChangeText={(text) => setFormData({ ...formData, amount: text })}
            keyboardType="numeric"
            placeholder="Enter amount"
          />
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Category:</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.category_id}
              style={styles.picker}
              onValueChange={(value) => {setFormData({ ...formData, category_id: value });console.log("Value",value)}}
            >
              <Picker.Item label="Select a category" value="" />
              {categories.map((category) => (
                <Picker.Item
                  key={category.id}
                  label={category.name}
                  value={category.id}
                />
              ))}
            </Picker>
          </View>
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Method:</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.expense_method}
              style={styles.picker}
              onValueChange={(value) => setFormData({ ...formData, expense_method: value })}
            >
              <Picker.Item label="UPI" value="upi" />
              <Picker.Item label="CASH" value="cash" />
            </Picker>
          </View>
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Date:</Text>
          <Text style={styles.inputLabel}>{new Date(expense.created_at).toISOString().split('T')[0]} (*workin on it)</Text>

              
        </View>
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.saveButton} 
          onPress={handleUpdate}
        >
          <Text style={styles.buttonText}>Save</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.cancelButton} 
          onPress={() => setIsEditMode(false)}
        >
          <Text style={styles.buttonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </>
  );


  return (
    <Modal 
      visible={visible} 
      transparent={true} 
      animationType="slide"
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {isEditMode ? renderEditMode() : renderViewMode()}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.85,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#6A11CB',
    textAlign: 'center',
  },
  modalDetails: {
    width: '100%',
    marginBottom: 20,
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalLabel: {
    color: '#666',
    fontSize: 16,
  },
  modalValue: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    color: '#666',
    fontSize: 16,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'white',
  },
  picker: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  editButton: {
    backgroundColor: '#4ECDC4',
    padding: 12,
    borderRadius: 25,
    width: '48%',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#FF6B6B',
    padding: 12,
    borderRadius: 25,
    width: '48%',
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#4ECDC4',
    padding: 12,
    borderRadius: 25,
    width: '48%',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
    padding: 12,
    borderRadius: 25,
    width: '48%',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default ExpenseActionModal;