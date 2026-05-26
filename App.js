import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import TeacherLoginScreen from './src/screens/TeacherLoginScreen';
import StudentScreen from './src/screens/StudentScreen';
import AttendanceScreen from './src/screens/AttendanceScreen';
import ChatScreen from './src/screens/ChatScreen';
import MarksScreen from './src/screens/MarksScreen';
import HomeworkScreen from './src/screens/HomeworkScreen';
import MealScreen from './src/screens/MealScreen';
import SyllabusScreen from './src/screens/SyllabusScreen';
import PrincipalChatScreen from './src/screens/PrincipalChatScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AttendanceHistoryScreen from './src/screens/AttendanceHistoryScreen';
import { supabase } from './src/services/supabase';
import colors from './src/components/colors';

// Teacher Dashboard with navigation grid
function TeacherDashboard({ onLogout, onNavigate, teacherClass, teacherName }) {
  const displayClass = teacherClass || 'Not Assigned';
  const displayName = teacherName || 'Educator';

  return (
    <SafeAreaView style={styles.container}>
      <ExpoStatusBar style="dark" />
      <View style={styles.dashboardHeader}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.dashboardTitle}>Greenfield ERP</Text>
            <Text style={styles.dashboardSubtitle}>Teacher Workspace 👩‍🏫</Text>
          </View>
          <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>🚪</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.welcomeBanner}>
          <Text style={styles.welcomeText}>Hello, {displayName}!</Text>
          <Text style={styles.subText}>Assigned Class Room: <Text style={styles.classBadge}>{displayClass}</Text></Text>
        </View>
        
        <Text style={styles.sectionTitle}>Quick Management Dashboard</Text>
        
        <View style={styles.quickActionsGrid}>
          {/* Row 1 */}
          <TouchableOpacity 
            style={[styles.gridCard, { borderLeftColor: colors.teal }]}
            onPress={() => onNavigate('students')}
          >
            <Text style={styles.cardEmoji}>👥</Text>
            <Text style={styles.cardTitle}>My Students</Text>
            <Text style={styles.cardDesc}>View class list & roll</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.gridCard, { borderLeftColor: colors.orange }]}
            onPress={() => onNavigate('attendance')}
          >
            <Text style={styles.cardEmoji}>✅</Text>
            <Text style={styles.cardTitle}>Take Attendance</Text>
            <Text style={styles.cardDesc}>Daily roll call & SMS</Text>
          </TouchableOpacity>

          {/* Row 2 */}
          <TouchableOpacity 
            style={[styles.gridCard, { borderLeftColor: colors.orange }]}
            onPress={() => onNavigate('attendanceHistory')}
          >
            <Text style={styles.cardEmoji}>📅</Text>
            <Text style={styles.cardTitle}>Attendance Logs</Text>
            <Text style={styles.cardDesc}>View class past records</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.gridCard, { borderLeftColor: colors.teal }]}
            onPress={() => onNavigate('marks')}
          >
            <Text style={styles.cardEmoji}>📊</Text>
            <Text style={styles.cardTitle}>Test Marks</Text>
            <Text style={styles.cardDesc}>Log exams & grades</Text>
          </TouchableOpacity>

          {/* Row 3 */}
          <TouchableOpacity 
            style={[styles.gridCard, { borderLeftColor: colors.green }]}
            onPress={() => onNavigate('homework')}
          >
            <Text style={styles.cardEmoji}>📝</Text>
            <Text style={styles.cardTitle}>Homework</Text>
            <Text style={styles.cardDesc}>Assign files & voice</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.gridCard, { borderLeftColor: colors.orange }]}
            onPress={() => onNavigate('meals')}
          >
            <Text style={styles.cardEmoji}>🍱</Text>
            <Text style={styles.cardTitle}>Mid-Day Meal</Text>
            <Text style={styles.cardDesc}>Track today's allergens</Text>
          </TouchableOpacity>

          {/* Row 4 */}
          <TouchableOpacity 
            style={[styles.gridCard, { borderLeftColor: colors.purple }]}
            onPress={() => onNavigate('chat')}
          >
            <Text style={styles.cardEmoji}>💬</Text>
            <Text style={styles.cardTitle}>Parent Chats</Text>
            <Text style={styles.cardDesc}>Direct messaging feed</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.gridCard, { borderLeftColor: colors.purple }]}
            onPress={() => onNavigate('principalChat')}
          >
            <Text style={styles.cardEmoji}>🏢</Text>
            <Text style={styles.cardTitle}>Principal Chat</Text>
            <Text style={styles.cardDesc}>Direct office connection</Text>
          </TouchableOpacity>

          {/* Row 5 */}
          <TouchableOpacity 
            style={[styles.gridCard, { borderLeftColor: colors.teal }]}
            onPress={() => onNavigate('profile')}
          >
            <Text style={styles.cardEmoji}>👤</Text>
            <Text style={styles.cardTitle}>My Profile</Text>
            <Text style={styles.cardDesc}>Edit info, slips & leaves</Text>
          </TouchableOpacity>

          <View style={{ width: '48%' }} />

          {/* Row 6 (Full Width) */}
          <TouchableOpacity 
            style={[styles.gridCardFull, { borderLeftColor: colors.purple, marginTop: 10 }]}
            onPress={() => onNavigate('syllabus')}
          >
            <View style={styles.fullCardLeft}>
              <Text style={styles.cardEmojiLarge}>📚</Text>
              <View style={styles.fullCardText}>
                <Text style={styles.cardTitle}>Syllabus & YouTube Helper</Text>
                <Text style={styles.cardDesc}>Log progress and share study links with parents</Text>
              </View>
            </View>
            <Text style={styles.arrowIcon}>→</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('dashboard');
  const [teacherClass, setTeacherClass] = useState('');
  const [teacherId, setTeacherId] = useState(null);
  const [teacherName, setTeacherName] = useState('');

  // Function to fetch teacher data after login
  const fetchTeacherData = async (email) => {
    try {
      // Get teacher record using email
      const { data: teacherData, error: teacherError } = await supabase
        .from('teachers')
        .select('id, name')
        .eq('email', email)
        .single();

      if (teacherError || !teacherData) {
        console.log('Teacher profile not found for email:', email);
        return;
      }

      setTeacherId(teacherData.id);
      setTeacherName(teacherData.name);

      // Get the teacher's assigned class from class_teachers
      const { data: classData, error: classError } = await supabase
        .from('class_teachers')
        .select('class_name')
        .eq('teacher_id', teacherData.id)
        .single();

      if (classData) {
        setTeacherClass(classData.class_name);
      } else {
        console.log('No class assigned to this teacher in class_teachers');
        // Fallback search in assignments
        const { data: assignData } = await supabase
          .from('teacher_assignments')
          .select('class_name')
          .eq('teacher_id', teacherData.id)
          .limit(1);
        if (assignData && assignData.length > 0) {
          setTeacherClass(assignData[0].class_name);
        } else {
          setTeacherClass('10A'); // standard default
        }
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
        setTeacherName('');
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
      return (
        <AttendanceScreen 
          onBack={() => setCurrentScreen('dashboard')} 
          className={teacherClass} 
          teacherId={teacherId} 
          teacherName={teacherName} 
        />
      );
    case 'chat':
      return (
        <ChatScreen 
          onBack={() => setCurrentScreen('dashboard')} 
          teacherId={teacherId} 
          teacherClass={teacherClass} 
        />
      );
    case 'marks':
      return <MarksScreen onBack={() => setCurrentScreen('dashboard')} teacherId={teacherId} />;
    case 'homework':
      return <HomeworkScreen onBack={() => setCurrentScreen('dashboard')} teacherId={teacherId} />;
    case 'meals':
      return (
        <MealScreen 
          onBack={() => setCurrentScreen('dashboard')} 
          className={teacherClass} 
          teacherId={teacherId} 
        />
      );
    case 'syllabus':
      return (
        <SyllabusScreen 
          onBack={() => setCurrentScreen('dashboard')} 
          className={teacherClass} 
          teacherId={teacherId} 
          teacherName={teacherName} 
        />
      );
    case 'principalChat':
      return <PrincipalChatScreen onBack={() => setCurrentScreen('dashboard')} teacherId={teacherId} />;
    case 'profile':
      return <ProfileScreen onBack={() => setCurrentScreen('dashboard')} teacherId={teacherId} />;
    case 'attendanceHistory':
      return <AttendanceHistoryScreen onBack={() => setCurrentScreen('dashboard')} className={teacherClass} />;
    default:
      return (
        <TeacherDashboard
          onLogout={() => setIsAuthenticated(false)}
          onNavigate={setCurrentScreen}
          teacherClass={teacherClass}
          teacherName={teacherName}
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
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dashboardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
  },
  dashboardSubtitle: {
    fontSize: 13,
    color: colors.gray,
    marginTop: 2,
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
  scrollContent: {
    padding: 15,
  },
  welcomeBanner: {
    backgroundColor: colors.white,
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.lightGray,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 6,
  },
  subText: {
    fontSize: 14,
    color: colors.gray,
  },
  classBadge: {
    color: colors.teal,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
    paddingLeft: 4,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridCard: {
    width: '48%',
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 5,
    borderWidth: 1,
    borderColor: colors.lightGray,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardEmoji: {
    fontSize: 28,
    marginBottom: 10,
  },
  cardEmojiLarge: {
    fontSize: 32,
    marginRight: 15,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 11,
    color: colors.gray,
    lineHeight: 14,
  },
  gridCardFull: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 5,
    borderWidth: 1,
    borderColor: colors.lightGray,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  fullCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fullCardText: {
    flex: 1,
    paddingRight: 10,
  },
  arrowIcon: {
    fontSize: 18,
    color: colors.gray,
    fontWeight: 'bold',
  },
});