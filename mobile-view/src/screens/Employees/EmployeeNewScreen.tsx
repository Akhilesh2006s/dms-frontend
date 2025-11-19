import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients } from '../../theme/colors';
import { typography } from '../../theme/typography';
import ApiService from '../../services/api';

const apiService = new ApiService('https://crm-backend-production-2ffd.up.railway.app/api');

export default function EmployeeNewScreen({ navigation }: any) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    empCode: '',
    email: '',
    password: '',
    phone: '0',
    mobile: '',
    address1: '',
    state: '',
    zone: '',
    cluster: '',
    district: '',
    city: '',
    pincode: '',
    role: 'Executive',
  });
  const [submitting, setSubmitting] = useState(false);

  const roles = ['Executive', 'Trainer', 'Finance Manager', 'Coordinator', 'Senior Coordinator', 'Manager', 'Admin', 'Super Admin'];

  const handleSubmit = async () => {
    if (!form.firstName?.trim()) {
      Alert.alert('Error', 'First Name is required');
      return;
    }
    if (!form.email?.trim()) {
      Alert.alert('Error', 'Email is required');
      return;
    }
    if (!form.mobile?.trim()) {
      Alert.alert('Error', 'Mobile is required');
      return;
    }
    if (!form.password?.trim()) {
      Alert.alert('Error', 'Password is required');
      return;
    }
    if (!form.state?.trim()) {
      Alert.alert('Error', 'State is required');
      return;
    }
    if (!form.zone?.trim()) {
      Alert.alert('Error', 'Zone is required');
      return;
    }
    if (!form.cluster?.trim()) {
      Alert.alert('Error', 'Cluster is required');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        name: `${form.firstName} ${form.lastName}`.trim() || form.firstName || form.lastName || 'Executive',
      };
      await apiService.post('/employees/create', payload);
      Alert.alert('Success', 'Employee created successfully', [
        { text: 'OK', onPress: () => navigation.navigate('EmployeesActive') },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create employee');
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
          <Text style={styles.headerTitle}>New Employee</Text>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.sectionTitle}>Personal Data</Text>
        <FormField label="First Name *" value={form.firstName} onChangeText={(text: string) => setForm((f) => ({ ...f, firstName: text }))} placeholder="First Name" />
        <FormField label="Last Name" value={form.lastName} onChangeText={(text: string) => setForm((f) => ({ ...f, lastName: text }))} placeholder="Last Name" />
        <FormField label="Emp ID / Code" value={form.empCode} onChangeText={(text: string) => setForm((f) => ({ ...f, empCode: text }))} placeholder="Employee ID / Code" />
        <FormField label="Email Id *" value={form.email} onChangeText={(text: string) => setForm((f) => ({ ...f, email: text }))} placeholder="Email" keyboardType="email-address" />
        <FormField label="Phone" value={form.phone} onChangeText={(text: string) => setForm((f) => ({ ...f, phone: text }))} placeholder="Phone" keyboardType="phone-pad" />
        <FormField label="Mobile *" value={form.mobile} onChangeText={(text: string) => setForm((f) => ({ ...f, mobile: text }))} placeholder="Mobile" keyboardType="phone-pad" />
        <View style={styles.textAreaContainer}>
          <Text style={styles.label}>Address 1</Text>
          <TextInput style={styles.textArea} value={form.address1} onChangeText={(text: string) => setForm((f) => ({ ...f, address1: text }))} placeholder="Address 1" multiline numberOfLines={3} />
        </View>
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Location & User Type</Text>
        <FormField label="State *" value={form.state} onChangeText={(text: string) => setForm((f) => ({ ...f, state: text }))} placeholder="Enter Employee State" />
        <FormField label="Zone *" value={form.zone} onChangeText={(text: string) => setForm((f) => ({ ...f, zone: text }))} placeholder="Enter Employee Zone" />
        <FormField label="Cluster *" value={form.cluster} onChangeText={(text: string) => setForm((f) => ({ ...f, cluster: text }))} placeholder="Enter Employee Cluster" />
        <FormField label="District" value={form.district} onChangeText={(text: string) => setForm((f) => ({ ...f, district: text }))} placeholder="Enter Employee District" />
        <FormField label="City" value={form.city} onChangeText={(text: string) => setForm((f) => ({ ...f, city: text }))} placeholder="City" />
        <FormField label="PinCode" value={form.pincode} onChangeText={(text: string) => setForm((f) => ({ ...f, pincode: text }))} placeholder="Pincode" keyboardType="number-pad" />
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>User Type *</Text>
          <View style={styles.roleContainer}>
            {roles.map((role) => (
              <TouchableOpacity
                key={role}
                style={[styles.roleOption, form.role === role && styles.roleOptionSelected]}
                onPress={() => setForm((f) => ({ ...f, role }))}
              >
                <Text style={[styles.roleOptionText, form.role === role && styles.roleOptionTextSelected]}>{role}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <FormField label="Password *" value={form.password} onChangeText={(text: string) => setForm((f) => ({ ...f, password: text }))} placeholder="Password" secureTextEntry />
        <TouchableOpacity style={[styles.submitButton, submitting && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={submitting}>
          <LinearGradient colors={[colors.primary, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.submitButtonGradient}>
            {submitting ? <ActivityIndicator color={colors.textLight} /> : <Text style={styles.submitButtonText}>Create Employee</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function FormField({ label, value, onChangeText, placeholder, keyboardType, secureTextEntry }: any) {
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.textSecondary} keyboardType={keyboardType} secureTextEntry={secureTextEntry} />
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
  sectionTitle: { ...typography.heading.h3, color: colors.textPrimary, marginBottom: 16, marginTop: 8 },
  fieldContainer: { marginBottom: 16 },
  label: { ...typography.label.medium, color: colors.textPrimary, marginBottom: 8 },
  input: { ...typography.body.medium, backgroundColor: colors.backgroundLight, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, color: colors.textPrimary },
  textAreaContainer: { marginBottom: 16 },
  textArea: { ...typography.body.medium, backgroundColor: colors.backgroundLight, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, color: colors.textPrimary, minHeight: 80, textAlignVertical: 'top' },
  roleContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleOption: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.backgroundLight, borderWidth: 1, borderColor: colors.border },
  roleOptionSelected: { backgroundColor: colors.primary + '20', borderColor: colors.primary },
  roleOptionText: { ...typography.body.medium, color: colors.textPrimary },
  roleOptionTextSelected: { color: colors.primary, fontWeight: '600' },
  submitButton: { marginTop: 24, borderRadius: 12, overflow: 'hidden' },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonGradient: { paddingVertical: 16, alignItems: 'center' },
  submitButtonText: { ...typography.label.large, color: colors.textLight, fontWeight: '600' },
});


