import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Alert,
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import { supabase } from '../services/supabase';
import colors from '../components/colors';

export default function AttendanceHistoryScreen({ onBack, className = "10A" }) {
  const [datesList, setDatesList] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  
  const [loadingDates, setLoadingDates] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchUniqueDates();
  }, [className]);

  async function fetchUniqueDates() {
    setLoadingDates(true);
    try {
      // Fetch dates where attendance was recorded for this class
      const { data, error } = await supabase
        .from('student_attendance')
        .select('date')
        .eq('class_name', className);

      if (error) throw error;

      // Extract unique dates and sort descending
      const unique = [...new Set((data || []).map(item => item.date))];
      unique.sort((a, b) => new Date(b) - new Date(a));
      setDatesList(unique);
    } catch (e) {
      Alert.alert('Error', 'Failed to retrieve attendance logs.');
      console.log(e);
    } finally {
      setLoadingDates(false);
    }
  }

  const handleSelectDate = async (date) => {
    setSelectedDate(date);
    setLoadingDetails(true);
    try {
      // Join to students table to get names & rolls
      const { data, error } = await supabase
        .from('student_attendance')
        .select(`
          status,
          student_id,
          students:student_id ( id, first_name, last_name, roll_number )
        `)
        .eq('class_name', className)
        .eq('date', date);

      if (error) throw error;

      // Sort by roll number
      const sorted = (data || []).sort((a, b) => {
        const rollA = parseInt(a.students?.roll_number) || 999;
        const rollB = parseInt(b.students?.roll_number) || 999;
        return rollA - rollB;
      });

      setAttendanceRecords(sorted);
    } catch (e) {
      Alert.alert('Error', 'Failed to load details.');
      console.log(e);
    } finally {
      setLoadingDetails(false);
    }
  };

  if (loadingDates) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.orange} />
          <Text style={{ marginTop: 15, color: colors.gray }}>Retrieving Class Dates...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render Daily Attendance Sheet Overlay
  if (selectedDate) {
    const presentCount = attendanceRecords.filter(r => r.status === 'present').length;
    const absentCount = attendanceRecords.filter(r => r.status === 'absent').length;

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedDate(null)} style={styles.backButton}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.headerTitle}>Class {className} Log</Text>
            <Text style={styles.headerSubtitle}>Date: {selectedDate}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {loadingDetails ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={colors.teal} />
            <Text style={{ marginTop: 15, color: colors.gray }}>Loading attendance log...</Text>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            {/* Summary Banner */}
            <View style={styles.summaryBanner}>
              <View style={[styles.summaryItem, { backgroundColor: colors.green + '15', borderColor: colors.green }]}>
                <Text style={[styles.summaryNumber, { color: colors.green }]}>{presentCount}</Text>
                <Text style={styles.summaryLabel}>Present</Text>
              </View>
              <View style={[styles.summaryItem, { backgroundColor: '#E74C3C15', borderColor: '#E74C3C' }]}>
                <Text style={[styles.summaryNumber, { color: '#E74C3C' }]}>{absentCount}</Text>
                <Text style={styles.summaryLabel}>Absent</Text>
              </View>
            </View>

            <FlatList
              data={attendanceRecords}
              keyExtractor={(item, index) => index.toString()}
              contentContainerStyle={{ padding: 15 }}
              renderItem={({ item }) => {
                const s = item.students || { first_name: 'Student', last_name: item.student_id, roll_number: '?' };
                const isPresent = item.status === 'present';
                return (
                  <View style={styles.studentRow}>
                    <View style={styles.studentInfo}>
                      <Text style={styles.rollBadge}>#{s.roll_number}</Text>
                      <Text style={styles.studentName}>{s.first_name} {s.last_name}</Text>
                    </View>
                    <View style={[
                      styles.statusIndicator,
                      isPresent ? styles.statusPresent : styles.statusAbsent
                    ]}>
                      <Text style={[
                        styles.statusText,
                        isPresent ? { color: colors.green } : { color: '#E74C3C' }
                      ]}>
                        {isPresent ? '🟢 PRESENT' : '🔴 ABSENT'}
                      </Text>
                    </View>
                  </View>
                );
              }}
            />
          </View>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📅 Attendance History</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={datesList}
        keyExtractor={item => item}
        contentContainerStyle={{ padding: 15 }}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.dateCard}
            onPress={() => handleSelectDate(item)}
          >
            <View style={styles.dateCardLeft}>
              <Text style={styles.calendarEmoji}>📅</Text>
              <Text style={styles.dateText}>{item}</Text>
            </View>
            <Text style={styles.arrowIcon}>→</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyText}>No attendance records found for Class {className}.</Text>
          </View>
        }
      />
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
  headerSubtitle: {
    fontSize: 11,
    color: colors.gray,
    marginTop: 2,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: 18,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.lightGray,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dateCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calendarEmoji: {
    fontSize: 22,
    marginRight: 15,
  },
  dateText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  arrowIcon: {
    fontSize: 16,
    color: colors.gray,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 80,
  },
  emptyEmoji: {
    fontSize: 60,
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 14,
    color: colors.gray,
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  summaryBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  summaryItem: {
    width: '48%',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  summaryLabel: {
    fontSize: 11,
    color: colors.text,
    marginTop: 2,
  },
  studentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.lightGray,
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 10,
  },
  rollBadge: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.teal,
    backgroundColor: colors.teal + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 12,
  },
  studentName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text,
  },
  statusIndicator: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  statusPresent: {
    backgroundColor: colors.green + '15',
  },
  statusAbsent: {
    backgroundColor: '#E74C3C15',
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
});
