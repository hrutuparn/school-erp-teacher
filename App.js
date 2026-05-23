import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import TeacherLoginScreen from './src/screens/TeacherLoginScreen';
import StudentScreen from './src/screens/StudentScreen';
import AttendanceScreen from './src/screens/AttendanceScreen';
import ChatScreen from './src/screens/ChatScreen';
import { supabase } from './src/services/supabase';
import colors from './src/components/colors';

// Teacher Dashboard with navigation
function TeacherDashboard({ onLogout, onNavigate, teacherClass }) {
  return (
    <SafeAreaView style={styles.container}>
      <ExpoStatusBar style="dark" />
      <View style={styles.dashboardHeader}>
        <View style={styles.headerRow}>
          <Text style={styles.dashboardTitle}>Teacher Dashboard</Text>
          <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>🚪</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.dashboardContent}>
        <Text style={styles.welcomeText}>Welcome, Teacher! 👩‍🏫</Text>
        <Text style={styles.subText}>What would you like to do today?</Text>
        
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={[styles.actionCard, { backgroundColor: colors.teal }]}
            onPress={() => onNavigate('students')}
          >
            <Text style={styles.actionEmoji}>👥</Text>
            <Text style={styles.actionText}>Manage Students</Text>
            <Text style={styles.actionSubtext}>Add or view students</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionCard, { backgroundColor: colors.orange }]}
            onPress={() => onNavigate('attendance')}
          >
            <Text style={styles.actionEmoji}>✅</Text>
            <Text style={styles.actionText}>Take Attendance</Text>
            <Text style={styles.actionSubtext}>Mark present/absent</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionCard, { backgroundColor: colors.purple }]}
            onPress={() => onNavigate('chat')}
          >
            <Text style={styles.actionEmoji}>💬</Text>
            <Text style={styles.actionText}>Chat with Parents</Text>
            <Text style={styles.actionSubtext}>Send messages</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionCard, { backgroundColor: colors.green }]}
            onPress={() => Alert.alert('Coming Soon', 'Homework feature coming soon!')}
          >
            <Text style={styles.actionEmoji}>📝</Text>
            <Text style={styles.actionText}>Homework</Text>
            <Text style={styles.actionSubtext}>Assign homework</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('dashboard');
  const [teacherClass, setTeacherClass] = useState('');
  const [teacherId, setTeacherId] = useState(null);

  // Function to fetch teacher data after login
  const fetchTeacherData = async (email) => {
    try {
      // Get teacher record using email
      const { data: teacherData, error: teacherError } = await supabase
        .from('teachers')
        .select('id')
        .eq('email', email)
        .single();

      if (teacherError || !teacherData) {
        console.log('Teacher not found for email:', email);
        return;
      }

      setTeacherId(teacherData.id);

      // Get the teacher's assigned class from class_teachers
      const { data: classData, error: classError } = await supabase
        .from('class_teachers')
        .select('class_name')
        .eq('teacher_id', teacherData.id)
        .single();

      if (classData) {
        setTeacherClass(classData.class_name);
      } else {
        console.log('No class assigned to this teacher');
      }
    } catch (error) {
      console.log('Error fetching teacher data:', error.message);
    }
  };

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      if (session) {
        fetchTeacherData(session.user.email);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      if (session) {
        fetchTeacherData(session.user.email);
      } else {
        setTeacherClass('');
        setTeacherId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!isAuthenticated) {
    return <TeacherLoginScreen onLogin={() => setIsAuthenticated(true)} />;
  }

  // Show different screens based on navigation
  switch (currentScreen) {
    case 'students':
      return <StudentScreen onBack={() => setCurrentScreen('dashboard')} classFilter={teacherClass} />;
    case 'attendance':
      return <AttendanceScreen onBack={() => setCurrentScreen('dashboard')} />;
    case 'chat':
      return <ChatScreen onBack={() => setCurrentScreen('dashboard')} teacherId={teacherId} />;
    default:
      return (
        <TeacherDashboard
          onLogout={() => setIsAuthenticated(false)}
          onNavigate={setCurrentScreen}
          teacherClass={teacherClass}
        />
      );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  dashboardHeader: {
    backgroundColor: colors.white,
    padding: 20,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dashboardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 20,
  },
  dashboardContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
  },
  subText: {
    fontSize: 16,
    color: colors.gray,
    textAlign: 'center',
    marginBottom: 20,
  },
  quickActions: {
    width: '100%',
    marginTop: 20,
  },
  actionCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionEmoji: {
    fontSize: 40,
    marginBottom: 10,
  },
  actionText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 5,
  },
  actionSubtext: {
    fontSize: 12,
    color: colors.white,
    opacity: 0.9,
  },
});