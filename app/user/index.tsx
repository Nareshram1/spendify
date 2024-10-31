import { StyleSheet, Text, View } from 'react-native'
import React,{useEffect,useState} from 'react'
import User from './home'
import PagerView from 'react-native-pager-view';
import LendingsAndBorrowingsPage from './lent'
import { getValueFor } from '@/utils/secureStore';
import { router } from 'expo-router';
import AnalyticsPage from './analyticsPage';

import { Audio } from 'expo-av';
const mainPage = () => {
  const [sound, setSound] = useState();
  const [userID, setUserID] = useState('');
  const [scroll, setScroll] = useState(true);

  async function BootPlaySound() {
    console.log('Loading Sound');
    const { sound } = await Audio.Sound.createAsync(require('../../assets/audio/booting.mp3')
    );
    //@ts-ignore
    setSound(sound);

    console.log('Playing Sound');
    await sound.playAsync();
  }

  useEffect(() => {
    return sound
      ? () => {
          console.log('Unloading Sound');
          //@ts-ignore
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  const toggleScroll=(value:boolean)=>{
    setScroll(value)
  }
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
    // console.log(date)
    checkLoggedIn();
    const play=async()=>{
      await BootPlaySound();
    }
    play();
  }, []);
  return (
    <View style={styles.container}>
      <PagerView style={styles.container} initialPage={1} scrollEnabled={scroll}>
        {/* Lent first page */}
        <LendingsAndBorrowingsPage userID={userID} />
    
        {/* second page */}
        <User userID={userID} toggleScroll={toggleScroll}/>
        {/* third page */}
        <AnalyticsPage userID={userID}/>
      </PagerView>
    </View>
  );
}

export default mainPage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  page: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});