import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function ReturnsEmployeeScreen({ navigation }: any) {
  const { user } = useAuth();
  const [leads, setLeads] = useState<any[]>([]);
  const [myReturns, setMyReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [form, setForm] = useState({
    returnDate: '',
    remarks: '',
    lrNumber: '',
    finYear: '',
    schoolType: '',
    schoolCode: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!user?._id) return;
    try {
      setLoading(true);
      const [leadsData, returnsData] = await Promise.all([
        apiService.get(`/leads?employee=${user._id}`).catch(() => []),
        apiService.get('/stock-returns/executive/mine').catch(() => [])
      ]);
      setLeads(Array.isArray(leadsData) ? leadsData : (leadsData?.data || []));
      setMyReturns(Array.isArray(returnsData) ? returnsData : (returnsData?.data || []));
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (lead: any) => {
    setSelectedLead(lead);
    setForm({ returnDate: '', remarks: '', lrNumber: '', finYear: '', schoolType: '', schoolCode: '' });
    setShowModal(true);
  };

  const submitReturn = async () => {
    if (!form.returnDate) {
      Alert.alert('Validation', 'Please select Return Date');
      return;
    }
    if (!selectedLead) return;

    setSubmittingId(selectedLead._id);
    try {
      const created = await apiService.post('/stock-returns/executive', {
        leadId: selectedLead._id,
        returnDate: form.returnDate,
        remarks: form.remarks,
        lrNumber: form.lrNumber,
        finYear: form.finYear,
        schoolType: form.schoolType,
        schoolCode: form.schoolCode,
      });
      Alert.alert('Success', `Return #${created.returnNumber} created`);
      setShowModal(false);
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit return');
    } finally {
      setSubmittingId(null);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('en-IN');
    } catch {
      return '-';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={gradients.primary as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Employee Stock Returns</Text>
            <Text style={styles.headerSubtitle}>Submit stock returns</Text>
          </View>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Assigned Leads</Text>
          {leads.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No assigned leads</Text>
            </View>
          ) : (
            leads.map((lead) => (
              <TouchableOpacity
                key={lead._id}
                style={styles.leadCard}
                onPress={() => openModal(lead)}
              >
                <Text style={styles.leadName}>{lead.school_name}</Text>
                <View style={styles.leadInfo}>
                  <Text style={styles.leadInfoText}>Contact: {lead.contact_person || '-'}</Text>
                  <Text style={styles.leadInfoText}>Location: {lead.location || '-'}</Text>
                </View>
                <Text style={styles.submitButtonText}>Tap to Submit Return →</Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Returns</Text>
          {myReturns.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No returns submitted yet</Text>
            </View>
          ) : (
            myReturns.map((ret) => (
              <View key={ret._id} style={styles.returnCard}>
                <View style={styles.returnHeader}>
                  <Text style={styles.returnNumber}>Return #{ret.returnNumber}</Text>
                  <Text style={styles.returnDate}>{formatDate(ret.returnDate)}</Text>
                </View>
                {ret.remarks && <Text style={styles.returnRemarks}>{ret.remarks}</Text>}
                {ret.lrNumber && <Text style={styles.returnInfo}>LR No: {ret.lrNumber}</Text>}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Submit Return</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalLabel}>School: {selectedLead?.school_name}</Text>
              <Text style={styles.modalLabel}>Return Date *</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={form.returnDate}
                onChangeText={(text) => setForm({ ...form, returnDate: text })}
              />
              <Text style={styles.modalLabel}>LR No (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. C062455"
                value={form.lrNumber}
                onChangeText={(text) => setForm({ ...form, lrNumber: text })}
              />
              <Text style={styles.modalLabel}>Fin Year (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 2025-26"
                value={form.finYear}
                onChangeText={(text) => setForm({ ...form, finYear: text })}
              />
              <Text style={styles.modalLabel}>School Type (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="New / Existing"
                value={form.schoolType}
                onChangeText={(text) => setForm({ ...form, schoolType: text })}
              />
              <Text style={styles.modalLabel}>School Code (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. VJVIJ5050"
                value={form.schoolCode}
                onChangeText={(text) => setForm({ ...form, schoolCode: text })}
              />
              <Text style={styles.modalLabel}>Remarks</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Reason/notes for return"
                value={form.remarks}
                onChangeText={(text) => setForm({ ...form, remarks: text })}
                multiline
                numberOfLines={4}
              />
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSubmit]}
                onPress={submitReturn}
                disabled={submittingId === selectedLead?._id || !form.returnDate}
              >
                {submittingId === selectedLead?._id ? (
                  <ActivityIndicator color={colors.textLight} />
                ) : (
                  <Text style={styles.modalButtonTextSubmit}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  loadingText: { marginTop: 12, ...typography.body.medium, color: colors.textSecondary },
  header: { paddingHorizontal: 20, paddingTop: 50, paddingBottom: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backIcon: { fontSize: 24, color: colors.textLight, fontWeight: 'bold' },
  headerTitleContainer: { flex: 1, alignItems: 'center' },
  headerTitle: { ...typography.heading.h1, color: colors.textLight, marginBottom: 4 },
  headerSubtitle: { ...typography.body.small, color: colors.textLight + 'CC' },
  placeholder: { width: 40 },
  content: { flex: 1 },
  contentContainer: { padding: 16, paddingBottom: 32 },
  section: { marginBottom: 24 },
  sectionTitle: { ...typography.heading.h3, color: colors.textPrimary, marginBottom: 16 },
  emptyContainer: { padding: 20, alignItems: 'center' },
  emptyText: { ...typography.body.medium, color: colors.textSecondary },
  leadCard: { backgroundColor: colors.backgroundLight, borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: colors.shadowDark, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  leadName: { ...typography.heading.h3, color: colors.textPrimary, marginBottom: 8 },
  leadInfo: { marginBottom: 8 },
  leadInfoText: { ...typography.body.small, color: colors.textSecondary, marginBottom: 4 },
  submitButtonText: { ...typography.body.small, color: colors.primary, textAlign: 'right', fontWeight: '500' },
  returnCard: { backgroundColor: colors.backgroundLight, borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: colors.shadowDark, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  returnHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  returnNumber: { ...typography.heading.h4, color: colors.textPrimary },
  returnDate: { ...typography.body.small, color: colors.textSecondary },
  returnRemarks: { ...typography.body.medium, color: colors.textPrimary, marginBottom: 4 },
  returnInfo: { ...typography.body.small, color: colors.textSecondary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.backgroundLight, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { ...typography.heading.h2, color: colors.textPrimary },
  modalClose: { fontSize: 24, color: colors.textSecondary },
  modalBody: { padding: 20 },
  modalLabel: { ...typography.body.medium, color: colors.textPrimary, marginBottom: 8, fontWeight: '600' },
  input: { backgroundColor: colors.background, borderRadius: 12, padding: 12, ...typography.body.medium, color: colors.textPrimary, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  modalFooter: { flexDirection: 'row', padding: 20, borderTopWidth: 1, borderTopColor: colors.border, gap: 12 },
  modalButton: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center' },
  modalButtonCancel: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  modalButtonSubmit: { backgroundColor: colors.primary },
  modalButtonTextCancel: { ...typography.body.medium, color: colors.textPrimary, fontWeight: '600' },
  modalButtonTextSubmit: { ...typography.body.medium, color: colors.textLight, fontWeight: '600' },
});


