import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import { supabase } from '../services/supabase';
import colors from '../components/colors';

export default function AttendanceScreen({ onBack, className = "10A", teacherId, teacherName }) {
  const [students, setStudents] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Load students for this class
  useEffect(() => {
    fetchStudents();
  }, []);

  async function fetchStudents() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('class', className)
        .order('roll_number', { ascending: true });

      if (error) throw error;
      setStudents(data || []);
      
      // Initialize attendance object
      const initialAttendance = {};
      data.forEach(student => {
        initialAttendance[student.id] = null; // null = not marked yet
      });
      setAttendance(initialAttendance);
    } catch (error) {
      Alert.alert('Error', 'Failed to load students');
      console.log(error);
    } finally {
      setLoading(false);
    }
  }

  const markPresent = () => {
    const currentStudent = students[currentIndex];
    const newAttendance = { ...attendance, [currentStudent.id]: 'present' };
    setAttendance(newAttendance);
    moveToNext();
  };

  const markAbsent = () => {
    const currentStudent = students[currentIndex];
    const newAttendance = { ...attendance, [currentStudent.id]: 'absent' };
    setAttendance(newAttendance);
    moveToNext();
  };

  const moveToNext = () => {
    if (currentIndex + 1 < students.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCompleted(true);
    }
  };

  const skipForNow = () => {
    moveToNext();
  };

  const finishAndSave = async () => {
    setSaving(true);
    try {
      // 1. Get current date in local YYYY-MM-DD
      const dateStr = new Date().toISOString().split('T')[0];
      const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false });

      // Get logged-in teacher's auth UID
      const { data: { user } } = await supabase.auth.getUser();
      const senderUid = user ? user.id : 'system';

      // 2. Prepare attendance rows to insert
      const attendanceInserts = Object.keys(attendance).map(studentId => {
        const status = attendance[studentId];
        return {
          student_id: parseInt(studentId),
          class_name: className,
          date: dateStr,
          status: status || 'present', // fallback to present if skipped
          marked_by: teacherId || null,
          marked_at: timeStr
        };
      });

      // 3. Save to Supabase student_attendance table
      const { error: saveError } = await supabase
        .from('student_attendance')
        .insert(attendanceInserts);

      if (saveError) throw saveError;

      // 4. Trigger Caring SMS for Absentees
      const absentStudents = students.filter(s => attendance[s.id] === 'absent');
      let smsCount = 0;

      for (const student of absentStudents) {
        try {
          // Find parent links
          const { data: parentLinks, error: linkErr } = await supabase
            .from('parent_students')
            .select('parent_id')
            .eq('student_id', student.id);

          if (linkErr || !parentLinks || parentLinks.length === 0) continue;

          // Find parent user accounts
          const parentIds = parentLinks.map(l => l.parent_id);
          const { data: parentUsers, error: userErr } = await supabase
            .from('parents')
            .select('user_id, name')
            .in('id', parentIds);

          if (userErr || !parentUsers || parentUsers.length === 0) continue;

          const caringMessage = `Dear Parent, we missed ${student.first_name} in school today. We hope they are doing well! Please let us know if there is anything we can help with. Warm regards, ${teacherName || 'Class Teacher'} & Greenfield School.`;

          for (const parent of parentUsers) {
            if (!parent.user_id) continue;
            // Write directly to chat_messages table to trigger parent app notification & chat history
            await supabase
              .from('chat_messages')
              .insert([
                {
                  sender_id: senderUid,
                  sender_type: 'teacher',
                  receiver_id: parent.user_id,
                  message: caringMessage,
                  command: '/chat',
                  is_read: false,
                  created_at: new Date()
                }
              ]);
            smsCount++;
          }
        } catch (e) {
          console.log(`Failed sending SMS for student ${student.first_name}:`, e.message);
        }
      }

      Alert.alert(
        'Success', 
        `Attendance saved successfully!\n📣 ${smsCount} caring parent notifications sent.`,
        [{ text: 'OK', onPress: onBack }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to save attendance: ' + error.message);
      console.log(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.teal} />
          <Text style={[styles.loadingText, { marginTop: 15 }]}>Loading students...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (students.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Attendance</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContent}>
          <Text style={styles.emptyEmoji}>📭</Text>
          <Text style={styles.emptyText}>No students in Class {className}</Text>
          <Text style={styles.emptySubText}>Add students in the school roster first.</Text>
          <TouchableOpacity 
            style={[styles.backToClassButton, { backgroundColor: colors.teal }]}
            onPress={onBack}
          >
            <Text style={styles.backToClassText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (completed) {
    const presentCount = Object.values(attendance).filter(v => v === 'present').length;
    const absentCount = Object.values(attendance).filter(v => v === 'absent').length;
    const absentStudents = students.filter(s => attendance[s.id] === 'absent');

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Review Attendance</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>📊 Class {className} Summary</Text>
            
            <View style={styles.statsRow}>
              <View style={[styles.statBox, { backgroundColor: colors.green + '15', borderWidth: 1, borderColor: colors.green }]}>
                <Text style={[styles.statNumber, { color: colors.green }]}>{presentCount}</Text>
                <Text style={styles.statLabel}>Present</Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: '#E74C3C15', borderWidth: 1, borderColor: '#E74C3C' }]}>
                <Text style={[styles.statNumber, { color: '#E74C3C' }]}>{absentCount}</Text>
                <Text style={styles.statLabel}>Absent</Text>
              </View>
            </View>

            {absentStudents.length > 0 ? (
              <View style={styles.absentList}>
                <Text style={styles.absentTitle}>❌ Absent Students ({absentStudents.length})</Text>
                {absentStudents.map(student => (
                  <View key={student.id} style={styles.absentItem}>
                    <Text style={styles.absentName}>{student.first_name} {student.last_name}</Text>
                    <Text style={styles.absentRoll}>Roll: {student.roll_number}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.allPresentText}>🎉 All students are marked present today!</Text>
            )}

            <TouchableOpacity 
              style={[styles.saveButton, { backgroundColor: colors.green }]}
              onPress={finishAndSave}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>
                {saving ? 'Saving...' : '✓ Submit & Send Parent Alerts'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const currentStudent = students[currentIndex];
  const progress = ((currentIndex) / students.length) * 100;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attendance: Class {className}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: colors.teal }]} />
        </View>
        <Text style={styles.progressText}>
          Student {currentIndex + 1} of {students.length}
        </Text>
      </View>

      <View style={styles.studentCard}>
        <View style={styles.studentAvatar}>
          <Text style={styles.avatarEmoji}>👤</Text>
        </View>
        
        <Text style={styles.studentName}>
          {currentStudent.first_name} {currentStudent.last_name}
        </Text>
        
        <View style={styles.studentDetails}>
          <Text style={styles.detailText}>Roll No: {currentStudent.roll_number}</Text>
          <Text style={styles.detailText}>ID: {currentStudent.unique_id ? currentStudent.unique_id.replace('ID:', '') : ''}</Text>
        </View>

        {/* Large bordered square cards layout */}
        <View style={styles.attendanceButtons}>
          <TouchableOpacity 
            style={[styles.squareCardButton, { borderColor: colors.green }]}
            onPress={markPresent}
          >
            <Text style={styles.buttonEmoji}>🟢</Text>
            <Text style={[styles.buttonLabel, { color: colors.green }]}>PRESENT</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.squareCardButton, { borderColor: '#E74C3C' }]}
            onPress={markAbsent}
          >
            <Text style={styles.buttonEmoji}>🔴</Text>
            <Text style={[styles.buttonLabel, { color: '#E74C3C' }]}>ABSENT</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={skipForNow} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.green }]} />
          <Text style={styles.legendText}>Present</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#E74C3C' }]} />
          <Text style={styles.legendText}>Absent</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.gray }]} />
          <Text style={styles.legendText}>Not marked</Text>
        </View>
      </View>
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
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 18,
    color: colors.gray,
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
    marginBottom: 20,
  },
  backToClassButton: {
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backToClassText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.lightGray,
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: colors.gray,
    textAlign: 'right',
  },
  studentCard: {
    backgroundColor: colors.white,
    margin: 20,
    padding: 25,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: colors.lightGray
  },
  studentAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatarEmoji: {
    fontSize: 40,
  },
  studentName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
  },
  studentDetails: {
    alignItems: 'center',
    marginBottom: 25,
  },
  detailText: {
    fontSize: 16,
    color: colors.gray,
    marginBottom: 4,
  },
  attendanceButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 15,
    paddingHorizontal: 10
  },
  squareCardButton: {
    width: 125,
    height: 125,
    borderWidth: 4,
    borderRadius: 15,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    marginHorizontal: 10
  },
  buttonEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  skipButton: {
    paddingVertical: 10,
  },
  skipText: {
    color: colors.gray,
    fontSize: 14,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 5,
  },
  legendText: {
    fontSize: 12,
    color: colors.text,
  },
  summaryContainer: {
    flex: 1,
    padding: 20,
  },
  summaryCard: {
    backgroundColor: colors.white,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statBox: {
    width: '44%',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: colors.text,
  },
  absentList: {
    marginTop: 15,
    marginBottom: 20,
  },
  absentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 10,
  },
  absentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  absentName: {
    fontSize: 14,
    color: colors.text,
  },
  absentRoll: {
    fontSize: 12,
    color: colors.gray,
  },
  allPresentText: {
    fontSize: 16,
    textAlign: 'center',
    color: colors.green,
    fontWeight: '600',
    marginVertical: 20
  },
  saveButton: {
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});