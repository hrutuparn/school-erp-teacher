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
  Platform
} from 'react-native';
import { supabase } from '../services/supabase';
import colors from '../components/colors';

export default function ProfileScreen({ onBack, teacherId }) {
  const [teacher, setTeacher] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  // Edit fields
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [qualification, setQualification] = useState('');
  const [bankAccount, setBankAccount] = useState('');

  // Leaves management
  const [leaves, setLeaves] = useState([]);
  const [leaveStart, setLeaveStart] = useState('');
  const [leaveEnd, setLeaveEnd] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [submittingLeave, setSubmittingLeave] = useState(false);

  // Salary Slips
  const [selectedSlip, setSelectedSlip] = useState(null);
  const [showSlipModal, setShowSlipModal] = useState(false);

  // Tabs: profile, leaves, salary
  const [activeSubTab, setActiveSubTab] = useState('profile');

  // Hardcoded salary slip history for visual presentation
  const mockSlips = [
    { month: 'May 2026', base: 45000, deductions: 1500, net: 43500, paidOn: '2026-05-01', bank: 'SBI - 302199201' },
    { month: 'April 2026', base: 45000, deductions: 0, net: 45000, paidOn: '2026-04-01', bank: 'SBI - 302199201' },
    { month: 'March 2026', base: 45000, deductions: 3000, net: 42000, paidOn: '2026-03-01', bank: 'SBI - 302199201' },
  ];

  useEffect(() => {
    fetchProfileAndLeaves();
  }, [teacherId]);

  async function fetchProfileAndLeaves() {
    setLoadingProfile(true);
    try {
      let tId = teacherId;
      if (!tId) {
        // Fallback: fetch first teacher
        const { data: firstTeach } = await supabase.from('teachers').select('id').limit(1).single();
        if (firstTeach) tId = firstTeach.id;
      }

      if (!tId) return;

      // 1. Fetch Teacher Profile
      const { data: profile, error } = await supabase
        .from('teachers')
        .select('*')
        .eq('id', tId)
        .single();

      if (error) throw error;
      setTeacher(profile);
      setPhone(profile.phone || '');
      setDob(profile.date_of_birth || '');
      setQualification(profile.qualification || '');
      setBankAccount(profile.bank_account || '');

      // 2. Fetch all leave requests in this school, filtered locally by teacherId
      const { data: docRequests, error: reqError } = await supabase
        .from('document_requests')
        .select('*')
        .eq('school_id', profile.school_id)
        .eq('type', 'teacher_leave');

      if (!reqError && docRequests) {
        const filteredLeaves = docRequests.filter(req => {
          try {
            const details = JSON.parse(req.note);
            return details.teacher_id === tId;
          } catch (e) {
            return false;
          }
        });
        setLeaves(filteredLeaves);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to retrieve profile data.');
      console.log(e);
    } finally {
      setLoadingProfile(false);
    }
  }

  // Save profile updates
  const handleSaveProfile = async () => {
    if (!phone.trim()) {
      Alert.alert('Error', 'Phone number cannot be empty');
      return;
    }

    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from('teachers')
        .update({
          phone: phone.trim(),
          date_of_birth: dob.trim(),
          qualification: qualification.trim(),
          bank_account: bankAccount.trim()
        })
        .eq('id', teacher.id);

      if (error) throw error;
      Alert.alert('Success', 'Profile updated successfully!');
      fetchProfileAndLeaves();
    } catch (e) {
      Alert.alert('Update Failed', e.message);
    } finally {
      setSavingProfile(false);
    }
  };

  // Submit new leave request
  const handleRequestLeave = async () => {
    if (!leaveStart.trim() || !leaveEnd.trim() || !leaveReason.trim()) {
      Alert.alert('Error', 'Please fill in Leave Dates and Reason.');
      return;
    }

    setSubmittingLeave(true);
    try {
      const details = {
        teacher_id: teacher.id,
        teacher_name: teacher.name,
        start_date: leaveStart.trim(),
        end_date: leaveEnd.trim(),
        reason: leaveReason.trim()
      };

      const payload = {
        school_id: teacher.school_id,
        student_id: null,
        parent_id: null,
        type: 'teacher_leave',
        note: JSON.stringify(details),
        status: 'pending',
        requested_on: new Date().toISOString()
      };

      const { error } = await supabase
        .from('document_requests')
        .insert([payload]);

      if (error) throw error;

      Alert.alert('Request Sent 📝', 'Your leave request has been submitted to the principal for review.');
      setLeaveStart('');
      setLeaveEnd('');
      setLeaveReason('');
      fetchProfileAndLeaves();
    } catch (e) {
      Alert.alert('Submission Failed', e.message);
    } finally {
      setSubmittingLeave(false);
    }
  };

  const handlePrintSlip = () => {
    Alert.alert('PDF Generator 🖨️', 'Salary Slip PDF generated successfully! Starting print stream...');
  };

  const parseLeaveNote = (noteStr) => {
    try {
      return JSON.parse(noteStr);
    } catch (e) {
      return { start_date: 'N/A', end_date: 'N/A', reason: noteStr };
    }
  };

  if (loadingProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.teal} />
          <Text style={{ marginTop: 15, color: colors.gray }}>Retrieving Profile details...</Text>
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
        <Text style={styles.headerTitle}>👤 My Workspace Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs list */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tabButton, activeSubTab === 'profile' && styles.activeTabButton]}
          onPress={() => setActiveSubTab('profile')}
        >
          <Text style={[styles.tabButtonText, activeSubTab === 'profile' && styles.activeTabButtonText]}>Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeSubTab === 'leaves' && styles.activeTabButton]}
          onPress={() => setActiveSubTab('leaves')}
        >
          <Text style={[styles.tabButtonText, activeSubTab === 'leaves' && styles.activeTabButtonText]}>Leaves</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeSubTab === 'salary' && styles.activeTabButton]}
          onPress={() => setActiveSubTab('salary')}
        >
          <Text style={[styles.tabButtonText, activeSubTab === 'salary' && styles.activeTabButtonText]}>Salary Slips</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.contentContainer} keyboardShouldPersistTaps="handled">
        
        {/* Tab 1: Profile Editor */}
        {activeSubTab === 'profile' && (
          <View style={styles.card}>
            <Text style={styles.cardHeader}>👤 General Details</Text>
            
            <Text style={styles.readOnlyLabel}>Full Name</Text>
            <Text style={styles.readOnlyText}>{teacher?.name}</Text>

            <Text style={styles.readOnlyLabel}>Email Address</Text>
            <Text style={styles.readOnlyText}>{teacher?.email}</Text>

            <Text style={styles.fieldLabel}>Mobile Phone</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="e.g. +91 9876543210"
              placeholderTextColor={colors.gray}
            />

            <Text style={styles.fieldLabel}>Date of Birth</Text>
            <TextInput
              style={styles.input}
              value={dob}
              onChangeText={setDob}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.gray}
            />

            <Text style={styles.fieldLabel}>Educational Qualification</Text>
            <TextInput
              style={styles.input}
              value={qualification}
              onChangeText={setQualification}
              placeholder="e.g. M.Sc, B.Ed"
              placeholderTextColor={colors.gray}
            />

            <Text style={styles.fieldLabel}>Bank Account Details</Text>
            <TextInput
              style={styles.input}
              value={bankAccount}
              onChangeText={setBankAccount}
              placeholder="e.g. State Bank of India - AC 203881"
              placeholderTextColor={colors.gray}
            />

            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: colors.teal }]}
              onPress={handleSaveProfile}
              disabled={savingProfile}
            >
              <Text style={styles.actionBtnText}>
                {savingProfile ? 'Updating Profile...' : '💾 Save Changes'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Tab 2: Leaves panel */}
        {activeSubTab === 'leaves' && (
          <View>
            {/* Request Form */}
            <View style={styles.card}>
              <Text style={styles.cardHeader}>📝 Request New Leave</Text>
              
              <View style={styles.row}>
                <View style={{ width: '48%' }}>
                  <Text style={styles.fieldLabel}>Start Date</Text>
                  <TextInput
                    style={styles.inputCompact}
                    value={leaveStart}
                    onChangeText={setLeaveStart}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.gray}
                  />
                </View>
                <View style={{ width: '48%' }}>
                  <Text style={styles.fieldLabel}>End Date</Text>
                  <TextInput
                    style={styles.inputCompact}
                    value={leaveEnd}
                    onChangeText={setLeaveEnd}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.gray}
                  />
                </View>
              </View>

              <Text style={styles.fieldLabel}>Reason for Leave</Text>
              <TextInput
                style={styles.textArea}
                value={leaveReason}
                onChangeText={setLeaveReason}
                placeholder="e.g. Not feeling well, family emergency..."
                multiline
                numberOfLines={3}
                placeholderTextColor={colors.gray}
                textAlignVertical="top"
              />

              <TouchableOpacity 
                style={[styles.actionBtn, { backgroundColor: colors.orange }]}
                onPress={handleRequestLeave}
                disabled={submittingLeave}
              >
                <Text style={styles.actionBtnText}>
                  {submittingLeave ? 'Submitting request...' : '🚀 Submit Request'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Leave History List */}
            <View style={[styles.card, { marginTop: 15 }]}>
              <Text style={styles.cardHeader}>📅 Leave Request History</Text>
              
              {leaves.length === 0 ? (
                <Text style={styles.emptyText}>No leaves requested yet.</Text>
              ) : (
                leaves.map((item) => {
                  const details = parseLeaveNote(item.note);
                  return (
                    <View key={item.request_id} style={styles.leaveHistoryRow}>
                      <View style={styles.leaveMeta}>
                        <Text style={styles.leaveDateRange}>
                          {details.start_date} to {details.end_date}
                        </Text>
                        <Text style={styles.leaveReasonText} numberOfLines={1}>
                          Reason: {details.reason}
                        </Text>
                      </View>

                      <View style={[
                        styles.statusBadge,
                        item.status === 'approved' && { backgroundColor: colors.green + '15' },
                        item.status === 'rejected' && { backgroundColor: '#E74C3C15' },
                        item.status === 'pending' && { backgroundColor: colors.orange + '15' }
                      ]}>
                        <Text style={[
                          styles.statusText,
                          item.status === 'approved' && { color: colors.green },
                          item.status === 'rejected' && { color: '#E74C3C' },
                          item.status === 'pending' && { color: colors.orange }
                        ]}>
                          {item.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </View>
        )}

        {/* Tab 3: Salary Slips */}
        {activeSubTab === 'salary' && (
          <View style={styles.card}>
            <Text style={styles.cardHeader}>💰 Disbursed Salary Slips</Text>
            <Text style={styles.helperText}>
              Access and download official print-ready monthly salary breakdown sheets.
            </Text>

            {mockSlips.map((slip, idx) => (
              <TouchableOpacity 
                key={idx}
                style={styles.slipRow}
                onPress={() => {
                  setSelectedSlip(slip);
                  setShowSlipModal(true);
                }}
              >
                <View>
                  <Text style={styles.slipMonth}>{slip.month}</Text>
                  <Text style={styles.slipDetails}>Paid on {slip.paidOn}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.slipAmount}>₹{slip.net.toLocaleString()}</Text>
                  <Text style={styles.viewSlipLink}>View PDF →</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Salary Slip Invoice Overlay Modal */}
      {selectedSlip && (
        <Modal visible={showSlipModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.slipInvoiceCard}>
              <View style={styles.invoiceHeader}>
                <Text style={styles.schoolNameInvoice}>GREENFIELD ACADEMY</Text>
                <Text style={styles.slipLabelInvoice}>PAYSLIP SLIP SUMMARY</Text>
              </View>

              <View style={styles.invoiceDivider} />

              {/* Employee Details Row */}
              <View style={styles.detailsRow}>
                <View>
                  <Text style={styles.detailsTitle}>EMPLOYEE PROFILE</Text>
                  <Text style={styles.detailsText}>{teacher?.name}</Text>
                  <Text style={styles.detailsSub}>Classroom Teacher</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.detailsTitle}>PAYMENT STAMP</Text>
                  <Text style={styles.detailsText}>{selectedSlip.month}</Text>
                  <Text style={styles.detailsSub}>Paid: {selectedSlip.paidOn}</Text>
                </View>
              </View>

              <View style={styles.invoiceDivider} />

              {/* Salary Breakdown calculations */}
              <View style={styles.ledgerHeader}>
                <Text style={styles.ledgerHeaderLabel}>DESCRIPTION</Text>
                <Text style={styles.ledgerHeaderValue}>AMOUNT (INR)</Text>
              </View>

              <View style={styles.ledgerRow}>
                <Text style={styles.ledgerLabel}>Base Monthly Salary</Text>
                <Text style={styles.ledgerValue}>₹{selectedSlip.base.toLocaleString()}.00</Text>
              </View>

              <View style={styles.ledgerRow}>
                <Text style={styles.ledgerLabel}>Loss of Pay (Absences)</Text>
                <Text style={[styles.ledgerValue, { color: '#E74C3C' }]}>
                  - ₹{selectedSlip.deductions.toLocaleString()}.00
                </Text>
              </View>

              <View style={styles.invoiceDivider} />

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>NET TAKE-HOME PAY</Text>
                <Text style={styles.totalValue}>₹{selectedSlip.net.toLocaleString()}.00</Text>
              </View>

              <View style={styles.bankInfoBox}>
                <Text style={styles.bankInfoText}>
                  Deposited via EFT to Bank details: {selectedSlip.bank}
                </Text>
              </View>

              {/* Modal controls */}
              <View style={styles.modalControlsRow}>
                <TouchableOpacity 
                  style={styles.closeSlipBtn}
                  onPress={() => setShowSlipModal(false)}
                >
                  <Text style={styles.closeSlipBtnText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.downloadSlipBtn}
                  onPress={handlePrintSlip}
                >
                  <Text style={styles.downloadSlipBtnText}>🖨️ Print / Save PDF</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
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
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTabButton: {
    borderBottomWidth: 3,
    borderBottomColor: colors.teal,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.gray,
  },
  activeTabButtonText: {
    color: colors.teal,
  },
  contentContainer: {
    flex: 1,
    padding: 15,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: colors.lightGray,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 15,
  },
  readOnlyLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.gray,
    marginBottom: 2,
  },
  readOnlyText: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 12,
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.gray,
    marginBottom: 6,
    textTransform: 'uppercase',
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
    marginBottom: 12,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  textArea: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.lightGray,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    minHeight: 70,
    marginBottom: 15,
  },
  actionBtn: {
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  actionBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    color: colors.gray,
    marginVertical: 20,
    fontSize: 13,
  },
  leaveHistoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  leaveMeta: {
    flex: 1,
    marginRight: 10,
  },
  leaveDateRange: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  leaveReasonText: {
    fontSize: 12,
    color: colors.gray,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  helperText: {
    fontSize: 12,
    color: colors.gray,
    marginBottom: 15,
  },
  slipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  slipMonth: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text,
  },
  slipDetails: {
    fontSize: 12,
    color: colors.gray,
    marginTop: 2,
  },
  slipAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.teal,
  },
  viewSlipLink: {
    fontSize: 11,
    color: colors.teal,
    fontWeight: 'bold',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  slipInvoiceCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  invoiceHeader: {
    alignItems: 'center',
    marginBottom: 15,
  },
  schoolNameInvoice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    letterSpacing: 1.5,
  },
  slipLabelInvoice: {
    fontSize: 11,
    color: colors.gray,
    marginTop: 4,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  invoiceDivider: {
    height: 1.5,
    backgroundColor: colors.text,
    opacity: 0.15,
    marginVertical: 10,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detailsTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.gray,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  detailsText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.text,
  },
  detailsSub: {
    fontSize: 11,
    color: colors.gray,
  },
  ledgerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  ledgerHeaderLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.gray,
  },
  ledgerHeaderValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.gray,
    textAlign: 'right',
  },
  ledgerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  ledgerLabel: {
    fontSize: 13,
    color: colors.text,
  },
  ledgerValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    marginBottom: 10,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.teal,
    textAlign: 'right',
  },
  bankInfoBox: {
    backgroundColor: colors.background,
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  bankInfoText: {
    fontSize: 10.5,
    color: colors.text,
    textAlign: 'center',
  },
  modalControlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  closeSlipBtn: {
    width: '30%',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.gray,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeSlipBtnText: {
    color: colors.gray,
    fontWeight: 'bold',
  },
  downloadSlipBtn: {
    width: '65%',
    paddingVertical: 12,
    backgroundColor: colors.teal,
    borderRadius: 8,
    alignItems: 'center',
  },
  downloadSlipBtnText: {
    color: colors.white,
    fontWeight: 'bold',
  },
});
