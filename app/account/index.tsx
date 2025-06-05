import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ScrollView,
  SafeAreaView,
  Modal,
  Animated,
  Linking
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { deleteValueFor, getValueFor } from '../../utils/secureStore';
import { router } from 'expo-router';
import {
  fetchUserInfoById,
  logoutUser,
  deleteUserExpenses,
  deleteUserAccount
} from '@/utils/database';

interface UserInfo {
  name: string;
  email: string;
  memberSince: string;
}

function Account(): JSX.Element {
  const [userInfo, setUserInfo] = useState<UserInfo>({
    name: 'Loading...',
    email: 'Loading...',
    memberSince: 'Loading...',
  });
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  useEffect(() => {
    const fetchUserData = async () => {
      const storedUserId = await getValueFor('user_id');
      if (storedUserId) {
        const { data, error } = await fetchUserInfoById(storedUserId);

        if (error) {
          console.error('Error fetching user data:', error);
          Alert.alert('Error', 'Failed to fetch user information.');
        } else if (data) {
          let formattedMemberSince = 'N/A';
          if (data.created_at) {
            const dateObj = new Date(data.created_at);
            const year = dateObj.getFullYear();
            const month = monthNames[dateObj.getMonth()];
            const day = dateObj.getDate();
            formattedMemberSince = `${month} ${day}, ${year}`;
          }

          setUserInfo({
            name: data.name || 'N/A',
            email: data.email || 'N/A',
            memberSince: formattedMemberSince,
          });
        }
      } else {
        router.replace('/');
      }
    };

    fetchUserData();

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleChangePassword = async (): Promise<void> => {
    const url = 'https://spendify-hub.vercel.app/reset-password';
    const supported = await Linking.canOpenURL(url);

    if (supported) {
      await Linking.openURL(url);
      Alert.alert(
        'Password Reset',
        'You will be redirected to our website to change your password. Please follow the instructions there.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert('Error', `Cannot open the URL: ${url}. Please ensure you have a web browser installed.`);
    }
  };

  const handleExportData = (): void => {
    Alert.alert(
      'Export Data',
      'This feature is under development. Soon you will be able to export your expense data.'
    );
  };

  const handleLogOut = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            const { error } = await logoutUser();
            if (error) {
              console.error('Error signing out:', error);
              Alert.alert('Logout Error', 'Could not log out at this time.');
              return;
            }
            await deleteValueFor('user_id');
            await deleteValueFor('user_email');
            router.replace('/');
          }
        }
      ]
    );
  };

  const handleDeleteAccount = (): void => {
    setDeleteModalVisible(true);
  };

  const confirmDeleteAccount = async (): Promise<void> => {
    setDeleteModalVisible(false);
    Alert.alert(
      'Confirm Account Deletion',
      'Deleting your account is a permanent action. All your data will be lost. Are you absolutely sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            const storedUserId = await getValueFor('user_id');
            if (!storedUserId) {
              Alert.alert('Error', 'User ID not found. Cannot delete account.');
              return;
            }

            try {
              const { error: deleteExpensesError } = await deleteUserExpenses(storedUserId);
              if (deleteExpensesError) {
                console.error('Error deleting user expenses:', deleteExpensesError.message);
                Alert.alert('Deletion Error', 'Failed to delete associated expenses. Please try again.');
                return;
              }

              const { error: deleteUserTableError } = await deleteUserAccount(storedUserId);
              if (deleteUserTableError) {
                console.error('Error deleting user from users table:', deleteUserTableError.message);
                Alert.alert('Deletion Error', 'Failed to delete user record. Please try again.');
                return;
              }

              await deleteValueFor('user_id');
              await deleteValueFor('user_email');
              Alert.alert('Account Deleted', 'Your account has been successfully deleted.');
              router.replace('/');
            } catch (error) {
              console.error('Unexpected error during account deletion:', error);
              Alert.alert('Error', 'An unexpected error occurred during account deletion.');
            }
          }
        }
      ]
    );
  };

  const cancelDeleteAccount = (): void => {
    setDeleteModalVisible(false);
  };


  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#171223" />
      <ScrollView contentContainerStyle={styles.container}>
        <Animated.View style={{ opacity: fadeAnim, width: '100%' }}>
          <Text style={styles.header}>Account Management</Text>

          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {userInfo.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
              </Text>
            </View>
          </View>

          {/* User Info */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>User Information</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Name:</Text>
              <Text style={styles.infoValue}>{userInfo.name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{userInfo.email}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Member Since:</Text>
              <Text style={styles.infoValue}>{userInfo.memberSince}</Text>
            </View>
          </View>

          {/* Password */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Change Password</Text>
            <TouchableOpacity style={styles.button} onPress={handleChangePassword}>
              <Ionicons name="key-outline" size={20} color="#171223" />
              <Text style={styles.buttonText}>   Change Password on Web</Text>
            </TouchableOpacity>
          </View>

          {/* Export Data */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Data Management</Text>
            <TouchableOpacity style={styles.button} onPress={handleExportData}>
              <Ionicons name="cloud-download-outline" size={20} color="#171223" />
              <Text style={styles.buttonText}>   Export My Data</Text>
            </TouchableOpacity>
          </View>

          {/* Other Options */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Other Options</Text>
            <TouchableOpacity style={styles.button} onPress={handleLogOut}>
              <Ionicons name="log-out-outline" size={20} color="#171223" />
              <Text style={styles.buttonText}>   Logout</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.deleteButton]} onPress={handleDeleteAccount}>
              <Ionicons name="trash-outline" size={20} color="#fff" />
              <Text style={[styles.buttonText, { color: '#fff' }]}>   Delete Account</Text>
            </TouchableOpacity>
          </View>

          {/* Modal */}
          <Modal animationType="slide" transparent={true} visible={isDeleteModalVisible} onRequestClose={cancelDeleteAccount}>
            <View style={styles.centeredView}>
              <View style={styles.modalView}>
                <Text style={styles.modalText}>Are you sure you want to delete your account?</Text>
                <Text style={styles.modalSubText}>This action cannot be undone.</Text>
                <View style={styles.modalButtonContainer}>
                  <TouchableOpacity style={[styles.modalButton, styles.modalButtonCancel]} onPress={cancelDeleteAccount}>
                    <Text style={styles.buttonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalButton, styles.modalButtonConfirm]} onPress={confirmDeleteAccount}>
                    <Text style={styles.buttonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default Account;

// Stylesheet remains the same
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#171223', // Background color
  },
  container: {
    flexGrow: 1,
    padding: 20,
    alignItems: 'center',
  },
  header: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0ac7b8', // Accent color
    marginBottom: 30,
    marginTop: 20,
    textAlign: 'center',
  },
  section: {
    width: '100%',
    backgroundColor: '#2a203b', // Slightly lighter background for sections
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  sectionHeader: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0ac7b8', // Accent color
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(10, 199, 184, 0.3)', // Semi-transparent accent color
    paddingBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  infoLabel: {
    fontSize: 16,
    color: '#ccc', // Lighter text for labels
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 16,
    color: '#fff', // White text for values
    flexShrink: 1, // Allow text to wrap
    textAlign: 'right',
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#3b2f4c', // Input background
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#fff',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#0ac7b8', // Accent color border
  },
  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: 50,
    backgroundColor: '#0ac7b8',
    borderRadius: 10,
    marginTop: 10,
    shadowColor: '#0ac7b8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 5,
  },
  buttonText: {
    color: '#171223', // Text color matching background
    fontSize: 18,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#e74c3c', // Red color for delete action
    marginTop: 20,
    borderColor: '#c0392b',
    borderWidth: 1,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Semi-transparent background for modal overlay
  },
  modalView: {
    margin: 20,
    backgroundColor: '#2a203b', // Section background for modal
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalText: {
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalSubText: {
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 16,
    color: '#ccc',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  modalButton: {
    borderRadius: 10,
    padding: 15,
    elevation: 2,
    width: '45%',
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#7f8c8d', // Grey for cancel
  },
  modalButtonConfirm: {
    backgroundColor: '#e74c3c', // Red for confirm delete
  },
    avatarContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3b2f4c',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  avatarText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
  },
});