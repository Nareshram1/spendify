import { StyleSheet, Text, View, Alert, TextInput, Button,TouchableOpacity, ScrollView, ToastAndroid } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import React, { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../../utils/supabaseClient';
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import PagerView from 'react-native-pager-view';
import LendingsAndBorrowingsPage from './lent';
import { deleteValueFor, getValueFor, save, saveCategory } from '@/utils/secureStore';
import { router } from 'expo-router';
import AnalyticsPage from './analyticsPage';

import { Audio } from 'expo-av';
import User from './home';

const MainPage = () => {
  const [sound, setSound] = useState();
  const [userID, setUserID] = useState('');
  const [scroll, setScroll] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [refresh, setRefresh] = useState(true);
  const [categories, setCategories] = useState([]);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState<string>(() => {
    const istOffset = 5.5 * 60 * 60000; // IST offset from UTC
    return new Date(new Date().getTime() + istOffset).toISOString().split('T')[0];
});
  async function BootPlaySound() {
    const { sound } = await Audio.Sound.createAsync(require('../../assets/audio/booting.mp3'));
    //@ts-ignore
    setSound(sound);
    await sound.playAsync();
  }
  async function SuccessPlaySound() {
    const { sound } = await Audio.Sound.createAsync(require('../../assets/audio/success.mp3'));
    //@ts-ignore
    setSound(sound);
    await sound.playAsync();
  }

  useEffect(() => {
    //@ts-ignore
    return sound ? () => sound.unloadAsync() : undefined;
  }, [sound]);
  //@ts-ignore
  const toggleScroll = (value) => setScroll(value);

  useEffect(() => {
    const checkLoggedIn = async () => {
      const storedEmail = await getValueFor('user_email');
      const storedUserId = await getValueFor('user_id');
      if (!storedEmail && !storedUserId) {
        router.replace('/'); // Replace with your home screen route
      }
      if (storedEmail) setUserID(storedUserId ?? '');
    };

    const playSound = async () => await BootPlaySound();
    checkLoggedIn();
    playSound();

    const syncCategory = async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .eq('user_id', await getValueFor('user_id'));
      if (error) console.error(error);
      if (data) {
        await saveCategory('categories', data);
        //@ts-ignore
        setCategories(data);
      }
    };

    const loadCategories = async () => {
      const storedCategories = await getValueFor('categories');
      if (storedCategories) {
        setCategories(JSON.parse(storedCategories));
      }
    };

    // Check internet connection and load categories accordingly
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        setIsOffline(false);
        syncCategory();
        syncLocalData();
        
        
      } else {
        setIsOffline(true);
        loadCategories();
      }
    });

    return () => unsubscribe();
  }, []);

  const syncLocalData = async () => {
    try {

      const localData = await getValueFor('expense');
      if (localData) {
        const data = JSON.parse(localData);
        for (const item of data) {
          await supabase.from('expenses')
          .insert([item]);
        }

        await deleteValueFor('expense');
        await SuccessPlaySound();
        alert('Local Data synced.')
        setRefresh(true);
      }
    } catch (error) {
      alert('Error in syncing.')
      console.error('Error syncing data with Supabase:', error);
    }
  };


  return (
    <View style={styles.container}>
      <StatusBar backgroundColor='#171223' />
      {isOffline ? (
              <OfflineUI 
              categories={categories}
              userID={userID}
            />
      ) : (
        
          refresh &&
        <PagerView style={styles.container} initialPage={1} scrollEnabled={scroll}>
          <LendingsAndBorrowingsPage userID={userID} />
          <User userID={userID} toggleScroll={toggleScroll} />
          <AnalyticsPage userID={userID} />
        </PagerView>
        
      )}
    </View>
  );
};

//@ts-ignore
const OfflineUI = ({ categories, userID }) => {
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => {
    const istOffset = 5.5 * 60 * 60000;
    return new Date(new Date().getTime() + istOffset).toISOString().split('T')[0];
  });
  
  const handleSave = async () => {
    try{
      if (parseFloat(amount) <= 0 || !category) {
        Alert.alert(
          "Invalid Input",
          "Please enter a valid amount and select a category.",
          [{ text: "OK" }]
        );
        return;
      }
  
      const expenseData = {
        expense_date: `${date}T10:00:00.000Z`,
        category_id: category,
        amount: parseFloat(amount).toFixed(2),
        expense_method: "upi",
        user_id: userID
      };
      console.log('ed',expenseData);
      const localData = await getValueFor('expense');
      const updatedData = localData ? JSON.parse(localData) : [];
      updatedData.push(expenseData);
      await save('expense', JSON.stringify(updatedData));
      Alert.alert('Saved offline');
    }
    catch (error) {
      console.log('error', error);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.offlineContainer}>
        {/* Offline Status Banner */}
        <View style={styles.offlineBanner}>
          <MaterialIcons name="wifi-off" size={24} color="white" />
          <Text style={styles.offlineText}>You're currently offline</Text>
        </View>

        {/* Main Content Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Add Offline Expense</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Category (Go online to add new)</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={category}
                style={styles.picker}
                onValueChange={setCategory}
                mode="dropdown"
              >
                <Picker.Item label="Select Category" value="" />
                
                {
                  //@ts-ignore
                categories.map((cat) => (
                  <Picker.Item 
                    key={cat.id} 
                    label={cat.name} 
                    value={cat.id}
                    color="#333"
                  />
                ))}
              </Picker>
            </View>

            <Text style={styles.label}>Amount</Text>
            <TextInput
              placeholder="Enter amount"
              style={styles.input}
              onChangeText={setAmount}
              value={amount}
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
          </View>

          <TouchableOpacity 
            style={styles.saveButton}
            onPress={handleSave}
          >
            <MaterialIcons name="save" size={20} color="white" />
            <Text style={styles.saveButtonText}>Save Expense</Text>
          </TouchableOpacity>

          <Text style={styles.syncNote}>
            Your expense will be synced when you're back online
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};


export default MainPage;

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: '#f5f5f5',
  },
  offlineContainer: {
    flex: 1,
    padding: 16,
    backgroundColor:'#171223'
  },
  offlineBanner: {
    backgroundColor: '#ff6b6b',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  offlineText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
  },
  picker: {
    height: 50,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  syncNote: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    marginTop: 16,
    fontStyle: 'italic',
  },
});
