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
    <View style={styles.container}>
      {/* Previous Day Button */}
      <Pressable
        onPress={handlePrevDay}
        onPressIn={handlePressIn}
        style={({ pressed }) => [
          styles.navigationButton,
          pressed && styles.buttonPressed,
        ]}
        accessibilityLabel="Previous day"
        accessibilityRole="button"
      >
        <Ionicons name="caret-back-outline" size={24} color={COLORS.primaryGreen} />
      </Pressable>

      {/* Date Picker */}
      <Pressable
        onPress={() => setOpenModal(true)}
        onPressIn={handlePressIn}
        style={({ pressed }) => [
          styles.dateDisplay,
          pressed && styles.buttonPressed,
        ]}
        accessibilityLabel="Select date"
        accessibilityRole="button"
      >
        <Text style={styles.dateText}>{selectedDate}</Text>
      </Pressable>

      {/* Next Day Button */}
      <Pressable
        onPress={handleNextDay}
        onPressIn={handlePressIn}
        style={({ pressed }) => [
          styles.navigationButton,
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

export default React.memo(DateNavigation);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20, // More padding for overall separation
    paddingVertical: 15,
    backgroundColor: COLORS.darkBackground, // Still keep a background for the whole strip
    borderRadius: 15, // Slightly more rounded corners
    ...Platform.select({
      ios: {
        shadowColor: COLORS.white,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 5,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  navigationButton: {
    padding: 12, // More padding for a larger touch target
    borderRadius: 10, // Rounded buttons
    backgroundColor: COLORS.mediumGray,
    justifyContent: 'center',
    alignItems: 'center',
    width: 50, // Fixed width for consistent button size
    height: 50, // Fixed height for consistent button size
  },
  dateDisplay: {
    flex: 1, // Allows the date display to take up available space
    marginHorizontal: 15, // Space between buttons and date
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: COLORS.mediumGray,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateText: {
    color: COLORS.white,
    fontSize: 20, // Slightly larger font for prominence
    fontWeight: '700', // Bolder font
  },
  buttonPressed: {
    opacity: COLORS.pressedOpacity,
    // Consider adding a slight scale or color change for more feedback if desired
  },
});