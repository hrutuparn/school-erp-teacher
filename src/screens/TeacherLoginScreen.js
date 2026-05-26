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
  ScrollView,
  Modal
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

  // Lookup data
  const [schoolName, setSchoolName] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [subjectsList, setSubjectsList] = useState([]);

  // Registration Fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedStandard, setSelectedStandard] = useState('10');
  const [selectedDivision, setSelectedDivision] = useState('A');
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const [showClassPicker, setShowClassPicker] = useState(false);

  const standards = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  const divisions = ['A', 'B', 'C', 'D', 'E'];

  const handleUdiseSubmit = async () => {
    if (!udise || udise.trim().length < 6) {
      Alert.alert('Error', 'Please enter a valid UDISE number');
      return;
    }

    setLoading(true);
    try {
      // Query schools table for UDISE number
      const { data: schoolData, error } = await supabase
        .from('schools')
        .select('school_id, name')
        .eq('udise_number', udise.trim())
        .single();

      if (error || !schoolData) {
        Alert.alert('School Not Found', 'No school matches this UDISE number. Ask your principal.');
        return;
      }

      setSchoolName(schoolData.name);
      setSchoolId(schoolData.school_id);
      
      // Fetch subjects for this school
      const { data: subs, error: subError } = await supabase
        .from('subjects')
        .select('name')
        .eq('school_id', schoolData.school_id)
        .order('name', { ascending: true });

      if (!subError && subs && subs.length > 0) {
        const names = subs.map(s => s.name);
        setSubjectsList(names);
        setSelectedSubject(names[0]);
      } else {
        // Fallbacks if no subjects created yet
        const defaultSubs = ['Mathematics', 'Science', 'English', 'Social Science', 'Hindi', 'Marathi'];
        setSubjectsList(defaultSubs);
        setSelectedSubject(defaultSubs[0]);
      }

      setStep(2);
    } catch (error) {
      Alert.alert('Error', 'An error occurred while validating the school. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in Email and Password fields');
      return;
    }

    if (!isLogin && (!name || !phone || !selectedSubject)) {
      Alert.alert('Error', 'Please fill in Name, Phone, and select a Subject');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        // --- LOGIN ---
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password: password,
        });
        
        if (error) throw error;
        
        // Verify teacher exists in teachers table
        const { data: teacher, error: teacherErr } = await supabase
          .from('teachers')
          .select('is_active')
          .eq('email', email.trim().toLowerCase())
          .single();

        if (teacherErr || !teacher) {
          Alert.alert('Unauthorized', 'You are not registered as a teacher in this school. Please register first.');
          await supabase.auth.signOut();
          return;
        }

        if (teacher.is_active === false) {
          Alert.alert('Pending Approval', 'Your teacher profile is pending approval by the principal. Please try again later.');
          await supabase.auth.signOut();
          return;
        }

        Alert.alert('Success', 'Welcome Teacher!');
        onLogin();
      } else {
        // --- REGISTRATION ---
        // 1. Sign Up in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password: password,
        });
        
        if (authError) throw authError;

        // 2. Insert into teachers table
        const { data: newTeacher, error: teacherError } = await supabase
          .from('teachers')
          .insert([
            {
              name: name.trim(),
              email: email.trim().toLowerCase(),
              phone: phone.trim(),
              school_id: schoolId,
              qualification: 'B.Ed',
              is_active: false // Starts as inactive, waiting for approval!
            }
          ])
          .select();

        if (teacherError) throw teacherError;

        // 3. Create initial class-subject assignment
        if (newTeacher && newTeacher.length > 0) {
          const tId = newTeacher[0].id;
          const assignedClass = selectedStandard + selectedDivision;
          
          const { error: assignError } = await supabase
            .from('teacher_assignments')
            .insert([
              {
                teacher_id: tId,
                class_name: assignedClass,
                subject: selectedSubject,
                created_at: new Date()
              }
            ]);

          if (assignError) {
            console.log('Error creating assignment:', assignError.message);
          }
        }

        Alert.alert('Success', 'Registration successful! Please wait for the Principal to approve your profile.');
        setIsLogin(true);
      }
    } catch (error) {
      Alert.alert('Authentication Error', error.message);
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
            <Text style={styles.logoEmoji}>🏫</Text>
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
                  value={name}
                  onChangeText={setName}
                  placeholderTextColor={colors.gray}
                />
                
                <TextInput
                  style={styles.input}
                  placeholder="Phone Number"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  placeholderTextColor={colors.gray}
                />

                {/* Primary Subject Picker Trigger */}
                <Text style={styles.fieldLabel}>Primary Subject</Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setShowSubjectPicker(true)}
                >
                  <Text style={styles.pickerText}>{selectedSubject || 'Select Subject'}</Text>
                  <Text style={styles.pickerIcon}>▼</Text>
                </TouchableOpacity>

                {/* Assigned Class Picker Trigger */}
                <Text style={styles.fieldLabel}>Assigned Class</Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setShowClassPicker(true)}
                >
                  <Text style={styles.pickerText}>{selectedStandard + selectedDivision}</Text>
                  <Text style={styles.pickerIcon}>▼</Text>
                </TouchableOpacity>
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

      {/* Subject Picker Modal */}
      <Modal visible={showSubjectPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose Primary Subject</Text>
            <ScrollView>
              {subjectsList.map((sub, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.modalItem, selectedSubject === sub && { backgroundColor: colors.teal + '20' }]}
                  onPress={() => {
                    setSelectedSubject(sub);
                    setShowSubjectPicker(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{sub}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity onPress={() => setShowSubjectPicker(false)} style={styles.modalCloseButton}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Class Picker Modal */}
      <Modal visible={showClassPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Assigned Class</Text>
            
            <Text style={styles.modalSubTitle}>Standard</Text>
            <View style={styles.modalRow}>
              {standards.map((std) => (
                <TouchableOpacity
                  key={std}
                  style={[styles.modalChip, selectedStandard === std && { backgroundColor: colors.teal }]}
                  onPress={() => setSelectedStandard(std)}
                >
                  <Text style={[styles.modalChipText, selectedStandard === std && { color: colors.white }]}>
                    {std}th
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalSubTitle}>Division</Text>
            <View style={styles.modalRow}>
              {divisions.map((div) => (
                <TouchableOpacity
                  key={div}
                  style={[styles.modalChip, selectedDivision === div && { backgroundColor: colors.teal }]}
                  onPress={() => setSelectedDivision(div)}
                >
                  <Text style={[styles.modalChipText, selectedDivision === div && { color: colors.white }]}>
                    Div {div}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity onPress={() => setShowClassPicker(false)} style={[styles.modalCloseButton, { marginTop: 15 }]}>
              <Text style={styles.modalCloseText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 5,
  },
  logoSubtext: {
    fontSize: 14,
    color: colors.gray,
  },
  welcomeText: {
    fontSize: 22,
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
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.lightGray,
    fontSize: 15,
    color: colors.text,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 5,
    marginBottom: 5
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 15,
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.lightGray,
  },
  pickerText: {
    fontSize: 15,
    color: colors.text,
  },
  pickerIcon: {
    fontSize: 12,
    color: colors.gray,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 15,
    textAlign: 'center',
  },
  modalItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
    alignItems: 'center',
  },
  modalItemText: {
    fontSize: 16,
    color: colors.text,
  },
  modalCloseButton: {
    marginTop: 15,
    paddingVertical: 12,
    backgroundColor: colors.gray,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCloseText: {
    color: colors.white,
    fontWeight: 'bold',
  },
  modalSubTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 10,
    marginBottom: 8,
  },
  modalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  modalChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.lightGray,
    borderRadius: 15,
    marginRight: 6,
    marginBottom: 8,
  },
  modalChipText: {
    fontSize: 12,
    color: colors.text,
  }
});