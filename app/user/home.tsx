import React, { useMemo, useRef, useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, Pressable, Button, Modal } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import { GestureHandlerRootView,ScrollView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../../utils/supabaseClient'; 
import { getValueFor ,deleteValueFor} from '../../utils/secureStore'; 
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DatePicker from 'react-native-modern-datepicker';
import Checkbox from 'expo-checkbox';

import Analytics from './analyticsHome';
import AppBar from './appBar';
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
  const snapPoints = useMemo(() => ['78%'], []);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
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
    
    console.log("NOW",new Date())
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
      // // Format the IST time as needed (example: HH:mm:ss)
      // let hours = istTime.getHours().toString().padStart(2, '0');
      // let minutes = istTime.getMinutes().toString().padStart(2, '0');
      // let seconds = istTime.getSeconds().toString().padStart(2, '0');
      // console.log(`${hours}:${minutes}:${seconds}`)
      // return `${hours}:${minutes}:${seconds}`;
  }
  
  // Example usage:
  console.log(`Current IST Time: ${getCurrentISTTime()}`);
  console.log('from g: ',date)

  }, [isBottomSheetOpen])
  const handleAddCategory = async () => {
    if (!newCategory.trim()) {
      alert('Category name cannot be empty');
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
      alert('Please enter an amount and select a category');
      return;
    }
    console.log(date,new Date().toISOString().split('T')[0].replaceAll('-','/'))
    const istOffset = 5.5 * 60 * 60000;
    console.log("DT DB ",date);
    const sendData=(date!=new Date(new Date().getTime() + istOffset).toISOString().split('T')[0].replaceAll('-','/'))?
    { amount: parseFloat(amount), category_id: selectedCategory, user_id: userID,expense_date: `${date}T10:00:00.000Z`,expense_method:paymentMethod,created_at: `${date}T10:00:00.000Z`}
    // To Ask time
    :
    { amount: parseFloat(amount), category_id: selectedCategory, user_id: userID,expense_method:paymentMethod,expense_date:date,created_at:date}
    const { error } = await supabase
      .from('expenses')
      .insert([sendData]);

    if (error) {
      alert(error.message);
    } else {
      alert('Expense added successfully');
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
      }
      else{
        alert('Deleted');
        return;
      }
  
      // delete all data for the category
      const { error: deleteCategoryError } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryToDelete.id);
  
      if (deleteCategoryError) {
        alert(deleteCategoryError.message);
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
      onPress={() => setSelectedCategory(item.id)}
      onLongPress={() => {
        setCategoryToDelete(item);
        setIsModalVisible(true);
      }}
    >
      <Text style={styles.categoryText}>{item.name}</Text>
    </TouchableOpacity>
  );

  const handleLogOut = async () => {
    await deleteValueFor('user_id');
    await deleteValueFor('user_email');
    router.replace('/')
  }

  const handleDateChange = (selectedDate: string) => {
    setDate(selectedDate);
    console.log(date)
  };
  return (
    <View style={styles.container}>
      <StatusBar backgroundColor='#171223' />
  
      <AppBar setProfileModalVisible={setProfileModalVisible}/>
  
      {
      !isBottomSheetOpen &&
      <Analytics refresh={refreshAnalytics}/>
      }
  
      <GestureHandlerRootView>
        <BottomSheet
          ref={bottomSheetRef}
          backgroundStyle={{ backgroundColor: '#D4D4D4' }}
          snapPoints={snapPoints}
          enablePanDownToClose={true}
          index={-1}
          style={[styles.bottomSheetStyle, { zIndex: 999 }]} // Set a high zIndex value
          onChange={(index) => {setIsBottomSheetOpen(index > -1)}}
          
        >
          <View style={{ flex: 1,flexDirection:'row', justifyContent: 'space-evenly',maxHeight:'10%' }}>
          <Text style={styles.mainTextBS}>Add Expense </Text>
          <Pressable style={{alignSelf:'center'}} onPress={()=>{setOpenModal(true)}}>
          <Ionicons name="calendar" size={26} color="black"/>
          </Pressable>
          </View>
          <View style={{ flex: 1, justifyContent: 'space-evenly' }}>
  
            <ScrollView horizontal={true} style={{ maxHeight: 100, padding: 10 }}>
              <View style={styles.categoryList}>
                <FlatList
                  data={categories}
                  renderItem={renderCategoryItem}
                  keyExtractor={(item) => item.id.toString()}
                  horizontal
                  showsHorizontalScrollIndicator={true}
                  contentContainerStyle={styles.categoryList}
                />
              </View>
            </ScrollView>
            <View style={styles.newCategoryContainer}>
              <TextInput
                style={styles.input1}
                placeholder="New Category"
                placeholderTextColor="white"
                value={newCategory}
                onChangeText={setNewCategory}
              />
              <TouchableOpacity style={styles.addCategoryButton} onPress={handleAddCategory}>
                <Text style={styles.addCategoryButtonText}>+</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Checkbox
                    style={styles.checkbox}
                    value={paymentMethod === 'upi'}
                    onValueChange={() => setPaymentMethod('upi')}
                    color={paymentMethod === 'upi' ? '#4630EB' : undefined}
                  />
                  <Text style={styles.paragraph}>Upi</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Checkbox
                    style={styles.checkbox}
                    value={paymentMethod === 'cash'}
                    onValueChange={() => setPaymentMethod('cash')}
                    color={paymentMethod === 'cash' ? '#4630EB' : undefined}
                  />
                  <Text style={styles.paragraph}>cash</Text>
                </View>
              </View>

            <TextInput
              style={styles.input2}
              placeholder="Amount"
              placeholderTextColor="white"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
              onPress={()=>{}}
            />
          </View>
          <TouchableOpacity style={styles.addExpenseButton} onPress={handleAddExpense}>
            <Text style={styles.buttonText}>Add Expense</Text>
          </TouchableOpacity>
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
            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                // handle change password
              }}
            >
              <Text style={styles.textStyle}>Change Password</Text>
            </TouchableOpacity>
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
    fontFamily:'Kalam',
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
    fontWeight: 'bold',
    letterSpacing: 2,
    fontSize: 20,
  },
  bottomSheetStyle: {
    padding: 20,
    zIndex:999
  },
  mainText: {
    color: 'white',
    fontSize: 30,
    fontWeight: 'bold',
    letterSpacing: 2,
    alignSelf:'center'
  },
  mainTextBS: {
    color: 'black',
    fontSize: 30,
    fontWeight: 'bold',
    letterSpacing: 2,
    alignSelf:'center'
  },
  categoryList: {

  },
  categoryPill: {
    borderRadius: 20,
    backgroundColor: '#706098',
    padding: 20,
    maxHeight:60,
    margin:5
  },
  selectedCategoryPill: {
    backgroundColor: '#0ac7b8',
  },
  categoryText: {
    color: 'white',
    letterSpacing:2,
    fontSize:12,
    fontWeight:'900'
  },
  newCategoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  input2: {
    backgroundColor: '#706098',
    borderRadius: 10,
    padding: 10,
    color: 'white',
    letterSpacing: 2,
    fontSize: 16,
    height:80
  },
  input1: {
    backgroundColor: '#706098',
    borderRadius: 10,
    padding: 10,
    color: 'white',
    letterSpacing: 2,
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
    marginLeft: 10,
  },
  addCategoryButtonText: {
    fontSize: 30,
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
    fontWeight: 'bold',
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
  },
  checkbox: {
    margin: 8,
  },
});
