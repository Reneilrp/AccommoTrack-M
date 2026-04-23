import React, { useEffect, useState } from 'react';
import { View, Text, StatusBar, ScrollView, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import Header from '../../components/Header.jsx';
import { useNavigation } from '@react-navigation/native';
import ProfileService from '../../../../services/ProfileService.js';
import PaymentService from '../../../../services/PaymentService.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tenantQueryKeys } from '../../hooks/useTenantQueryHelpers.js';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { getStyles } from '../../../../styles/Tenant/WalletStyles.js';
import { formatPrice } from '../../../../utils/price.js';

const TransactionItem = ({ item, theme }) => {
  const isDebit = item.type === 'debit';
  const date = new Date(item.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    }}>
      
      <View style={{ flex: 1 }}>
        <Text style={{ 
          fontSize: 15, 
          fontWeight: '700', 
          color: theme.colors.text,
          marginBottom: 4 
        }}>
          {item.description || (isDebit ? "Credit Usage" : "Credit Adjustment")}
        </Text>
        <Text style={{ 
          fontSize: 12, 
          color: theme.colors.textSecondary 
        }}>
          {date} • {item.property?.title || 'System'}
          {item.invoice?.invoice_number ? ` • Inv #${item.invoice.invoice_number}` : ''}
        </Text>
      </View>

      <Text style={{ 
        fontSize: 16, 
        fontWeight: '900', 
        color: isDebit ? "#D97706" : "#059669" 
      }}>
        {isDebit ? '-' : '+'}{formatPrice(item.amount_cents || item.amount || 0)}
      </Text>
    </View>
  );
};

export default function MyWallet() {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation();
  const [balance, setBalance] = useState(0);

  const profileQuery = useQuery({
    queryKey: tenantQueryKeys.profilePage(),
    queryFn: async () => {
      const res = await ProfileService.getProfile();
      if (res?.success && res?.data) return res.data;
      const userString = await AsyncStorage.getItem("user");
      if (userString) return JSON.parse(userString);
      throw new Error("Failed to load profile");
    },
  });

  const logsQuery = useQuery({
    queryKey: ['wallet-logs'],
    queryFn: async () => {
      const res = await PaymentService.getWalletLogs();
      if (res.success) return res.data?.items || [];
      return [];
    },
  });

  useEffect(() => {
    if (profileQuery.data?.wallet_balance !== undefined) {
      setBalance(parseFloat(profileQuery.data.wallet_balance));
    }
  }, [profileQuery.data]);

  const isLoading = profileQuery.isLoading || logsQuery.isLoading;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar barStyle="light-content" />
      <Header title="My Wallet & Credits" onBack={() => navigation.goBack()} showRightIcon={false} />
      
      {isLoading && !profileQuery.data ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Header Spacer */}
          {/* <View style={{ height: 20 }} /> */}

          {/* Balance Card */}
          <View style={styles.balanceCard}>
            <View style={{ position: 'absolute', right: -20, bottom: -20, opacity: 0.1 }}>
              <MaterialCommunityIcons name="wallet" size={160} color="white" />
            </View>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <Text style={styles.balanceValue}>
              {formatPrice(balance)}
            </Text>
            <Text style={styles.balanceSubtext}>
              Automatically applied to your next payments.
            </Text>
          </View>

          {/* Property Scoping Disclaimer */}
          <View style={styles.disclaimerCard}>
            <Ionicons name="information-circle" size={20} color={theme.isDark ? '#FBBF24' : '#B45309'} />
            <Text style={styles.disclaimerText}>
              Important: Credits are only applicable to the property where they were earned and will not appear or be usable at other properties.
            </Text>
          </View>

          <View style={{ height: 32 }} />

          {/* History Section */}
          <View style={{ paddingHorizontal: 20, marginTop: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Ionicons name="time-outline" size={20} color={theme.colors.textSecondary} style={{ marginRight: 8 }} />
              <Text style={{ 
                fontSize: 14, 
                fontWeight: '800', 
                color: theme.colors.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: 1
              }}>
                Transaction History
              </Text>
            </View>

            {logsQuery.isLoading ? (
              <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginTop: 20 }} />
            ) : logsQuery.data?.length === 0 ? (
              <View style={{ 
                padding: 40, 
                alignItems: 'center', 
                backgroundColor: theme.colors.surface, 
                borderRadius: 16,
                marginTop: 10 
              }}>
                <Ionicons name="receipt-outline" size={48} color={theme.colors.border} />
                <Text style={{ 
                  color: theme.colors.textSecondary, 
                  marginTop: 16, 
                  fontSize: 15,
                  fontWeight: '600' 
                }}>
                  No transactions yet
                </Text>
              </View>
            ) : (
              logsQuery.data.map((item) => (
                <TransactionItem key={item.id} item={item} theme={theme} />
              ))
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
