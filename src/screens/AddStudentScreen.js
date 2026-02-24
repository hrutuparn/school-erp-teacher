import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  FlatList,
  Modal,
  SafeAreaView
} from 'react-native';
import { supabase } from '../services/supabase';
import colors from '../components/colors';

export default function AddStudentScreen({ onBack }) {
  const [students, setStudents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Form fields
const [firstName, setFirstName] = useState('');
const [lastName, setLastName] = useState('');
const [rollNumber, setRollNumber] = useState('');
const [class_, setClass_] = useState('10A');
const [showClassPicker, setShowClassPicker] = useState(false);
const [standard, setStandard] = useState('10th');
const [division, setDivision] = useState('A');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [generatedId, setGeneratedId] = useState('');

  // Load students on screen open
  useEffect(() => {
    fetchStudents();
  }, []);

  async function fetchStudents() {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.log('Error fetching students:', error.message);
    }
  }

  // YOUR GENIUS UNIQUE ID GENERATOR!
  function generateUniqueId(first, last) {
    // Take first 3 letters of first name (or less if name is shorter)
    const firstPart = first.substring(0, 3).toUpperCase();
    
    // Take first 2 letters of last name (or less if name is shorter)
    const lastPart = last.substring(0, 2).toUpperCase();
    
    // Generate 4 random alphanumeric characters
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    
    // Combine: e.g., "JOHDOE7X9F"
    return firstPart + lastPart + randomPart;
  }

  // Update generated ID when names change
  useEffect(() => {
    if (firstName && lastName) {
      setGeneratedId(generateUniqueId(firstName, lastName));
    } else {
      setGeneratedId('');
    }
  }, [firstName, lastName]);

  async function addStudent() {
    if (!firstName || !lastName || !rollNumber || !class_ || !parentName || !parentPhone) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      // Check if student with same roll number exists in class
      const { data: existing } = await supabase
        .from('students')
        .select('*')
        .eq('class', class_)
        .eq('roll_number', rollNumber);

      if (existing && existing.length > 0) {
        Alert.alert('Error', 'Roll number already exists in this class!');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('students')
        .insert([
          { 
            first_name: firstName,
            last_name: lastName,
            unique_id: generatedId,
            roll_number: rollNumber,
            class: class_,
            parent_name: parentName,
            parent_phone: parentPhone,
            created_at: new Date()
          }
        ])
        .select();

      if (error) throw error;
      
      Alert.alert('Success', `Student added!\nUnique ID: ${generatedId}`);
      setShowForm(false);
      
      // Clear form
      setFirstName('');
      setLastName('');
      setRollNumber('');
      setClass_('10A');
      setParentName('');
      setParentPhone('');
      setGeneratedId('');
      
      fetchStudents(); // Refresh the list
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Students</Text>
        <TouchableOpacity 
          onPress={() => setShowForm(!showForm)} 
          style={[styles.addButton, { backgroundColor: colors.teal }]}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <ScrollView>
        {/* Add Student Form */}
        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Add New Student</Text>
            
            <View style={styles.row}>
              <View style={styles.halfWidth}>
                <Text style={styles.label}>First Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., John"
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholderTextColor={colors.gray}
                />
              </View>
              <View style={styles.halfWidth}>
                <Text style={styles.label}>Last Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Doe"
                  value={lastName}
                  onChangeText={setLastName}
                  placeholderTextColor={colors.gray}
                />
              </View>
            </View>

            {/* UNIQUE ID DISPLAY - YOUR BRILLIANT IDEA! */}
            {generatedId ? (
              <View style={styles.uniqueIdContainer}>
                <Text style={styles.uniqueIdLabel}>UNIQUE ID:</Text>
                <Text style={styles.uniqueIdValue}>{generatedId}</Text>
                <Text style={styles.uniqueIdNote}>Student will use this to connect parents</Text>
              </View>
            ) : null}

            <View style={styles.row}>
              <View style={styles.halfWidth}>
                <Text style={styles.label}>Roll Number *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 15"
                  value={rollNumber}
                  onChangeText={setRollNumber}
                  keyboardType="numeric"
                  placeholderTextColor={colors.gray}
                />
              </View>
              <View style={styles.halfWidth}>
                <Text style={styles.label}>Class *</Text>
<TouchableOpacity 
  style={styles.classPickerButton}
  onPress={() => setShowClassPicker(true)}
>
  <Text style={styles.classPickerText}>{class_}</Text>
  <Text style={styles.dropdownIcon}>▼</Text>
</TouchableOpacity>
              </View>
            </View>

            <Text style={styles.label}>Parent Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Mr. John Doe Sr."
              value={parentName}
              onChangeText={setParentName}
              placeholderTextColor={colors.gray}
            />

            <Text style={styles.label}>Parent Phone *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 9876543210"
              value={parentPhone}
              onChangeText={setParentPhone}
              keyboardType="phone-pad"
              maxLength={10}
              placeholderTextColor={colors.gray}
            />

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.orange }]}
              onPress={addStudent}
              disabled={loading}
            >
{/* Class Picker Modal */}
<Modal visible={showClassPicker} transparent animationType="slide">
  <View style={styles.modalOverlay}>
    <View style={styles.modalContent}>
      <Text style={styles.modalTitle}>Select Class</Text>
      
      <Text style={styles.modalSubTitle}>Standard</Text>
      <View style={styles.modalRow}>
        {['1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th','11th','12th'].map((std) => (
          <TouchableOpacity
            key={std}
            style={[
              styles.modalChip,
              standard === std && { backgroundColor: colors.teal }
            ]}
            onPress={() => setStandard(std)}
          >
            <Text style={[
              styles.modalChipText,
              standard === std && { color: colors.white }
            ]}>{std}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.modalSubTitle}>Division</Text>
      <View style={styles.modalRow}>
        {['A','B','C','D','E'].map((div) => (
          <TouchableOpacity
            key={div}
            style={[
              styles.modalChip,
              division === div && { backgroundColor: colors.teal }
            ]}
            onPress={() => setDivision(div)}
          >
            <Text style={[
              styles.modalChipText,
              division === div && { color: colors.white }
            ]}>Div {div}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={styles.modalDoneButton}
        onPress={() => {
          const stdNumber = standard.replace('th', '').replace('rd', '').replace('nd', '').replace('st', '');
          setClass_(stdNumber + division);
          setShowClassPicker(false);
        }}
      >
        <Text style={styles.modalDoneText}>Done</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>
              <Text style={styles.saveButtonText}>
                {loading ? 'Adding...' : 'Add Student'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Students List */}
        <Text style={styles.listTitle}>Your Students ({students.length})</Text>
        
        {students.map((student) => (
          <View key={student.id} style={styles.studentCard}>
            <View style={styles.studentHeader}>
              <View>
                <Text style={styles.studentName}>
                  {student.first_name} {student.last_name}
                </Text>
                <Text style={styles.studentClass}>Class {student.class} | Roll: {student.roll_number}</Text>
              </View>
              <View style={[styles.uniqueIdBadge, { backgroundColor: colors.teal }]}>
                <Text style={styles.uniqueIdBadgeText}>ID: {student.unique_id}</Text>
              </View>
            </View>
            
            <View style={styles.parentInfo}>
              <Text style={styles.parentText}>👪 {student.parent_name}</Text>
              <Text style={styles.parentText}>📞 {student.parent_phone}</Text>
            </View>
          </View>
        ))}
        
        {students.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📚</Text>
            <Text style={styles.emptyText}>No students yet</Text>
            <Text style={styles.emptySubText}>Tap the + button to add your first student</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    fontSize: 24,
    color: colors.text,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 24,
    color: colors.white,
    fontWeight: 'bold',
  },
  formCard: {
    backgroundColor: colors.white,
    margin: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 15,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  label: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 5,
    fontWeight: '500',
  },
  input: {
    backgroundColor: colors.lightGray,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 14,
    color: colors.text,
  },
  uniqueIdContainer: {
    backgroundColor: colors.teal + '20', // 20% opacity
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.teal,
  },
  uniqueIdLabel: {
    fontSize: 12,
    color: colors.text,
    marginBottom: 5,
  },
  uniqueIdValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.teal,
    letterSpacing: 2,
    marginBottom: 5,
  },
  uniqueIdNote: {
    fontSize: 10,
    color: colors.gray,
    textAlign: 'center',
  },
  saveButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginHorizontal: 20,
    marginBottom: 10,
  },
  studentCard: {
    backgroundColor: colors.white,
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  studentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
    paddingBottom: 10,
  },
  studentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  studentClass: {
    fontSize: 12,
    color: colors.gray,
    marginTop: 2,
  },
  uniqueIdBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  uniqueIdBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  parentInfo: {
    marginTop: 5,
  },
  parentText: {
    fontSize: 13,
    color: colors.text,
    marginBottom: 3,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyEmoji: {
    fontSize: 60,
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 5,
  },
  emptySubText: {
    fontSize: 14,
    color: colors.gray,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  classPickerButton: {
    backgroundColor: colors.lightGray,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  classPickerText: {
    fontSize: 14,
    color: colors.text,
  },
  dropdownIcon: {
    fontSize: 12,
    color: colors.gray,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 15,
    textAlign: 'center',
  },
  modalSubTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 10,
    marginBottom: 10,
  },
  modalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  modalChip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: colors.lightGray,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  modalChipText: {
    fontSize: 14,
    color: colors.text,
  },
  modalDoneButton: {
    marginTop: 20,
    paddingVertical: 12,
    backgroundColor: colors.teal,
    borderRadius: 8,
  },
  modalDoneText: {
    fontSize: 16,
    color: colors.white,
    textAlign: 'center',
    fontWeight: 'bold',
  },
});