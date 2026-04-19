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
import { Ionicons } from '@expo/vector-icons';

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
      <View style={{
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: isDebit ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
      }}>
        <Ionicons 
          name={isDebit ? "arrow-up-outline" : "arrow-down-outline"} 
          size={22} 
          color={isDebit ? "#D97706" : "#059669"} 
        />
      </View>
      
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
        </Text>
      </View>

      <Text style={{ 
        fontSize: 16, 
        fontWeight: '900', 
        color: isDebit ? "#D97706" : "#059669" 
      }}>
        {isDebit ? '-' : '+'}₱{(parseFloat(item.amount_cents) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </Text>
    </View>
  );
};

export default function MyWallet() {
  const { theme } = useTheme();
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
      if (res.success) return res.data?.data || [];
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
          {/* Balance Card */}
          <View style={{ padding: 20 }}>
            <View style={{
              backgroundColor: '#10B981', 
              borderRadius: 24,
              padding: 28,
              width: '100%',
              shadowColor: "#059669", 
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.4,
              shadowRadius: 10,
              elevation: 8,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                <View style={{ 
                  backgroundColor: 'rgba(255,255,255,0.2)', 
                  padding: 8, 
                  borderRadius: 12,
                  marginRight: 12
                }}>
                  <Ionicons name="wallet-outline" size={20} color="white" />
                </View>
                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16, letterSpacing: 0.5 }}>AVAILABLE CREDITS</Text>
              </View>
              <Text style={{ color: 'white', fontWeight: '900', fontSize: 42, letterSpacing: -1 }}>
                ₱{balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
              <View style={{ 
                marginTop: 20, 
                paddingTop: 20, 
                borderTopWidth: 1, 
                borderTopColor: 'rgba(255,255,255,0.15)' 
              }}>
                <Text style={{ color: '#D1FAE5', fontSize: 13, lineHeight: 18, fontWeight: '500' }}>
                  Use this balance to discount your next payment. Credits are automatically applied upon checkout.
                </Text>
              </View>
            </View>
          </View>

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
