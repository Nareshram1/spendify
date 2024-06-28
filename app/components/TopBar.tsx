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
      <Ionicons name="flash-outline" size={28} color="white"/>
      <Text style={styles.MainText}>Insights</Text>
      <Picker
        selectedValue={selectOptions}
        onValueChange={(item) => setSelectOptions(item)}
        style={styles.picker}
      >
        <Picker.Item label="Daily" value="day" />
        <Picker.Item label="Weekly" value="week" />
        <Picker.Item label="Monthly" value="month" />
        <Picker.Item label="Yearly" value="year" />
      </Picker>
    </View>
  );
};

export default TopBar;

const styles = StyleSheet.create({
  topBar: {
    padding: 5,
    flexDirection: 'row',
    alignItems: 'center',
    maxHeight: '10%',
    justifyContent: 'space-between'
  },
  MainText: {
    color: 'white',
    fontSize: 24,
    fontFamily: 'cool',
    letterSpacing: 2,
    fontWeight: 'bold',
  },
  picker: {
    color: 'white',
    fontWeight: 'bold',
    width: '50%',
    marginLeft: 50,
    borderColor: 'white',
    // backgroundColor:'red'
  },
});
