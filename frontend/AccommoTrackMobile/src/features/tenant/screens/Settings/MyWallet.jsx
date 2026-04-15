import React, { useEffect, useState } from 'react';
import { View, Text, StatusBar, ScrollView, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import { getStyles } from '../../../../styles/Menu/Settings.js';
import Header from '../../components/Header.jsx';
import { useNavigation } from '@react-navigation/native';
import ProfileService from '../../../../services/ProfileService.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tenantQueryKeys } from '../../hooks/useTenantQueryHelpers.js';
import { Ionicons } from '@expo/vector-icons';

export default function MyWallet() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const [balance, setBalance] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: tenantQueryKeys.profilePage(),
    queryFn: async () => {
      const res = await ProfileService.getProfile();
      if (res?.success && res?.data) return res.data;
      const userString = await AsyncStorage.getItem("user");
      if (userString) return JSON.parse(userString);
      throw new Error("Failed to load profile");
    },
    placeholderData: (previousData) => previousData,
  });

  useEffect(() => {
    if (data?.wallet_balance !== undefined) {
      setBalance(parseFloat(data.wallet_balance));
    }
  }, [data]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar barStyle="light-content" />
      <Header title="My Wallet & Credits" onBack={() => navigation.goBack()} showRightIcon={false} />
      
      {isLoading && !data ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView style={{ padding: 20 }}>
          <View style={{
            backgroundColor: '#10B981', // Tailwind green-500
            borderRadius: 16,
            padding: 24,
            width: '100%',
            alignSelf: 'center',
            shadowColor: "#059669", 
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 5,
            elevation: 4,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Ionicons name="wallet-outline" size={24} color="white" style={{ marginRight: 8 }} />
              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>My Wallet & Credits</Text>
            </View>
            <Text style={{ color: '#D1FAE5', fontSize: 14, marginBottom: 8 }}>Available balance</Text>
            <Text style={{ color: 'white', fontWeight: '900', fontSize: 36, letterSpacing: -0.5 }}>
              ₱{balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            <Text style={{ color: '#D1FAE5', fontSize: 12, marginTop: 12 }}>
              Use this balance for your next payment or invoice.
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}
