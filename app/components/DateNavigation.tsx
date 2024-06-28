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
      <Pressable onPress={handlePrevDay}>
      <Ionicons name="caret-back-outline" size={32} color="white" style={{alignSelf:'center'}}/>
      </Pressable>
      <Pressable style={styles.datePickerContainer} onPress={() => setOpenModal(true)}>
        <Text style={styles.datePickerText}>{selectedDate}</Text>
      </Pressable>
      <Pressable onPress={handleNextDay}>
      <Ionicons name="caret-forward-outline" size={32} color="white" style={{alignSelf:'center'}}/>
      </Pressable>
    </View>
  );
};

export default DateNavigation;

const styles = StyleSheet.create({
  bottomPickerContainer: {
    flex: 1,
    marginBottom: 20,
    width: '100%',
    maxHeight: '10%',
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  arrowText: {
    fontSize: 42,
    color: '#0ac7b8',
  },
  datePickerContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  datePickerText: {
    color: 'white',
    fontSize: 18,
  },
});
