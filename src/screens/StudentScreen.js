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

export default function StudentScreen({ onBack, classFilter }) {
  const [students, setStudents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [class_, setClass_] = useState(classFilter || '10A'); // Use classFilter if present
  const [showClassPicker, setShowClassPicker] = useState(false);
  const [standard, setStandard] = useState('10th');
  const [division, setDivision] = useState('A');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [udiseNumber, setUdiseNumber] = useState('');

  // Load students on screen open
  useEffect(() => {
    fetchStudents();
  }, []);

  async function fetchStudents() {
    try {
      let query = supabase.from('students').select('*');
      if (classFilter) {
        query = query.eq('class', classFilter);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.log('Error fetching students:', error.message);
    }
  }

  // Open form to edit a student
  const openEditForm = (student) => {
    setEditingStudent(student);
    setIsEditing(true);
    setFirstName(student.first_name);
    setLastName(student.last_name);
    setRollNumber(student.roll_number);
    setClass_(student.class);
    setParentName(student.parent_name);
    setParentPhone(student.parent_phone);
    // Extract numeric part from unique_id (remove "ID:")
    const udise = student.unique_id ? student.unique_id.replace('ID:', '') : '';
    setUdiseNumber(udise);
    // Set the class picker values based on class (e.g., "10A" -> standard "10th", division "A")
    const match = student.class.match(/(\d+)([A-Z])/);
    if (match) {
      const stdNum = match[1];
      setStandard(`${stdNum}th`);
      setDivision(match[2]);
    }
    setShowForm(true);
  };

  // Clear form after saving or cancel
  const clearForm = () => {
    setFirstName('');
    setLastName('');
    setRollNumber('');
    setClass_(classFilter || '10A');
    setParentName('');
    setParentPhone('');
    setUdiseNumber('');
    setEditingStudent(null);
    setIsEditing(false);
  };

  // Save student (insert or update)
  async function saveStudent() {
    if (!firstName || !lastName || !rollNumber || !class_ || !parentName || !parentPhone || !udiseNumber) {
      Alert.alert('Error', 'Please fill in all fields, including UDISE Number');
      return;
    }
    // If classFilter exists (teacher view), force the class to the teacher's class
    const finalClass = classFilter ? classFilter : class_;
    const fullUdiseId = `ID:${udiseNumber}`;

    setLoading(true);
    try {
      if (isEditing && editingStudent) {
        // UPDATE existing student – class cannot be changed if classFilter exists
        const { error } = await supabase
          .from('students')
          .update({
            first_name: firstName,
            last_name: lastName,
            roll_number: rollNumber,
            class: finalClass,               // ← Use finalClass
            parent_name: parentName,
            parent_phone: parentPhone,
            unique_id: fullUdiseId,
          })
          .eq('id', editingStudent.id);

        if (error) throw error;
        Alert.alert('Success', 'Student updated successfully!');
      } else {
        // INSERT new student – check duplicate roll number in the same class (finalClass)
        const { data: existing } = await supabase
          .from('students')
          .select('id')
          .eq('class', finalClass)
          .eq('roll_number', rollNumber);

        if (existing && existing.length > 0) {
          Alert.alert('Error', 'Roll number already exists in this class!');
          setLoading(false);
          return;
        }

        // Check for duplicate UDISE ID
        const { data: existingUdise } = await supabase
          .from('students')
          .select('id')
          .eq('unique_id', fullUdiseId);

        if (existingUdise && existingUdise.length > 0) {
          Alert.alert('Error', 'This UDISE Number is already registered');
          setLoading(false);
          return;
        }

        const { error } = await supabase
          .from('students')
          .insert([{
            first_name: firstName,
            last_name: lastName,
            unique_id: fullUdiseId,
            roll_number: rollNumber,
            class: finalClass,             // ← Use finalClass
            parent_name: parentName,
            parent_phone: parentPhone,
            created_at: new Date()
          }]);

        if (error) throw error;
        Alert.alert('Success', 'Student added successfully!');
      }

      // Close form and refresh list
      setShowForm(false);
      clearForm();
      fetchStudents();
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
          onPress={() => {
            clearForm();
            setShowForm(true);
          }} 
          style={[styles.addButton, { backgroundColor: colors.teal }]}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <ScrollView>
        {/* Add/Edit Student Form */}
        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>
              {isEditing ? 'Edit Student' : 'Add New Student'}
            </Text>
            
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

              {/* Class field – different for teacher vs principal */}
              {!classFilter ? (
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
              ) : (
                <View style={styles.halfWidth}>
                  <Text style={styles.label}>Class</Text>
                  <View style={[styles.classPickerButton, { backgroundColor: colors.lightGray, opacity: 0.7 }]}>
                    <Text style={styles.classPickerText}>{classFilter}</Text>
                  </View>
                </View>
              )}
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

            {/* UDISE Number Input */}
            <Text style={styles.label}>SARAL UDISE Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 2024271909001120002"
              value={udiseNumber}
              onChangeText={setUdiseNumber}
              keyboardType="numeric"
              maxLength={19}
              placeholderTextColor={colors.gray}
            />

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.orange }]}
              onPress={saveStudent}
              disabled={loading}
            >
              <Text style={styles.saveButtonText}>
                {loading ? 'Saving...' : (isEditing ? 'Update Student' : 'Add Student')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cancelButton, { marginTop: 10 }]}
              onPress={() => {
                setShowForm(false);
                clearForm();
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Class Picker Modal – only shown when no classFilter (principal) */}
        {!classFilter && (
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
                <Text style={styles.uniqueIdBadgeText}>
                  ID: {student.unique_id ? student.unique_id.replace('ID:', '') : ''}
                </Text>
              </View>
            </View>
            
            <View style={styles.parentInfo}>
              <Text style={styles.parentText}>👪 {student.parent_name}</Text>
              <Text style={styles.parentText}>📞 {student.parent_phone}</Text>
            </View>
            
            {/* Edit Button */}
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => openEditForm(student)}
            >
              <Text style={styles.editButtonText}>✏️ Edit</Text>
            </TouchableOpacity>
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
  cancelButton: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: colors.lightGray,
  },
  cancelButtonText: {
    color: colors.text,
    fontSize: 14,
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
  editButton: {
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.teal,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  editButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
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