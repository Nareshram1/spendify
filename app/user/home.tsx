import React, { useMemo, useRef, useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, Pressable, Button, Modal, BackHandler, Alert, ActivityIndicator } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import { GestureHandlerRootView, ScrollView } from 'react-native-gesture-handler';
import {
  getCategoriesForUser,
  addCategory,
  addExpense,
  deleteExpensesByCategory,
  deleteCategory,
} from '../../utils/database';
import { deleteValueFor } from '../../utils/secureStore'; 
import { router } from 'expo-router';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import DatePicker from 'react-native-modern-datepicker';
import { Audio } from 'expo-av';
import Analytics from './analyticsHome';
import AppBar from './appBar';
import * as Haptics from 'expo-haptics';

type Category = {
  id: number;
  name: string;
  user_id: string;
};

interface UserPageProp {
  userID: string,
  toggleScroll: (value: boolean) => void
}

const User: React.FC<UserPageProp> = ({ userID, toggleScroll }) => {
  const [sound, setSound] = useState();
  const snapPoints = useMemo(() => ['25%', '90%'], []); // Increased height for better UX
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState<boolean | any>(false);
  const [refreshAnalytics, setRefreshAnalytics] = useState<boolean>(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  
  // Validation states
  const [amountError, setAmountError] = useState('');
  const [categoryError, setCategoryError] = useState('');
  
  const [date, setDate] = useState<string>(() => {
    const istOffset = 5.5 * 60 * 60000;
    return new Date(new Date().getTime() + istOffset).toISOString().split('T')[0];
  });
  const [openModal, setOpenModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('upi');
  
  useEffect(() => {
    const backAction = () => {
      if (isBottomSheetOpen) {
        bottomSheetRef.current?.close();
        return true;
      }
      if (openModal) {
        setOpenModal(false);
        return true;
      }
      if (isModalVisible) {
        setIsModalVisible(false);
        return true;
      }
      if (profileModalVisible) {
        setProfileModalVisible(false);
        return true;
      }
      return false;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [isBottomSheetOpen, openModal, isModalVisible, profileModalVisible]);

  async function SuccessPlaySound() {
    // Same pattern: create + auto‐play
    const { sound } = await Audio.Sound.createAsync(
      require('../../assets/audio/success.mp3'),
      { shouldPlay: true }
    );
    //@ts-ignore
    setSound(sound);

    sound.setOnPlaybackStatusUpdate((status) => {
      //@ts-ignore
      if (status.didJustFinish) {
        sound.unloadAsync();
      }
    });
  }

async function ErrorPlaySound() {
  try {
    // 1) Create the Sound and start playing immediately
    const { sound } = await Audio.Sound.createAsync(
      require('../../assets/audio/error.mp3'),
      { shouldPlay: true }
    );
    //@ts-ignore
    setSound(sound);

    // 2) Unload as soon as playback finishes
    sound.setOnPlaybackStatusUpdate((status) => {
      //@ts-ignore
      if (status.didJustFinish) {
        sound.unloadAsync();
      }
    });
  } catch (error) {
    console.log('Error playing error sound:', error);
  }
}


  useEffect(() => {
    return sound
      ? () => {
          //@ts-ignore
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  useEffect(() => {
    const getCategories = async () => {
      setIsLoading(true);
      try {
        const data = await getCategoriesForUser(userID);
        setCategories(data);
      } catch (error: any) {
        Alert.alert('Error', error.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (userID) {
      getCategories();
    }
  }, [userID]);

  useEffect(() => {
    toggleScroll(!isBottomSheetOpen);
  }, [isBottomSheetOpen]);

  // Validation functions
  const validateAmount = (value: string) => {
    const numValue = parseFloat(value);
    if (!value.trim()) {
      setAmountError('Amount is required');
      return false;
    }
    if (isNaN(numValue) || numValue <= 0) {
      setAmountError('Please enter a valid amount greater than 0');
      return false;
    }
    if (numValue > 1000000) {
      setAmountError('Amount seems too large. Please verify.');
      return false;
    }
    setAmountError('');
    return true;
  };

  const validateCategory = () => {
    if (!selectedCategory) {
      setCategoryError('Please select a category');
      return false;
    }
    setCategoryError('');
    return true;
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) {
      Alert.alert('Validation Error', 'Category name cannot be empty');
      return;
    }

    if (newCategory.length > 20) {
      Alert.alert('Validation Error', 'Category name should be less than 20 characters');
      return;
    }

    const existingCategory = categories.find(category => 
      category.name.toLowerCase() === newCategory.toLowerCase()
    );
    
    if (existingCategory) {
      Alert.alert('Category Exists', 'This category already exists');
      return;
    }

    setIsAddingCategory(true);
  try {
    const data = await addCategory(newCategory.trim(), userID);
    setCategories(prev => [...prev, ...data]);
    setNewCategory('');
  } catch (error: any) {
    Alert.alert('Error', error.message);
  } finally {
      setIsAddingCategory(false);
    }
  };

  const handleAddExpense = async () => {
    const isAmountValid = validateAmount(amount);
    const isCategoryValid = validateCategory();

    if (!isAmountValid || !isCategoryValid) {
      await ErrorPlaySound();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsAddingExpense(true);
    try {
      const istOffset = 5.5 * 60 * 60000;
      const currentDate = new Date(new Date().getTime() + istOffset).toISOString().split('T')[0];

      const isCustomDate = date !== currentDate;

      const sendData = {
        amount: parseFloat(amount).toFixed(2),
        category_id: selectedCategory,
        user_id: userID,
        expense_method: paymentMethod,
        expense_date: isCustomDate ? `${date}T10:00:00.000Z` : date,
        created_at: isCustomDate ? `${date}T10:00:00.000Z` : date,
      };

      await addExpense(sendData);

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await SuccessPlaySound();

      setAmount('');
      setSelectedCategory(null);
      setSelectedCategoryName('');
      setAmountError('');
      setCategoryError('');
      setRefreshAnalytics(!refreshAnalytics);
    } catch (error: any) {
      Alert.alert('Error', error.message);
      await ErrorPlaySound();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsAddingExpense(false);
    }
  };


  const handleOpen = () => {
    bottomSheetRef.current?.expand();
    setIsBottomSheetOpen(true);
  };

  const handleClose = () => {
    bottomSheetRef.current?.collapse();
    setIsBottomSheetOpen(false);
  };

  const handleDeleteCategory = async () => {
    if (categoryToDelete) {
      Alert.alert(
        'Delete Category',
        `Are you sure you want to delete "${categoryToDelete.name}"? This will also delete all expenses in this category.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteExpensesByCategory(categoryToDelete.id);
                await deleteCategory(categoryToDelete.id);

                setCategories(prev =>
                  prev.filter(category => category.id !== categoryToDelete.id)
                );
                setCategoryToDelete(null);
                setIsModalVisible(false);
                Alert.alert('Success', 'Category deleted successfully');
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              } catch (error: any) {
                Alert.alert('Error', error.message);
              }
            },
          },
        ]
      );
    }
  };


  const renderCategoryItem = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={[
        styles.categoryPill,
        selectedCategory === item.id && styles.selectedCategoryPill,
      ]}
      onPress={() => {
        setSelectedCategory(item.id);
        setSelectedCategoryName(item.name);
        setCategoryError('');
        Haptics.selectionAsync();
      }}
      onLongPress={() => {
        setCategoryToDelete(item);
        setIsModalVisible(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }}
      activeOpacity={0.7}
    >
      <Text style={styles.categoryText}>{item.name}</Text>

    </TouchableOpacity>
  );

  const renderPaymentMethod = (method: string, icon: any) => (
    <TouchableOpacity 
      style={[
        styles.paymentMethodButton,
        paymentMethod === method && styles.selectedPaymentMethod
      ]}
      onPress={() => {
        setPaymentMethod(method);
        Haptics.selectionAsync();
      }}
      activeOpacity={0.7}
    >
      <Ionicons 
        name={icon} 
        size={24} 
        color={paymentMethod === method ? '#fff' : '#888'} 
      />
      <Text style={[
        styles.paymentMethodText,
        paymentMethod === method && styles.selectedPaymentMethodText
      ]}>
        {method.toUpperCase()}
      </Text>
    </TouchableOpacity>
  );

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
            await deleteValueFor('user_id');
            await deleteValueFor('user_email');
            router.replace('/');
          }
        }
      ]
    );
  };

  const handleDateChange = (selectedDate: string) => {
    setDate(selectedDate);
  };

  const isFormValid = amount && selectedCategory && !amountError && !categoryError;

  return (
    <View style={styles.container}>
      <AppBar setProfileModalVisible={setProfileModalVisible} />

      {!isBottomSheetOpen && (
        <Analytics refresh={refreshAnalytics} />
      )}

      <GestureHandlerRootView>
        <BottomSheet
          ref={bottomSheetRef}
          backgroundStyle={styles.bottomSheetBackground}
          snapPoints={snapPoints}
          enablePanDownToClose={true}
          index={-1}
          style={styles.bottomSheetStyle}
          onChange={(index) => {
            setIsBottomSheetOpen(index > -1);
            if (index === 0) {
              bottomSheetRef.current?.snapToIndex(1);
            }
          }}
        >
          <View style={styles.bottomSheetContent}>
            <View style={styles.bottomSheetHeader}>
              <Text style={styles.mainTextBS}>Add Expense - </Text>
              <Pressable 
                style={styles.dateButton} 
                onPress={() => setOpenModal(true)}
              >
                <Feather name="calendar" size={20} color="white" />
                <Text style={styles.dateButtonText}>{date.replace(/\//g, '-')}</Text>
              </Pressable>
            </View>

            {/* Amount Input */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Amount</Text>
              <View style={[
                styles.amountInputContainer,
                amountError ? styles.inputError : null
              ]}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0.00"
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={(text) => {
                    setAmount(text);
                    validateAmount(text);
                  }}
                  onBlur={() => validateAmount(amount)}
                />
              </View>
              {amountError ? (
                <Text style={styles.errorText}>{amountError}</Text>
              ) : null}
            </View>

            {/* Payment Methods */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Payment Method</Text>
              <View style={styles.paymentMethodsContainer}>
                {renderPaymentMethod('upi', 'phone-portrait-outline')}
                {renderPaymentMethod('cash', 'wallet-outline')}
              </View>
            </View>

            {/* Categories */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Category</Text>
              {isLoading ? (
                <ActivityIndicator color="#0ac7b8" size="small" style={styles.loadingIndicator} />
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScrollView}>
                  <FlatList
                    data={categories}
                    renderItem={renderCategoryItem}
                    keyExtractor={(item) => item.id.toString()}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoryListContent}
                  />
                </ScrollView>
              )}
              {categoryError ? (
                <Text style={styles.errorText}>{categoryError}</Text>
              ) : null}
            </View>

            {/* Add New Category */}
            <View style={styles.newCategoryContainer}>
              <TextInput
                style={styles.newCategoryInput}
                placeholder="Add New Category"
                placeholderTextColor="#666"
                value={newCategory}
                onChangeText={setNewCategory}
                maxLength={20}
              />
              <TouchableOpacity 
                style={[
                  styles.addCategoryButton,
                  isAddingCategory && styles.buttonDisabled
                ]} 
                onPress={handleAddCategory}
                disabled={isAddingCategory}
                activeOpacity={0.7}
              >
                {isAddingCategory ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <MaterialIcons name="add" size={24} color="white" />
                )}
              </TouchableOpacity>
            </View>

            {/* Add Expense Button */}
            <TouchableOpacity 
              style={[
                styles.addExpenseButton,
                !isFormValid && styles.addExpenseButtonDisabled
              ]} 
              onPress={handleAddExpense}
              disabled={!isFormValid || isAddingExpense}
              activeOpacity={0.8}
            >
              {isAddingExpense ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <MaterialIcons name="add-circle-outline" size={24} color="white" />
                  <Text style={styles.buttonText}>Add Expense</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </BottomSheet>
      </GestureHandlerRootView>

      {!isBottomSheetOpen && (
        <Pressable style={styles.AddExpenseButton} onPress={handleOpen}>
          <MaterialIcons name="add-circle-outline" size={24} color="white" />
          <Text style={styles.buttonText}>New Expense</Text>
        </Pressable>
      )}

      {/* Delete Category Modal */}
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <MaterialIcons name="warning" size={48} color="#ff4444" style={styles.warningIcon} />
            <Text style={styles.warningTitle}>Delete Category</Text>
            <Text style={styles.modalText}>
              This will permanently delete "{categoryToDelete?.name}" and all its expenses.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setIsModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton]}
                onPress={handleDeleteCategory}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Profile Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={profileModalVisible}
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Pressable 
              onPress={() => setProfileModalVisible(false)} 
              style={styles.closeModalButton}
            >
              <Ionicons name="close" size={24} color="#666" />
            </Pressable>
            
            <View style={styles.profileContent}>
              <Ionicons name="person-circle" size={64} color="#0ac7b8" />
              <Text style={styles.profileTitle}>Account</Text>
            </View>
                        {/* New "Manage Account" option */}
            <TouchableOpacity
              style={styles.manageAccountButton} // You'll define this style
              onPress={()=>router.push("/account")} 
            >
              <MaterialIcons name="settings" size={20} color="#333" />
              <Text style={styles.manageAccountButtonText}>Manage Account</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogOut}
            >
              <MaterialIcons name="logout" size={20} color="white" />
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Date Picker Modal - UNCHANGED */}
      <Modal visible={openModal} transparent={true} animationType="slide">
        <View style={styles.modalContainer1}>
          <View style={styles.datePickerContent1}>
            <DatePicker
              mode="calendar"
              onSelectedChange={handleDateChange}
              selected={date}
            />
            <Pressable onPress={() => setOpenModal(false)} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default User;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#171223',
  },
  icon: {
    marginHorizontal: 10,
    color: 'black',
    alignSelf: 'flex-end'
  },
  AppNameText: {
    color: 'white',
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: 2,
  },
  AppBar: {
    flex: 1,
    flexDirection: 'row',
    maxHeight: '8%',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8
  },
  AddExpenseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0ac7b8',
    borderRadius: 25,
    paddingVertical: 18,
    marginTop: 15,
    marginBottom: 25,
    marginHorizontal: 20,
    elevation: 8,
    shadowColor: '#0ac7b8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    gap: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 18,
  },
  bottomSheetStyle: {
    padding: 10,
    zIndex: 999,
    backgroundColor: 'rgba(23, 18, 35, 0.95)',
    elevation: 10,
  },
  mainTextBS: {
    color: 'white',
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: 1,
  },
  bottomSheetBackground: {
    backgroundColor: '#1a1529',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  bottomSheetContent: {
    flex: 1,
    padding: 20,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 199, 184, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(10, 199, 184, 0.3)',
    gap: 6,
  },
  dateButtonText: {
    color: '#0ac7b8',
    fontSize: 14,
    fontWeight: '600',
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2438',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  inputError: {
    borderColor: '#ff4444',
  },
  currencySymbol: {
    color: '#0ac7b8',
    fontSize: 24,
    fontWeight: '600',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    color: 'white',
    fontSize: 24,
    fontWeight: '500',
    padding: 0,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  paymentMethodsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
  },
  paymentMethodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    borderRadius: 16,
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  selectedPaymentMethod: {
    backgroundColor: '#0ac7b8',
  },
  paymentMethodText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
  },
  selectedPaymentMethodText: {
    color: 'white',
  },
  categoryScrollView: {
    maxHeight: 120,
  },
  categoryListContent: {
    gap: 8,
    paddingHorizontal: 4,
  },
  categoryPill: {
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    marginHorizontal: 4,
    minWidth: 80,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedCategoryPill: {
    backgroundColor: '#0ac7b8',
    borderColor: '#0ac7b8',
  },
  categoryText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  categoryCheckmark: {
    marginTop: 2,
  },
  loadingIndicator: {
    padding: 20,
  },
  newCategoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  newCategoryInput: {
    flex: 1,
    backgroundColor: '#2a2438',
    borderRadius: 16,
    padding: 16,
    color: 'white',
    fontSize: 16,
  },
  addCategoryButton: {
    backgroundColor: '#0ac7b8',
    borderRadius: 16,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  addExpenseButton: {
    backgroundColor: '#0ac7b8',
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    elevation: 4,
    shadowColor: '#0ac7b8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    // paddingBottom:100,
  },
  addExpenseButtonDisabled: {
    backgroundColor: 'rgba(10, 199, 184, 0.4)',
    elevation: 0,
    shadowOpacity: 0,
    // paddingBottom:50,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 20,
    width: '85%',
    alignItems: 'center',
  },
  warningIcon: {
    marginBottom: 16,
  },
  warningTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  modalText: {
    marginBottom: 24,
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  deleteButton: {
    backgroundColor: '#ff4444',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    width: '85%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  closeModalButton: {
    alignSelf: 'flex-end',
    padding: 8,
  },
  profileContent: {
    alignItems: 'center',
    marginVertical: 20,
  },
  profileTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
  },
   manageAccountButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    // gap: 8,
    marginTop: 20,
  },
  manageAccountButtonText: {
    color: '#333', // Darker text color
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10, // Space between icon and text
  },
  logoutButton: {
    backgroundColor: '#ff4444',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  // Date picker modal styles - UNCHANGED
  modalContainer1: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  datePickerContent1: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 10,
    paddingBottom: 10
  },
  closeButton: {
    backgroundColor: '#0ac7b8',
    padding: 15,
    alignItems: 'center',
    borderRadius: 25,
    marginTop: 20,
    width: '50%',
    alignSelf: 'center'
  },
  closeButtonText: {
    fontWeight: '500',
    fontSize: 17,
    letterSpacing: 2,
  },
});