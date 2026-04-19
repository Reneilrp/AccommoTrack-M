import React, { useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator, 
  StyleSheet,
  RefreshControl,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import tenantService from '../../../../services/TenantService.js';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import { getStyles as getBaseStyles } from '../../../../styles/Tenant/MaintenanceStyles.js';
import { BASE_URL as API_BASE_URL } from '../../../../config/index.js';

export default function MaintenanceDetailScreen({ route, navigation }) {
  const { requestId } = route.params;
  const { theme } = useTheme();
  const baseStyles = React.useMemo(() => getBaseStyles(theme), [theme]);
  const [refreshing, setRefreshing] = useState(false);

  const { data: result, isLoading, refetch } = useQuery({
    queryKey: ['maintenanceRequest', requestId],
    queryFn: () => tenantService.getRequestDetails(requestId),
  });

  const request = result?.data || null;

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return { uri: path };
    return { uri: `${API_BASE_URL}/storage/${path.replace(/^\//, '')}` };
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return '#10b981';
      case 'in_progress': return '#3b82f6';
      case 'pending': return '#f59e0b';
      case 'cancelled': return '#ef4444';
      default: return theme.colors.textSecondary;
    }
  };

  const localStyles = StyleSheet.create({
    statusBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      alignSelf: 'flex-start',
      marginTop: 8,
    },
    statusText: {
      fontSize: 10,
      fontWeight: '900',
      textTransform: 'uppercase',
      letterSpacing: 1,
      color: '#fff',
    },
    priorityBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.dark ? 'rgba(255,255,255,0.05)' : '#f9fafb',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    timelineContainer: {
      marginTop: 24,
      paddingLeft: 4,
    },
    timelineItem: {
      flexDirection: 'row',
      gap: 16,
      paddingBottom: 24,
    },
    timelineLine: {
      width: 2,
      backgroundColor: theme.colors.border,
      position: 'absolute',
      left: 7,
      top: 16,
      bottom: 0,
    },
    timelineDot: {
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: theme.colors.primary,
      borderWidth: 3,
      borderColor: theme.colors.surface,
      zIndex: 1,
      marginTop: 2,
    },
    timelineContent: {
      flex: 1,
    },
    timelineHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    timelineTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    timelineTime: {
      fontSize: 10,
      color: theme.colors.textTertiary,
      fontWeight: '600',
    },
    timelineNote: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      lineHeight: 18,
      backgroundColor: theme.dark ? 'rgba(255,255,255,0.02)' : '#fefefe',
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginTop: 4,
    },
    imageScroll: {
      marginTop: 12,
      gap: 12,
    },
    detailImage: {
      width: 120,
      height: 120,
      borderRadius: 12,
      backgroundColor: theme.colors.backgroundSecondary,
    },
    docItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    docName: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.text,
      flex: 1,
    }
  });

  if (isLoading) {
    return (
      <View style={baseStyles.centered}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (!request) {
    return (
      <View style={baseStyles.centered}>
        <Ionicons name="search-outline" size={48} color={theme.colors.textTertiary} />
        <Text style={{ color: theme.colors.text, marginTop: 16, fontWeight: '600' }}>Request not found</Text>
        <TouchableOpacity 
          style={{ marginTop: 24, padding: 12, backgroundColor: theme.colors.primary, borderRadius: 10 }}
          onPress={() => navigation.goBack()}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const attachments = request.attachments || [];
  const images = (request.images || []).map(path => ({ path, type: 'image' }));
  const docs = attachments.filter(a => !a.mime_type?.startsWith('image')).map(a => ({ path: a.file_path, name: a.original_name, type: 'doc' }));

  return (
    <SafeAreaView style={baseStyles.safeArea}>
      {/* Header */}
      <View style={baseStyles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={baseStyles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={baseStyles.headerTitle}>Request Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        contentContainerStyle={baseStyles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Core Info */}
        <View style={baseStyles.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={[baseStyles.label, { marginBottom: 4 }]}>#{request.id || request.request_id}</Text>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.colors.text }}>{request.title}</Text>
            </View>
            <View style={localStyles.priorityBadge}>
               <Ionicons name="flash" size={12} color={request.priority === 'urgent' ? '#ef4444' : theme.colors.primary} />
               <Text style={{ fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', color: theme.colors.textSecondary }}>{request.priority}</Text>
            </View>
          </View>

          <View style={[localStyles.statusBadge, { backgroundColor: getStatusColor(request.status) }]}>
            <Text style={localStyles.statusText}>{request.status?.replace('_', ' ')}</Text>
          </View>
        </View>

        {/* Description */}
        <View style={baseStyles.section}>
          <Text style={baseStyles.label}>Description</Text>
          <Text style={{ fontSize: 15, lineHeight: 22, color: theme.colors.textSecondary }}>
            {request.description}
          </Text>
        </View>

        {/* Photo & Document Attachments */}
        {(images.length > 0 || docs.length > 0) && (
          <View style={baseStyles.section}>
            <Text style={baseStyles.label}>Attachments</Text>
            
            {images.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[localStyles.imageScroll, { marginBottom: docs.length > 0 ? 16 : 0 }]}>
                {images.map((img, idx) => (
                  <Image key={idx} source={getImageUrl(img.path)} style={localStyles.detailImage} />
                ))}
              </ScrollView>
            )}

            {docs.map((doc, idx) => (
              <TouchableOpacity 
                key={idx} 
                style={localStyles.docItem}
                onPress={() => Linking.openURL(getImageUrl(doc.path).uri)}
              >
                <Ionicons 
                  name={doc.name?.toLowerCase().endsWith('.pdf') ? 'document-text' : 'document'} 
                  size={24} 
                  color={theme.colors.primary} 
                />
                <Text style={localStyles.docName} numberOfLines={1}>{doc.name || 'View Document'}</Text>
                <Ionicons name="download-outline" size={18} color={theme.colors.textTertiary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Staff Assigned */}
        {request.assigned_worker && (
          <View style={baseStyles.section}>
             <View style={baseStyles.infoBox}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.primary, alignItems: 'center', justifyCenter: 'center' }}>
                   <Ionicons name="person" size={20} color="#fff" />
                </View>
                <View>
                   <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.colors.textSecondary }}>Assigned Staff</Text>
                   <Text style={{ fontSize: 14, fontWeight: 'bold', color: theme.colors.text }}>
                      {request.assigned_worker.first_name} {request.assigned_worker.last_name}
                   </Text>
                </View>
             </View>
          </View>
        )}

        {/* Timeline */}
        <View style={[baseStyles.section, { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 24 }]}>
          <Text style={baseStyles.label}>Live Feed / History</Text>
          <View style={localStyles.timelineContainer}>
            {request.updates?.length === 0 ? (
              <Text style={{ fontSize: 12, color: theme.colors.textTertiary, fontStyle: 'italic' }}>No activity logged yet.</Text>
            ) : (
              request.updates.map((update, idx) => (
                <View key={update.id} style={localStyles.timelineItem}>
                  {idx < request.updates.length - 1 && <View style={localStyles.timelineLine} />}
                  <View style={[localStyles.timelineDot, { backgroundColor: update.status === 'completed' ? '#10b981' : theme.colors.primary }]} />
                  <View style={localStyles.timelineContent}>
                    <View style={localStyles.timelineHeader}>
                      <Text style={localStyles.timelineTitle}>
                        {update.status?.replace('_', ' ').toUpperCase()}
                      </Text>
                      <Text style={localStyles.timelineTime}>
                        {new Date(update.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 10, color: theme.colors.textTertiary, marginBottom: 4 }}>
                      {new Date(update.created_at).toLocaleDateString()}
                    </Text>
                    {update.notes && (
                      <Text style={localStyles.timelineNote}>{update.notes}</Text>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
