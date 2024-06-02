import React, { useMemo, useRef, useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, Pressable } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../../utils/supabaseClient'; // Ensure you have a supabaseClient.js file for your Supabase instance
import { getValueFor } from '../../utils/secureStore'; // Assuming you have a secure store setup
import { router } from 'expo-router';

type Category = {
  id: number;
  name: string;
  user_id: string;
};

const User = () => {
  const snapPoints = useMemo(() => ['70%'], []);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [userID, setUserID] = useState('');

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

  const renderCategoryItem = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={[
        styles.categoryPill,
        selectedCategory === item.id && styles.selectedCategoryPill,
      ]}
      onPress={() => setSelectedCategory(item.id)}
    >
      <Text style={styles.categoryText}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor='#171223' />
      <Text style={styles.mainText}>ANALYTICS</Text>

      <GestureHandlerRootView>
        <BottomSheet
          ref={bottomSheetRef}
          backgroundStyle={{ backgroundColor: 'gray' }}
          snapPoints={snapPoints}
          enablePanDownToClose={true}
          index={-1}
          style={styles.bottomSheetStyle}
          onChange={(index) => setIsBottomSheetOpen(index > -1)}
        >
          <Text style={styles.mainText}>Add Expense</Text>
          
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

  categoryList: {
    // backgroundColor:'red',
    flex:1,
    maxHeight:178,
    flexWrap:'wrap',
    justifyContent:'space-evenly',
    paddingTop:10,
    paddingHorizontal:0
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
    height:'20%'

  },
  input1: {
    backgroundColor: '#706098',
    borderRadius: 10,
    padding: 10,
    color: 'white',
    letterSpacing: 2,
    fontSize: 16,
    width:'80%'
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
});
