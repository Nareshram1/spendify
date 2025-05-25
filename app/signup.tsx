import { StyleSheet, Text, View, TextInput, TouchableOpacity, Pressable } from 'react-native';
import React, { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../utils/supabaseClient';
import { Link, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

const SignUp = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSignUp = async () => {
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    // First, sign up the user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName // This is for Supabase Auth's user metadata
        },
      },
    });

    if (authError) {
      alert(authError.message);
    } else {
      // If authentication is successful, insert user data into your 'users' table
      if (authData.user) {
        const { error: insertError } = await supabase
          .from('users')
          .insert([
            {
              user_id: authData.user.id, // Supabase Auth user ID
              name: fullName,
              email: email,
              created_at: new Date().toISOString(), // Or use a Supabase default for this column
            },
          ]);

        if (insertError) {
          console.error('Error inserting user data into "users" table:', insertError.message);
          alert('Account created, but failed to save user info. Please contact support.');
          // You might want to handle rollback or allow the user to retry
        } else {
          // alert('Check your email to confirm and then come back to sign in!');
          router.replace('/');
        }
      } else {
        // This case might occur if the user already exists and a confirmation email is sent
        // alert('Check your email to confirm and then come back to sign in!');
        router.replace('/');
      }
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
        <View style={styles.inputContainer}>
          <Ionicons name="mail" size={24} color="white" style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="white"
            onChangeText={setEmail}
            value={email}
            keyboardType="email-address" // Hint for email keyboard
            autoCapitalize="none" // Prevent auto-capitalization for emails
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
        <Pressable style={styles.signUpButton} onPress={handleSignUp}>
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