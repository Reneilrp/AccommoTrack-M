import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../../../styles/Landlord/RoomManagement.js';
import Button from '../components/ui/Button';
import R101 from '../../../../assets/101.jpeg';
import R102 from '../../../../assets/102.jpeg';
import R103 from '../../../../assets/103.jpeg';
import R201 from '../../../../assets/201.jpeg';



export default function RoomManagementScreen({ navigation }) {
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);

  const [rooms] = useState([
    {
      id: 1,
      roomNumber: '101',
      type: 'Single Room',
      price: 5000,
      status: 'occupied',
      floor: '1st Floor',
      capacity: 1,
      occupied: 1,
      tenant: 'Pheinz Magnun',
      image: R101,
      amenities: ['WiFi', 'AC', 'Study Desk']
    },
    {
      id: 2,
      roomNumber: '102',
      type: 'Double Room',
      price: 4500,
      status: 'occupied',
      floor: '1st Floor',
      capacity: 2,
      occupied: 2,
      tenant: 'Ar-rauf Imar, JP Enriquez',
      image: R102,
      amenities: ['WiFi', 'AC', 'Study Desk']
    },
    {
      id: 3,
      roomNumber: '103',
      type: 'Single Room',
      price: 5500,
      status: 'available',
      floor: '1st Floor',
      capacity: 1,
      occupied: 0,
      tenant: 'Jean claro',
      image: R103,
      amenities: ['WiFi', 'AC', 'Private Bath']
    },
    {
      id: 4,
      roomNumber: '201',
      type: 'Quad Room',
      price: 3500,
      status: 'maintenance',
      floor: '2nd Floor',
      capacity: 4,
      occupied: 0,
      tenant: 'Rhadzmiel Sali',
      image: R201,
      amenities: ['WiFi', 'Fan']
    }
  ]);

  const filteredRooms = filterStatus === 'all' 
    ? rooms 
    : rooms.filter(room => room.status === filterStatus);

  const stats = {
    total: rooms.length,
    occupied: rooms.filter(r => r.status === 'occupied').length,
    available: rooms.filter(r => r.status === 'available').length,
    maintenance: rooms.filter(r => r.status === 'maintenance').length
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'occupied': return '#F44336';
      case 'available': return '#4CAF50';
      case 'maintenance': return '#FF9800';
      default: return '#9E9E9E';
    }
  };

  const getStatusBg = (status) => {
    switch(status) {
      case 'occupied': return '#FFEBEE';
      case 'available': return '#E8F5E9';
      case 'maintenance': return '#FFF3E0';
      default: return '#F5F5F5';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#4CAF50" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rooms</Text>
        <Button onPress={() => setShowAddModal(true)} style={{ padding: 6 }}>
          <Ionicons name="add-circle" size={24} color="#fff" />
        </Button>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={[styles.statChip, { backgroundColor: '#2196F3' }]}>
            <Text style={styles.statChipValue}>{stats.total}</Text>
            <Text style={styles.statChipLabel}>Total</Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: '#F44336' }]}>
            <Text style={styles.statChipValue}>{stats.occupied}</Text>
            <Text style={styles.statChipLabel}>Occupied</Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: '#4CAF50' }]}>
            <Text style={styles.statChipValue}>{stats.available}</Text>
            <Text style={styles.statChipLabel}>Available</Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: '#FF9800' }]}>
            <Text style={styles.statChipValue}>{stats.maintenance}</Text>
            <Text style={styles.statChipLabel}>Maintenance</Text>
          </View>
        </ScrollView>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.filterChip, filterStatus === 'all' && styles.filterChipActive]}
            onPress={() => setFilterStatus('all')}
          >
            <Text style={[styles.filterChipText, filterStatus === 'all' && styles.filterChipTextActive]}>
              All ({stats.total})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filterStatus === 'occupied' && styles.filterChipActive]}
            onPress={() => setFilterStatus('occupied')}
          >
            <Text style={[styles.filterChipText, filterStatus === 'occupied' && styles.filterChipTextActive]}>
              Occupied ({stats.occupied})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filterStatus === 'available' && styles.filterChipActive]}
            onPress={() => setFilterStatus('available')}
          >
            <Text style={[styles.filterChipText, filterStatus === 'available' && styles.filterChipTextActive]}>
              Available ({stats.available})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filterStatus === 'maintenance' && styles.filterChipActive]}
            onPress={() => setFilterStatus('maintenance')}
          >
            <Text style={[styles.filterChipText, filterStatus === 'maintenance' && styles.filterChipTextActive]}>
              Maintenance ({stats.maintenance})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Rooms List */}
      <ScrollView style={styles.roomsList} showsVerticalScrollIndicator={false}>
        {filteredRooms.map((room) => (
          <TouchableOpacity 
            key={room.id} 
            style={styles.roomCard}
            onPress={() => navigation.navigate('RoomDetails', { room })}
          >
            <Image source={room.image} style={styles.roomImage} />
            <View style={[styles.statusBadge, { backgroundColor: getStatusBg(room.status) }]}>
              <Text style={[styles.statusText, { color: getStatusColor(room.status) }]}>
                {room.status.charAt(0).toUpperCase() + room.status.slice(1)}
              </Text>
            </View>

            <View style={styles.roomContent}>
              <View style={styles.roomHeader}>
                <View>
                  <Text style={styles.roomNumber}>Room {room.roomNumber}</Text>
                  <Text style={styles.roomType}>{room.type} • {room.floor}</Text>
                </View>
                <View>
                  <Text style={styles.roomPrice}>₱{room.price.toLocaleString()}</Text>
                  <Text style={styles.roomPriceLabel}>per month</Text>
                </View>
              </View>

              <View style={styles.roomInfo}>
                <View style={styles.roomInfoItem}>
                  <Ionicons name="people" size={16} color="#6B7280" />
                  <Text style={styles.roomInfoText}>{room.occupied}/{room.capacity}</Text>
                </View>
              </View>

              {room.tenant && (
                <View style={styles.tenantInfo}>
                  <Ionicons name="person" size={14} color="#4CAF50" />
                  <Text style={styles.tenantText} numberOfLines={1}>{room.tenant}</Text>
                </View>
              )}

              <View style={styles.amenitiesContainer}>
                {room.amenities.slice(0, 3).map((amenity, index) => (
                  <View key={index} style={styles.amenityChip}>
                    <Text style={styles.amenityText}>{amenity}</Text>
                  </View>
                ))}
                {room.amenities.length > 3 && (
                  <View style={styles.amenityChip}>
                    <Text style={styles.amenityText}>+{room.amenities.length - 3}</Text>
                  </View>
                )}
              </View>

              <View style={styles.roomActions}>
                      <Button
                        onPress={() => navigation.navigate('EditRoom', { room })}
                        style={[styles.actionButton, styles.editButton]}
                      >
                        <Ionicons name="create-outline" size={18} color="#2196F3" />
                        <Text style={[styles.actionButtonText, { color: '#2196F3', marginLeft: 8 }]}>Edit</Text>
                      </Button>
                      <Button
                        onPress={() => {}}
                        style={[styles.actionButton, styles.statusButton]}
                      >
                        <Ionicons name="swap-horizontal" size={18} color="#FF9800" />
                        <Text style={[styles.actionButtonText, { color: '#FF9800', marginLeft: 8 }]}>Status</Text>
                      </Button>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Add Room Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Room</Text>
              <Button onPress={() => setShowAddModal(false)} style={{ padding: 6 }}>
                <Ionicons name="close" size={20} color="#1F2937" />
              </Button>
            </View>
            <Text style={styles.modalMessage}>
              Soon, dont have time na XD
            </Text>
            <Button style={styles.modalButton} onPress={() => setShowAddModal(false)}>
              <Text style={styles.modalButtonText}>Close</Text>
            </Button>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

