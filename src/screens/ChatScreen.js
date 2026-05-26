import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator
} from 'react-native';
import { supabase } from '../services/supabase';
import colors from '../components/colors';

export default function ChatScreen({ onBack, teacherId, teacherClass }) {
  const [parents, setParents] = useState([]);
  const [classParents, setClassParents] = useState([]);
  const [selectedParent, setSelectedParent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  
  // Search bar
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // 1. Fetch class parents on load
  useEffect(() => {
    fetchClassParents();
  }, [teacherClass]);

  const fetchClassParents = async () => {
    setLoading(true);
    try {
      const activeClass = teacherClass || '10A'; // fallback
      
      // Get all students in the teacher's assigned class
      const { data: studentsData, error: studError } = await supabase
        .from('students')
        .select('parent_name, parent_phone, student_name_full')
        .eq('class', activeClass);

      if (studError) throw studError;

      // Deduplicate parent profiles by phone
      const uniqueParents = [];
      const seen = new Set();
      for (const student of (studentsData || [])) {
        if (student.parent_phone && !seen.has(student.parent_phone)) {
          seen.add(student.parent_phone);
          uniqueParents.push({
            id: student.parent_phone, // Use phone number as the ID!
            name: student.parent_name || `Parent of ${student.student_name_full || 'Student'}`,
            phone: student.parent_phone
          });
        }
      }

      setParents(uniqueParents);
      setClassParents(uniqueParents);
    } catch (error) {
      console.log('Error loading parents list:', error.message);
      Alert.alert('Notice', 'Could not load parent profiles.');
    } finally {
      setLoading(false);
    }
  };

  // Search filter
  const handleSearch = async (text) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setParents(classParents);
      return;
    }

    try {
      // Search students in the system by parent_name or parent_phone
      const { data, error } = await supabase
        .from('students')
        .select('parent_name, parent_phone, student_name_full')
        .or(`parent_name.ilike.%${text}%,parent_phone.like.%${text}%`);

      if (error) throw error;

      // Deduplicate parent profiles by phone
      const uniqueParents = [];
      const seen = new Set();
      for (const student of (data || [])) {
        if (student.parent_phone && !seen.has(student.parent_phone)) {
          seen.add(student.parent_phone);
          uniqueParents.push({
            id: student.parent_phone,
            name: student.parent_name || `Parent of ${student.student_name_full || 'Student'}`,
            phone: student.parent_phone
          });
        }
      }

      setParents(uniqueParents);
    } catch (e) {
      console.log('Search failed:', e.message);
    }
  };

  // 2. Fetch messages between teacher and selected parent
  const fetchMessages = async (parentId) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .or(`and(sender_id.eq.${teacherId},receiver_id.eq.${parentId}),and(sender_id.eq.${parentId},receiver_id.eq.${teacherId})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.log('Error fetching messages:', error.message);
    }
  };

  // 3. Real-time subscription
  useEffect(() => {
    if (!selectedParent) return;

    fetchMessages(selectedParent.id.toString());

    const subscription = supabase
      .channel(`chat-parent-teacher-${teacherId}-${selectedParent.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `receiver_id=eq.${teacherId},sender_id=eq.${selectedParent.id}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => subscription.unsubscribe();
  }, [selectedParent]);

  // 4. Send Message
  const sendMessage = async () => {
    if (!inputText.trim() || !selectedParent) return;

    const command = inputText.match(/^\/(\w+)/)?.[1] || null;

    const newMessage = {
      sender_id: teacherId.toString(),
      sender_type: 'teacher',
      receiver_id: selectedParent.id.toString(),
      message: inputText.trim(),
      command,
      is_read: false,
      created_at: new Date()
    };

    setInputText('');
    setMessages(prev => [...prev, { ...newMessage, id: Date.now() }]);

    try {
      const { error } = await supabase.from('chat_messages').insert([newMessage]);
      if (error) throw error;
    } catch (error) {
      Alert.alert('Error', 'Failed to send');
      setMessages(prev => prev.filter(m => m.id !== newMessage.id));
    }
  };

  const formatTime = (ts) => {
    try {
      return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch(e) {
      return '';
    }
  };

  const getCommandColor = (cmd) => {
    switch(cmd) {
      case 'chat': return colors.teal;
      case 'complaint': return '#E74C3C';
      case 'doubt': return colors.purple;
      case 'request': return colors.green;
      default: return colors.gray;
    }
  };

  if (!selectedParent) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>💬 Parent Chat Feed</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Search bar */}
        <View style={styles.searchBarContainer}>
          <TextInput
            style={styles.searchBarInput}
            placeholder="🔍 Search parents by name or phone..."
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor={colors.gray}
          />
        </View>

        {loading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={colors.teal} />
            <Text style={{ marginTop: 15, color: colors.gray }}>Loading parent roster...</Text>
          </View>
        ) : (
          <FlatList
            data={parents}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={{ paddingBottom: 30 }}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.parentItem} 
                onPress={() => setSelectedParent(item)}
              >
                <View style={styles.parentItemContent}>
                  <Text style={styles.parentName}>{item.name}</Text>
                  <Text style={styles.parentPhone}>📞 {item.phone}</Text>
                </View>
                <Text style={styles.chatActionLabel}>Chat →</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No parents found. Try another search query.</Text>
            }
          />
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setSelectedParent(null)} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{selectedParent.name}</Text>
          <Text style={styles.headerSubtitle}>Student's Parent</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <FlatList
          data={messages}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => {
            const isTeacher = item.sender_type === 'teacher';
            const commandColor = item.command ? getCommandColor(item.command) : null;
            return (
              <View style={[styles.messageRow, isTeacher ? styles.teacherRow : styles.parentRow]}>
                <View style={[styles.messageBubble, isTeacher ? styles.teacherBubble : styles.parentBubble]}>
                  {item.command && (
                    <View style={[styles.commandTag, { backgroundColor: commandColor }]}>
                      <Text style={styles.commandText}>/{item.command}</Text>
                    </View>
                  )}
                  <Text style={[styles.messageText, isTeacher ? styles.teacherText : styles.parentText]}>
                    {item.message}
                  </Text>
                  <Text style={[styles.messageTime, isTeacher ? styles.timeTeacher : styles.timeParent]}>
                    {formatTime(item.created_at)}
                  </Text>
                </View>
              </View>
            );
          }}
          contentContainerStyle={{ padding: 15 }}
          showsVerticalScrollIndicator={false}
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type /chat, /complaint, /doubt..."
            value={inputText}
            onChangeText={setInputText}
            placeholderTextColor={colors.gray}
            multiline
          />
          <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.background 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingTop: 50, 
    paddingBottom: 20, 
    backgroundColor: colors.white, 
    borderBottomWidth: 1, 
    borderBottomColor: colors.lightGray 
  },
  backButton: { 
    width: 40, 
    height: 40, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  backText: { 
    fontSize: 24, 
    color: colors.text 
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: colors.text 
  },
  headerSubtitle: {
    fontSize: 10,
    color: colors.gray,
    marginTop: 1,
  },
  searchBarContainer: {
    padding: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  searchBarInput: {
    backgroundColor: colors.background,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.lightGray,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  parentItem: { 
    backgroundColor: colors.white, 
    padding: 15, 
    marginHorizontal: 15, 
    marginTop: 12, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: colors.lightGray,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  parentItemContent: {
    flex: 1,
    paddingRight: 10,
  },
  parentName: { 
    fontSize: 15, 
    fontWeight: 'bold', 
    color: colors.text 
  },
  parentPhone: { 
    fontSize: 12, 
    color: colors.gray, 
    marginTop: 4 
  },
  chatActionLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.teal,
  },
  emptyText: { 
    textAlign: 'center', 
    marginTop: 50, 
    color: colors.gray,
    fontSize: 13,
  },
  messageRow: { 
    marginBottom: 12 
  },
  teacherRow: { 
    alignItems: 'flex-end' 
  },
  parentRow: { 
    alignItems: 'flex-start' 
  },
  messageBubble: { 
    maxWidth: '80%', 
    padding: 12, 
    borderRadius: 16 
  },
  teacherBubble: { 
    backgroundColor: colors.teal,
    borderBottomRightRadius: 2,
  },
  parentBubble: { 
    backgroundColor: colors.white, 
    borderWidth: 1, 
    borderColor: colors.lightGray,
    borderBottomLeftRadius: 2,
  },
  messageText: { 
    fontSize: 14, 
    lineHeight: 20,
  },
  teacherText: {
    color: colors.white,
  },
  parentText: {
    color: colors.text,
  },
  messageTime: { 
    fontSize: 9, 
    marginTop: 4, 
    alignSelf: 'flex-end' 
  },
  timeTeacher: {
    color: 'rgba(255,255,255,0.7)',
  },
  timeParent: {
    color: colors.gray,
  },
  commandTag: { 
    alignSelf: 'flex-start', 
    paddingHorizontal: 8, 
    paddingVertical: 2, 
    borderRadius: 10, 
    marginBottom: 6 
  },
  commandText: { 
    fontSize: 9, 
    color: colors.white, 
    fontWeight: 'bold' 
  },
  inputContainer: { 
    flexDirection: 'row', 
    paddingHorizontal: 15, 
    paddingVertical: 10, 
    backgroundColor: colors.white, 
    borderTopWidth: 1, 
    borderTopColor: colors.lightGray 
  },
  input: { 
    flex: 1, 
    backgroundColor: colors.background, 
    borderRadius: 20, 
    paddingHorizontal: 15, 
    paddingVertical: 8, 
    fontSize: 14, 
    maxHeight: 80,
    color: colors.text,
  },
  sendButton: { 
    marginLeft: 10, 
    paddingHorizontal: 15, 
    borderRadius: 20, 
    justifyContent: 'center', 
    backgroundColor: colors.teal 
  },
  sendButtonText: { 
    color: colors.white, 
    fontSize: 14, 
    fontWeight: '600' 
  },
});