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
  Image,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { supabase } from '../services/supabase';
import colors from '../components/colors';

export default function HomeworkScreen({ onBack, teacherId }) {
  const [assignments, setAssignments] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  
  // Homework details
  const [topic, setTopic] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [contentType, setContentType] = useState('text'); // text, photo, voice, preloaded
  const [textContent, setTextContent] = useState('');
  
  // Photo Simulation
  const [photoCaptured, setPhotoCaptured] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');
  
  // Voice Simulation
  const [recording, setRecording] = useState(false);
  const [voiceDuration, setVoiceDuration] = useState(0);
  const [voiceUrl, setVoiceUrl] = useState('');
  const [playingVoice, setPlayingVoice] = useState(false);
  
  // Preloaded Q&A Selection
  const [selectedChapter, setSelectedChapter] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState('');

  // States
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dropdowns modals
  const [showClassModal, setShowClassModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showChapterModal, setShowChapterModal] = useState(false);

  // Chapters & Q&A mock bank
  const chapterBank = [
    {
      no: 1,
      name: 'Arithmetic Progressions',
      questions: [
        'Find the 20th term of the AP: 2, 7, 12, ...',
        'How many three-digit numbers are divisible by 7?',
        'Determine the sum of the first 40 positive integers divisible by 6.'
      ]
    },
    {
      no: 2,
      name: 'Quadratic Equations',
      questions: [
        'Find the roots of the quadratic equation 2x² - 5x + 3 = 0.',
        'State whether the equation x² - 4x + 4 = 0 has real roots.',
        'The sum of the areas of two squares is 468 m². Find their sides if difference of perimeters is 24m.'
      ]
    },
    {
      no: 3,
      name: 'Life Processes',
      questions: [
        'Draw a neat labeled diagram of the human digestive system.',
        'Explain the process of photosynthesis in green plants.',
        'What are the differences between aerobic and anaerobic respiration?'
      ]
    }
  ];

  // Set default due date to tomorrow
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDueDate(tomorrow.toISOString().split('T')[0]);
  }, []);

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
      console.log('Error assignments homework:', error.message);
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

  // Handle Simulated Blackboard Capture
  const handleCapturePhoto = () => {
    Alert.alert('📸 Camera Active', 'Simulating high-quality blackboard auto-scan...', [
      {
        text: 'Capture',
        onPress: () => {
          setPhotoCaptured(true);
          // Standard placeholder blackboard representation
          setPhotoUrl('https://images.unsplash.com/photo-1571844307560-f4797c7db814?q=80&w=600');
        }
      }
    ]);
  };

  // Voice Note Simulation
  const toggleRecording = () => {
    if (recording) {
      // stop recording
      setRecording(false);
      setVoiceUrl('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'); // Mock audio link
    } else {
      // start recording
      setRecording(true);
      setVoiceDuration(0);
      setVoiceUrl('');
    }
  };

  useEffect(() => {
    let timer;
    if (recording) {
      timer = setInterval(() => {
        setVoiceDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [recording]);

  const handlePlayVoice = () => {
    setPlayingVoice(true);
    setTimeout(() => {
      setPlayingVoice(false);
    }, 5000);
  };

  // Save Homework to Supabase
  const handleSaveHomework = async () => {
    if (!topic.trim()) {
      Alert.alert('Error', 'Please enter a Topic Name for the homework.');
      return;
    }

    if (!dueDate.trim()) {
      Alert.alert('Error', 'Please enter a valid Due Date.');
      return;
    }

    setSaving(true);
    try {
      let schoolId = 'SCH_MH_27430012';
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

      // Check content logic
      let textToSave = textContent;
      if (contentType === 'preloaded') {
        textToSave = selectedQuestion ? `From Chapter ${selectedChapter}:\n${selectedQuestion}` : '';
      }

      const homeworkRecord = {
        school_id: schoolId,
        class_name: selectedClass,
        teacher_id: teacherId || null,
        subject: selectedSubject,
        assigned_date: new Date().toISOString().split('T')[0],
        due_date: dueDate,
        content_type: contentType,
        text_content: textToSave || null,
        photo_url: contentType === 'photo' ? photoUrl : null,
        voice_url: contentType === 'voice' ? voiceUrl : null,
        chapter_no: contentType === 'preloaded' ? parseInt(selectedChapter) : null,
        chapter_name: contentType === 'preloaded' ? chapterBank.find(c => c.no === selectedChapter)?.name : null
      };

      const { error } = await supabase
        .from('homework')
        .insert([homeworkRecord]);

      if (error) throw error;

      Alert.alert(
        'Homework Assigned! 📝',
        'Your students and their parents have been notified about the new task.',
        [{ text: 'Superb', onPress: onBack }]
      );
    } catch (error) {
      console.log('Error creating homework:', error.message);
      Alert.alert('Upload Failed', error.message);
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
        <Text style={styles.headerTitle}>Homework Board</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.contentContainer} keyboardShouldPersistTaps="handled">
          
          {/* Section: Configuration */}
          <View style={styles.setupCard}>
            <Text style={styles.sectionHeader}>📋 Task Configuration</Text>
            
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

            <Text style={[styles.inputLabel, { marginTop: 10 }]}>General Topic Title</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Quadratic Equations Problems"
              value={topic}
              onChangeText={setTopic}
              placeholderTextColor={colors.gray}
            />

            <Text style={styles.inputLabel}>Due Date</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              value={dueDate}
              onChangeText={setDueDate}
              placeholderTextColor={colors.gray}
            />
          </View>

          {/* Section: Content Creation Tabs */}
          <View style={styles.tabsCard}>
            <Text style={styles.sectionHeader}>📂 Choose Content Type</Text>
            
            {/* Tabs Row */}
            <View style={styles.tabsRow}>
              <TouchableOpacity 
                style={[styles.tabItem, contentType === 'text' && styles.activeTabItem]}
                onPress={() => setContentType('text')}
              >
                <Text style={[styles.tabText, contentType === 'text' && styles.activeTabText]}>💬 Text</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tabItem, contentType === 'photo' && styles.activeTabItem]}
                onPress={() => setContentType('photo')}
              >
                <Text style={[styles.tabText, contentType === 'photo' && styles.activeTabText]}>📸 Board</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tabItem, contentType === 'voice' && styles.activeTabItem]}
                onPress={() => setContentType('voice')}
              >
                <Text style={[styles.tabText, contentType === 'voice' && styles.activeTabText]}>🎙️ Voice</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tabItem, contentType === 'preloaded' && styles.activeTabItem]}
                onPress={() => setContentType('preloaded')}
              >
                <Text style={[styles.tabText, contentType === 'preloaded' && styles.activeTabText]}>📚 Q&A</Text>
              </TouchableOpacity>
            </View>

            {/* Tab 1 Content: Text editor */}
            {contentType === 'text' && (
              <View style={styles.tabContentContainer}>
                <Text style={styles.tabHeading}>Write Assignment Description</Text>
                <TextInput
                  style={styles.textArea}
                  multiline
                  numberOfLines={6}
                  placeholder="Type homework tasks here..."
                  value={textContent}
                  onChangeText={setTextContent}
                  placeholderTextColor={colors.gray}
                  textAlignVertical="top"
                />
              </View>
            )}

            {/* Tab 2 Content: Board Photo simulator */}
            {contentType === 'photo' && (
              <View style={styles.tabContentContainer}>
                <Text style={styles.tabHeading}>Blackboard Photo Upload</Text>
                <Text style={styles.tabDesc}>
                  Quickly capture class blackboard work. Students can zoom and reference the text directly.
                </Text>

                {photoCaptured ? (
                  <View style={styles.photoContainer}>
                    {/* Simulated Chalkboard */}
                    <View style={styles.chalkboard}>
                      <View style={styles.woodBorder}>
                        <Text style={styles.chalkText}>📚 Homework Task ✍️</Text>
                        <Text style={styles.chalkSubText}>Class: {selectedClass} - {selectedSubject}</Text>
                        <Text style={styles.chalkBody}>
                          Solve Ex 4.2 Page 88{'\n'}
                          Q1. Find roots using factorization.{'\n'}
                          Q3. Find numbers whose sum is 27.
                        </Text>
                        <Text style={styles.chalkSignature}>- {selectedSubject} Teacher</Text>
                      </View>
                    </View>
                    <TouchableOpacity 
                      style={styles.retakeBtn}
                      onPress={handleCapturePhoto}
                    >
                      <Text style={styles.retakeBtnText}>🔄 Scan Again</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={styles.captureButton}
                    onPress={handleCapturePhoto}
                  >
                    <Text style={styles.captureBtnText}>📸 Capture Blackboard Work</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Tab 3 Content: Voice recording simulator */}
            {contentType === 'voice' && (
              <View style={styles.tabContentContainer}>
                <Text style={styles.tabHeading}>Voice Note Instruction</Text>
                <Text style={styles.tabDesc}>
                  Record audio instructions for pronunciation or explanations.
                </Text>

                <View style={styles.audioControls}>
                  {recording ? (
                    <View style={styles.recordingSection}>
                      <Text style={styles.recordingLabel}>🛑 RECORDING ACTIVE</Text>
                      <Text style={styles.recordingTimer}>
                        00:{voiceDuration.toString().padStart(2, '0')}
                      </Text>
                      {/* Animated wave simulation */}
                      <View style={styles.waveBarRow}>
                        {[1, 2, 3, 4, 5, 4, 3, 2, 1, 2, 3, 4, 5].map((h, i) => (
                          <View 
                            key={i} 
                            style={[
                              styles.waveBar, 
                              { height: 10 + (Math.sin(voiceDuration + i) + 1.2) * 12 }
                            ]} 
                          />
                        ))}
                      </View>
                    </View>
                  ) : voiceUrl ? (
                    <View style={styles.playSection}>
                      <Text style={styles.recordingTimer}>🔈 Voice Instruction Ready</Text>
                      <TouchableOpacity 
                        style={[styles.audioPlayBtn, playingVoice && { backgroundColor: colors.gray }]}
                        onPress={handlePlayVoice}
                        disabled={playingVoice}
                      >
                        <Text style={styles.audioPlayBtnText}>
                          {playingVoice ? '🔊 Playing Audio...' : '▶ Play Recording'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}

                  <TouchableOpacity 
                    style={[styles.recordBtn, recording && { backgroundColor: '#E74C3C' }]}
                    onPress={toggleRecording}
                  >
                    <Text style={styles.recordBtnText}>
                      {recording ? 'Stop Recording' : '🎙️ Start Recording'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Tab 4 Content: Textbook Q&A dropdowns */}
            {contentType === 'preloaded' && (
              <View style={styles.tabContentContainer}>
                <Text style={styles.tabHeading}>Preloaded Chapter Q&A</Text>
                <Text style={styles.tabDesc}>
                  Pick verified syllabus questions from textbook chapters.
                </Text>

                <Text style={styles.inputLabel}>Select Chapter</Text>
                <TouchableOpacity 
                  style={styles.dropdownBtn}
                  onPress={() => setShowChapterModal(true)}
                >
                  <Text style={styles.dropdownBtnText}>
                    {selectedChapter ? `Chapter ${selectedChapter}: ${chapterBank.find(c => c.no === selectedChapter)?.name}` : 'Select Chapter'}
                  </Text>
                  <Text style={styles.dropdownIcon}>▼</Text>
                </TouchableOpacity>

                {selectedChapter ? (
                  <View style={styles.questionsContainer}>
                    <Text style={[styles.inputLabel, { marginTop: 15 }]}>Tap to Select Question</Text>
                    {chapterBank.find(c => c.no === selectedChapter)?.questions.map((q, idx) => (
                      <TouchableOpacity 
                        key={idx}
                        style={[styles.questionChip, selectedQuestion === q && styles.activeQuestionChip]}
                        onPress={() => {
                          setSelectedQuestion(q);
                          setTextContent(q); // Auto-copy to textContent
                        }}
                      >
                        <Text style={[styles.questionChipText, selectedQuestion === q && styles.activeQuestionChipText]}>
                          {q}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}
              </View>
            )}
          </View>

          {/* Submission Button */}
          <TouchableOpacity 
            style={[styles.submitBtn, { backgroundColor: colors.green }]}
            onPress={handleSaveHomework}
            disabled={saving}
          >
            <Text style={styles.submitBtnText}>
              {saving ? 'Uploading Assignment...' : '🚀 Assign Homework'}
            </Text>
          </TouchableOpacity>

          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Class picker modal */}
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

      {/* Subject picker modal */}
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

      {/* Chapter picker modal */}
      <Modal visible={showChapterModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Textbook Chapter</Text>
            <ScrollView>
              {chapterBank.map((ch) => (
                <TouchableOpacity
                  key={ch.no}
                  style={[styles.modalItem, selectedChapter === ch.no && { backgroundColor: colors.teal + '20' }]}
                  onPress={() => {
                    setSelectedChapter(ch.no);
                    setSelectedQuestion('');
                    setShowChapterModal(false);
                  }}
                >
                  <Text style={styles.modalItemText}>Chapter {ch.no}: {ch.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity onPress={() => setShowChapterModal(false)} style={styles.modalCloseBtn}>
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
  input: {
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.lightGray,
    fontSize: 14,
    color: colors.text,
    marginBottom: 10,
  },
  tabsCard: {
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
  tabsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 3,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTabItem: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.gray,
  },
  activeTabText: {
    color: colors.text,
  },
  tabContentContainer: {
    minHeight: 150,
  },
  tabHeading: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  tabDesc: {
    fontSize: 12,
    color: colors.gray,
    marginBottom: 15,
  },
  textArea: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.lightGray,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    minHeight: 120,
  },
  captureButton: {
    backgroundColor: colors.teal,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  captureBtnText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  photoContainer: {
    alignItems: 'center',
  },
  chalkboard: {
    width: '100%',
    aspectRatio: 1.6,
    backgroundColor: '#1E352F', // Slate dark green
    borderRadius: 12,
    borderWidth: 8,
    borderColor: '#7E523A', // Wooden Frame brown
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  woodBorder: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#3D251A',
    borderRadius: 2,
    padding: 5,
  },
  chalkText: {
    color: '#ECEFF1',
    fontFamily: Platform.OS === 'ios' ? 'Chalkboard SE' : 'monospace',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
    textDecorationLine: 'underline',
  },
  chalkSubText: {
    color: '#B0BEC5',
    fontFamily: Platform.OS === 'ios' ? 'Chalkboard SE' : 'monospace',
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 10,
  },
  chalkBody: {
    color: '#ECEFF1',
    fontFamily: Platform.OS === 'ios' ? 'Chalkboard SE' : 'monospace',
    fontSize: 12,
    lineHeight: 18,
  },
  chalkSignature: {
    color: '#ECEFF1',
    fontFamily: Platform.OS === 'ios' ? 'Chalkboard SE' : 'monospace',
    fontSize: 10,
    textAlign: 'right',
    marginTop: 10,
  },
  retakeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: colors.lightGray,
    borderRadius: 8,
    marginTop: 10,
  },
  retakeBtnText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: 'bold',
  },
  audioControls: {
    alignItems: 'center',
    marginVertical: 10,
  },
  recordingSection: {
    alignItems: 'center',
    marginBottom: 15,
  },
  recordingLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#E74C3C',
    letterSpacing: 1,
    marginBottom: 5,
  },
  recordingTimer: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
  },
  waveBarRow: {
    flexDirection: 'row',
    height: 40,
    alignItems: 'center',
  },
  waveBar: {
    width: 3,
    backgroundColor: '#E74C3C',
    marginHorizontal: 2,
    borderRadius: 2,
  },
  playSection: {
    alignItems: 'center',
    marginBottom: 15,
  },
  audioPlayBtn: {
    backgroundColor: colors.teal,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  audioPlayBtnText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 13,
  },
  recordBtn: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    backgroundColor: colors.text,
    borderRadius: 25,
    marginTop: 10,
  },
  recordBtnText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  questionsContainer: {
    marginTop: 5,
  },
  questionChip: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.lightGray,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  activeQuestionChip: {
    backgroundColor: colors.teal + '15',
    borderColor: colors.teal,
  },
  questionChipText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  activeQuestionChipText: {
    color: colors.teal,
    fontWeight: '600',
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
