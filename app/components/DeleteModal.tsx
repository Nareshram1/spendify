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
    id: string;
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
    expense_method: '',
    day: '1',
    month: '1',
    year: new Date().getFullYear().toString()
  });
  const [availableDays, setAvailableDays] = useState<string[]>([]);

  // Function to update available days when month or year changes
  const isLeapYear = (year: number): boolean => {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  };
  
  const getDaysInMonth = (month: number, year: number): number => {
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (month === 2 && isLeapYear(year)) {
      return 29;
    }
    return daysInMonth[month - 1];
  };
  const updateAvailableDays = (month: string, year: string) => {
    const daysInMonth = getDaysInMonth(parseInt(month), parseInt(year));
    const newDays = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString());
    setAvailableDays(newDays);
    
    // If current selected day is greater than days in new month, adjust it
    if (parseInt(formData.day) > daysInMonth) {
      setFormData(prev => ({
        ...prev,
        day: daysInMonth.toString()
      }));
    }
  };
  useEffect(() => {
    if(expense)
    {
      const expenseDate = new Date(expense.created_at);
      const initialMonth = (expenseDate.getUTCMonth() + 1).toString();
      const initialYear = expenseDate.getUTCFullYear().toString();
      updateAvailableDays(initialMonth, initialYear);
    }

  }, [expense]);

  useEffect(() => {
    updateAvailableDays(formData.month, formData.year);
  }, [formData.month, formData.year]);
  // // Generate arrays for days, months, and years
  // const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
  const months = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
  const years = Array.from({ length: 10 }, (_, i) => 
    (new Date().getFullYear() - 5 + i).toString()
  );

  // useEffect(() => {
  //   if (expense) {
  //     setFormData({
  //       amount: expense.amount.toString(),
  //       category_id: expense.category || '',
  //       expense_method: expense.expense_method,
        
  //     });
  //   }
  //   console.log("EE.",expense);
  // }, [expense]);
  useEffect(() => {
    
    const getCategories = async () => {
      const { data , error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', userID);

      if (error) {
        alert(error.message);
      } else if (data) {
        setCategories(data);
        const expenseDate = new Date(expense.created_at);
        console.log("\n",expenseDate.getDate())
        setFormData({
          amount: expense.amount.toString(),
          category_id: data.find(category => category.name == expense.category)?.id || '',
          expense_method: expense.expense_method,
          day: expenseDate.getUTCDate().toString(),
          month: (expenseDate.getUTCMonth() + 1).toString(),
          year: expenseDate.getUTCFullYear().toString()
        });
      }
    };

    if (userID) {
      getCategories();
      console.log("edit data c",categories);
    }
    console.log("up ",formData)
  }, [userID,expense]);
  const handleUpdate = async () => {
    try {
      const newDate = new Date(
        parseInt(formData.year),
        parseInt(formData.month) - 1,
        parseInt(formData.day) +1
      );
      console.log("edit date",newDate.toISOString().split('T')[0].replaceAll('-','/'))
      const updatedExpense = {
        ...expense,
        amount: parseFloat(formData.amount),
        category_id: formData.category_id,
        expense_method: formData.expense_method,
        expense_date: newDate.toISOString()
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
        <View style={styles.modalRow}>
          <Text style={styles.modalLabel}>Date:</Text>
          <Text style={styles.modalValue}>
            {new Date(expense?.created_at.split('T')[0]).toLocaleDateString('en-GB') ?? 'UnKnown'}
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
            onChangeText={(text) => {setFormData({ ...formData, amount: text });console.log("Form data",formData)}}
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
      <View style={styles.datePickersContainer}>
        <View style={styles.datePickerWrapper}>
          <Text style={styles.datePickerLabel}>Day</Text>
          <Picker
            selectedValue={formData.day}
            style={styles.datePicker}
            onValueChange={(value) => setFormData({ ...formData, day: value })}
          >
            {availableDays.map((day) => (
              <Picker.Item 
                key={day} 
                label={day.padStart(2, '0')} 
                value={day} 
              />
            ))}
          </Picker>
        </View>
        <View style={styles.datePickerWrapper}>
          <Text style={styles.datePickerLabel}>Month</Text>
          <Picker
            selectedValue={formData.month}
            style={styles.datePicker}
            onValueChange={(value) => setFormData({ ...formData, month: value })}
          >
            {months.map((month) => (
              <Picker.Item 
                key={month} 
                label={new Date(2024, parseInt(month) - 1)
                  .toLocaleString('default', { month: 'long' })} 
                value={month} 
              />
            ))}
          </Picker>
        </View>
        <View style={styles.datePickerWrapper}>
          <Text style={styles.datePickerLabel}>Year</Text>
          <Picker
            selectedValue={formData.year}
            style={styles.datePicker}
            onValueChange={(value) => setFormData({ ...formData, year: value })}
          >
            {years.map((year) => (
              <Picker.Item 
                key={year} 
                label={year}
                value={year}
              />
            ))}
          </Picker>
        </View>
      </View>
    </View>
      </View>
      <View style={styles.actionButtons}>
      <TouchableOpacity 
          style={styles.cancelButton} 
          onPress={() => setIsEditMode(false)}
        >
          <Text style={styles.buttonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.saveButton} 
          onPress={handleUpdate}
        >
          <Text style={styles.buttonText}>Save</Text>
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
  datePickersContainer: {
    width: '100%',
    backgroundColor: '#2C2C2E', // Dark background for container
  },
  datePickerWrapper: {
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#444', // Darker border color
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1E1E1E',
  },
  datePicker: {
    height: 50,
    width: '100%',
    color: 'white',
  },
  datePickerLabel: {
    color: '#E0E0E0', // Lighter text color
    fontSize: 14,
    paddingHorizontal: 10,
    paddingTop: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)', // Darker overlay
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.90,
    backgroundColor: '#2C2C2E', // Dark background for modal
    borderRadius: 15,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#FFFFFF', // White text for title
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
    borderBottomColor: '#444', // Darker border for rows
  },
  modalLabel: {
    color: '#E0E0E0', // Lighter text for labels
    fontSize: 16,
  },
  modalValue: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#FFFFFF', // White text for values
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    color: '#E0E0E0', // Lighter text for input labels
    fontSize: 16,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#444', // Darker border for input
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#1E1E1E', // Dark background for input
    color: '#FFFFFF', // White text for input
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#444', // Darker border for picker
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1E1E1E', // Dark background for picker
  },
  picker: {
    borderWidth: 1,
    borderColor: '#444', // Darker border for picker
    borderRadius: 8,
    color:'white',
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