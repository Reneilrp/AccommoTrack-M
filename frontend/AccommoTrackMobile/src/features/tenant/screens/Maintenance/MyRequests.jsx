import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import tenantService from '../../../../services/TenantService.js';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import { getStyles } from '../../../../styles/Tenant/MaintenanceStyles.js';

export default function MyRequests({ hideHeader = false }) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await tenantService.getMyMaintenanceRequests();
      if (res.success && res.data) {
          // data is paginated usually
          const data = res.data.data || res.data || [];
          setRequests(data);
      }
    } catch (err) {
      console.error('Load maintenance requests', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) return (
    <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );

  const content = (
    <View style={styles.container}>
      {!hideHeader && <Text style={[styles.title, { color: theme.colors.text }]}>My Maintenance Requests</Text>}
      <FlatList
          data={requests}
          keyExtractor={(item) => (item.id || item.request_id || String(item.created_at || Math.random())).toString()}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
          <View style={[styles.requestCard, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.requestTitle, { color: theme.colors.text }]}>{item.title || item.subject || 'Maintenance Request'}</Text>
              <Text style={[styles.requestText, { color: theme.colors.textSecondary }]}>{item.description || item.note || ''}</Text>
              <Text style={[styles.requestText, { color: theme.colors.textSecondary }]}>Status: {item.status || item.request_status || 'Pending'}</Text>
              <Text style={[styles.requestText, { color: theme.colors.textSecondary }]}>Created: {item.created_at ? new Date(item.created_at).toLocaleString() : ''}</Text>
          </View>
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
                <Ionicons name="construct-outline" size={64} color={theme.colors.textTertiary} />
                <Text style={[styles.emptyTitle, { color: theme.colors.textSecondary, textAlign: 'center' }]}>No maintenance requests found</Text>
                <Text style={[styles.emptySub, { color: theme.colors.textTertiary, textAlign: 'center' }]}>If you have any issues with your room, feel free to submit a request.</Text>
            </View>
          )}
      />
    </View>
  );

  if (hideHeader) return content;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      {content}
    </SafeAreaView>
  );
}
