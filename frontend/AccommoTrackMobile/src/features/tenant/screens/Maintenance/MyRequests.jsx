import React, { useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import tenantService from '../../../../services/TenantService.js';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import { getStyles } from '../../../../styles/Tenant/MaintenanceStyles.js';
import {
  tenantQueryKeys,
  useTenantFocusRefetch,
  useTenantRefreshHandler,
} from '../../hooks/useTenantQueryHelpers.js';

export default function MyRequests({ hideHeader = false, historyOnly = false, navigation }) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const [refreshing, setRefreshing] = useState(false);

  const maintenanceInfiniteQuery = useInfiniteQuery({
    queryKey: tenantQueryKeys.maintenanceRequests(),
    queryFn: async ({ pageParam = 1 }) => {
      const res = await tenantService.getMyMaintenanceRequests(pageParam);
      if (!res?.success) throw new Error(res?.error || 'Failed to load maintenance requests');
      return res.data; // { items, pagination }
    },
    getNextPageParam: (lastPage) => {
      const { current_page, last_page } = lastPage.pagination;
      return current_page < last_page ? current_page + 1 : undefined;
    },
    initialPageParam: 1,
    placeholderData: (previousData) => previousData,
  });

  const requests = React.useMemo(() => {
    return maintenanceInfiniteQuery.data?.pages.flatMap((page) => page.items) || [];
  }, [maintenanceInfiniteQuery.data]);

  const loading = maintenanceInfiniteQuery.isPending && requests.length === 0;
  const isFetchingNextPage = maintenanceInfiniteQuery.isFetchingNextPage;
  const refetchMaintenanceRequests = maintenanceInfiniteQuery.refetch;
  const maintenanceRequestsRefetchers = React.useMemo(
    () => [refetchMaintenanceRequests],
    [refetchMaintenanceRequests],
  );

  useTenantFocusRefetch({ refetchers: maintenanceRequestsRefetchers });

  const onRefresh = useTenantRefreshHandler({
    setRefreshing,
    refetchers: maintenanceRequestsRefetchers,
  });

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
          keyExtractor={(item, index) => (item.id || item.request_id || `req-${index}`).toString()}
          onEndReached={() => {
            if (maintenanceInfiniteQuery.hasNextPage && !isFetchingNextPage) {
              maintenanceInfiniteQuery.fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.3}
          ListFooterComponent={() => (
            isFetchingNextPage ? (
              <View style={{ paddingVertical: 20 }}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
              </View>
            ) : null
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
          <TouchableOpacity 
            style={[styles.requestCard, { backgroundColor: theme.colors.surface }]}
            onPress={() => navigation.navigate('MaintenanceDetail', { requestId: item.id })}
          >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[styles.requestTitle, { color: theme.colors.text }]}>
                  {item.title || item.subject || 'Maintenance Request'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.textTertiary} />
              </View>
              <Text style={[styles.requestText, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                {item.description || item.note || ''}
              </Text>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                 <Text style={[styles.requestText, { color: theme.colors.primary, fontWeight: 'bold', fontSize: 12 }]}>
                   {item.status?.replace('_', ' ').toUpperCase()}
                 </Text>
                 <Text style={[styles.requestText, { color: theme.colors.textTertiary, fontSize: 11 }]}>
                   {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
                 </Text>
              </View>
          </TouchableOpacity>
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
                <Ionicons name="construct-outline" size={64} color={theme.colors.textTertiary} />
                <Text style={[styles.emptyTitle, { color: theme.colors.textSecondary, textAlign: 'center' }]}>No maintenance requests found</Text>
                <Text style={[styles.emptySub, { color: theme.colors.textTertiary, textAlign: 'center' }]}>
                  {historyOnly
                    ? 'No maintenance request history yet. Create new requests in MyBookings MyStay.'
                    : 'If you have any issues with your room, feel free to submit a request.'}
                </Text>
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
