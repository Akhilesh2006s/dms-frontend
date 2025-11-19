import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients } from '../../theme/colors';
import { typography } from '../../theme/typography';
import ApiService from '../../services/api';

const apiService = new ApiService('https://crm-backend-production-2ffd.up.railway.app/api');

interface DcItem {
  _id: string;
  saleId?: { customerName?: string };
  dcOrderId?: { school_name?: string; school_code?: string; zone?: string };
}

const categories = ['Travel', 'Food', 'Office Supplies', 'Marketing', 'Utilities', 'Salary', 'Rent', 'Other'];
const paymentMethods = ['Cash', 'Bank Transfer', 'Credit Card', 'Debit Card', 'Other'];
const pendingMonths = ['none', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function ExpenseCreateScreen({ navigation }: any) {
  const [form, setForm] = useState({
    title: '',
    amount: '',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    employeeRemarks: '',
    paymentMethod: '',
    pendingMonth: 'none',
    dcId: '',
  });
  const [dcs, setDcs] = useState<DcItem[]>([]);
  const [loadingDcs, setLoadingDcs] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchDcs = async () => {
      try {
        setLoadingDcs(true);
        const data = await apiService.get<DcItem[]>('/dc/employee/my');
        setDcs(Array.isArray(data) ? data : []);
      } catch {
        setDcs([]);
      } finally {
        setLoadingDcs(false);
      }
    };
    fetchDcs();
  }, []);

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.amount.trim() || !form.category.trim() || !form.date.trim()) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }
    if (dcs.length > 0 && !form.dcId) {
      Alert.alert('Error', 'Please select a School/DC for this expense.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: form.title,
        amount: parseFloat(form.amount),
        category: form.category,
        description: form.description || undefined,
        date: form.date,
        employeeRemarks: form.employeeRemarks || undefined,
        paymentMethod: form.paymentMethod || undefined,
        pendingMonth: form.pendingMonth !== 'none' ? form.pendingMonth : undefined,
        dcId: form.dcId || undefined,
        status: 'Pending',
      };
      await apiService.post('/expenses/create', payload);
      Alert.alert('Success', 'Expense created successfully', [
        { text: 'OK', onPress: () => navigation.navigate('ExpenseMy') },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create expense');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Expense</Text>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <FormField label="Title *" value={form.title} onChangeText={(text) => setForm((f) => ({ ...f, title: text }))} placeholder="Enter expense title" />
        <FormField label="Amount *" value={form.amount} onChangeText={(text) => setForm((f) => ({ ...f, amount: text }))} placeholder="0.00" keyboardType="decimal-pad" />
        <DropdownField
          label="Category *"
          options={categories}
          selected={form.category}
          onSelect={(value) => setForm((f) => ({ ...f, category: value }))}
        />
        <FormField label="Date *" value={form.date} onChangeText={(text) => setForm((f) => ({ ...f, date: text }))} placeholder="YYYY-MM-DD" />
        <DropdownField
          label="Payment Method"
          options={['', ...paymentMethods]}
          selected={form.paymentMethod}
          onSelect={(value) => setForm((f) => ({ ...f, paymentMethod: value }))}
        />
        <DropdownField
          label="Pending Month"
          options={pendingMonths}
          selected={form.pendingMonth}
          onSelect={(value) => setForm((f) => ({ ...f, pendingMonth: value }))}
        />
        <TextAreaField label="Description" value={form.description} onChangeText={(text) => setForm((f) => ({ ...f, description: text }))} placeholder="Enter description" />
        <TextAreaField label="Employee Remarks" value={form.employeeRemarks} onChangeText={(text) => setForm((f) => ({ ...f, employeeRemarks: text }))} placeholder="Enter remarks" />
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Select School/DC *</Text>
          {loadingDcs ? (
            <Text style={styles.helperText}>Loading schools…</Text>
          ) : dcs.length === 0 ? (
            <Text style={styles.helperText}>No DCs assigned</Text>
          ) : (
            dcs.map((dc) => {
              const display = dc.dcOrderId?.school_name || dc.saleId?.customerName || 'School';
              return (
                <TouchableOpacity
                  key={dc._id}
                  style={[styles.option, form.dcId === dc._id && styles.optionSelected]}
                  onPress={() => setForm((f) => ({ ...f, dcId: dc._id }))}
                >
                  <Text style={[styles.optionText, form.dcId === dc._id && styles.optionTextSelected]}>{display}</Text>
                  {dc.dcOrderId?.school_code && <Text style={styles.helperText}>{dc.dcOrderId.school_code}</Text>}
                </TouchableOpacity>
              );
            })
          )}
        </View>
        <TouchableOpacity style={[styles.submitButton, submitting && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={submitting}>
          <LinearGradient colors={[colors.primary, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.submitButtonGradient}>
            {submitting ? <ActivityIndicator color={colors.textLight} /> : <Text style={styles.submitButtonText}>Submit Expense</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function FormField({ label, value, onChangeText, placeholder, keyboardType }: any) {
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.textSecondary} keyboardType={keyboardType} />
    </View>
  );
}

function TextAreaField({ label, value, onChangeText, placeholder }: any) {
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, { minHeight: 100, textAlignVertical: 'top' }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        multiline
      />
    </View>
  );
}

function DropdownField({ label, options, selected, onSelect }: { label: string; options: string[]; selected: string; onSelect: (value: string) => void }) {
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalOptions}>
        {options.map((option) => (
          <TouchableOpacity
            key={option}
            style={[styles.horizontalOption, selected === option && styles.horizontalOptionSelected]}
            onPress={() => onSelect(option)}
          >
            <Text style={[styles.horizontalOptionText, selected === option && styles.horizontalOptionTextSelected]}>{option || 'None'}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingTop: 50, paddingBottom: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backIcon: { fontSize: 24, color: colors.textLight, fontWeight: 'bold' },
  headerTitle: { ...typography.heading.h1, color: colors.textLight, flex: 1, textAlign: 'center' },
  placeholder: { width: 40 },
  content: { flex: 1 },
  contentContainer: { padding: 20, paddingBottom: 40 },
  fieldContainer: { marginBottom: 16 },
  label: { ...typography.label.medium, color: colors.textPrimary, marginBottom: 8 },
  input: { ...typography.body.medium, backgroundColor: colors.backgroundLight, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, color: colors.textPrimary },
  horizontalOptions: { flexDirection: 'row' },
  horizontalOption: { paddingHorizontal: 16, paddingVertical: 8, marginRight: 8, borderRadius: 20, backgroundColor: colors.backgroundLight, borderWidth: 1, borderColor: colors.border },
  horizontalOptionSelected: { backgroundColor: colors.primary + '20', borderColor: colors.primary },
  horizontalOptionText: { ...typography.body.medium, color: colors.textPrimary },
  horizontalOptionTextSelected: { color: colors.primary, fontWeight: '600' },
  option: { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 10 },
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
  optionText: { ...typography.body.medium, color: colors.textPrimary },
  optionTextSelected: { color: colors.primary, fontWeight: '600' },
  helperText: { ...typography.body.small, color: colors.textSecondary },
  submitButton: { marginTop: 24, borderRadius: 12, overflow: 'hidden' },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonGradient: { paddingVertical: 16, alignItems: 'center' },
  submitButtonText: { ...typography.label.large, color: colors.textLight, fontWeight: '600' },
});


