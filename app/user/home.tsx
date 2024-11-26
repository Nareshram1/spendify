import React, { useMemo, useRef, useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, Pressable, Button, Modal } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import { GestureHandlerRootView,ScrollView } from 'react-native-gesture-handler';
import { supabase } from '../../utils/supabaseClient'; 
import { deleteValueFor} from '../../utils/secureStore'; 
import { router } from 'expo-router';
import { Ionicons,Feather } from '@expo/vector-icons';
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
interface UserPageProp{
    userID:string,
    toggleScroll:(value:boolean)=>void
}
// let istOffset = 5.5 * 60 * 60000;
const User:React.FC<UserPageProp> = ({userID,toggleScroll}) => {
  const [sound, setSound] = useState();
  const snapPoints = useMemo(() => ['25%','78%'], []);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedCategoryName,setSelectedCategoryName] = useState<String>('');
  const [amount, setAmount] = useState('');
//   const [userID, setUserID] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState<Boolean|any>(false);
  const [refreshAnalytics, setRefreshAnalytics] = useState<Boolean>(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [date, setDate] = useState<string>(() => {
    const istOffset = 5.5 * 60 * 60000; // IST offset from UTC
    return new Date(new Date().getTime() + istOffset).toISOString().split('T')[0];
});
  const [openModal, setOpenModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('upi');
  
  // const [active, setActive] = React.useState('');
  async function SuccessPlaySound() {
    const { sound } = await Audio.Sound.createAsync(require('../../assets/audio/success.mp3')
    );
    //@ts-ignore
    setSound(sound);

    await sound.playAsync();
  }
  async function ErrorPlaySound() {
    console.log('Loading Sound');
    const { sound } = await Audio.Sound.createAsync(require('../../assets/audio/error.mp3')
    );
    //@ts-ignore
    setSound(sound);

    await sound.playAsync();
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
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', userID);

      if (error) {
        alert(error.message);
      } else if (data) {
        setCategories(data);
      }
    };

    if (userID) {
      getCategories();
    }
  }, [userID]);
  useEffect(() => {
    if(isBottomSheetOpen)
      {
        toggleScroll(false)
      }
      else
      toggleScroll(true)

    function getCurrentISTTime() {
      // Create a new Date object for current time in UTC
      let now = new Date();
  
      // UTC time offset in milliseconds
      let utcOffset = now.getTimezoneOffset() * 60000;
  
      // Indian Standard Time (IST) offset from UTC (UTC+5:30)
      let istOffset = 5.5 * 60 * 60000; // Convert 5 hours 30 minutes to milliseconds
  
      // Calculate IST time
      let istTime = new Date(now.getTime() + istOffset);
      return istTime.toISOString().split('T')[0]
  }
  

  }, [isBottomSheetOpen])
  const handleAddCategory = async () => {
    if (!newCategory.trim()) {
      alert('Category name cannot be empty');
      return;
    }
      // Check if the category already exists (case insensitive)
    const existingCategory = categories.find(category => 
      category.name.toLowerCase() === newCategory.toLowerCase()
    );

    if (existingCategory) {
      alert('Category already exists');
      return;
    }
    const { data, error } = await supabase
      .from('categories')
      .insert([{ name: newCategory, user_id: userID }])
      .select("*");
    if (error) {
      alert(error.message);
    } else if (data) {
      // Dynamically update the categories state
      setCategories(prevCategories => [...prevCategories, ...data]);
      setNewCategory('');
    }
  };


  const handleAddExpense = async () => {
    if (!amount.trim() || !selectedCategory) {
      await ErrorPlaySound();
      alert('Please enter an amount or select a category');
      return;
    }
    if(parseFloat(amount)<=0.0)
    {
      await ErrorPlaySound();
      alert(`Really ${amount} rupee on ${selectedCategoryName}`);
      return;
    }
    // const formatedAmount=
    console.log(date,new Date().toISOString().split('T')[0].replaceAll('-','/'))
    const istOffset = 5.5 * 60 * 60000;
    const sendData=(date!=new Date(new Date().getTime() + istOffset).toISOString().split('T')[0].replaceAll('-','/'))?
    { amount: parseFloat(amount).toFixed(2), category_id: selectedCategory, user_id: userID,expense_date: `${date}T10:00:00.000Z`,expense_method:paymentMethod,created_at: `${date}T10:00:00.000Z`}
    // To Ask time
    :
    { amount: parseFloat(amount).toFixed(2), category_id: selectedCategory, user_id: userID,expense_method:paymentMethod,expense_date:date,created_at:date}
    const { error } = await supabase
      .from('expenses')
      .insert([sendData]);

    if (error) {
      await ErrorPlaySound();
      alert(error.message);

    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
      await SuccessPlaySound();
      // alert('Expense added successfully');
      setAmount('');
      setSelectedCategory(null);
      // handleClose(); Issue 2: Fixed
      setRefreshAnalytics(!refreshAnalytics);
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
      // Delete related expenses first
      const { error: deleteExpensesError } = await supabase
        .from('expenses')
        .delete()
        .eq('category_id', categoryToDelete.id);
  
      if (deleteExpensesError) {
        alert(deleteExpensesError.message);
        return;
      }
      else{
        alert('Deleted');
        // return;
      }
  
      // delete all data for the category
      const { data,error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryToDelete.id)
        .select();
  
      if (error) {
        alert(error);
      } else {
        setCategories(categories.filter(category => category.id !== categoryToDelete.id));
        setCategoryToDelete(null);
        setIsModalVisible(false);
      }
    }
  };
  

  const renderCategoryItem = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={[
        styles.categoryPill,
        selectedCategory === item.id && styles.selectedCategoryPill,
      ]}
      onPress={() => {
        setSelectedCategory(item.id)
        setSelectedCategoryName(item.name);
      }}
      onLongPress={() => {
        setCategoryToDelete(item);
        setIsModalVisible(true);
      }}
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
      onPress={() => setPaymentMethod(method)}
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
    await deleteValueFor('user_id');
    await deleteValueFor('user_email');
    router.replace('/')
  }

  const handleDateChange = (selectedDate: string) => {
    setDate(selectedDate);
  };
  
  return (
    <View style={styles.container}>
      
  
      <AppBar setProfileModalVisible={setProfileModalVisible}/>
  
      {
      !isBottomSheetOpen &&
      <Analytics refresh={refreshAnalytics}/>
      }
  
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
              // Quick add mode
              bottomSheetRef.current?.snapToIndex(1);
            }
          }}
        >
          <View style={styles.bottomSheetContent}>
            <View style={styles.bottomSheetHeader}>
              <Text style={styles.mainTextBS}>Amount</Text>
              <Pressable 
                style={styles.dateButton} 
                onPress={() => setOpenModal(true)}
              >
                <Feather name="calendar" size={24} color="white" />
                <Text style={styles.dateButtonText}>{date.replace(/\//g, '-')}</Text>
              </Pressable>
            </View>

            <View style={styles.amountInputContainer}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                placeholderTextColor="#666"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
              />
            </View>

            <View style={styles.paymentMethodsContainer}>
              {renderPaymentMethod('upi', 'phone-portrait-outline')}
              {renderPaymentMethod('cash', 'wallet-outline')}
            </View>

            <View style={styles.categoriesSection}>
              <Text style={styles.sectionTitle}>Categories</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.categoryList}>
                  <FlatList
                    data={categories}
                    renderItem={renderCategoryItem}
                    keyExtractor={(item) => item.id.toString()}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoryListContent}
                  />
                </View>
              </ScrollView>
            </View>

            <View style={styles.newCategoryContainer}>
              <TextInput
                style={styles.newCategoryInput}
                placeholder="Add New Category"
                placeholderTextColor="#666"
                value={newCategory}
                onChangeText={setNewCategory}
              />
              <TouchableOpacity 
                style={styles.addCategoryButton} 
                onPress={handleAddCategory}
              >
                <Text style={styles.addCategoryButtonText}>+</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[
                styles.addExpenseButton,
                (!amount || !selectedCategory) && styles.addExpenseButtonDisabled
              ]} 
              onPress={handleAddExpense}
              disabled={!amount || !selectedCategory}
            >
              <Text style={styles.buttonText}>Add Expense</Text>
            </TouchableOpacity>
          </View>
        </BottomSheet>
      </GestureHandlerRootView>
  
      {!isBottomSheetOpen && (
        <Pressable style={styles.AddExpenseButton} onPress={handleOpen}>
          <Text style={styles.buttonText}>Add New Expense</Text>
        </Pressable>
      )}

      {/* Modals */}
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={{color:'red',fontSize:24,fontWeight:900,letterSpacing:2}}>WARNING!</Text>
            <Text style={styles.modalText}>This will also delete all DATA of this category.</Text>
            <View style={styles.modalButtons}>
              <Button title="DELETE" onPress={handleDeleteCategory} color={'red'} />
              <Button title="CANCEL" onPress={() => setIsModalVisible(false)} />
            </View>
          </View>
        </View>
      </Modal>
  
      <Modal
        animationType="slide"
        transparent={true}
        visible={profileModalVisible}
        onRequestClose={() => {
          setProfileModalVisible(!profileModalVisible);
        }}
      >
  
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Pressable onPress={() => { setProfileModalVisible(false) }} style={{ alignSelf: 'flex-end' }}>
              <Ionicons name="close" size={32} color="white" style={styles.icon} />
            </Pressable>
            {/* <TouchableOpacity
              style={styles.button}
              onPress={() => {
                // handle change password
              }}
            >
              <Text style={styles.textStyle}>Change Password</Text>
            </TouchableOpacity> */}
            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                // handle logout
                handleLogOut()
              }}
            >
              <Text style={styles.textStyle}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
    color:'black',
    alignSelf:'flex-end'
  },
  AppNameText:{
    // fontFamily:'cool',
    color:'white',
    fontSize:30,
    fontWeight:'700',
    letterSpacing:2,
  },
  AppBar:{
    flex:1,
    flexDirection:'row',
    maxHeight:'8%',
    alignItems:'center',
    justifyContent:'space-between',
    padding:8
  },
  AddExpenseButton: {
    backgroundColor: '#0ac7b8',
    borderRadius: 25,
    paddingVertical: 15,
    marginTop: 15,
    alignItems: 'center',
    marginBottom: 20,
    marginHorizontal: 50,
  },
  buttonText: {
    color: 'white',
    // fontWeight: '500',
    fontFamily:'cool',
    letterSpacing: 2,
    fontSize: 20,
  },
  bottomSheetStyle: {
    padding: 10,
    zIndex:999,
    backgroundColor:'rgba(23, 18, 35, 0.95)',
    
  },
  mainText: {
    color: 'white',
    fontSize: 30,
    // fontWeight: 'bold',
    letterSpacing: 2,
    alignSelf:'center',
    fontFamily:'cool',
  },
  mainTextBS: {
    color: 'white',
    fontSize: 20,
    // fontWeight: 'bold',
    letterSpacing: 2,
    alignSelf:'center',
    fontFamily:'cool',
  },
  categoryList: {
    width:'100%'
  },
  categoryPill: {
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    marginHorizontal: 4,
  },
  selectedCategoryPill: {
    backgroundColor: '#0ac7b8',
  },
  categoryText: {
    color: 'white',
    letterSpacing:2,
    fontSize:12,
    // fontWeight:'900'
    fontFamily:'cool',
  },
  newCategoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  input2: {
    backgroundColor: '#333',
    borderRadius: 10,
    padding: 10,
    color: 'white',
    letterSpacing: 2,
    fontSize: 16,
    fontFamily:'cool',
    height:80
  },
  input1: {
    backgroundColor: '#333',
    borderRadius: 10,
    padding: 10,
    color: 'white',
    letterSpacing: 2,
    fontFamily:'cool',
    fontSize: 16,
    width:'80%',
    height:80
  },
  addCategoryButton: {
    backgroundColor: '#0ac7b8',
    borderRadius: 50,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addCategoryButtonText: {
    fontSize: 29,
    color: 'white',

  },
  addExpenseButton: {
    backgroundColor: '#0ac7b8',
    borderRadius: 25,
    paddingVertical: 15,
    alignItems: 'center',
    marginVertical: 10,
    width: '100%',
    marginBottom:33
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },
  modalText: {
    marginBottom: 20,
    fontSize: 18,
    textAlign: 'center',
    fontFamily:'cool',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },


  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  button: {
    borderRadius: 20,
    padding: 10,
    elevation: 2,
    marginVertical: 10,
    backgroundColor:'#706098'
  },
  textStyle: {
    color: 'white',
    // fontWeight: 'bold',
    fontFamily:'cool',
    textAlign: 'center',
    fontSize:20
  },
  datePickerContent: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 10,
    paddingBottom:10
  },
  modalContainer1: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  datePickerContent1: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 10,
    paddingBottom:10
  },

  closeButton: {
    backgroundColor: '#0ac7b8',
    padding: 15,
    alignItems: 'center',
    borderRadius: 25,
    marginTop:20,
    width:'50%',
    alignSelf:'center'
  },
  closeButtonText: {
    fontWeight: '500',
    fontSize: 17,
    letterSpacing: 2,
  },
  paragraph: {
    fontSize: 15,
    fontFamily:'cool',
    color: 'white', 
  },
  checkbox: {
    margin: 8,
    color: '#0ac7b8'
  },
  bottomSheetBackground: {
    backgroundColor: 'rgba(23, 18, 35, 0.1)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 8,
    borderRadius: 12,
    gap: 8,
  },
  dateButtonText: {
    color: 'white',
    fontFamily: 'cool',
    fontSize: 16,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  currencySymbol: {
    color: '#0ac7b8',
    fontSize: 24,
    fontFamily: 'cool',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    color: 'white',
    fontSize: 24,
    fontFamily: 'cool',
    padding: 0,
  },
  paymentMethodsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  paymentMethodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 12,
    borderRadius: 12,
    gap: 8,
    minWidth: 120,
    justifyContent: 'center',
  },
  selectedPaymentMethod: {
    backgroundColor: '#0ac7b8',
  },
  paymentMethodText: {
    color: '#888',
    fontFamily: 'cool',
    fontSize: 14,
  },
  selectedPaymentMethodText: {
    color: 'white',
  },
  categoriesSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: 'white',
    fontFamily: 'cool',
    fontSize: 20,
    marginBottom: 12,
  },
  categoryListContent: {
    gap: 8,
    paddingHorizontal: 4,
  },
  newCategoryInput: {
    flex: 1,
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 16,
    color: 'white',
    fontSize: 16,
    marginRight: 12,
  },
  addExpenseButtonDisabled: {
    backgroundColor: 'rgba(10, 199, 184, 0.5)',
  },
});
