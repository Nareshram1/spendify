import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics'; // You'll need to install expo-haptics: expo install expo-haptics

interface DateNavigationProps {
  handlePrevDay: () => void;
  handleNextDay: () => void;
  selectedDate: string;
  setOpenModal: (value: boolean) => void;
}

// Define common colors as constants
const COLORS = {
  primaryGreen: '#0AC4B7', // A slightly softer teal/green
  darkBackground: '#1A1A1A',
  mediumGray: '#333333',
  lightGray: '#555555',
  white: '#FFFFFF',
  pressedOpacity: 0.7, // Slightly stronger feedback than 0.6
};

const DateNavigation: React.FC<DateNavigationProps> = ({
  handlePrevDay,
  handleNextDay,
  selectedDate,
  setOpenModal,
}) => {
  const handlePressIn = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  return (
    <View style={styles.bottomPickerContainer}>
      <Pressable
        onPress={handlePrevDay}
        onPressIn={handlePressIn}
        style={({ pressed }) => [
          styles.iconButton,
          pressed && styles.buttonPressed,
        ]}
        accessibilityLabel="Previous day"
        accessibilityRole="button"
      >
        <Ionicons name="caret-back-outline" size={24} color={COLORS.primaryGreen} />
      </Pressable>

      <Pressable
        onPress={() => setOpenModal(true)}
        onPressIn={handlePressIn}
        style={({ pressed }) => [
          styles.datePickerContainer,
          pressed && styles.buttonPressed, // Apply pressed style to date picker as well
        ]}
        accessibilityLabel="Select date"
        accessibilityRole="button"
      >
        <Text style={styles.datePickerText}>{selectedDate}</Text>
      </Pressable>

      <Pressable
        onPress={handleNextDay}
        onPressIn={handlePressIn}
        style={({ pressed }) => [
          styles.iconButton,
          pressed && styles.buttonPressed,
        ]}
        accessibilityLabel="Next day"
        accessibilityRole="button"
      >
        <Ionicons name="caret-forward-outline" size={24} color={COLORS.primaryGreen} />
      </Pressable>
    </View>
  );
};

// Use React.memo for performance optimization if the component doesn't need to re-render often
export default React.memo(DateNavigation);

const styles = StyleSheet.create({
  bottomPickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.darkBackground,
    paddingVertical: 14, // Slightly more vertical padding
    paddingHorizontal: 16, // Slightly more horizontal padding
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.white, // Lighter shadow for iOS
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 6, // Android elevation for depth
      },
    }),
  },
  iconButton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: COLORS.mediumGray,
    justifyContent: 'center', // Center content
    alignItems: 'center',    // Center content
  },
  buttonPressed: {
    opacity: COLORS.pressedOpacity,
  },
  datePickerContainer: {
    flex: 1, // Allow it to take up available space
    marginHorizontal: 12, // Space between buttons and date
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: COLORS.mediumGray,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
  },
});