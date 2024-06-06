import { StyleSheet, Text, View, Image, TextInput, TouchableOpacity,Pressable } from 'react-native'
import React, { useState,useEffect } from 'react'
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '../utils/supabaseClient';
import { save, getValueFor, deleteValueFor } from '../utils/secureStore';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
 
    // Auto Login
    useEffect(() => {
      const checkLoggedIn = async () => {
        const storedEmail = await getValueFor('user_email');
        const storedUserId = await getValueFor('user_id');
  
        if (storedEmail && storedUserId) {
          // Auto-login if user data is stored
          router.replace('/user'); // Replace 'Home' with your home screen component
        }
      };
  
      checkLoggedIn();
    }, []);
    // type User={
    //   email:string,
    //   user_id:string
    // }
    const handleLogin = async () => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  
      if (error) {
        alert(error.message);
      } else {
        const {user} = data;
        await save('user_email', user.email ?? '');
        await save('user_id', user.id);
        router.replace('/user'); // Replace 'Home' with your home screen component
      }
    };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor='#171223'/>
      {/* Top IlLustration */}
      <Image
        style={styles.image}
        source={require('../assets/images/login_b.png')}
      />
        
      <Text style={styles.mainText}>Login</Text>
      <Text style={styles.secondaryText}>Please sign in to continue</Text>
      
      {/* Form */}
      <View style={styles.formContainer}>
        {/* Email */}
        <View style={[styles.inputContainer, emailFocused && styles.inputContainerFocused]}>
          <Ionicons name="mail" size={24} color="white" style={styles.icon} />
          <TextInput
            style={[styles.input, emailFocused && styles.inputFocused]}
            placeholder="Email"
            placeholderTextColor="white" 
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
            onChangeText={setEmail}
            value={email}
          />
        </View>
        {/* Password */}
        <View style={[styles.inputContainer, passwordFocused && styles.inputContainerFocused]}>
          <Ionicons name="lock-closed" size={24} color="white" style={styles.icon} />
          <TextInput
            style={[styles.input, passwordFocused && styles.inputFocused]}
            placeholder="Password"
            placeholderTextColor="white" 
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            onChangeText={setPassword}
            value={password}
            secureTextEntry
          />
        </View>
        {/* Login Button */}
        <TouchableOpacity style={styles.loginButton} onPress={()=>{handleLogin()}}>
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>
        {/* Forgot Password Text */}
        <TouchableOpacity>
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>
      </View>

      {/* Sign Up Link */}
      {/* <TouchableOpacity style={styles.signUpLink} onPress={handleSignUpRoute}> */}
        <Pressable onPress={() => router.push('/signup')}>
        <Text style={styles.signUpText}>Don't have an account? Sign Up</Text>
        </Pressable>
      {/* </TouchableOpacity> */}
    </View>
  )
}

export default Login;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#171223',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40
  },
  image: {
    width: 250,
    height: 250,
  }, 
  mainText: {
    color: 'white',
    fontSize: 30,
    fontWeight: 'bold',
    alignSelf: 'flex-start',
    letterSpacing: 2
  },
  secondaryText: {
    color: 'gray',
    fontSize: 10,
    fontWeight: 'bold',
    alignSelf: 'flex-start',
    marginTop: 15,
    letterSpacing: 2,
  },
  formContainer: {
    width: '100%',
    marginTop: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#706098',
    borderRadius: 15,
    marginBottom: 10,
    paddingVertical: 5,
  },
  inputContainerFocused: {
    borderColor: '#0ac7b8',
    borderWidth: 2,
  },
  icon: {
    marginHorizontal: 10,
  },
  inputFocused:{

  },
  input: {
    flex: 1,
    color: 'white',
    fontSize: 15,
    paddingHorizontal: 10,
    paddingVertical: 12,
    letterSpacing: 2,
  },

  loginButton: {
    backgroundColor: '#0ac7b8',
    borderRadius: 25,
    paddingVertical: 15,
    marginTop:15,
    alignItems: 'center',
    marginBottom: 10,
    
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    letterSpacing:2,
    fontSize: 20,
  },
  forgotPasswordText: {
    color: 'gray',
    fontSize: 14,
    alignSelf: 'flex-end',
    marginBottom: 20,
    
  },
  signUpLink: {
    position: 'static',
    bottom:0,
  },
  signUpText: {
    color: '#0ac7b8',
    fontSize: 16,
    fontWeight: 'bold',
    
  }
})
