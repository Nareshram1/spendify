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
      <View style={styles.pickerView}>

      <Picker
        selectedValue={selectOptions}
        onValueChange={(item) => setSelectOptions(item)}
        style={styles.picker}
        >
        <Picker.Item label="D" value="day" style={styles.pickerText} />
        <Picker.Item label="W" value="week" style={styles.pickerText}/>
        <Picker.Item label="M" value="month" style={styles.pickerText}/>
        <Picker.Item label="Y" value="year" style={styles.pickerText}/>
        <Picker.Item label="C" value="custom" style={styles.pickerText}/>
      </Picker>
        </View>
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
    letterSpacing: 2
  },
  pickerView:{

    width: '50%',
  },
  picker: {
    color: 'white',
    width: '70%',
    marginHorizontal:115,
    backgroundColor:'#D22B2B',
    borderRadius:50,
  },
  pickerText:{
    color:'black',
  },
});
