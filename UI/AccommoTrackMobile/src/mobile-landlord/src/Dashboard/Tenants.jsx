import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../../../styles/Landlord/Tenants.js';
import Button from '../components/ui/Button';

export default function TenantsScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  
  const [tenants] = useState([
    {
      id: 1,
      name: 'Pheinz Magnun',
      email: 'pheinz.magnun@gmail.com',
      phone: '+63 993 692 9775',
      roomNumber: '101',
      roomType: 'Single Room',
      monthlyRent: 5000,
      paymentStatus: 'paid',
      lastPayment: '2025-11-01'
    },
    {
      id: 2,
      name: 'Jean Claro',
      email: 'JeanClaro@gmail.com',
      phone: '+63 976 434 1384',
      roomNumber: '102',
      roomType: 'Double Room',
      monthlyRent: 4500,
      paymentStatus: 'pending',
      lastPayment: '2025-10-01'
    },
    {
      id: 3,
      name: 'Ar-rauf Imar',
      email: 'mike.j@email.com',
      phone: '+63 934 567 8901',
      roomNumber: '102',
      roomType: 'Double Room',
      monthlyRent: 4500,
      paymentStatus: 'paid',
      lastPayment: '2025-11-01'
    },
    {
      id: 4,
      name: 'Rhadzmiel Sali',
      email: 'rhadzsali@gmail.com',
      phone: '+63 945 678 9012',
      roomNumber: '201',
      roomType: 'Quad Room',
      monthlyRent: 3500,
      paymentStatus: 'overdue',
      lastPayment: '2025-09-01'
    }
  ]);

  const getPaymentStatusColor = (status) => {
    switch(status) {
      case 'paid': return '#4CAF50';
      case 'pending': return '#FF9800';
      case 'overdue': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getPaymentStatusBg = (status) => {
    switch(status) {
      case 'paid': return '#E8F5E9';
      case 'pending': return '#FFF3E0';
      case 'overdue': return '#FFEBEE';
      default: return '#F5F5F5';
    }
  };

  const filteredTenants = tenants.filter(tenant =>
    tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tenant.roomNumber.includes(searchQuery)
  );

  const stats = {
    total: tenants.length,
    paid: tenants.filter(t => t.paymentStatus === 'paid').length,
    pending: tenants.filter(t => t.paymentStatus === 'pending').length,
    overdue: tenants.filter(t => t.paymentStatus === 'overdue').length
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#4CAF50" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tenants</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: '#4CAF50' }]}>
          <Text style={[styles.statValue, { color: '#FFFFFF' }]}>{stats.paid}</Text>
          <Text style={[styles.statLabel, { color: '#FFFFFF' }]}>Paid</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: '#FF9800' }]}>
          <Text style={[styles.statValue, { color: '#FFFFFF' }]}>{stats.pending}</Text>
          <Text style={[styles.statLabel, { color: '#FFFFFF' }]}>Pending</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: '#F44336' }]}>
          <Text style={[styles.statValue, { color: '#FFFFFF' }]}>{stats.overdue}</Text>
          <Text style={[styles.statLabel, { color: '#FFFFFF' }]}>Overdue</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or room..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Tenants List */}
      <ScrollView style={styles.tenantsList} showsVerticalScrollIndicator={false}>
        {filteredTenants.map((tenant) => (
          <TouchableOpacity
            key={tenant.id}
            style={styles.tenantCard}
            onPress={() => navigation.navigate('TenantDetails', { tenant })}
          >
            <View style={styles.tenantAvatar}>
              <Text style={styles.tenantInitials}>
                {tenant.name.split(' ').map(n => n[0]).join('')}
              </Text>
            </View>

            <View style={styles.tenantInfo}>
              <Text style={styles.tenantName}>{tenant.name}</Text>
              <Text style={styles.tenantRoom}>Room {tenant.roomNumber} • {tenant.roomType}</Text>
              <View style={styles.tenantMeta}>
                <Text style={styles.tenantRent}>₱{tenant.monthlyRent.toLocaleString()}/mo</Text>
                <View style={[styles.paymentBadge, { backgroundColor: getPaymentStatusBg(tenant.paymentStatus) }]}>
                  <Text style={[styles.paymentText, { color: getPaymentStatusColor(tenant.paymentStatus) }]}>
                    {tenant.paymentStatus.charAt(0).toUpperCase() + tenant.paymentStatus.slice(1)}
                  </Text>
                </View>
              </View>
            </View>

            <Button
              onPress={() => navigation.navigate('Chat', { tenant })}
              style={styles.messageButton}
              type="primary"
            >
              <Ionicons name="chatbubble-outline" size={20} color="#fff" />
            </Button>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

