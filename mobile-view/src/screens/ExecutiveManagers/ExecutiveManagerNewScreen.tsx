import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients } from '../../theme/colors';
import { typography } from '../../theme/typography';
import ApiService from '../../services/api';

const apiService = new ApiService('https://crm-backend-production-2ffd.up.railway.app/api');

export default function ExecutiveManagerNewScreen({ navigation }: any) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'Manager',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!form.name?.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }
    if (!form.email?.trim()) {
      Alert.alert('Error', 'Email is required');
      return;
    }
    if (!form.password?.trim()) {
      Alert.alert('Error', 'Password is required');
      return;
    }

    setSubmitting(true);
    try {
      await apiService.post('/executive-managers', form);
      Alert.alert('Success', 'Manager created successfully', [
        { text: 'OK', onPress: () => navigation.navigate('ExecutiveManagers') },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create manager');
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
          <Text style={styles.headerTitle}>New Manager</Text>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <FormField label="Name *" value={form.name} onChangeText={(text: string) => setForm((f) => ({ ...f, name: text }))} placeholder="Enter name" />
        <FormField label="Email *" value={form.email} onChangeText={(text: string) => setForm((f) => ({ ...f, email: text }))} placeholder="Enter email" keyboardType="email-address" />
        <FormField label="Phone" value={form.phone} onChangeText={(text: string) => setForm((f) => ({ ...f, phone: text }))} placeholder="Enter phone" keyboardType="phone-pad" />
        <FormField label="Password *" value={form.password} onChangeText={(text: string) => setForm((f) => ({ ...f, password: text }))} placeholder="Enter password" secureTextEntry />
        <TouchableOpacity style={[styles.submitButton, submitting && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={submitting}>
          <LinearGradient colors={[colors.primary, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.submitButtonGradient}>
            {submitting ? <ActivityIndicator color={colors.textLight} /> : <Text style={styles.submitButtonText}>Create Manager</Text>}
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
  fieldContainer: { marginBottom: 16 },
  label: { ...typography.label.medium, color: colors.textPrimary, marginBottom: 8 },
  input: { ...typography.body.medium, backgroundColor: colors.backgroundLight, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, color: colors.textPrimary },
  submitButton: { marginTop: 24, borderRadius: 12, overflow: 'hidden' },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonGradient: { paddingVertical: 16, alignItems: 'center' },
  submitButtonText: { ...typography.label.large, color: colors.textLight, fontWeight: '600' },
});


