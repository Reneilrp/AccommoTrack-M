import { StyleSheet, Dimensions } from "react-native";

const { width } = Dimensions.get('window');

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#16a34a',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
    marginLeft: 12,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  
  // Image Gallery
  imageGalleryContainer: {
    position: 'relative',
    backgroundColor: '#fff',
  },
  roomImage: {
    width: width,
    height: 280,
    backgroundColor: '#f5f5f5',
  },
  imageIndicator: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  indicatorDotActive: {
    backgroundColor: '#fff',
    width: 20,
  },
  
  // Content Container
  contentContainer: {
    padding: 20,
    backgroundColor: '#fff',
  },
  
  // Room Header
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  roomNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    letterSpacing: -0.5,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  roomType: {
    fontSize: 15,
    color: '#666',
    marginBottom: 20,
    fontWeight: '400',
  },
  
  // Price Section
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#16a34a',
    letterSpacing: -0.8,
  },
  priceLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 6,
    fontWeight: '400',
  },
  
  // Sections
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
    letterSpacing: -0.2,
  },
  description: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 24,
    fontWeight: '400',
  },
  
  // Amenities
  amenitiesGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 12,
},
amenityItem: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
  paddingVertical: 2,
  width: '48%',
},
amenityText: {
  fontSize: 14,
  color: '#374151',
  fontWeight: '400',
  flex: 1,
},
  
  // Property Information
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
    lineHeight: 20,
    fontWeight: '400',
  },
  
  // Property Rules Container
  rulesContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  rulesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  ruleText: {
    fontSize: 13,
    color: '#374151',
    flex: 1,
    lineHeight: 20,
  },
  viewAllButton: {
    marginTop: 8,
  },
  viewAllText: {
    fontSize: 13,
    color: '#16a34a',
    fontWeight: '600',
  },
  
  // Action Buttons
  bookButton: {
    backgroundColor: '#16a34a',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  contactButton: {
    backgroundColor: '#16a34a',
    paddingVertical: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 0,
    marginBottom: 20,
  },
  contactButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  
  // Booking Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 20,
    width: '100%',
    height: '100%',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 24,
    letterSpacing: -0.3,
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    padding: 14,
    marginBottom: 16,
    borderRadius: 8,
    fontSize: 14,
    color: '#000',
  },
  submitButton: {
    backgroundColor: '#16a34a',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
    letterSpacing: 0.3,
  },
  cancelButton: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '500',
  },
  guestNotice: {
  backgroundColor: '#EFF6FF',
  padding: 16,
  borderRadius: 12,
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 16,
  borderWidth: 1,
  borderColor: '#BFDBFE',
},
guestNoticeText: {
  flex: 1,
  marginLeft: 12,
  fontSize: 14,
  color: '#1E40AF',
  lineHeight: 20,
},
dateButton: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#fff',
  borderWidth: 1,
  borderColor: '#d1d5db',
  borderRadius: 8,
  padding: 14,
  gap: 10,
},
dateButtonText: {
  fontSize: 16,
  color: '#111827',
  flex: 1,
},

// Summary container styles
summaryContainer: {
  backgroundColor: '#f0fdf4',
  borderRadius: 12,
  padding: 16,
  marginBottom: 16,
  borderWidth: 1,
  borderColor: '#bbf7d0',
},
summaryRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
},
summaryLabel: {
  fontSize: 14,
  color: '#166534',
},
summaryValue: {
  fontSize: 14,
  fontWeight: '600',
  color: '#166534',
},
summaryLabelBold: {
  fontSize: 16,
  fontWeight: '600',
  color: '#166534',
},
summaryValueBold: {
  fontSize: 20,
  fontWeight: 'bold',
  color: '#15803d',
},
summaryNote: {
  fontSize: 12,
  color: '#166534',
  marginTop: 4,
},

// Update existing submitButtonDisabled style
submitButtonDisabled: {
  backgroundColor: '#d1d5db',
  opacity: 0.6,
},
});