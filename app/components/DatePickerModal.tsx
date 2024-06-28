import React from 'react';
import { View, Pressable, Text, StyleSheet, Modal } from 'react-native';
import DatePicker from 'react-native-modern-datepicker';

interface DatePickerModalProps {
  openModal: boolean;
  setOpenModal: (value: boolean) => void;
  selectedDate: string;
  handleDateChange: (date: string) => void;
}

const DatePickerModal: React.FC<DatePickerModalProps> = ({ openModal, setOpenModal, selectedDate, handleDateChange }) => {
  return (
    <Modal visible={openModal} transparent={true} animationType="slide">
      <View style={styles.modalContainer}>
        <View style={styles.datePickerContent}>
          <DatePicker mode="calendar" onSelectedChange={handleDateChange} selected={selectedDate} />
          <Pressable onPress={() => setOpenModal(false)} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

export default DatePickerModal;

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  datePickerContent: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 10,
    paddingBottom: 10,
  },
  closeButton: {
    backgroundColor: '#0ac7b8',
    padding: 15,
    alignItems: 'center',
    borderRadius: 25,
    marginTop: 20,
    width: '50%',
    alignSelf: 'center',
  },
  closeButtonText: {
    fontWeight: '500',
    fontSize: 17,
    letterSpacing: 2,
  },
});
