import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  GestureResponderEvent, // For onPress event type
} from 'react-native';

interface BudgetModalProps {
  isVisible: boolean;
  onClose: () => void;
  currentBudget: number;
  onSaveBudget: (newBudget: number) => void;
}

const BudgetInputModal: React.FC<BudgetModalProps> = ({
  isVisible,
  onClose,
  currentBudget,
  onSaveBudget,
}) => {
  const [newBudget, setNewBudget] = useState<string>('');

  const handleSave = () => {
    const budgetValue = parseFloat(newBudget);
    if (isNaN(budgetValue) || budgetValue < 0) {
      Alert.alert('Invalid Input', 'Please enter a valid positive number for the budget.');
      return;
    }
    onSaveBudget(budgetValue);
    setNewBudget(''); // Clear the input field after saving
  };

  const handleCancel = () => {
    setNewBudget(''); // Clear input if modal is dismissed
    onClose();
  };

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose} // Handles Android back button
    >
      <View style={styles.modalOverlay}>
        <View style={styles.budgetInputModal}>
          <Text style={styles.currentBudgetInModal}>Current Budget: ₹{currentBudget.toFixed(2)}</Text>

          <TextInput
            style={styles.budgetInput}
            keyboardType="numeric"
            placeholder="Enter new budget"
            value={newBudget}
            onChangeText={setNewBudget}
            maxLength={10} // Limit input length
          />

          <View style={styles.modalButtonContainer}>
            <Pressable onPress={handleSave} style={[styles.modalButton, styles.saveButton]}>
              <Text style={styles.modalButtonText}>Save Budget</Text>
            </Pressable>
            <Pressable onPress={handleCancel} style={[styles.modalButton, styles.cancelButton]}>
              <Text style={styles.modalButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};


export default BudgetInputModal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  currentBudgetText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Dim background
  },
  budgetInputModal: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#6A11CB',
  },
  currentBudgetInModal: {
    fontSize: 18,
    marginBottom: 20,
    color: '#555',
  },
  budgetInput: {
    width: '100%',
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
    minWidth: 100,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#0ac7b8',
    marginRight: 10,
  },
  cancelButton: {
    backgroundColor: '#A0A0A0',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});