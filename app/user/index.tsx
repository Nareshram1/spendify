import React, { useMemo, useRef, useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, Pressable, Button, Modal, Alert } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import { GestureHandlerRootView,ScrollView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../../utils/supabaseClient'; 
import { getValueFor ,deleteValueFor} from '../../utils/secureStore'; 
import { router } from 'expo-router';

type Category = {
  id: number;
  name: string;
  user_id: string;
};

const User = () => {
  const snapPoints = useMemo(() => ['70%','76%'], []);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [userID, setUserID] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  useEffect(() => {
    const checkLoggedIn = async () => {
      const storedEmail = await getValueFor('user_email');
      const storedUserId = await getValueFor('user_id');

      if (!storedEmail && !storedUserId) {
        // Auto-login if user data is stored
        router.replace('/'); // Replace with your home screen route
      }
      if (storedEmail) {
        // may cause bug
        setUserID(storedUserId ?? '');
      }
    };

    checkLoggedIn();
  }, []);

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

    const { error } = await supabase
      .from('expenses')
      .insert([{ amount: parseFloat(amount), category_id: selectedCategory, user_id: userID }]);

    if (error) {
      alert(error.message);
    } else {
      alert('Expense added successfully');
      setAmount('');
      setSelectedCategory(null);
      handleClose();
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
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryToDelete.id);

      if (error) {
        alert(error.message);
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

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor='#171223' />
      <Text style={styles.mainText}>ANALYTICS</Text>
      <Pressable onPress={() => { handleLogOut() }}>
        <Text style={styles.mainText}>LOG OUT</Text>
      </Pressable>

      <GestureHandlerRootView>
        <BottomSheet
          ref={bottomSheetRef}
          backgroundStyle={{ backgroundColor: '#D4D4D4' }}
          snapPoints={snapPoints}
          enablePanDownToClose={true}
          index={-1}
          style={styles.bottomSheetStyle}
          onChange={(index) => setIsBottomSheetOpen(index > -1)}
        >
          <Text style={styles.mainTextBS}>Add Expense</Text>
          
          <View style={{flex:1,justifyContent:'space-evenly'}}>

          <ScrollView horizontal={true} style={{maxHeight:100,padding:10}}>
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
          <TextInput
            style={styles.input2}
            placeholder="Amount"
            placeholderTextColor="white"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
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

      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>Are you sure you want to delete this category?</Text>
            <View style={styles.modalButtons}>
              <Button title="DELETE" onPress={handleDeleteCategory} />
              <Button title="CANCEL" onPress={() => setIsModalVisible(false)} />
            </View>
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
    height:'40%'
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
});
