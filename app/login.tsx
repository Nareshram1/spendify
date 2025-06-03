import { StyleSheet, Text, View, Image, TextInput, TouchableOpacity,Pressable,Linking } from 'react-native'
import React, { useState,useEffect } from 'react'
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { loginUser } from '../utils/auth';
import { save, getValueFor } from '../utils/secureStore';
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
      try {
        await loginUser(email, password);
        router.replace('/user');
      } catch (error: any) {
        alert(error.message);
      }
    };
    const handleForgotPassword = async () => {
      // Open the website
      const url = 'https://spendify-hub.vercel.app/';
      const supported = await Linking.canOpenURL(url);

      if (supported) {
        await Linking.openURL(url);
        alert('You will be redirected to the password reset page on our website. Please follow the instructions there.');
      } else {
        alert(`Don't know how to open this URL: ${url}`);
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
        <TouchableOpacity onPress={handleForgotPassword}>
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
