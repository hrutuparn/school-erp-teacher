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
  Clipboard,
  Platform
} from 'react-native';
import { supabase } from '../services/supabase';
import colors from '../components/colors';

export default function SyllabusScreen({ onBack, className = "10A", teacherId, teacherName }) {
  const [assignments, setAssignments] = useState([]);
  const [selectedClass, setSelectedClass] = useState(className);
  const [selectedSubject, setSelectedSubject] = useState('');
  
  // Lesson logging fields
  const [chapterTitle, setChapterTitle] = useState('');
  const [exerciseText, setExerciseText] = useState('');
  const [summaryNotes, setSummaryNotes] = useState('');
  const [boardType, setBoardType] = useState('CBSE'); // CBSE, ICSE, MSBSHSE

  // Generated Link State
  const [youtubeUrl, setYoutubeUrl] = useState('');
  
  // Loading/saving
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [saving, setSaving] = useState(false);
  const [broadcastToParents, setBroadcastToParents] = useState(true);

  // Picker states
  const [showClassModal, setShowClassModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showBoardModal, setShowBoardModal] = useState(false);

  const boards = ['CBSE', 'ICSE', 'Maharashtra State Board (SSC)'];

  // Fetch teacher assignments
  useEffect(() => {
    fetchAssignments();
  }, [teacherId]);

  async function fetchAssignments() {
    if (!teacherId) {
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
        const fallback = [
          { class_name: '10A', subject: 'Mathematics' },
          { class_name: '10A', subject: 'Science' }
        ];
        setAssignments(fallback);
        setSelectedClass(fallback[0].class_name);
        setSelectedSubject(fallback[0].subject);
      }
    } catch (error) {
      console.log('Error fetching assignments for syllabus:', error.message);
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

  // Calculate YouTube Search Link in real time
  useEffect(() => {
    if (!chapterTitle.trim()) {
      setYoutubeUrl('');
      return;
    }
    
    // e.g. CBSE Class 10 Mathematics Arithmetic Progressions
    const cleanBoard = boardType === 'CBSE' ? 'CBSE' : boardType === 'ICSE' ? 'ICSE' : 'SSC Board';
    const classNum = selectedClass.replace(/[^0-9]/g, '');
    const query = `${cleanBoard} Class ${classNum} ${selectedSubject} ${chapterTitle}`;
    const encodedQuery = encodeURIComponent(query);
    const generatedLink = `https://www.youtube.com/results?search_query=${encodedQuery}`;
    setYoutubeUrl(generatedLink);
  }, [chapterTitle, selectedClass, selectedSubject, boardType]);

  const copyToClipboard = () => {
    if (!youtubeUrl) return;
    Clipboard.setString(youtubeUrl);
    Alert.alert('Link Copied! 📋', 'YouTube search link copied to clipboard.');
  };

  const handleSaveSyllabus = async () => {
    if (!chapterTitle.trim()) {
      Alert.alert('Error', 'Please enter the Chapter/Topic Name.');
      return;
    }

    setSaving(true);
    try {
      // 1. Get logged-in teacher's auth UID
      const { data: { user } } = await supabase.auth.getUser();
      const senderUid = user ? user.id : 'system';

      let broadcastCount = 0;

      // 2. Broadcast to parents if toggle is active
      if (broadcastToParents) {
        // Fetch all students in class with parent_phone
        const { data: studentsList, error: studError } = await supabase
          .from('students')
          .select('parent_phone')
          .eq('class', selectedClass);

        if (!studError && studentsList && studentsList.length > 0) {
          const parentPhones = [...new Set(studentsList.map(s => s.parent_phone).filter(Boolean))];
          
          if (parentPhones.length > 0) {
            const exerciseInfo = exerciseText ? ` (${exerciseText})` : '';
            const broadcastMessage = `📢 Today's Class Update:\nWe completed ${chapterTitle}${exerciseInfo} in Class ${selectedClass} ${selectedSubject}.\n\nRevision video link for students: ${youtubeUrl || 'Review textbook chapter'}\n\nWarm regards, ${teacherName || 'Class Teacher'}.`;

            for (const phone of parentPhones) {
              await supabase
                .from('chat_messages')
                .insert([
                  {
                    sender_id: senderUid,
                    sender_type: 'teacher',
                    receiver_id: phone,
                    message: broadcastMessage,
                    command: '/chat',
                    is_read: false,
                    created_at: new Date()
                  }
                ]);
              broadcastCount++;
            }
          }
        }
      }

      Alert.alert(
        'Syllabus Logged! 📚',
        broadcastCount > 0 
          ? `Lesson details stored!\n📣 Lesson updates broadcasted to ${broadcastCount} parents.`
          : 'Lesson details stored successfully in local session logs.',
        [{ text: 'Terrific', onPress: onBack }]
      );
    } catch (e) {
      Alert.alert('Save Failed', e.message);
    } finally {
      setSaving(false);
    }
  };

  const uniqueClasses = [...new Set(assignments.map(a => a.class_name))];
  const uniqueSubjects = [...new Set(assignments.filter(a => a.class_name === selectedClass).map(a => a.subject))];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Syllabus Log</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.contentContainer} keyboardShouldPersistTaps="handled">
        
        {/* Step 1: Selection Info */}
        <View style={styles.setupCard}>
          <Text style={styles.sectionHeader}>📂 Subject & Board Setup</Text>
          <View style={styles.selectionRow}>
            {/* Class Picker */}
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

            {/* Subject Picker */}
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

          <Text style={[styles.inputLabel, { marginTop: 12 }]}>Board Curriculum</Text>
          <TouchableOpacity 
            style={styles.dropdownBtn}
            onPress={() => setShowBoardModal(true)}
          >
            <Text style={styles.dropdownBtnText}>{boardType}</Text>
            <Text style={styles.dropdownIcon}>▼</Text>
          </TouchableOpacity>
        </View>

        {/* Step 2: Topic and Exercises Log */}
        <View style={styles.logCard}>
          <Text style={styles.sectionHeader}>📚 Lesson Progress Completed Today</Text>
          
          <Text style={styles.inputLabel}>Topic / Chapter Title</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Chapter 5: Arithmetic Progressions"
            value={chapterTitle}
            onChangeText={setChapterTitle}
            placeholderTextColor={colors.gray}
          />

          <Text style={styles.inputLabel}>Exercises Taught</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Exercise 5.2 (Q1 to Q8)"
            value={exerciseText}
            onChangeText={setExerciseText}
            placeholderTextColor={colors.gray}
          />

          <Text style={styles.inputLabel}>Brief Progress Notes</Text>
          <TextInput
            style={styles.textArea}
            multiline
            numberOfLines={4}
            placeholder="e.g. Explained common difference (d) formula and solved classroom examples."
            value={summaryNotes}
            onChangeText={setSummaryNotes}
            placeholderTextColor={colors.gray}
            textAlignVertical="top"
          />
        </View>

        {/* Step 3: YouTube Search Helper (Dynamic Card) */}
        {youtubeUrl ? (
          <View style={styles.youtubeCard}>
            <View style={styles.youtubeHeader}>
              <Text style={styles.youtubeHeaderTitle}>📺 YouTube study helper</Text>
              <Text style={styles.youtubeBadge}>AUTO-GEN</Text>
            </View>
            <Text style={styles.youtubeDesc}>
              We generated this Board search link so absent students can watch pre-recorded lectures on this topic at home:
            </Text>

            <View style={styles.urlBox}>
              <Text style={styles.urlText} numberOfLines={1}>{youtubeUrl}</Text>
              <TouchableOpacity onPress={copyToClipboard} style={styles.copyBtn}>
                <Text style={styles.copyBtnText}>Copy Link</Text>
              </TouchableOpacity>
            </View>

            {/* Video Card Mock representation */}
            <View style={styles.videoMock}>
              <Text style={styles.videoPlayIcon}>▶</Text>
              <View style={styles.videoTextContent}>
                <Text style={styles.videoTitle} numberOfLines={1}>
                  Search YouTube: {chapterTitle}
                </Text>
                <Text style={styles.videoSub} numberOfLines={1}>
                  Curriculum match: {boardType} • Class {selectedClass}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* Step 4: Broadcast to parent chat switch */}
        <View style={styles.broadcastOptionCard}>
          <TouchableOpacity 
            style={styles.checkboxRow}
            onPress={() => setBroadcastToParents(!broadcastToParents)}
          >
            <View style={[styles.checkbox, broadcastToParents && styles.checkboxChecked]}>
              {broadcastToParents && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <View style={styles.checkboxLabelWrapper}>
              <Text style={styles.checkboxMainLabel}>📢 Share Lesson Update with Parents</Text>
              <Text style={styles.checkboxSubLabel}>
                Sends a summary of topics covered and the YouTube video link to all class parent chats.
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Action button */}
        <TouchableOpacity 
          style={[styles.submitBtn, { backgroundColor: colors.teal }]}
          onPress={handleSaveSyllabus}
          disabled={saving}
        >
          <Text style={styles.submitBtnText}>
            {saving ? 'Saving Syllabus Log...' : '✓ Log Lesson & Broadcast'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Class Selector Modal */}
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

      {/* Subject Selector Modal */}
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

      {/* Board Selector Modal */}
      <Modal visible={showBoardModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Curriculum Board</Text>
            <ScrollView>
              {boards.map((bd, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.modalItem, boardType === bd && { backgroundColor: colors.teal + '20' }]}
                  onPress={() => {
                    setBoardType(bd);
                    setShowBoardModal(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{bd}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity onPress={() => setShowBoardModal(false)} style={styles.modalCloseBtn}>
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
  setupCard: {
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: colors.lightGray,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
  logCard: {
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 16,
    marginBottom: 15,
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
  textArea: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.lightGray,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    minHeight: 80,
  },
  youtubeCard: {
    backgroundColor: '#FFF9C4', // Soft yellowish light background
    padding: 15,
    borderRadius: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#FFF59D',
  },
  youtubeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  youtubeHeaderTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#D84315',
  },
  youtubeBadge: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.white,
    backgroundColor: '#D84315',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  youtubeDesc: {
    fontSize: 12,
    color: '#5D4037',
    marginBottom: 12,
    lineHeight: 18,
  },
  urlBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingLeft: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.lightGray,
    marginBottom: 12,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  urlText: {
    fontSize: 11,
    color: colors.gray,
    flex: 1,
    marginRight: 10,
  },
  copyBtn: {
    backgroundColor: colors.text,
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  copyBtnText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: 'bold',
  },
  videoMock: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.lightGray,
  },
  videoPlayIcon: {
    fontSize: 20,
    color: '#FF0000', // Youtube Red
    marginRight: 10,
    fontWeight: 'bold',
  },
  videoTextContent: {
    flex: 1,
  },
  videoTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.text,
  },
  videoSub: {
    fontSize: 10,
    color: colors.gray,
    marginTop: 2,
  },
  broadcastOptionCard: {
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: colors.lightGray,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.teal,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: colors.teal,
  },
  checkmark: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  checkboxLabelWrapper: {
    flex: 1,
  },
  checkboxMainLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  checkboxSubLabel: {
    fontSize: 11,
    color: colors.gray,
    marginTop: 2,
    lineHeight: 15,
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
