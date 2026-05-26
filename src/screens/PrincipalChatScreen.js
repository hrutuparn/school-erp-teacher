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

export default function PrincipalChatScreen({ onBack, teacherId }) {
  const [principal, setPrincipal] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPrincipalInfo();
  }, [teacherId]);

  async function fetchPrincipalInfo() {
    setLoading(true);
    try {
      // 1. Get teacher's school_id
      const { data: teacherData, error: teachError } = await supabase
        .from('teachers')
        .select('school_id')
        .eq('id', teacherId)
        .single();

      if (teachError || !teacherData) throw new Error('Could not find teacher school association.');

      // 2. Get school principal
      const { data: principalData, error: princError } = await supabase
        .from('principals')
        .select('principal_id, full_name')
        .eq('school_id', teacherData.school_id)
        .limit(1);

      if (princError || !principalData || principalData.length === 0) {
        throw new Error('Principal account not configured for this school.');
      }

      setPrincipal(principalData[0]);
    } catch (e) {
      Alert.alert('Notice', e.message || 'Principal chat unavailable.');
      onBack();
    } finally {
      setLoading(false);
    }
  }

  // Fetch messages between teacher & principal
  const fetchMessages = async (principalId) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .or(`and(sender_id.eq.${teacherId},receiver_id.eq.${principalId}),and(sender_id.eq.${principalId},receiver_id.eq.${teacherId})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.log('Error fetching messages:', error.message);
    }
  };

  // Real-time subscription
  useEffect(() => {
    if (!principal) return;

    fetchMessages(principal.principal_id);

    const subscription = supabase
      .channel(`chat-teacher-principal-${teacherId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `receiver_id=eq.${teacherId},sender_id=eq.${principal.principal_id}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => subscription.unsubscribe();
  }, [principal]);

  const sendMessage = async () => {
    if (!inputText.trim() || !principal) return;

    const newMessage = {
      sender_id: teacherId.toString(),
      sender_type: 'teacher',
      receiver_id: principal.principal_id,
      message: inputText.trim(),
      command: '/chat',
      is_read: false,
      created_at: new Date()
    };

    setInputText('');
    setMessages(prev => [...prev, { ...newMessage, id: Date.now() }]);

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert([newMessage]);

      if (error) throw error;
    } catch (error) {
      Alert.alert('Failed to send', error.message);
      setMessages(prev => prev.filter(m => m.id !== newMessage.id));
    }
  };

  const formatTime = (ts) => {
    try {
      return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.purple} />
          <Text style={{ marginTop: 15, color: colors.gray }}>Locating Principal workspace...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            🏢 {principal?.full_name || 'School Principal'}
          </Text>
          <Text style={styles.headerSubtitle}>Greenfield Administrator</Text>
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
            return (
              <View style={[styles.messageRow, isTeacher ? styles.teacherRow : styles.principalRow]}>
                <View style={[styles.messageBubble, isTeacher ? styles.teacherBubble : styles.principalBubble]}>
                  <Text style={[styles.messageText, isTeacher ? styles.teacherText : styles.principalText]}>
                    {item.message}
                  </Text>
                  <Text style={[styles.messageTime, isTeacher ? styles.timeTeacher : styles.timePrincipal]}>
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
            placeholder="Type a message to Principal..."
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
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 10,
    color: colors.gray,
    marginTop: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageRow: {
    marginBottom: 12,
  },
  teacherRow: {
    alignItems: 'flex-end',
  },
  principalRow: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  teacherBubble: {
    backgroundColor: colors.purple,
    borderBottomRightRadius: 2,
  },
  principalBubble: {
    backgroundColor: colors.white,
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: colors.lightGray,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  teacherText: {
    color: colors.white,
  },
  principalText: {
    color: colors.text,
  },
  messageTime: {
    fontSize: 9,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  timeTeacher: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  timePrincipal: {
    color: colors.gray,
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
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
    paddingHorizontal: 18,
    borderRadius: 20,
    justifyContent: 'center',
    backgroundColor: colors.purple,
  },
  sendButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
});
