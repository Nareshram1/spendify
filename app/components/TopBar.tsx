import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TopBarProps {
  selectOptions: string;
  setSelectOptions: (value: string) => void;
}

const options = [
  { label: 'Day', value: 'day' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'Year', value: 'year' },
  { label: 'Custom', value: 'custom' },
];

const TopBar: React.FC<TopBarProps> = ({ selectOptions, setSelectOptions }) => {
  const [modalVisible, setModalVisible] = useState(false);

  const handleSelectOption = (value: string) => {
    setSelectOptions(value);
    setModalVisible(false);
  };

  const selectedLabel = options.find(
    (option) => option.value === selectOptions
  )?.label;

  return (
    <View style={styles.topBar}>
      <View style={styles.leftContainer}>
        <Ionicons name="flash-outline" size={26} color="white" />
        <Text style={styles.mainText}>Insights</Text>
      </View>

      <TouchableOpacity
        style={styles.customPickerButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.customPickerButtonText}>{selectedLabel}</Text>
        <Ionicons name="chevron-down" size={18} color="white" />
      </TouchableOpacity>

      <Modal
        animationType="fade" // Or "slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPressOut={() => setModalVisible(false)} // Close modal when tapping outside
        >
          <View style={styles.modalContent}>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => handleSelectOption(item.value)}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      selectOptions === item.value &&
                        styles.modalSelectedItemText,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
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
    // fontFamily: 'cool', // Make sure this font is loaded
  },
  customPickerButton: {
    backgroundColor: '#0ac7b8',
    borderRadius: 30,
    width: 140,
    height: 40,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  customPickerButtonText: {
    color: 'white',
    fontSize: 16,
    marginRight: 5,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Dim background
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 10,
    width: 200, // Adjust width as needed
    maxHeight: '50%', // Limit height for scrollability
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalItem: {
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
  modalItemText: {
    fontSize: 16,
    color: '#333',
  },
  modalSelectedItemText: {
    fontWeight: 'bold',
    color: '#0ac7b8', // Highlight selected item
  },
});