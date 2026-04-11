import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  Modal,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
import { useQuery } from "@tanstack/react-query";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from "../../../../../contexts/ThemeContext.jsx";
import ProfileService from "../../../../../services/ProfileService.js";
import { getImageUrl } from "../../../../../utils/imageUtils.js";
import { getStyles } from "../../../../../styles/Landlord/VerificationStatus.js";
import {
  landlordQueryKeys,
  refetchLandlordQueries,
  useLandlordFocusRefetch,
  useLandlordRefreshHandler,
} from "../../../hooks/useLandlordQueryHelpers.js";

const EMPTY_ID_TYPES = [];

export default function VerificationStatus({ navigation }) {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const showAlert = Alert.alert;
  const insets = useSafeAreaInsets();

  const [refreshing, setRefreshing] = useState(false);
  const [showResubmitForm, setShowResubmitForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    validIdType: "",
    validIdOther: "",
    validIdFront: null,
    validIdBack: null,
    permit: null,
  });

  const verificationBundleQuery = useQuery({
    queryKey: landlordQueryKeys.verificationStatusBundle(),
    queryFn: async () => {
      const [statusRes, typesRes, profileRes, meRes, storedUserJson] = await Promise.all([
        ProfileService.getVerificationStatus(),
        ProfileService.getValidIdTypes(),
        ProfileService.getProfile(),
        ProfileService.getCurrentUser(),
        AsyncStorage.getItem('user'),
      ]);

      let storedRole = null;
      if (storedUserJson) {
        try {
          const parsedUser = JSON.parse(storedUserJson);
          if (parsedUser?.role) {
            storedRole = String(parsedUser.role).toLowerCase();
          }
        } catch {
          storedRole = null;
        }
      }

      const profileRole = profileRes?.success && profileRes?.data?.role
        ? String(profileRes.data.role).toLowerCase()
        : null;

      const meRole = meRes?.success && meRes?.data?.role
        ? String(meRes.data.role).toLowerCase()
        : null;

      const resolvedRole = meRole || profileRole || storedRole || 'tenant';

      return {
        verification: statusRes?.success ? statusRes.data : null,
        idTypes: Array.isArray(typesRes?.data) ? typesRes.data : EMPTY_ID_TYPES,
        userRole: resolvedRole,
      };
    },
    placeholderData: (previousData) => previousData,
  });

  const verification = verificationBundleQuery.data?.verification || null;
  const idTypes = verificationBundleQuery.data?.idTypes || EMPTY_ID_TYPES;
  const userRole = verificationBundleQuery.data?.userRole || "tenant";
  const loading = verificationBundleQuery.isPending && !verificationBundleQuery.data;
  const fetchError = verificationBundleQuery.error?.message || "";
  const refetchVerificationBundle = verificationBundleQuery.refetch;
  const verificationRefetchers = useMemo(
    () => [refetchVerificationBundle],
    [refetchVerificationBundle],
  );

  useLandlordFocusRefetch({ refetchers: verificationRefetchers });

  const handleRefresh = useLandlordRefreshHandler({
    setRefreshing,
    refetchers: verificationRefetchers,
  });

  useEffect(() => {
    if (!fetchError) return;
    console.error("Error fetching verification data:", fetchError);
  }, [fetchError]);

  const updatePickedDocument = (field, asset) => {
    const filename = asset.uri.split("/").pop();
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : "image/jpeg";

    setFormData((prev) => ({
      ...prev,
      [field]: {
        uri: asset.uri,
        name: filename,
        type,
      },
    }));
  };

  const pickDocumentFromLibrary = async (field) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showAlert(
        "Permission Required",
        "Please allow photo library access to upload documents.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      updatePickedDocument(field, result.assets[0]);
    }
  };

  const takeDocumentPhoto = async (field) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      showAlert(
        "Permission Required",
        "Please allow camera access to capture documents.",
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      updatePickedDocument(field, result.assets[0]);
    }
  };

  const handlePickDocument = (field) => {
    showAlert("Upload Document", "Choose a source for your document image.", [
      {
        text: "Take Photo",
        onPress: () => {
          void takeDocumentPhoto(field);
        },
      },
      {
        text: "Choose from Library",
        onPress: () => {
          void pickDocumentFromLibrary(field);
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleSubmit = async () => {
    if (!formData.validIdType || !formData.validIdFront || !formData.permit) {
      showAlert(
        "Validation",
        "Please select an ID type and upload your valid ID plus business/accommodation permit.",
      );
      return;
    }

    if (formData.validIdType === "other" && !formData.validIdOther) {
      showAlert("Validation", "Please specify your ID type.");
      return;
    }

    setSubmitting(true);
    try {
      const normalizedUserRole = String(userRole || '').toLowerCase();
      const idType =
        formData.validIdType === "other"
          ? formData.validIdOther.trim()
          : formData.validIdType;

      const buildTenantPayload = () => {
        const payload = new FormData();
        payload.append('valid_id_type', idType);
        payload.append('permit', formData.permit);
        payload.append('valid_id_front', formData.validIdFront);
        if (formData.validIdBack) {
          payload.append('valid_id_back', formData.validIdBack);
        }
        return payload;
      };

      const buildLandlordPayload = () => {
        const payload = new FormData();
        payload.append('valid_id_type', idType);
        payload.append('permit', formData.permit);
        payload.append('valid_id', formData.validIdFront);
        if (formData.validIdBack) {
          payload.append('valid_id_back', formData.validIdBack);
        }
        return payload;
      };

      let res;
      let usedTenantFlow = normalizedUserRole === 'tenant';

      if (usedTenantFlow) {
        res = await ProfileService.registerAsLandlord(buildTenantPayload());
      } else {
        res = await ProfileService.resubmitVerification(buildLandlordPayload());

        // Fallback for stale role state: tenant account accidentally routed to landlord endpoint.
        if (!res.success && (res.status === 401 || res.status === 403)) {
          const tenantRetry = await ProfileService.registerAsLandlord(buildTenantPayload());
          if (tenantRetry.success) {
            res = tenantRetry;
            usedTenantFlow = true;
          }
        }
      }

      if (res.success) {
        showAlert(
          "Success",
          usedTenantFlow
            ? "Landlord registration submitted! Please wait for admin review."
            : "Verification documents submitted! Please wait for admin review.",
        );
        setShowResubmitForm(false);
        setFormData({
          validIdType: "",
          validIdOther: "",
          validIdFront: null,
          validIdBack: null,
          permit: null,
        });
        await refetchLandlordQueries(verificationRefetchers);
      } else {
        showAlert("Error", res.error || "Failed to submit documents");
      }
    } catch (_error) {
      showAlert("Error", "An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case "approved":
        return {
          icon: "checkmark-circle",
          color: "#16a34a",
          bg: "#DCFCE7",
          border: "#86EFAC",
          label: "Verified",
          description:
            "Your account is verified. You can now publish properties and manage bookings.",
        };
      case "rejected":
        return {
          icon: "close-circle",
          color: "#DC2626",
          bg: "#FEF2F2",
          border: "#FECACA",
          label: "Rejected",
          description:
            "Your verification was rejected. Please review the reason and resubmit.",
        };
      case "pending":
        return {
          icon: "time",
          color: "#D97706",
          bg: "#FEF3C7",
          border: "#FDE68A",
          label: "Pending Review",
          description:
            "Your documents are under review. This usually takes 1-3 business days.",
        };
      default:
        return {
          icon: "alert-circle",
          color: "#6B7280",
          bg: "#F3F4F6",
          border: "#E5E7EB",
          label: "Not Submitted",
          description:
            "Please submit your valid ID and business permit to verify your account.",
        };
    }
  };

  const statusConfig = getStatusConfig(verification?.status);

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#16a34a" />
          <Text style={styles.loadingText}>Loading status...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor="#16a34a" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account Verification</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#16a34a"]}
          />
        }
      >
        {/* Status Card */}
        <View
          style={[
            styles.statusCard,
            {
              backgroundColor: statusConfig.bg,
              borderColor: statusConfig.border,
            },
          ]}
        >
          <View style={styles.statusIconContainer}>
            <Ionicons
              name={statusConfig.icon}
              size={32}
              color={statusConfig.color}
            />
          </View>
          <View style={styles.statusInfo}>
            <Text style={[styles.statusLabel, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
            <Text style={styles.statusDescription}>
              {statusConfig.description}
            </Text>
            {verification?.reviewed_at && (
              <Text style={styles.lastReviewed}>
                Reviewed on:{" "}
                {new Date(verification.reviewed_at).toLocaleDateString()}
              </Text>
            )}
          </View>
        </View>

        {/* Rejection Reason */}
        {verification?.status === "rejected" &&
          verification?.rejection_reason && (
            <View style={styles.rejectionCard}>
              <Ionicons name="warning" size={20} color="#991B1B" />
              <View style={{ flex: 1 }}>
                <Text style={styles.rejectionTitle}>Reason for Rejection</Text>
                <Text style={styles.rejectionReason}>
                  {verification.rejection_reason}
                </Text>
              </View>
            </View>
          )}

        {/* Current Documents */}
        {verification?.status && verification.status !== "not_submitted" && (
          <View>
            <Text style={styles.sectionTitle}>Submitted Documents</Text>
            <View style={styles.documentGrid}>
              <View style={styles.documentCard}>
                <View style={styles.documentHeader}>
                  <Ionicons name="image-outline" size={18} color="#16a34a" />
                  <Text style={styles.documentLabel}>
                    Valid ID Front ({verification.valid_id_type})
                  </Text>
                </View>
                {verification.valid_id_path ? (
                  <Image
                    source={{ uri: getImageUrl(verification.valid_id_path) }}
                    style={styles.previewImage}
                  />
                ) : (
                  <View style={styles.previewPlaceholder}>
                    <Text>No image</Text>
                  </View>
                )}
              </View>

              <View style={styles.documentCard}>
                <View style={styles.documentHeader}>
                  <Ionicons name="image-outline" size={18} color="#16a34a" />
                  <Text style={styles.documentLabel}>
                    Valid ID Back ({verification.valid_id_type})
                  </Text>
                </View>
                {verification.valid_id_back_path ? (
                  <Image
                    source={{ uri: getImageUrl(verification.valid_id_back_path) }}
                    style={styles.previewImage}
                  />
                ) : (
                  <View style={styles.previewPlaceholder}>
                    <Text>No image</Text>
                  </View>
                )}
              </View>

              <View style={styles.documentCard}>
                <View style={styles.documentHeader}>
                  <Ionicons
                    name="document-text-outline"
                    size={18}
                    color="#8B5CF6"
                  />
                  <Text style={styles.documentLabel}>
                    Business/Accommodation Permit
                  </Text>
                </View>
                {verification.permit_path ? (
                  verification.permit_path.toLowerCase().endsWith(".pdf") ? (
                    <View style={styles.pdfPreview}>
                      <Ionicons
                        name="document-outline"
                        size={48}
                        color="#EF4444"
                      />
                      <Text style={styles.pdfText}>PDF Document</Text>
                    </View>
                  ) : (
                    <Image
                      source={{ uri: getImageUrl(verification.permit_path) }}
                      style={styles.previewImage}
                    />
                  )
                ) : (
                  <View style={styles.previewPlaceholder}>
                    <Text>No document</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {/* History Section */}
        {verification?.history && verification.history.length > 0 && (
          <View>
            <TouchableOpacity
              style={styles.historyToggle}
              onPress={() => setShowHistory(!showHistory)}
            >
              <View style={styles.historyLabelContainer}>
                <Ionicons name="list-outline" size={20} color="#374151" />
                <Text style={styles.historyLabel}>Submission History</Text>
                <View style={styles.historyBadge}>
                  <Text style={styles.historyBadgeText}>
                    {verification.history.length}
                  </Text>
                </View>
              </View>
              <Ionicons
                name={showHistory ? "chevron-up" : "chevron-down"}
                size={20}
                color="#9CA3AF"
              />
            </TouchableOpacity>

            {showHistory && (
              <View style={styles.historyList}>
                {verification.history.map((entry, index) => (
                  <View key={entry.id || index} style={styles.historyItem}>
                    <View style={styles.historyItemHeader}>
                      <View
                        style={[
                          styles.historyStatusBadge,
                          {
                            backgroundColor:
                              entry.status === "approved"
                                ? "#DCFCE7"
                                : entry.status === "rejected"
                                  ? "#FEF2F2"
                                  : "#FEF3C7",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.historyStatusText,
                            {
                              color:
                                entry.status === "approved"
                                  ? "#166534"
                                  : entry.status === "rejected"
                                    ? "#991B1B"
                                    : "#92400E",
                            },
                          ]}
                        >
                          {entry.status}
                        </Text>
                      </View>
                      <Text style={styles.historyDate}>
                        {entry.submitted_at
                          ? new Date(entry.submitted_at).toLocaleDateString()
                          : "N/A"}
                      </Text>
                    </View>
                    <Text style={styles.historyIdType}>
                      {entry.valid_id_type}
                    </Text>
                    {entry.rejection_reason ? (
                      <Text style={styles.historyRejection}>
                        {entry.rejection_reason}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Fixed Footer with Action Button */}
      {(verification?.status === "rejected" ||
        verification?.status === "not_submitted") && (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 20, 28) }]}>
          <TouchableOpacity
            style={styles.resubmitButton}
            onPress={() => setShowResubmitForm(true)}
          >
            <Ionicons name="cloud-upload-outline" size={22} color="#FFFFFF" />
            <Text style={styles.resubmitButtonText}>
              {userRole === 'tenant'
                ? verification?.status === 'rejected'
                  ? 'Update Landlord Registration'
                  : 'Register as Landlord'
                : verification?.status === "rejected"
                  ? "Resubmit Documents"
                  : "Submit Verification"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Form Modal */}
      <Modal
        visible={showResubmitForm}
        animationType="slide"
        transparent={true}
        statusBarTranslucent={true}
        navigationBarTranslucent={false}
        presentationStyle="overFullScreen"
        onRequestClose={() => setShowResubmitForm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Submit Verification</Text>
              <Text style={styles.modalSubtitle}>
                Please provide clear images of your documents.
              </Text>
            </View>

            <ScrollView
              style={styles.formContainer}
              showsVerticalScrollIndicator={false}
            >
              {userRole === 'tenant' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.modalSubtitle}>
                    Only documents are required here. Name and date of birth will be taken from your tenant account.
                  </Text>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Valid ID Type <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={formData.validIdType}
                    onValueChange={(val) =>
                      setFormData((prev) => ({ ...prev, validIdType: val }))
                    }
                    style={styles.picker}
                  >
                    <Picker.Item label="Select ID Type" value="" />
                    {idTypes.map((type) => (
                      <Picker.Item key={type} label={type} value={type} />
                    ))}
                    <Picker.Item label="Other" value="other" />
                  </Picker>
                </View>
              </View>

              {formData.validIdType === "other" && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>
                    Specify ID Type <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.validIdOther}
                    onChangeText={(val) =>
                      setFormData((prev) => ({ ...prev, validIdOther: val }))
                    }
                    placeholder="Enter ID type"
                  />
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Upload Valid ID Front <Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.uploadBox}
                  onPress={() => handlePickDocument("validIdFront")}
                >
                  <Ionicons name="camera-outline" size={32} color="#16a34a" />
                  <Text style={styles.uploadBoxText}>
                    Capture or Pick Front Image
                  </Text>
                </TouchableOpacity>
                {formData.validIdFront && (
                  <Text style={styles.selectedFile}>
                    Selected: {formData.validIdFront.name}
                  </Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Upload Valid ID Back
                </Text>
                <TouchableOpacity
                  style={styles.uploadBox}
                  onPress={() => handlePickDocument("validIdBack")}
                >
                  <Ionicons name="camera-outline" size={32} color="#16a34a" />
                  <Text style={styles.uploadBoxText}>
                    Capture or Pick Back Image
                  </Text>
                </TouchableOpacity>
                {formData.validIdBack && (
                  <Text style={styles.selectedFile}>
                    Selected: {formData.validIdBack.name}
                  </Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Upload Business/Dorm Permit{" "}
                  <Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.uploadBox}
                  onPress={() => handlePickDocument("permit")}
                >
                  <Ionicons
                    name="document-attach-outline"
                    size={32}
                    color="#16a34a"
                  />
                  <Text style={styles.uploadBoxText}>
                    Upload Permit Document
                  </Text>
                </TouchableOpacity>
                {formData.permit && (
                  <Text style={styles.selectedFile}>
                    Selected: {formData.permit.name}
                  </Text>
                )}
              </View>

              <View style={[styles.formActions, { marginBottom: Math.max(insets.bottom + 16, 32) }]}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowResubmitForm(false)}
                  disabled={submitting}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitButtonText}>Submit Now</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
