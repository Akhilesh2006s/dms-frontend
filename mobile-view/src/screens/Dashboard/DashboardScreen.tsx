import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import AttendanceCard from '../../components/AttendanceCard';
import { colors, gradients } from '../../theme/colors';
import { commonStyles } from '../../theme/styles';
import { typography } from '../../theme/typography';

export default function DashboardScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  
  // Determine user role and permissions (like web app)
  const userRole = user?.role || '';
  const userRoles = user?.roles || [];
  const normalizedRole = userRole.toLowerCase();
  const normalizedRoles = userRoles.map((role) => role.toLowerCase());
  const roleIncludes = (match: string) =>
    normalizedRole.includes(match.toLowerCase()) ||
    normalizedRoles.some((role) => role.includes(match.toLowerCase()));
  
  // Role checks - NOW INCLUDING Admin/Super Admin for mobile app
  // Note: "Executive" is the role name for employees in the web app
  const isEmployee = roleIncludes('employee') || roleIncludes('executive') || roleIncludes('sales bde');
  const isManager = roleIncludes('manager');
  const isCoordinator = roleIncludes('coordinator');
  const isSeniorCoordinator = roleIncludes('senior coordinator');
  const isTrainer = roleIncludes('trainer');
  const isSalesBDE = roleIncludes('sales bde');
  const isFinanceManager = roleIncludes('finance manager');
  const isExecutive = roleIncludes('executive');
  const isAdmin = roleIncludes('admin') || roleIncludes('super admin');
  
  // Debug logging
  useEffect(() => {
    console.log('Dashboard - User Role:', userRole);
    console.log('Dashboard - User Roles:', userRoles);
    console.log('Dashboard - isEmployee:', isEmployee);
    console.log('Dashboard - isExecutive:', isExecutive);
  }, [userRole, userRoles, isEmployee, isExecutive]);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  // Employee Dashboard (like web app - only My DC, no Create DC)
  const renderEmployeeDashboard = () => (
    <View style={styles.content}>
      <AttendanceCard />
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIconContainer}>
            <View style={[styles.sectionIcon, { backgroundColor: '#3b82f6' + '15' }]}>
              <Text style={styles.sectionIconText}>📋</Text>
            </View>
          </View>
          <Text style={styles.sectionTitle}>Leads</Text>
        </View>
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('LeadsList')}
        >
          <LinearGradient
            colors={['#3b82f6', '#2563eb']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          >
            <View style={styles.cardContent}>
              <View style={styles.cardIconContainer}>
                <Text style={styles.cardIcon}>📋</Text>
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>My Leads</Text>
                <Text style={styles.cardSubtitle}>View and manage leads</Text>
              </View>
              <View style={styles.cardArrowContainer}>
                <Text style={styles.cardArrow}>›</Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('LeadAdd')}
        >
          <View style={[styles.cardContent, styles.cardContentWhite]}>
            <View style={styles.cardIconContainer}>
              <Text style={styles.cardIconWhite}>➕</Text>
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitleWhite}>Add Lead</Text>
              <Text style={styles.cardSubtitleWhite}>Create new lead</Text>
            </View>
            <View style={styles.cardArrowContainer}>
              <Text style={styles.cardArrowWhite}>›</Text>
            </View>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('LeadFollowup')}
        >
          <View style={[styles.cardContent, styles.cardContentWhite]}>
            <View style={styles.cardIconContainer}>
              <Text style={styles.cardIconWhite}>📞</Text>
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitleWhite}>Followup Leads</Text>
              <Text style={styles.cardSubtitleWhite}>View follow-up leads</Text>
            </View>
            <View style={styles.cardArrowContainer}>
              <Text style={styles.cardArrowWhite}>›</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIconContainer}>
            <View style={[styles.sectionIcon, { backgroundColor: colors.primary + '15' }]}>
              <Text style={styles.sectionIconText}>📦</Text>
            </View>
          </View>
          <Text style={styles.sectionTitle}>DC Management</Text>
        </View>
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('DCList', { type: 'sales' })}
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          >
            <View style={styles.cardContent}>
              <View style={styles.cardIconContainer}>
                <Text style={styles.cardIcon}>📋</Text>
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>My DC</Text>
                <Text style={styles.cardSubtitle}>View and manage my DC orders</Text>
              </View>
              <View style={styles.cardArrowContainer}>
                <Text style={styles.cardArrow}>›</Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('DCClosed')}
        >
          <View style={[styles.cardContent, styles.cardContentWhite]}>
            <View style={styles.cardIconContainer}>
              <Text style={styles.cardIconWhite}>✅</Text>
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitleWhite}>Closed Sales</Text>
              <Text style={styles.cardSubtitleWhite}>View closed sales and raise DC</Text>
            </View>
            <View style={styles.cardArrowContainer}>
              <Text style={styles.cardArrowWhite}>›</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIconContainer}>
            <View style={[styles.sectionIcon, { backgroundColor: colors.success + '15' }]}>
              <Text style={styles.sectionIconText}>💳</Text>
            </View>
          </View>
          <Text style={styles.sectionTitle}>Payments</Text>
        </View>
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('PaymentList')}
        >
          <LinearGradient
            colors={[colors.success, '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          >
            <View style={styles.cardContent}>
              <View style={styles.cardIconContainer}>
                <Text style={styles.cardIcon}>💰</Text>
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>Add Payment</Text>
                <Text style={styles.cardSubtitle}>Record new payment</Text>
              </View>
              <View style={styles.cardArrowContainer}>
                <Text style={styles.cardArrow}>›</Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIconContainer}>
            <View style={[styles.sectionIcon, { backgroundColor: colors.warning + '15' }]}>
              <Text style={styles.sectionIconText}>💸</Text>
            </View>
          </View>
          <Text style={styles.sectionTitle}>Expenses</Text>
        </View>
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('ExpenseList')}
        >
          <LinearGradient
            colors={[colors.warning, '#D97706']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          >
            <View style={styles.cardContent}>
              <View style={styles.cardIconContainer}>
                <Text style={styles.cardIcon}>➕</Text>
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>Create Expense</Text>
                <Text style={styles.cardSubtitle}>Submit new expense</Text>
              </View>
              <View style={styles.cardArrowContainer}>
                <Text style={styles.cardArrow}>›</Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('ExpenseList', { myExpenses: true })}
        >
          <View style={[styles.cardContent, styles.cardContentWhite]}>
            <View style={styles.cardIconContainer}>
              <Text style={styles.cardIconWhite}>📊</Text>
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitleWhite}>My Expenses</Text>
              <Text style={styles.cardSubtitleWhite}>View my submitted expenses</Text>
            </View>
            <View style={styles.cardArrowContainer}>
              <Text style={styles.cardArrowWhite}>›</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIconContainer}>
            <View style={[styles.sectionIcon, { backgroundColor: colors.info + '15' }]}>
              <Text style={styles.sectionIconText}>🏖️</Text>
            </View>
          </View>
          <Text style={styles.sectionTitle}>Leaves</Text>
        </View>
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('LeaveList')}
        >
          <LinearGradient
            colors={[colors.info, '#2563EB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          >
            <View style={styles.cardContent}>
              <View style={styles.cardIconContainer}>
                <Text style={styles.cardIcon}>📅</Text>
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>My Leaves</Text>
                <Text style={styles.cardSubtitle}>View and manage leaves</Text>
              </View>
              <View style={styles.cardArrowContainer}>
                <Text style={styles.cardArrow}>›</Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Manager Dashboard
  const renderManagerDashboard = () => (
    <View style={styles.content}>
      <AttendanceCard />
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>DC</Text>
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('DCList', { type: 'sales' })}
        >
          <Text style={styles.cardTitle}>DC Management</Text>
          <Text style={styles.cardSubtitle}>View and manage DC orders</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('DCCapture', { type: 'sales' })}
        >
          <Text style={styles.cardTitle}>Create DC</Text>
          <Text style={styles.cardSubtitle}>Create new DC entry</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Trainer Dashboard
  const renderTrainerDashboard = () => (
    <View style={styles.content}>
      <AttendanceCard />
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Training</Text>
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('DCList', { type: 'training' })}
        >
          <Text style={styles.cardTitle}>Training DC</Text>
          <Text style={styles.cardSubtitle}>View training DC orders</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('DCCapture', { type: 'training' })}
        >
          <Text style={styles.cardTitle}>Capture Training DC</Text>
          <Text style={styles.cardSubtitle}>Create new training DC</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Sales BDE Dashboard (with Create DC, Payments, Expenses, Leaves)
  const renderSalesBDEDashboard = () => (
    <View style={styles.content}>
      <AttendanceCard />
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>DC</Text>
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('DCList', { type: 'sales' })}
        >
          <Text style={styles.cardTitle}>My DC</Text>
          <Text style={styles.cardSubtitle}>View and manage my DC orders</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('DCCapture', { type: 'sales' })}
        >
          <Text style={styles.cardTitle}>Create DC</Text>
          <Text style={styles.cardSubtitle}>Create new DC entry</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payments</Text>
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('PaymentList')}
        >
          <Text style={styles.cardTitle}>Add Payment</Text>
          <Text style={styles.cardSubtitle}>Record new payment</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Expenses</Text>
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('ExpenseList')}
        >
          <Text style={styles.cardTitle}>Create Expense</Text>
          <Text style={styles.cardSubtitle}>Submit new expense</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('ExpenseList', { myExpenses: true })}
        >
          <Text style={styles.cardTitle}>My Expenses</Text>
          <Text style={styles.cardSubtitle}>View my submitted expenses</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Leaves</Text>
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('LeaveList')}
        >
          <Text style={styles.cardTitle}>My Leaves</Text>
          <Text style={styles.cardSubtitle}>View and manage leaves</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Combined Sales BDE + Trainer
  const renderCombinedDashboard = () => (
    <View style={styles.content}>
      <AttendanceCard />
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sales BDE</Text>
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('DCList', { type: 'sales' })}
        >
          <Text style={styles.cardTitle}>My DC</Text>
          <Text style={styles.cardSubtitle}>View and manage DC orders</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('DCCapture', { type: 'sales' })}
        >
          <Text style={styles.cardTitle}>Create DC</Text>
          <Text style={styles.cardSubtitle}>Create new DC entry</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trainer</Text>
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('DCList', { type: 'training' })}
        >
          <Text style={styles.cardTitle}>Training DC</Text>
          <Text style={styles.cardSubtitle}>View training DC orders</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('DCCapture', { type: 'training' })}
        >
          <Text style={styles.cardTitle}>Capture Training DC</Text>
          <Text style={styles.cardSubtitle}>Create new training DC</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Admin Dashboard - Comprehensive with all features
  const renderAdminDashboard = () => (
    <View style={styles.content}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIconContainer}>
            <View style={[styles.sectionIcon, { backgroundColor: '#8B5CF6' + '15' }]}>
              <Text style={styles.sectionIconText}>👥</Text>
            </View>
          </View>
          <Text style={styles.sectionTitle}>Employees</Text>
        </View>
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('EmployeesActive')}
        >
          <LinearGradient
            colors={['#8B5CF6', '#7C3AED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          >
            <View style={styles.cardContent}>
              <View style={styles.cardIconContainer}>
                <Text style={styles.cardIcon}>👥</Text>
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>Active Employees</Text>
                <Text style={styles.cardSubtitle}>View and manage employees</Text>
              </View>
              <View style={styles.cardArrowContainer}>
                <Text style={styles.cardArrow}>›</Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('EmployeeNew')}
        >
          <View style={[styles.cardContent, styles.cardContentWhite]}>
            <View style={styles.cardIconContainer}>
              <Text style={styles.cardIconWhite}>➕</Text>
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitleWhite}>Add Employee</Text>
              <Text style={styles.cardSubtitleWhite}>Create new employee</Text>
            </View>
            <View style={styles.cardArrowContainer}>
              <Text style={styles.cardArrowWhite}>›</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIconContainer}>
            <View style={[styles.sectionIcon, { backgroundColor: colors.primary + '15' }]}>
              <Text style={styles.sectionIconText}>📦</Text>
            </View>
          </View>
          <Text style={styles.sectionTitle}>DC Management</Text>
        </View>
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('DCAdminMy')}
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          >
            <View style={styles.cardContent}>
              <View style={styles.cardIconContainer}>
                <Text style={styles.cardIcon}>📋</Text>
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>All Created DCs</Text>
                <Text style={styles.cardSubtitle}>View all employee DCs</Text>
              </View>
              <View style={styles.cardArrowContainer}>
                <Text style={styles.cardArrow}>›</Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('DCPending')}
        >
          <View style={[styles.cardContent, styles.cardContentWhite]}>
            <View style={styles.cardIconContainer}>
              <Text style={styles.cardIconWhite}>⏳</Text>
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitleWhite}>Pending DCs</Text>
              <Text style={styles.cardSubtitleWhite}>Review pending DCs</Text>
            </View>
            <View style={styles.cardArrowContainer}>
              <Text style={styles.cardArrowWhite}>›</Text>
            </View>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('DCClosed')}
        >
          <View style={[styles.cardContent, styles.cardContentWhite]}>
            <View style={styles.cardIconContainer}>
              <Text style={styles.cardIconWhite}>✅</Text>
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitleWhite}>Closed Sales</Text>
              <Text style={styles.cardSubtitleWhite}>View closed sales</Text>
            </View>
            <View style={styles.cardArrowContainer}>
              <Text style={styles.cardArrowWhite}>›</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIconContainer}>
            <View style={[styles.sectionIcon, { backgroundColor: '#10B981' + '15' }]}>
              <Text style={styles.sectionIconText}>📦</Text>
            </View>
          </View>
          <Text style={styles.sectionTitle}>Products</Text>
        </View>
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('ProductsList')}
        >
          <LinearGradient
            colors={['#10B981', '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          >
            <View style={styles.cardContent}>
              <View style={styles.cardIconContainer}>
                <Text style={styles.cardIcon}>📦</Text>
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>Products</Text>
                <Text style={styles.cardSubtitle}>Manage products</Text>
              </View>
              <View style={styles.cardArrowContainer}>
                <Text style={styles.cardArrow}>›</Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('ProductNew')}
        >
          <View style={[styles.cardContent, styles.cardContentWhite]}>
            <View style={styles.cardIconContainer}>
              <Text style={styles.cardIconWhite}>➕</Text>
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitleWhite}>Add Product</Text>
              <Text style={styles.cardSubtitleWhite}>Create new product</Text>
            </View>
            <View style={styles.cardArrowContainer}>
              <Text style={styles.cardArrowWhite}>›</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIconContainer}>
            <View style={[styles.sectionIcon, { backgroundColor: colors.warning + '15' }]}>
              <Text style={styles.sectionIconText}>💳</Text>
            </View>
          </View>
          <Text style={styles.sectionTitle}>Payments</Text>
        </View>
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('PaymentApprovalPendingCash')}
        >
          <LinearGradient
            colors={[colors.warning, '#D97706']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          >
            <View style={styles.cardContent}>
              <View style={styles.cardIconContainer}>
                <Text style={styles.cardIcon}>💰</Text>
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>Pending Cash</Text>
                <Text style={styles.cardSubtitle}>Approve cash payments</Text>
              </View>
              <View style={styles.cardArrowContainer}>
                <Text style={styles.cardArrow}>›</Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('PaymentApprovalPendingCheques')}
        >
          <View style={[styles.cardContent, styles.cardContentWhite]}>
            <View style={styles.cardIconContainer}>
              <Text style={styles.cardIconWhite}>💳</Text>
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitleWhite}>Pending Cheques</Text>
              <Text style={styles.cardSubtitleWhite}>Approve cheque payments</Text>
            </View>
            <View style={styles.cardArrowContainer}>
              <Text style={styles.cardArrowWhite}>›</Text>
            </View>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('PaymentTransactionReport')}
        >
          <View style={[styles.cardContent, styles.cardContentWhite]}>
            <View style={styles.cardIconContainer}>
              <Text style={styles.cardIconWhite}>📊</Text>
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitleWhite}>Transaction Report</Text>
              <Text style={styles.cardSubtitleWhite}>View payment reports</Text>
            </View>
            <View style={styles.cardArrowContainer}>
              <Text style={styles.cardArrowWhite}>›</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIconContainer}>
            <View style={[styles.sectionIcon, { backgroundColor: colors.info + '15' }]}>
              <Text style={styles.sectionIconText}>📊</Text>
            </View>
          </View>
          <Text style={styles.sectionTitle}>Reports</Text>
        </View>
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('ReportsLeads')}
        >
          <LinearGradient
            colors={[colors.info, '#2563EB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          >
            <View style={styles.cardContent}>
              <View style={styles.cardIconContainer}>
                <Text style={styles.cardIcon}>📊</Text>
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>Reports</Text>
                <Text style={styles.cardSubtitle}>View all reports</Text>
              </View>
              <View style={styles.cardArrowContainer}>
                <Text style={styles.cardArrow}>›</Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIconContainer}>
            <View style={[styles.sectionIcon, { backgroundColor: '#F59E0B' + '15' }]}>
              <Text style={styles.sectionIconText}>🏢</Text>
            </View>
          </View>
          <Text style={styles.sectionTitle}>Warehouse</Text>
        </View>
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('WarehouseDCAtWarehouse')}
        >
          <LinearGradient
            colors={['#F59E0B', '#D97706']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          >
            <View style={styles.cardContent}>
              <View style={styles.cardIconContainer}>
                <Text style={styles.cardIcon}>📦</Text>
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>DC At Warehouse</Text>
                <Text style={styles.cardSubtitle}>Process warehouse DCs</Text>
              </View>
              <View style={styles.cardArrowContainer}>
                <Text style={styles.cardArrow}>›</Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('WarehouseInventoryItems')}
        >
          <View style={[styles.cardContent, styles.cardContentWhite]}>
            <View style={styles.cardIconContainer}>
              <Text style={styles.cardIconWhite}>📋</Text>
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitleWhite}>Inventory Items</Text>
              <Text style={styles.cardSubtitleWhite}>Manage inventory</Text>
            </View>
            <View style={styles.cardArrowContainer}>
              <Text style={styles.cardArrowWhite}>›</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIconContainer}>
            <View style={[styles.sectionIcon, { backgroundColor: '#EC4899' + '15' }]}>
              <Text style={styles.sectionIconText}>📊</Text>
            </View>
          </View>
          <Text style={styles.sectionTitle}>Sales & Inventory</Text>
        </View>
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Sales')}
        >
          <LinearGradient
            colors={['#EC4899', '#DB2777']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          >
            <View style={styles.cardContent}>
              <View style={styles.cardIconContainer}>
                <Text style={styles.cardIcon}>💰</Text>
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>Sales</Text>
                <Text style={styles.cardSubtitle}>View sales overview</Text>
              </View>
              <View style={styles.cardArrowContainer}>
                <Text style={styles.cardArrow}>›</Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Inventory')}
        >
          <View style={[styles.cardContent, styles.cardContentWhite]}>
            <View style={styles.cardIconContainer}>
              <Text style={styles.cardIconWhite}>📦</Text>
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitleWhite}>Stock Returns</Text>
              <Text style={styles.cardSubtitleWhite}>Manage returns</Text>
            </View>
            <View style={styles.cardArrowContainer}>
              <Text style={styles.cardArrowWhite}>›</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Determine which dashboard to show
  const renderDashboardContent = () => {
    // Admin/Super Admin gets admin dashboard
    if (isAdmin) {
      return renderAdminDashboard();
    }
    // Combined Sales BDE + Trainer gets special dashboard
    else if (isSalesBDE && isTrainer) {
      return renderCombinedDashboard();
    } 
    // Trainer only gets trainer dashboard
    else if (isTrainer && !isSalesBDE) {
      return renderTrainerDashboard();
    } 
    // Regular Employee/Executive role (not Sales BDE) gets employee dashboard with all features
    else if (isEmployee && !isSalesBDE) {
      return renderEmployeeDashboard();
    } 
    // Sales BDE (without Trainer) gets employee dashboard but with Create DC
    else if (isSalesBDE && !isTrainer) {
      return renderSalesBDEDashboard();
    }
    // Manager, Coordinator, etc. get manager dashboard
    else if (isManager || isCoordinator || isSeniorCoordinator || isFinanceManager) {
      return renderManagerDashboard();
    } 
    // Fallback: If user has Executive role but didn't match above, show employee dashboard
    else if (isExecutive) {
      return renderEmployeeDashboard();
    }
    else {
      // Debug: Show user role for troubleshooting
      return (
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Dashboard</Text>
          <Text style={styles.cardSubtitle}>No specific dashboard available for your role: {userRole || 'Unknown'}</Text>
          <Text style={[styles.cardSubtitle, { marginTop: 10, fontSize: 12 }]}>
            Roles: {JSON.stringify(userRoles)}
          </Text>
        </View>
      );
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.name?.split(' ')[0] || 'User'}</Text>
            <View style={styles.roleBadge}>
              <View style={styles.roleBadgeDot} />
              <Text style={styles.roleBadgeText}>{userRole}</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.logoutButton} 
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <View style={styles.logoutButtonInner}>
              <Text style={styles.logoutIcon}>⚙</Text>
            </View>
          </TouchableOpacity>
        </View>
      </LinearGradient>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderDashboardContent()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTextContainer: {
    flex: 1,
  },
  greeting: {
    ...typography.body.medium,
    color: colors.textLight,
    opacity: 0.95,
    marginBottom: 6,
  },
  userName: {
    ...typography.display.small,
    color: colors.textLight,
    marginBottom: 16,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    backdropFilter: 'blur(10px)',
  },
  roleBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textLight,
    marginRight: 8,
    opacity: 0.9,
  },
  roleBadgeText: {
    ...typography.label.small,
    color: colors.textLight,
    textTransform: 'uppercase',
  },
  logoutButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutButtonInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutIcon: {
    fontSize: 22,
    opacity: 0.95,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionIconContainer: {
    marginRight: 12,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionIconText: {
    fontSize: 20,
  },
  sectionTitle: {
    ...typography.heading.h2,
    color: colors.textPrimary,
    flex: 1,
  },
  card: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  cardGradient: {
    borderRadius: 20,
    padding: 20,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
  },
  cardIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardIcon: {
    fontSize: 28,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    ...typography.heading.h3,
    color: colors.textLight,
    marginBottom: 6,
  },
  cardSubtitle: {
    ...typography.body.medium,
    color: colors.textLight,
    opacity: 0.9,
  },
  cardArrowContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  cardArrow: {
    fontSize: 20,
    color: colors.textLight,
    fontWeight: '700',
  },
  cardContentWhite: {
    padding: 20,
    backgroundColor: colors.backgroundLight,
    borderRadius: 20,
  },
  cardTitleWhite: {
    ...typography.heading.h3,
    color: colors.textPrimary,
    marginBottom: 6,
  },
  cardSubtitleWhite: {
    ...typography.body.medium,
    color: colors.textSecondary,
  },
  cardArrowWhite: {
    fontSize: 20,
    color: colors.primary,
    fontWeight: '700',
  },
});

