import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, SafeAreaView, KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import { supabase } from '../services/supabase';
import colors from '../components/colors';

export default function ChatScreen({ onBack, teacherId }) {
  const [parents, setParents] = useState([]);
  const [selectedParent, setSelectedParent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');

  // 1. Fetch all parents whose children have this teacher_id
  useEffect(() => {
    fetchParents();
  }, []);

  const fetchParents = async () => {
    try {
      const { data, error } = await supabase
        .from('parent_students')
        .select(`
          parent_id,
          parents:parent_id ( id, name, phone ),
          students!inner ( teacher_id )
        `)
        .eq('students.teacher_id', teacherId);

      if (error) throw error;

      // Deduplicate parents (one parent may have multiple children with same teacher)
      const uniqueParents = [];
      const seen = new Set();
      for (const item of data) {
        const parent = item.parents;
        if (!seen.has(parent.id)) {
          seen.add(parent.id);
          uniqueParents.push(parent);
        }
      }
      setParents(uniqueParents);
    } catch (error) {
      Alert.alert('Error', 'Could not load parent list');
    }
  };

  // 2. Fetch messages between this teacher and selected parent
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
      console.log('Error fetching messages:', error);
    }
  };

  // 3. Real‑time subscription for new messages
  useEffect(() => {
    if (!selectedParent) return;

    fetchMessages(selectedParent.id);

    const subscription = supabase
      .channel(`chat-${teacherId}-${selectedParent.id}`)
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

  // 4. Send message
  const sendMessage = async () => {
    if (!inputText.trim() || !selectedParent) return;

    const command = inputText.match(/^\/(\w+)/)?.[1] || null;

    const newMessage = {
      sender_id: teacherId,
      sender_type: 'teacher',
      receiver_id: selectedParent.id.toString(),
      message: inputText,
      command,
      is_read: false,
      created_at: new Date()
    };

    setInputText('');
    // optimistic update
    setMessages(prev => [...prev, { ...newMessage, id: Date.now() }]);

    try {
      const { error } = await supabase.from('chat_messages').insert([newMessage]);
      if (error) throw error;
    } catch (error) {
      Alert.alert('Error', 'Failed to send');
      setMessages(prev => prev.filter(m => m.id !== newMessage.id));
    }
  };

  // Helper
  const formatTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const getCommandColor = (cmd) => {
    switch(cmd) {
      case 'chat': return colors.teal;
      case 'complaint': return colors.orange;
      case 'doubt': return colors.purple;
      case 'request': return colors.green;
      default: return colors.gray;
    }
  };

  // Render parent list
  if (!selectedParent) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chat with Parents</Text>
          <View style={{ width: 40 }} />
        </View>
        <FlatList
          data={parents}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.parentItem} onPress={() => setSelectedParent(item)}>
              <Text style={styles.parentName}>{item.name}</Text>
              <Text style={styles.parentPhone}>{item.phone}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No parents found</Text>}
        />
      </SafeAreaView>
    );
  }

  // Render chat
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setSelectedParent(null)} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{selectedParent.name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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
                  <Text style={styles.messageText}>{item.message}</Text>
                  <Text style={styles.messageTime}>{formatTime(item.created_at)}</Text>
                </View>
              </View>
            );
          }}
          contentContainerStyle={{ padding: 15 }}
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type /chat, /complaint, /doubt..."
            value={inputText}
            onChangeText={setInputText}
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
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 20, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.lightGray },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backText: { fontSize: 24, color: colors.text },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text, flex: 1, textAlign: 'center' },
  parentItem: { backgroundColor: colors.white, padding: 15, marginHorizontal: 20, marginTop: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.lightGray },
  parentName: { fontSize: 16, fontWeight: '600', color: colors.text },
  parentPhone: { fontSize: 12, color: colors.gray, marginTop: 4 },
  emptyText: { textAlign: 'center', marginTop: 50, color: colors.gray },
  messageRow: { marginBottom: 15 },
  teacherRow: { alignItems: 'flex-end' },
  parentRow: { alignItems: 'flex-start' },
  messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 15, backgroundColor: colors.white },
  teacherBubble: { backgroundColor: colors.teal },
  parentBubble: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.lightGray },
  messageText: { fontSize: 14, color: colors.text },
  messageTime: { fontSize: 10, color: colors.gray, marginTop: 4, alignSelf: 'flex-end' },
  commandTag: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginBottom: 6 },
  commandText: { fontSize: 9, color: colors.white, fontWeight: 'bold' },
  inputContainer: { flexDirection: 'row', paddingHorizontal: 15, paddingVertical: 10, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.lightGray },
  input: { flex: 1, backgroundColor: colors.lightGray, borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8, fontSize: 14, maxHeight: 100 },
  sendButton: { marginLeft: 10, paddingHorizontal: 15, borderRadius: 20, justifyContent: 'center', backgroundColor: colors.teal },
  sendButtonText: { color: colors.white, fontSize: 14, fontWeight: '600' },
});