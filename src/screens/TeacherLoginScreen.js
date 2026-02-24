import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { supabase } from '../services/supabase';
import colors from '../components/colors';

export default function TeacherLoginScreen({ onLogin }) {
  const [udise, setUdise] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState(1); // 1: UDISE, 2: Login/Register

  // This would be replaced with actual school lookup
  const [schoolName, setSchoolName] = useState('');

  const handleUdiseSubmit = async () => {
    if (!udise || udise.length < 6) {
      Alert.alert('Error', 'Please enter a valid UDISE number');
      return;
    }

    setLoading(true);
    try {
      // TODO: Check if school exists in database
      // For now, simulate success
      setSchoolName('Greenfield School');
      setStep(2);
    } catch (error) {
      Alert.alert('Error', 'School not found. Check UDISE number.');
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });
        
        if (error) throw error;
        
        // TODO: Check if user is a teacher for this school
        Alert.alert('Success', 'Welcome Teacher!');
        onLogin();
      } else {
        const { error } = await supabase.auth.signUp({
          email: email,
          password: password,
        });
        
        if (error) throw error;
        Alert.alert('Success', 'Registration successful! Please wait for principal approval.');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  if (step === 1) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.innerContainer}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoEmoji}>👩‍🏫</Text>
            <Text style={styles.logoText}>Teacher Portal</Text>
            <Text style={styles.logoSubtext}>School ERP for Educators</Text>
          </View>

          <Text style={styles.welcomeText}>Enter School UDISE</Text>
          <Text style={styles.subText}>
            Enter your school's unique UDISE number to continue
          </Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="UDISE Number"
              value={udise}
              onChangeText={setUdise}
              keyboardType="numeric"
              maxLength={11}
              placeholderTextColor={colors.gray}
            />
          </View>

          <TouchableOpacity
            style={[styles.authButton, { backgroundColor: colors.orange }]}
            onPress={handleUdiseSubmit}
            disabled={loading}
          >
            <Text style={styles.authButtonText}>
              {loading ? 'Checking...' : 'Continue'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.helpText}>
            Don't know your UDISE? Ask your principal
          </Text>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.innerContainer}>
          <TouchableOpacity 
            onPress={() => setStep(1)} 
            style={styles.backButton}
          >
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.logoContainer}>
            <Text style={styles.logoEmoji}>👩‍🏫</Text>
            <Text style={styles.logoText}>{schoolName}</Text>
            <Text style={styles.logoSubtext}>UDISE: {udise}</Text>
          </View>

          <Text style={styles.welcomeText}>
            {isLogin ? 'Welcome Back, Teacher!' : 'New Teacher Registration'}
          </Text>
          <Text style={styles.subText}>
            {isLogin 
              ? 'Sign in to manage your classes' 
              : 'Register to join your school'}
          </Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={colors.gray}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor={colors.gray}
            />

            {!isLogin && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  placeholderTextColor={colors.gray}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Phone Number"
                  keyboardType="phone-pad"
                  placeholderTextColor={colors.gray}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Subject (e.g., Mathematics)"
                  placeholderTextColor={colors.gray}
                />
              </>
            )}
          </View>

          <TouchableOpacity
            style={[styles.authButton, { backgroundColor: colors.orange }]}
            onPress={handleAuth}
            disabled={loading}
          >
            <Text style={styles.authButtonText}>
              {loading ? 'Please wait...' : (isLogin ? 'LOGIN' : 'REGISTER')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setIsLogin(!isLogin)}
            style={styles.toggleButton}
          >
            <Text style={styles.toggleText}>
              {isLogin 
                ? "New teacher? " 
                : "Already have an account? "}
              <Text style={styles.toggleHighlight}>
                {isLogin ? 'Register here' : 'Login'}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 25,
    paddingVertical: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoEmoji: {
    fontSize: 70,
    marginBottom: 10,
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 5,
  },
  logoSubtext: {
    fontSize: 14,
    color: colors.gray,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
  },
  subText: {
    fontSize: 14,
    color: colors.gray,
    marginBottom: 25,
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: colors.white,
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.lightGray,
    fontSize: 16,
    color: colors.text,
  },
  authButton: {
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  authButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  toggleButton: {
    alignItems: 'center',
    marginBottom: 15,
  },
  toggleText: {
    fontSize: 14,
    color: colors.text,
  },
  toggleHighlight: {
    color: colors.teal,
    fontWeight: 'bold',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  backText: {
    fontSize: 16,
    color: colors.teal,
  },
  helpText: {
    textAlign: 'center',
    color: colors.gray,
    fontSize: 12,
    marginTop: 15,
  },
});