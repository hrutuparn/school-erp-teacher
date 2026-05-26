import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { supabase } from '../services/supabase';
import colors from '../components/colors';

export default function MarksScreen({ onBack, teacherId }) {
  const [assignments, setAssignments] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [students, setStudents] = useState([]);
  const [marks, setMarks] = useState({}); // { studentId: marksObtainedString }
  
  // Test parameters
  const [testType, setTestType] = useState('unit'); // unit, weekly, monthly, olympiad, semester
  const [testName, setTestName] = useState('');
  const [maxMarks, setMaxMarks] = useState('20');
  const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Loading states
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modals for selection dropdowns
  const [showClassModal, setShowClassModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);

  const testTypes = [
    { value: 'unit', label: 'Unit Test' },
    { value: 'weekly', label: 'Weekly Test' },
    { value: 'monthly', label: 'Monthly Test' },
    { value: 'olympiad', label: 'Olympiad' },
    { value: 'semester', label: 'Semester Exam' }
  ];

  // 1. Fetch teacher assignments
  useEffect(() => {
    fetchAssignments();
  }, [teacherId]);

  async function fetchAssignments() {
    if (!teacherId) {
      // If no teacherId is provided (e.g. mock login), try to fetch the first teacher in db
      setLoadingAssignments(true);
      try {
        const { data: teacherData } = await supabase.from('teachers').select('id').limit(1).single();
        if (teacherData) {
          fetchAssignmentsForId(teacherData.id);
        } else {
          setAssignments([]);
          setLoadingAssignments(false);
        }
      } catch (e) {
        setAssignments([]);
        setLoadingAssignments(false);
      }
      return;
    }
    fetchAssignmentsForId(teacherId);
  }

  async function fetchAssignmentsForId(tId) {
    setLoadingAssignments(true);
    try {
      const { data, error } = await supabase
        .from('teacher_assignments')
        .select('*')
        .eq('teacher_id', tId);

      if (error) throw error;

      if (data && data.length > 0) {
        setAssignments(data);
        setSelectedClass(data[0].class_name);
        setSelectedSubject(data[0].subject);
      } else {
        // Fallback standard classes if teacher has no assignments
        const fallback = [
          { class_name: '10A', subject: 'Mathematics' },
          { class_name: '10A', subject: 'Science' },
          { class_name: '9A', subject: 'Mathematics' }
        ];
        setAssignments(fallback);
        setSelectedClass(fallback[0].class_name);
        setSelectedSubject(fallback[0].subject);
      }
    } catch (error) {
      console.log('Error fetching assignments:', error.message);
      Alert.alert('Notice', 'Using default class and subjects list.');
      const fallback = [
        { class_name: '10A', subject: 'Mathematics' }
      ];
      setAssignments(fallback);
      setSelectedClass(fallback[0].class_name);
      setSelectedSubject(fallback[0].subject);
    } finally {
      setLoadingAssignments(false);
    }
  }

  // 2. Fetch students when selected class changes
  useEffect(() => {
    if (selectedClass) {
      fetchStudents(selectedClass);
    }
  }, [selectedClass]);

  async function fetchStudents(className) {
    setLoadingStudents(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, roll_number')
        .eq('class', className)
        .order('roll_number', { ascending: true });

      if (error) throw error;

      setStudents(data || []);
      
      // Initialize marks map
      const initialMarks = {};
      (data || []).forEach(student => {
        initialMarks[student.id] = '';
      });
      setMarks(initialMarks);
    } catch (error) {
      console.log('Error fetching students:', error.message);
      Alert.alert('Error', 'Failed to load students for class ' + className);
    } finally {
      setLoadingStudents(false);
    }
  }

  // 3. Mark update helper
  const handleMarkChange = (studentId, value) => {
    // Basic sanitization: only numbers or decimal point
    const cleanValue = value.replace(/[^0-9.]/g, '');
    
    // Check if it exceeds max marks
    const numericVal = parseFloat(cleanValue);
    const numericMax = parseFloat(maxMarks) || 100;
    
    if (!isNaN(numericVal) && numericVal > numericMax) {
      Alert.alert('Invalid Marks', `Marks obtained cannot exceed maximum marks (${numericMax})`);
      return;
    }
    
    setMarks({
      ...marks,
      [studentId]: cleanValue
    });
  };

  const handleIncrementDecrement = (studentId, isIncrement) => {
    const currentVal = parseFloat(marks[studentId]) || 0;
    const step = 1;
    let newVal = isIncrement ? currentVal + step : currentVal - step;
    
    if (newVal < 0) newVal = 0;
    
    const numericMax = parseFloat(maxMarks) || 100;
    if (newVal > numericMax) newVal = numericMax;

    setMarks({
      ...marks,
      [studentId]: newVal.toString()
    });
  };

  // 4. Save Marks to Supabase
  const handleSaveMarks = async () => {
    if (!testName.trim()) {
      Alert.alert('Error', 'Please enter a test title (e.g., Chapter 1 Algebra)');
      return;
    }
    
    const numericMax = parseFloat(maxMarks);
    if (isNaN(numericMax) || numericMax <= 0) {
      Alert.alert('Error', 'Please enter a valid maximum marks limit');
      return;
    }

    // Verify at least one student has marks
    const enteredStudentIds = Object.keys(marks).filter(id => marks[id] !== '');
    if (enteredStudentIds.length === 0) {
      Alert.alert('Error', 'Please enter marks for at least one student');
      return;
    }

    setSaving(true);
    try {
      // Resolve school_id from teacher or fallback
      let schoolId = 'SCH_MH_27430012'; // default
      if (teacherId) {
        const { data: teacherData } = await supabase
          .from('teachers')
          .select('school_id')
          .eq('id', teacherId)
          .single();
        if (teacherData && teacherData.school_id) {
          schoolId = teacherData.school_id;
        }
      }

      // Format payload rows
      const marksRecords = enteredStudentIds.map(studentId => {
        const score = parseFloat(marks[studentId]);
        return {
          student_id: parseInt(studentId),
          school_id: schoolId,
          class_name: selectedClass,
          subject: selectedSubject,
          test_name: testName.trim(),
          test_type: testType,
          date: testDate,
          max_marks: numericMax,
          marks_obtained: score,
          teacher_id: teacherId || null
        };
      });

      const { error } = await supabase
        .from('marks')
        .insert(marksRecords);

      if (error) throw error;

      Alert.alert(
        'Marks Saved! 🎉',
        `Successfully logged results for ${marksRecords.length} students.`,
        [{ text: 'Great', onPress: onBack }]
      );
    } catch (error) {
      console.log('Error saving marks:', error.message);
      Alert.alert('Save Failed', error.message);
    } finally {
      setSaving(false);
    }
  };

  // Helper arrays for selection lists
  const uniqueClasses = [...new Set(assignments.map(a => a.class_name))];
  const uniqueSubjects = [...new Set(assignments.filter(a => a.class_name === selectedClass).map(a => a.subject))];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Test Marks Manager</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.contentContainer} keyboardShouldPersistTaps="handled">
          
          {/* Card 1: Select Subject and Class */}
          <View style={styles.selectionCard}>
            <Text style={styles.sectionHeader}>📂 Class & Subject Setup</Text>
            
            <View style={styles.selectionRow}>
              {/* Class Dropdown */}
              <View style={styles.dropdownWrapper}>
                <Text style={styles.inputLabel}>Class</Text>
                <TouchableOpacity 
                  style={styles.dropdownBtn}
                  onPress={() => setShowClassModal(true)}
                  disabled={loadingAssignments}
                >
                  <Text style={styles.dropdownBtnText}>
                    {loadingAssignments ? 'Loading...' : `Class ${selectedClass}`}
                  </Text>
                  <Text style={styles.dropdownIcon}>▼</Text>
                </TouchableOpacity>
              </View>

              {/* Subject Dropdown */}
              <View style={styles.dropdownWrapper}>
                <Text style={styles.inputLabel}>Subject</Text>
                <TouchableOpacity 
                  style={styles.dropdownBtn}
                  onPress={() => setShowSubjectModal(true)}
                  disabled={loadingAssignments}
                >
                  <Text style={styles.dropdownBtnText} numberOfLines={1}>
                    {loadingAssignments ? 'Loading...' : selectedSubject}
                  </Text>
                  <Text style={styles.dropdownIcon}>▼</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Card 2: Test Parameter Information */}
          <View style={styles.testDetailsCard}>
            <Text style={styles.sectionHeader}>📊 Test Description</Text>
            
            <Text style={styles.inputLabel}>Test Title</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Chapter 1 Geometry Quiz, Mid-term"
              value={testName}
              onChangeText={setTestName}
              placeholderTextColor={colors.gray}
            />

            <View style={styles.selectionRow}>
              {/* Test Type Select */}
              <View style={styles.dropdownWrapper}>
                <Text style={styles.inputLabel}>Assessment Type</Text>
                <TouchableOpacity 
                  style={styles.dropdownBtn}
                  onPress={() => setShowTypeModal(true)}
                >
                  <Text style={styles.dropdownBtnText}>
                    {testTypes.find(t => t.value === testType)?.label || 'Select'}
                  </Text>
                  <Text style={styles.dropdownIcon}>▼</Text>
                </TouchableOpacity>
              </View>

              {/* Max Marks Select */}
              <View style={styles.dropdownWrapper}>
                <Text style={styles.inputLabel}>Maximum Marks</Text>
                <TextInput
                  style={styles.inputCompact}
                  keyboardType="numeric"
                  value={maxMarks}
                  onChangeText={(val) => {
                    const clean = val.replace(/[^0-9]/g, '');
                    setMaxMarks(clean);
                  }}
                  placeholder="e.g. 50"
                  placeholderTextColor={colors.gray}
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>Date Administered</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              value={testDate}
              onChangeText={setTestDate}
              placeholderTextColor={colors.gray}
            />
          </View>

          {/* Card 3: Marks Entry Sheet */}
          <View style={styles.studentMarksCard}>
            <Text style={styles.sectionHeader}>✍️ Student Marks Scorecard</Text>
            <Text style={styles.helperText}>
              Input marks out of {maxMarks || '0'} below. Leave blank if student was absent.
            </Text>

            {loadingStudents ? (
              <ActivityIndicator size="large" color={colors.teal} style={{ marginVertical: 30 }} />
            ) : students.length === 0 ? (
              <Text style={styles.emptyClassText}>No students registered in Class {selectedClass}</Text>
            ) : (
              students.map((student) => (
                <View key={student.id} style={styles.studentScoreRow}>
                  <View style={styles.studentNameCol}>
                    <Text style={styles.studentRollText}>#{student.roll_number || '?'}</Text>
                    <Text style={styles.studentNameText} numberOfLines={1}>
                      {student.first_name} {student.last_name}
                    </Text>
                  </View>
                  
                  <View style={styles.scoreActionCol}>
                    {/* Decrement Button */}
                    <TouchableOpacity 
                      style={styles.adjustBtn}
                      onPress={() => handleIncrementDecrement(student.id, false)}
                    >
                      <Text style={styles.adjustBtnText}>-</Text>
                    </TouchableOpacity>

                    {/* Score Input Box */}
                    <TextInput
                      style={styles.scoreInput}
                      keyboardType="numeric"
                      placeholder="--"
                      placeholderTextColor={colors.gray}
                      value={marks[student.id] || ''}
                      onChangeText={(val) => handleMarkChange(student.id, val)}
                    />

                    {/* Increment Button */}
                    <TouchableOpacity 
                      style={styles.adjustBtn}
                      onPress={() => handleIncrementDecrement(student.id, true)}
                    >
                      <Text style={styles.adjustBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Save Action Card */}
          {students.length > 0 && !loadingStudents && (
            <TouchableOpacity 
              style={[styles.submitBtn, { backgroundColor: colors.teal }]}
              onPress={handleSaveMarks}
              disabled={saving}
            >
              <Text style={styles.submitBtnText}>
                {saving ? 'Saving Scores...' : '💾 Save Class Results'}
              </Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Class Dropdown Picker Modal */}
      <Modal visible={showClassModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose Assigned Class</Text>
            <ScrollView>
              {uniqueClasses.map((cls, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.modalItem, selectedClass === cls && { backgroundColor: colors.teal + '20' }]}
                  onPress={() => {
                    setSelectedClass(cls);
                    // Reset selected subject if it is not in assignments for the new class
                    const validSubs = assignments.filter(a => a.class_name === cls).map(a => a.subject);
                    if (!validSubs.includes(selectedSubject) && validSubs.length > 0) {
                      setSelectedSubject(validSubs[0]);
                    }
                    setShowClassModal(false);
                  }}
                >
                  <Text style={styles.modalItemText}>Class {cls}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity onPress={() => setShowClassModal(false)} style={styles.modalCloseBtn}>
              <Text style={styles.modalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Subject Dropdown Picker Modal */}
      <Modal visible={showSubjectModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose Subject</Text>
            <ScrollView>
              {uniqueSubjects.map((sub, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.modalItem, selectedSubject === sub && { backgroundColor: colors.teal + '20' }]}
                  onPress={() => {
                    setSelectedSubject(sub);
                    setShowSubjectModal(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{sub}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity onPress={() => setShowSubjectModal(false)} style={styles.modalCloseBtn}>
              <Text style={styles.modalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Test Type Selection Modal */}
      <Modal visible={showTypeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Assessment Type</Text>
            <ScrollView>
              {testTypes.map((type, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.modalItem, testType === type.value && { backgroundColor: colors.teal + '20' }]}
                  onPress={() => {
                    setTestType(type.value);
                    setShowTypeModal(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{type.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity onPress={() => setShowTypeModal(false)} style={styles.modalCloseBtn}>
              <Text style={styles.modalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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
  contentContainer: {
    flex: 1,
    padding: 15,
  },
  selectionCard: {
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 16,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.lightGray,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  selectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dropdownWrapper: {
    width: '48%',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.gray,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  dropdownBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.lightGray,
  },
  dropdownBtnText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  dropdownIcon: {
    fontSize: 10,
    color: colors.gray,
  },
  testDetailsCard: {
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 16,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.lightGray,
  },
  input: {
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.lightGray,
    fontSize: 14,
    color: colors.text,
    marginBottom: 12,
  },
  inputCompact: {
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.lightGray,
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  studentMarksCard: {
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 16,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.lightGray,
  },
  helperText: {
    fontSize: 12,
    color: colors.gray,
    marginBottom: 15,
  },
  emptyClassText: {
    textAlign: 'center',
    color: colors.gray,
    marginVertical: 20,
    fontSize: 14,
  },
  studentScoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  studentNameCol: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
  },
  studentRollText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.teal,
    marginRight: 10,
    backgroundColor: colors.teal + '15',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  studentNameText: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
  },
  scoreActionCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adjustBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adjustBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  scoreInput: {
    width: 50,
    height: 36,
    textAlign: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.lightGray,
    borderRadius: 8,
    marginHorizontal: 8,
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  submitBtn: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    marginTop: 10,
  },
  submitBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
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
    width: '85%',
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 16,
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
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
  },
  modalCloseBtn: {
    marginTop: 15,
    paddingVertical: 12,
    backgroundColor: colors.gray,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCloseBtnText: {
    color: colors.white,
    fontWeight: 'bold',
  },
});
