import { StyleSheet, Text, View, TextInput, TouchableOpacity, Pressable } from 'react-native';
import React, { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../utils/supabaseClient';
import { Link, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
const SignUp = () => {
  const [fullName, setFullName] = useState('');
  // const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSignUp = async () => {
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    // console.log("edeging")
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        },
      },
    });
    // console.log("cumming1")

    if (error) {
      alert(error.message);
    } else {
      alert('check mail to confirm and cum back')
      router.replace('/')
      // Navigate to login screen
      
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor='#171223'/>
      <Text style={styles.mainText}>Sign Up</Text>
      <Text style={styles.secondaryText}>Create an account to get started</Text>
      
      <View style={styles.formContainer}>
        <View style={styles.inputContainer}>
          <Ionicons name="person" size={24} color="white" style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            placeholderTextColor="white"
            onChangeText={setFullName}
            value={fullName}
          />
        </View>
        {/* <View style={styles.inputContainer}>
          <Ionicons name="call" size={24} color="white" style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Phone"
            placeholderTextColor="white"
            onChangeText={setPhone}
            value={phone}
          />
        </View> */}
        <View style={styles.inputContainer}>
          <Ionicons name="mail" size={24} color="white" style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="white"
            onChangeText={setEmail}
            value={email}
          />
        </View>
        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed" size={24} color="white" style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="white"
            onChangeText={setPassword}
            value={password}
            secureTextEntry
          />
        </View>
        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed" size={24} color="white" style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            placeholderTextColor="white"
            onChangeText={setConfirmPassword}
            value={confirmPassword}
            secureTextEntry
          />
        </View>
        <Pressable style={styles.signUpButton} onPress={()=>{handleSignUp()}}>
          <Text style={styles.buttonText}>Sign Up</Text>
        </Pressable>
      </View>

      <TouchableOpacity style={styles.signInLink}>
        <Link href="/" style={styles.signUpText}>
          Already have an account? <Text style={styles.signUpTextHighlight}>Sign In</Text>
        </Link>
      </TouchableOpacity>
    </View>
  );
};

export default SignUp;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#171223',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40
  },
  mainText: {
    color: 'white',
    fontSize: 30,
    fontWeight: 'bold',
    alignSelf: 'flex-start',
    letterSpacing: 2,
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
  icon: {
    marginHorizontal: 10,
  },
  input: {
    flex: 1,
    color: 'white',
    fontSize: 15,
    paddingHorizontal: 10,
    paddingVertical: 12,
    letterSpacing: 2,
  },
  signUpButton: {
    backgroundColor: '#0ac7b8',
    borderRadius: 25,
    paddingVertical: 15,
    marginTop: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    letterSpacing: 2,
    fontSize: 20,
  },
  signInLink: {
    position: 'static',
    bottom: 0,
  },
  signUpText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  signUpTextHighlight: {
    color: '#0ac7b8',
  }
});
