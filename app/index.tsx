import React, { useEffect, useState } from 'react';
import Login from './login';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import FontAwesome from '@expo/vector-icons/FontAwesome';
SplashScreen.preventAutoHideAsync();

export default function Page() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    Kalam: require('../assets/fonts/Kalam-Regular.ttf'),
    cool: require('../assets/fonts/library-3-am.3am.otf'),
    Roboto: require('../assets/fonts/Roboto-Regular.ttf'),
    ...FontAwesome.font,
  });


  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <>
      <StatusBar style="light" backgroundColor='#171223' />
      <Login /> 
    </>
  );
}