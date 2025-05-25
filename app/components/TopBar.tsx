import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';

interface TopBarProps {
  selectOptions: string;
  setSelectOptions: (value: string) => void;
}

const TopBar: React.FC<TopBarProps> = ({ selectOptions, setSelectOptions }) => {
  return (
    <View style={styles.topBar}>
      <View style={styles.leftContainer}>
        <Ionicons name="flash-outline" size={26} color="white" />
        <Text style={styles.mainText}>Insights</Text>
      </View>

      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={selectOptions}
          onValueChange={(itemValue) => setSelectOptions(itemValue)}
          style={styles.picker}
          dropdownIconColor="white"
        >
          <Picker.Item label="Day" value="day" />
          <Picker.Item label="Week" value="week" />
          <Picker.Item label="Month" value="month" />
          <Picker.Item label="Year" value="year" />
          <Picker.Item label="Custom" value="custom" />
        </Picker>
      </View>
    </View>
  );
};

export default TopBar;

const styles = StyleSheet.create({
  topBar: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#171223',
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mainText: {
    color: 'white',
    fontSize: 24,
    fontWeight: '600',
    marginLeft: 8,
    letterSpacing: 1,
    fontFamily: 'cool',
  },
  pickerWrapper: {
    backgroundColor: '#D22B2B',
    borderRadius: 30,
    overflow: 'hidden',
    width: 140,
    height: 40,
    justifyContent: 'center',
  },
  picker: {
    color: 'white',
    width: '100%',
    height: '100%',
    paddingHorizontal: 10,
  },
});