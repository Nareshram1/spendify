import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Dimensions,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { getCategoriesForUser } from '@/utils/database';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

type Category = {
  id: string;
  name: string;
  user_id: string;
};

interface ExpenseActionModalProps {
  visible: boolean;
  expense: any; // the selected individual expense
  onClose: () => void;
  onDelete: () => void;
  onUpdate: (updatedExpense: any) => void;
  userID: string;
}

const ExpenseActionModal: React.FC<ExpenseActionModalProps> = ({
  visible,
  expense,
  onClose,
  onDelete,
  onUpdate,
  userID,
}) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState<{
    amount: string;
    category_id: string;
    expense_method: string;
    day: string;
    month: string;
    year: string;
  }>({
    amount: '',
    category_id: '',
    expense_method: '',
    day: '1',
    month: '1',
    year: new Date().getFullYear().toString(),
  });

  const [availableDays, setAvailableDays] = useState<string[]>([]);

  const isLeapYear = (year: number): boolean => {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
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

    if (parseInt(formData.day) > daysInMonth) {
      setFormData((prev) => ({
        ...prev,
        day: daysInMonth.toString(),
      }));
    }
  };

  useEffect(() => {
    if (!expense) {
      setFormData({
        amount: '',
        category_id: '',
        expense_method: '',
        day: '1',
        month: '1',
        year: new Date().getFullYear().toString(),
      });
      setIsEditMode(false);
      return;
    }

    const fetchCategories = async () => {
      try {
        const cats = await getCategoriesForUser(userID);
        setCategories(cats);

        const expenseDate = new Date(expense.created_at);
        const initialMonth = (expenseDate.getUTCMonth() + 1).toString();
        const initialYear = expenseDate.getUTCFullYear().toString();
        const initialDay = expenseDate.getUTCDate().toString();

        updateAvailableDays(initialMonth, initialYear);

        setFormData({
          amount: expense.amount.toString(),
          category_id:
            cats.find((c) => c.name === expense.category)?.id ?? '',
          expense_method: expense.expense_method,
          day: initialDay,
          month: initialMonth,
          year: initialYear,
        });
      } catch (err) {
        console.error('Error in fetchCategories:', err);
        Alert.alert('Error', 'Failed to load categories.');
      }
    };

    if (userID && expense) {
      fetchCategories();
    }
  }, [expense, userID]);

  useEffect(() => {
    updateAvailableDays(formData.month, formData.year);
  }, [formData.month, formData.year]);

  const months = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
  const years = Array.from({ length: 10 }, (_, i) =>
    (new Date().getFullYear() - 5 + i).toString()
  );

  const handleUpdatePress = async () => {
    try {
      if (!formData.amount || isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0) {
        Alert.alert('Invalid Amount', 'Please enter a valid positive amount.');
        return;
      }
      if (!formData.category_id) {
        Alert.alert('Missing Category', 'Please select a category.');
        return;
      }

      const newDate = new Date(
        parseInt(formData.year),
        parseInt(formData.month) - 1,
        parseInt(formData.day)
      );

      if (newDate.getDate() !== parseInt(formData.day) ||
          (newDate.getMonth() + 1) !== parseInt(formData.month) ||
          newDate.getFullYear() !== parseInt(formData.year)) {
            Alert.alert('Invalid Date', 'The selected date is invalid. Please check day, month, and year.');
            return;
          }

      const updatedExpense = {
        ...expense,
        amount: parseFloat(formData.amount),
        category_id: formData.category_id,
        expense_method: formData.expense_method,
        expense_date: newDate.toISOString(),
      };
      await onUpdate(updatedExpense);
    } catch (err) {
      console.error('Error updating expense:', err);
      Alert.alert('Error', 'Failed to update expense. Please try again.');
    }
  };

  const renderViewMode = () => (
    <>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Expense Details</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeIcon}>
          <Ionicons name="close-circle-outline" size={26} color="#B0B0B0" />
        </TouchableOpacity>
      </View>

      <View style={styles.modalDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Amount:</Text>
          <Text style={styles.detailValueAmount}>₹{expense?.amount.toFixed(2)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Category:</Text>
          <Text style={styles.detailValue}>
            {expense?.category ?? 'Unknown'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Method:</Text>
          <Text style={styles.detailValue}>
            {expense?.expense_method.toUpperCase()}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Date:</Text>
          <Text style={styles.detailValue}>
            {new Date(expense?.created_at).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </Text>
        </View>
      </View>

      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity
          style={styles.actionButtonEdit}
          onPress={() => setIsEditMode(true)}
        >
          <Ionicons name="create-outline" size={20} color="white" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButtonDelete} onPress={onDelete}>
          <Ionicons name="trash-outline" size={20} color="white" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderEditMode = () => (
    <>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Edit Expense</Text>
        <TouchableOpacity onPress={() => setIsEditMode(false)} style={styles.closeIcon}>
          <Ionicons name="arrow-back-outline" size={26} color="#B0B0B0" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Amount:</Text>
          <TextInput
            value={formData.amount}
            onChangeText={(text) =>
              setFormData({ ...formData, amount: text.replace(/[^0-9.]/g, '') })
            }
            keyboardType="numeric"
            placeholder="Enter amount"
            placeholderTextColor="#888"
            style={styles.textInput}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Category:</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={formData.category_id}
              onValueChange={(value) =>
                setFormData({ ...formData, category_id: value })
              }
              style={styles.picker}
              itemStyle={styles.pickerItem}
            >
              {categories.length === 0 ? (
                 <Picker.Item label="No categories available" value="" enabled={false} />
              ) : (
                categories.map((cat) => (
                  <Picker.Item
                    key={cat.id}
                    value={cat.id}
                    label={cat.name}
                  />
                ))
              )}
            </Picker>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Method:</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={formData.expense_method}
              onValueChange={(value) =>
                setFormData({ ...formData, expense_method: value })
              }
              style={styles.picker}
              itemStyle={styles.pickerItem}
            >
              <Picker.Item label="UPI" value="upi" />
              <Picker.Item label="Cash" value="cash" />
              <Picker.Item label="Card" value="card" />
            </Picker>
          </View>
        </View>

        {/* --- START OF DATE PICKER UI IMPROVEMENT --- */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Date:</Text>
          {/* Day Picker */}
          <View style={styles.datePickerFullWidth}>
            <Text style={styles.datePickerSubLabel}>Day</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={formData.day}
                onValueChange={(value) =>
                  setFormData({ ...formData, day: value })
                }
                style={styles.picker}
                itemStyle={styles.pickerItem}
              >
                {availableDays.map((d) => (
                  <Picker.Item key={d} label={d} value={d} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Month Picker */}
          <View style={styles.datePickerFullWidth}>
            <Text style={styles.datePickerSubLabel}>Month</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={formData.month}
                onValueChange={(value) =>
                  setFormData({ ...formData, month: value })
                }
                style={styles.picker}
                itemStyle={styles.pickerItem}
              >
                {months.map((m) => (
                  <Picker.Item key={m} label={m} value={m} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Year Picker */}
          <View style={styles.datePickerFullWidth}>
            <Text style={styles.datePickerSubLabel}>Year</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={formData.year}
                onValueChange={(value) =>
                  setFormData({ ...formData, year: value })
                }
                style={styles.picker}
                itemStyle={styles.pickerItem}
              >
                {years.map((y) => (
                  <Picker.Item key={y} label={y} value={y} />
                ))}
              </Picker>
            </View>
          </View>
        </View>
        {/* --- END OF DATE PICKER UI IMPROVEMENT --- */}

      </ScrollView>

      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity
          style={styles.actionButtonSave}
          onPress={handleUpdatePress}
        >
          <Ionicons name="save-outline" size={20} color="white" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Save</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButtonCancel}
          onPress={() => setIsEditMode(false)}
        >
          <Ionicons name="close-outline" size={20} color="white" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            {isEditMode ? renderEditMode() : renderViewMode()}
          </View>
        </TouchableOpacity>
      </KeyboardAvoidingView>
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
    width: width * 0.90,
    backgroundColor: '#2C2C2E',
    borderRadius: 15,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    maxHeight: '90%',
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
  modalDetails: {
    width: '100%',
    marginBottom: 20,
    paddingHorizontal: 5, // Little padding for details
  },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  detailLabel: {
    color: '#B0B0B0',
    fontSize: 16,
    flex: 1,
  },
  detailValue: {
    fontWeight: '600',
    fontSize: 16,
    color: '#FFFFFF',
    flex: 1.5,
    textAlign: 'right',
  },
  detailValueAmount: {
    fontWeight: 'bold',
    fontSize: 18,
    color: '#A9FDD8',
    flex: 1.5,
    textAlign: 'right',
  },

  scrollViewContent: {
    paddingBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    color: '#E0E0E0',
    fontSize: 15,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#1E1E1E',
    color: '#FFFFFF',
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#1E1E1E',
  },
  picker: {
    color: 'white',
    height: 50,
    width: '100%',
  },
  pickerItem: {
    color: 'white',
    fontSize: 16,
  },

  // --- START OF NEW/MODIFIED DATE PICKER STYLES ---
  // Removed datePickerRow and datePickerItem styles as they are replaced
  datePickerFullWidth: { // New style for each stacked picker
    marginBottom: 10, // Space between stacked pickers
  },
  datePickerSubLabel: {
    color: '#B0B0B0',
    fontSize: 13,
    marginBottom: 5,
    textAlign: 'left', // Align label to left
    paddingLeft: 5, // Small padding for label alignment
  },
  // --- END OF NEW/MODIFIED DATE PICKER STYLES ---

  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    paddingHorizontal: 5,
  },
  actionButtonEdit: {
    backgroundColor: '#4ECDC4',
    paddingVertical: 12,
    borderRadius: 25,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  actionButtonDelete: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 12,
    borderRadius: 25,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  actionButtonSave: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 25,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  actionButtonCancel: {
    backgroundColor: '#6c757d',
    paddingVertical: 12,
    borderRadius: 25,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 5,
  },
  buttonIcon: {
    marginRight: 5,
  },
});

export default ExpenseActionModal;