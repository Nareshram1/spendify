import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DateNavigationProps {
  handlePrevDay: () => void;
  handleNextDay: () => void;
  selectedDate: string;
  setOpenModal: (value: boolean) => void;
}

const DateNavigation: React.FC<DateNavigationProps> = ({ handlePrevDay, handleNextDay, selectedDate, setOpenModal }) => {
  return (
    <View style={styles.bottomPickerContainer}>
      <Pressable style={({ pressed }) => [styles.iconButton, pressed && styles.buttonPressed]} onPress={handlePrevDay}>
        <Ionicons name="caret-back-outline" size={24} color="#0ac7b8" />
      </Pressable>
      <Pressable style={styles.datePickerContainer} onPress={() => setOpenModal(true)}>
        <Text style={styles.datePickerText}>{selectedDate}</Text>
      </Pressable>
      <Pressable style={({ pressed }) => [styles.iconButton, pressed && styles.buttonPressed]} onPress={handleNextDay}>
        <Ionicons name="caret-forward-outline" size={24} color="#0ac7b8" />
      </Pressable>
    </View>
  );
};

export default DateNavigation;

const styles = StyleSheet.create({
  bottomPickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  iconButton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  buttonPressed: {
    opacity: 0.6,
  },
  datePickerContainer: {
    padding: 10,
    backgroundColor: '#333',
    borderRadius: 8,
  },
  datePickerText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});