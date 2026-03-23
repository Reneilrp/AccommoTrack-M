import { useState, useRef, useEffect } from "react";
import { X, Upload, Plus, Loader2, HelpCircle } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../utils/api";
import PricingHelp from "../../components/Rooms/PricingHelp";
import PriceRow from "../../components/Shared/PriceRow";

export default function AddRoomModal({
  isOpen,
  onClose,
  propertyId,
  onRoomAdded,
  propertyType,
  propertyAmenities = [],
  onAmenityAdded,
}) {
  const normalizedType = (propertyType || "").toString().toLowerCase();
  const isApartment = normalizedType.includes("apartment");
  const isDormitory = normalizedType.includes("dormitory");
  const isBoarding = normalizedType.includes("boarding");
  const isBedSpacerProperty =
    normalizedType.includes("bedspacer") ||
    normalizedType.includes("bed spacer");

  const initialRoomType = isBedSpacerProperty ? "bedSpacer" : "single";
  const initialPricingModel = isBedSpacerProperty ? "per_bed" : "full_room";

  const [formData, setFormData] = useState({
    roomNumber: "",
    roomType: initialRoomType,
    genderRestriction: "male",
    floor: "1",
    monthlyRate: "",
    // new billing related fields
    dailyRate: "",
    billingPolicy: "monthly",
    minStayDays: "1",
    capacity: isBedSpacerProperty ? "1" : "1",
    pricingModel: initialPricingModel,
    description: "",
    rules: [],
    amenities: [],
    images: [],
  });

  // Bed spacer is controlled per-room via `formData.roomType`.
  // Property-wide bed-spacer properties are detected with `isBedSpacerProperty`.

  const [previewImages, setPreviewImages] = useState([]);
  const [showPricingHelp, setShowPricingHelp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [isFormValid, setIsFormValid] = useState(true);
  const [successMessage, setSuccessMessage] = useState("");
  const [newAmenity, setNewAmenity] = useState("");
  const [propertyRules, setPropertyRules] = useState([]);
  const [newRule, setNewRule] = useState("");

  const roomNumberRef = useRef(null);
  const monthlyRateRef = useRef(null);
  const dailyRateRef = useRef(null);
  const capacityRef = useRef(null);
  const minStayRef = useRef(null);

  const [localAmenities, setLocalAmenities] = useState(
    Array.isArray(propertyAmenities) ? propertyAmenities : [],
  );

  const [totalFloors, setTotalFloors] = useState(1);
  const [managedFloors, setManagedFloors] = useState([]);
  const [propertyGender, setPropertyGender] = useState("mixed");

  // Sync amenities list when prop changes (e.g. parent refreshes after onAmenityAdded)
  useEffect(() => {
    setLocalAmenities(
      Array.isArray(propertyAmenities) ? propertyAmenities : [],
    );
  }, [propertyAmenities]);

  // Load property-level rules and amenities when modal opens
  useEffect(() => {
    if (!isOpen || !propertyId) return;
    let mounted = true;
    (async () => {
      try {
        const res = await api.get(`/landlord/properties/${propertyId}`);
        const p = res.data || {};
        const rules = p.rules || p.property_rules || p.rules_list || [];
        const amenities = p.amenities_list || p.amenities || [];
        if (mounted) {
          setPropertyRules(Array.isArray(rules) ? rules : []);
          setLocalAmenities(Array.isArray(amenities) ? amenities : []);
          
          let maxFloor = p.total_floors || 1;
          if (maxFloor === 1 && p.floor_level) {
            // Extract numbers from "5th floor", "Level 4", "12", etc.
            const parsedFloor = parseInt(String(p.floor_level).replace(/\D/g, ''), 10);
            if (!isNaN(parsedFloor) && parsedFloor > 0) {
              maxFloor = parsedFloor;
            }
          }
          setTotalFloors(maxFloor);

          const pGender = p.gender_restriction || "mixed";
          setPropertyGender(pGender);

          // Managed floors parsing
          const floorStr = String(p.floor_level || "");
          const isManagedList = floorStr.split(',').every(part => part.trim() && !isNaN(part.trim()));
          if (isManagedList && floorStr.includes(',')) {
            const list = floorStr.split(',').map(n => parseInt(n.trim())).sort((a, b) => a - b);
            setManagedFloors(list);
            setFormData(prev => ({ ...prev, floor: String(list[0]) }));
          } else {
            setManagedFloors([]);
          }

          // Auto-set room gender if property is restricted
          if (pGender === "male" || pGender === "boys") {
            setFormData((prev) => ({ ...prev, genderRestriction: "male" }));
          } else if (pGender === "female" || pGender === "girls") {
            setFormData((prev) => ({ ...prev, genderRestriction: "female" }));
          }
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, [isOpen, propertyId]);

  // Reset form when modal opens or property changes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        roomNumber: "",
        roomType: initialRoomType,
        genderRestriction: "male",
        floor: "1",
        monthlyRate: "",
        dailyRate: "",
        billingPolicy: "monthly",
        minStayDays: "1",
        capacity: isBedSpacerProperty ? "1" : "1",
        pricingModel: initialPricingModel,
        description: "",
        rules: [],
        amenities: [],
        images: [],
      });
      setPreviewImages([]);
      setError("");
      setFieldErrors({});
      setIsFormValid(false);
    }
  }, [
    isOpen,
    propertyId,
    initialRoomType,
    initialPricingModel,
    isBedSpacerProperty,
  ]);

  const allRoomTypes = [
    { value: "single", label: "Single Room" },
    { value: "double", label: "Double Room" },
    { value: "quad", label: "Quad Room" },
    { value: "bedSpacer", label: "Bed Spacer" },
  ];
  // Determine available room types per property type:
  // - Apartments: single/double/quad (no bed spacer option)
  // - Dormitory/Boarding: single (and bedSpacer as an option via toggle)
  // - Properties explicitly marked as bed-spacer: bedSpacer only
  const roomTypes = (() => {
    if (isApartment) {
      return allRoomTypes.filter((rt) => rt.value !== "bedSpacer");
    }
    if (isDormitory || isBoarding || isBedSpacerProperty) {
      return allRoomTypes.filter((rt) => rt.value === "single" || rt.value === "bedSpacer");
    }
    // For others, allow all types.
    return allRoomTypes;
  })();

  const floors = managedFloors.length > 0
    ? managedFloors.map(f => ({
        value: f,
        label: `${f}${getOrdinalSuffix(f)} Floor`,
      }))
    : Array.from({ length: totalFloors }, (_, i) => ({
        value: i + 1,
        label: `${i + 1}${getOrdinalSuffix(i + 1)} Floor`,
      }));

  function getOrdinalSuffix(num) {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return "st";
    if (j === 2 && k !== 12) return "nd";
    if (j === 3 && k !== 13) return "rd";
    return "th";
  }

  const handleInputChange = (field, value) => {
    let updated = { ...formData, [field]: value };

    // Auto-set capacity based on room type
    if (field === "roomType") {
      const capacityMap = {
        single: "1",
        double: "2",
        quad: "4",
        bedSpacer: "1", // Default to 1 for bedSpacer, user can increase
      };
      if (capacityMap[value]) {
        updated.capacity = capacityMap[value];
      }

      // Smart Pricing Defaults
      if (value === "single") {
        updated.pricingModel = "full_room";
      } else if (value === "bedSpacer") {
        updated.pricingModel = "per_bed";
      } else {
        // For double/quad: Apartments default to full_room, others to per_bed
        updated.pricingModel = isApartment ? "full_room" : "per_bed";
      }
    }
    // When billing policy changes, clear/hide irrelevant fields
    if (field === "billingPolicy") {
      const bp = value;
      if (bp !== "monthly" && bp !== "monthly_with_daily") {
        updated.monthlyRate = "";
      }
      if (bp !== "daily" && bp !== "monthly_with_daily") {
        updated.dailyRate = "";
      }
    }

    setFormData(updated);
    if (error) setError("");
    // run validation on change to update inline errors and button state
    const { valid, errors } = validateForm(updated);
    setFieldErrors(errors);
    setIsFormValid(valid);
  };

  // Centralized validation helper
  const validateForm = (data) => {
    const errors = {};
    // Room number
    if (!data.roomNumber || !String(data.roomNumber).trim()) {
      errors.roomNumber = "Room number is required";
    }

    // Billing policy / rates
    const bp = data.billingPolicy || "monthly";
    if (bp === "monthly" || bp === "monthly_with_daily") {
      const m = parseFloat(data.monthlyRate);
      if (!Number.isFinite(m) || m <= 0) {
        errors.monthlyRate = "Enter a valid monthly rate greater than 0";
      }
    }
    if (bp === "daily" || bp === "monthly_with_daily") {
      const d = parseFloat(data.dailyRate);
      if (!Number.isFinite(d) || d <= 0) {
        errors.dailyRate = "Enter a valid daily rate greater than 0";
      }
    }

    // Capacity
    const cap = parseInt(data.capacity, 10);
    if (!Number.isFinite(cap) || cap < 1) {
      errors.capacity = "Capacity must be 1 or more";
    } else if (cap > 10) {
      errors.capacity = "Capacity cannot exceed 10";
    }

    // Min stay
    const ms = parseInt(data.minStayDays, 10);
    if (!Number.isFinite(ms) || ms < 1) {
      errors.minStayDays = "Minimum stay must be at least 1 day";
    }

    // Pricing model for bed spacer
    if (data.roomType === "bedSpacer" && data.pricingModel !== "per_bed") {
      errors.pricingModel = "Bed Spacer must use per-bed pricing";
    }

    // Images count check
    if (Array.isArray(data.images) && data.images.length > 10) {
      errors.images = "Maximum 10 images allowed";
    }

    // Determine first invalid field for focusing
    const priority = [
      "roomNumber",
      "monthlyRate",
      "dailyRate",
      "capacity",
      "minStayDays",
      "images",
      "pricingModel",
    ];
    const firstInvalidField = priority.find((f) => errors[f]);

    return {
      valid: Object.keys(errors).length === 0,
      errors,
      firstInvalidField,
    };
  };

  // Map server-side error keys (snake_case) to front-end field names (camelCase)
  const mapServerErrors = (serverErrors) => {
    if (!serverErrors || typeof serverErrors !== "object") return {};
    const mapping = {
      room_number: "roomNumber",
      room_type: "roomType",
      monthly_rate: "monthlyRate",
      daily_rate: "dailyRate",
      capacity: "capacity",
      min_stay_days: "minStayDays",
      pricing_model: "pricingModel",
      images: "images",
    };
    const result = {};
    Object.keys(serverErrors).forEach((key) => {
      const target =
        mapping[key] || key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      const val = serverErrors[key];
      result[target] = Array.isArray(val) ? val.join(", ") : String(val);
    });
    return result;
  };

  // Note: removed the toggle handler — dormitory/boarding properties will
  // show a Room Type select with `Single` and `Bed Spacer` options instead.

  const toggleAmenity = (amenity) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const toggleRule = (rule) => {
    setFormData((prev) => ({
      ...prev,
      rules: prev.rules.includes(rule)
        ? prev.rules.filter((r) => r !== rule)
        : [...prev.rules, rule],
    }));
  };

  const addNewRule = async () => {
    if (!newRule.trim() || !propertyId) return;
    try {
      await api.post(`/landlord/properties/${propertyId}/rules`, {
        rule: newRule.trim(),
      });
      // refresh local list and select it
      setPropertyRules((prev) => [...prev, newRule.trim()]);
      setFormData((prev) => ({
        ...prev,
        rules: [...prev.rules, newRule.trim()],
      }));
      setNewRule("");
      if (onAmenityAdded) onAmenityAdded();
      toast.success("Rule added");
    } catch {
      toast.error("Failed to add rule");
    }
  };

  const addNewAmenity = async () => {
    if (!newAmenity.trim()) return;

    try {
      // Add amenity to property first
      await api.post(`/landlord/properties/${propertyId}/amenities`, {
        amenity: newAmenity.trim(),
      });

      // Update local amenities list (triggers re-render immediately)
      setLocalAmenities((prev) => [...prev, newAmenity.trim()]);

      // Auto-select the newly added amenity for this room
      setFormData((prev) => ({
        ...prev,
        amenities: [...prev.amenities, newAmenity.trim()],
      }));

      // Notify parent component to refresh property data
      if (onAmenityAdded) {
        onAmenityAdded();
      }

      setNewAmenity("");
      toast.success("Amenity added");
    } catch (err) {
      setError("Failed to add amenity: " + err.message);
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];

    // Validate files individually
    const validatedFiles = [];
    for (const f of files) {
      if (!allowedTypes.includes(f.type)) {
        toast.error(`${f.name}: unsupported file type`);
        continue;
      }
      if (f.size > MAX_SIZE) {
        toast.error(`${f.name}: file too large (max 10 MB)`);
        continue;
      }
      validatedFiles.push(f);
    }

    if (validatedFiles.length + formData.images.length > 10) {
      toast.error("Maximum 10 images allowed");
      return;
    }

    const newPreviews = validatedFiles.map((f) => URL.createObjectURL(f));
    setPreviewImages((prev) => [...prev, ...newPreviews]);
    setFormData((prev) => ({
      ...prev,
      images: [...prev.images, ...validatedFiles],
    }));
    try {
      e.target.value = "";
    } catch {
      // ignore
    }
    // re-validate after adding images
    const { valid, errors } = validateForm({
      ...formData,
      images: [...formData.images, ...validatedFiles],
    });
    setFieldErrors(errors);
    setIsFormValid(valid);
  };

  const removeImage = (index) => {
    setPreviewImages((prev) => {
      const url = prev[index];
      try {
        if (typeof url === "string" && url.startsWith("blob:")) {
          URL.revokeObjectURL(url);
        }
      } catch {
        // ignore revoke errors
      }
      return prev.filter((_, i) => i !== index);
    });
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    if (!propertyId) {
      setError("Property ID is missing. Please refresh the page.");
      return;
    }

    const { valid, errors, firstInvalidField } = validateForm(formData);
    if (!valid) {
      setFieldErrors(errors);
      setError("Please fix highlighted errors");
      const firstMessage =
        errors[firstInvalidField] || Object.values(errors)[0];
      if (firstMessage) toast.error(firstMessage);
      // focus first invalid field
      if (firstInvalidField === "roomNumber") roomNumberRef.current?.focus();
      else if (firstInvalidField === "monthlyRate")
        monthlyRateRef.current?.focus();
      else if (firstInvalidField === "dailyRate") dailyRateRef.current?.focus();
      else if (firstInvalidField === "capacity") capacityRef.current?.focus();
      else if (firstInvalidField === "minStayDays") minStayRef.current?.focus();
      return;
    }

    setLoading(true);
    setError("");

    try {
      const payload = new FormData();
      const bp = formData.billingPolicy || "monthly";

      // Append non-file fields
      const isGenderRestricted = isDormitory || isBoarding || isBedSpacerProperty;

      payload.append("property_id", propertyId);
      payload.append("room_number", formData.roomNumber);
      payload.append("room_type", formData.roomType);
      payload.append("gender_restriction", isGenderRestricted ? formData.genderRestriction : 'mixed');
      payload.append("floor", parseInt(formData.floor));
      if (bp === "monthly" || bp === "monthly_with_daily") {
        const monthlyVal = parseFloat(formData.monthlyRate);
        if (Number.isFinite(monthlyVal))
          payload.append("monthly_rate", monthlyVal);
      }
      // Use the provided capacity (auto-filled by room type or manually entered)
      payload.append(
        "capacity",
        parseInt(formData.capacity || 1),
      );
      if (bp === "daily" || bp === "monthly_with_daily") {
        const dailyVal = parseFloat(formData.dailyRate);
        if (Number.isFinite(dailyVal)) payload.append("daily_rate", dailyVal);
      }
      if (formData.billingPolicy)
        payload.append("billing_policy", formData.billingPolicy);
      // Append new billing-related fields if provided
      if (formData.minStayDays) {
        const v = parseInt(formData.minStayDays);
        if (Number.isFinite(v)) payload.append("min_stay_days", v);
      }
      payload.append("pricing_model", formData.pricingModel);
      payload.append("description", formData.description || "");
      payload.append("status", "available");
      formData.amenities.forEach((amenity, idx) => {
        payload.append(`amenities[${idx}]`, amenity);
      });

      // Append rules (array style)
      (formData.rules || []).forEach((r) => payload.append("rules[]", r));

      // Append image files (use images[] array style)
      formData.images.forEach((file) => {
        payload.append("images[]", file);
      });

      const result = await api.post("/landlord/rooms", payload);
      const newRoom = result.data;

      setFormData({
        roomNumber: "",
        roomType: "single",
        floor: "1",
        monthlyRate: "",
        // billing fields
        dailyRate: "",
        billingPolicy: "monthly",
        minStayDays: "1",
        capacity: "1",
        pricingModel: "full_room",
        description: "",
        rules: [],
        amenities: [],
        images: [],
      });
      setPreviewImages([]);

      // show success message briefly, notify parent, then close modal
      setSuccessMessage("Room added successfully");
      toast.success("Room added successfully");
      if (onRoomAdded) onRoomAdded(newRoom);
      setTimeout(() => {
        setSuccessMessage("");
        onClose();
      }, 1200);
    } catch (err) {
      const msg =
        err.response?.data?.message || err.message || "Failed to add room";
      // If server returned field errors, map them
      const serverErrors = err.response?.data?.errors;
      if (serverErrors && typeof serverErrors === "object") {
        const mapped = mapServerErrors(serverErrors);
        setFieldErrors(mapped);
      }
      setError(msg);
      try {
        toast.error(msg);
      } catch {
        /* ignore toast errors */
      }
    } finally {
      setLoading(false);
    }
  };

  // Revoke preview URLs when modal closes or unmounts to prevent memory leaks
  useEffect(() => {
    return () => {
      try {
        previewImages.forEach((u) => {
          if (u && typeof u === "string" && u.startsWith("blob:"))
            URL.revokeObjectURL(u);
        });
      } catch {
        // ignore
      }
      setPreviewImages([]);
      // clear any staged files
      setFormData((prev) => ({ ...prev, images: [] }));
    };
    return () => {
      try {
        previewImages.forEach((u) => {
          if (u && typeof u === "string" && u.startsWith("blob:"))
            URL.revokeObjectURL(u);
        });
      } catch {}
    };
  }, [isOpen, previewImages]);

  if (!isOpen) return null;

  return (
    <div className="flex flex-col fixed inset-0 bg-black bg-opacity-50 items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-center relative">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white text-center">
              Add New Room
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors absolute right-0"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {successMessage && (
            <div className="px-4 py-2 bg-green-50 border border-green-200 rounded text-green-800 text-sm">
              {successMessage}
            </div>
          )}
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white shrink-0">
                Basic Information
              </h3>
              {(error || Object.keys(fieldErrors).length > 0) && (
                <p className="text-red-600 text-xs font-bold animate-in fade-in slide-in-from-left-2">
                  {Object.values(fieldErrors).join(" • ") ||
                    (error !== "Please fix highlighted errors" ? error : "")}
                </p>
              )}
            </div>

            {/* Row 2: Room Number | Floor | Room Type | Gender */}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Room Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., 301"
                  ref={roomNumberRef}
                  value={formData.roomNumber}
                  onChange={(e) =>
                    handleInputChange("roomNumber", e.target.value)
                  }
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white ${fieldErrors.roomNumber ? "border-red-500" : "border-gray-300 dark:border-gray-600"}`}
                />
                {fieldErrors.roomNumber && <p className="text-red-500 text-xs mt-1">{fieldErrors.roomNumber}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Floor <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.floor}
                  onChange={(e) => handleInputChange("floor", e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-transparent dark:bg-gray-700 dark:text-white"
                >
                  {floors.map((floorObj) => (
                    <option key={floorObj.value} value={floorObj.value}>
                      {floorObj.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Room Type <span className="text-red-500 ml-1">*</span>
                </label>
                <select
                  value={formData.roomType}
                  onChange={(e) =>
                    handleInputChange("roomType", e.target.value)
                  }
                  className={`w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 ${isBedSpacerProperty ? "bg-gray-50 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed" : ""}`}
                  disabled={isBedSpacerProperty}
                >
                  {roomTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              { (isDormitory || isBoarding || isBedSpacerProperty) ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Gender
                  </label>
                  <select
                    value={formData.genderRestriction}
                    onChange={(e) => handleInputChange("genderRestriction", e.target.value)}
                    disabled={propertyGender !== "mixed"}
                    className={`w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white ${propertyGender !== "mixed" ? "bg-gray-50 dark:bg-gray-600 cursor-not-allowed" : ""}`}
                  >
                    <option value="male">Male Only</option>
                    <option value="female">Female Only</option>
                  </select>
                  {propertyGender !== "mixed" && (
                    <p className="mt-1 text-[10px] text-amber-600 dark:text-amber-400 italic">
                      * Property is restricted to {propertyGender} only.
                    </p>
                  )}
                </div>
              ) : (
                <div className="hidden"></div>
              )}
            </div>

            {/* Row 2: Billing Policy | Monthly Rate | Daily Rate */}
            <div className="grid grid-cols-3 gap-4 mt-2 items-end min-w-0">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Billing Policy
                </label>
                <select
                  value={formData.billingPolicy}
                  onChange={(e) =>
                    handleInputChange("billingPolicy", e.target.value)
                  }
                  className="w-full pr-4 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="monthly">Monthly Rate</option>
                  <option value="monthly_with_daily">Monthly + Daily</option>
                  <option value="daily">Daily Rate</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Monthly Rate (₱/month)
                  {formData.billingPolicy === "monthly" ||
                  formData.billingPolicy === "monthly_with_daily" ? (
                    <span className="text-red-500 ml-1">*</span>
                  ) : null}
                </label>
                <input
                  type="number"
                  placeholder="e.g., 5000"
                  ref={monthlyRateRef}
                  value={formData.monthlyRate}
                  onChange={(e) =>
                    handleInputChange("monthlyRate", e.target.value)
                  }
                  className={`w-full px-2 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white ${formData.billingPolicy === "daily" ? "bg-gray-50 dark:bg-gray-600" : ""} ${fieldErrors.monthlyRate ? "border-red-500" : "border-gray-300 dark:border-gray-600"}`}
                  min="0"
                  step="0.01"
                  disabled={formData.billingPolicy === "daily"}
                />
                {fieldErrors.monthlyRate && <p className="text-red-500 text-xs mt-1">{fieldErrors.monthlyRate}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Daily Rate (₱/day)
                  {formData.billingPolicy === "daily" ||
                  formData.billingPolicy === "monthly_with_daily" ? (
                    <span className="text-red-500 ml-1">*</span>
                  ) : null}
                </label>
                <input
                  type="number"
                  placeholder="e.g., 300"
                  ref={dailyRateRef}
                  value={formData.dailyRate}
                  onChange={(e) =>
                    handleInputChange("dailyRate", e.target.value)
                  }
                  className={`w-full px-2 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white ${!(formData.billingPolicy === "daily" || formData.billingPolicy === "monthly_with_daily") ? "bg-gray-50 dark:bg-gray-600" : ""} ${fieldErrors.dailyRate ? "border-red-500" : "border-gray-300 dark:border-gray-600"}`}
                  min="0"
                  step="0.01"
                  disabled={
                    !(
                      formData.billingPolicy === "daily" ||
                      formData.billingPolicy === "monthly_with_daily"
                    )
                  }
                />
                {fieldErrors.dailyRate && <p className="text-red-500 text-xs mt-1">{fieldErrors.dailyRate}</p>}
              </div>
            </div>

            {/* Row 3: Minimum Stay | Capacity */}
            <div className="grid grid-cols-3 gap-4 mt-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Minimum Stay (days)
                </label>
                <input
                  type="number"
                  placeholder="e.g., 30"
                  value={formData.minStayDays}
                  onChange={(e) =>
                    handleInputChange("minStayDays", e.target.value)
                  }
                  className={`w-full px-2 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white ${fieldErrors.minStayDays ? "border-red-500" : "border-gray-300 dark:border-gray-600"}`}
                  min="1"
                  step="1"
                />
              </div>

              <div>
                <div className="flex items-baseline justify-between">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Capacity
                  </label>
                  <div className="flex items-baseline gap-2">
                    <span className="text-red-500 ml-1">*</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formData.roomType === "bedSpacer"
                        ? "(manually if bed spacer)"
                        : "(auto-set by room type)"}
                    </span>
                  </div>
                </div>

                {(() => {
                  const capacityDisabled =
                    (isDormitory || isBoarding) &&
                    formData.roomType !== "bedSpacer" &&
                    !isBedSpacerProperty;
                  const displayValue = capacityDisabled
                    ? "1"
                    : formData.capacity;
                  return (
                    <>
                      <input
                        type="number"
                        ref={capacityRef}
                        value={displayValue}
                        onChange={(e) => {
                          if (!capacityDisabled)
                            handleInputChange("capacity", e.target.value);
                        }}
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white ${capacityDisabled ? "bg-gray-50 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed" : ""} ${fieldErrors.capacity ? "border-red-500" : "border-gray-300 dark:border-gray-600"}`}
                        min="1"
                        max="10"
                        disabled={capacityDisabled}
                      />
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Pricing Model Section - Only show for multi-capacity non-bedspacer rooms */}
            {formData.roomType !== "single" && formData.roomType !== "bedSpacer" && (
              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Pricing Model
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowPricingHelp(true)}
                    className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 p-1 rounded focus:outline-none"
                    title="Pricing help"
                    aria-label="Open pricing help"
                  >
                    <HelpCircle className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                  How should tenants pay for this {isApartment ? "unit" : "room"}?
                </p>

                <div className="space-y-3">
                  <label
                    className={`flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors ${formData.pricingModel === "full_room" ? "bg-blue-100 dark:bg-blue-900/50" : ""}`}
                  >
                    <input
                      type="radio"
                      name="pricingModel"
                      value="full_room"
                      checked={formData.pricingModel === "full_room"}
                      onChange={(e) =>
                        handleInputChange("pricingModel", e.target.value)
                      }
                      className="w-4 h-4"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {isApartment ? "Entire Unit Price" : "Full Room Price"}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        The price covers the whole room/unit regardless of occupants.
                      </p>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors ${formData.pricingModel === "per_bed" ? "bg-blue-100 dark:bg-blue-900/50" : ""}`}
                  >
                    <input
                      type="radio"
                      name="pricingModel"
                      value="per_bed"
                      checked={formData.pricingModel === "per_bed"}
                      onChange={(e) =>
                        handleInputChange("pricingModel", e.target.value)
                      }
                      className="w-4 h-4"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Per Tenant Price
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Each tenant pays the fixed rate individually.
                      </p>
                    </div>
                  </label>
                </div>

                {/* Revenue Summary */}
                <div className="mt-4 pt-3 border-t border-blue-200 dark:border-blue-800">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-blue-700 dark:text-blue-400 font-medium">Estimated Monthly Revenue:</span>
                    <span className="text-lg font-bold text-blue-900 dark:text-blue-200">
                      <PriceRow 
                        amount={formData.pricingModel === 'per_bed' 
                          ? (parseFloat(formData.monthlyRate) || 0) * (parseInt(formData.capacity) || 1)
                          : (parseFloat(formData.monthlyRate) || 0)
                        } 
                      />
                    </span>
                  </div>
                  {formData.pricingModel === 'full_room' && parseInt(formData.capacity) > 1 && (
                    <p className="text-[10px] text-blue-600 dark:text-blue-500 mt-1 text-right italic">
                      * Approx. <PriceRow amount={(parseFloat(formData.monthlyRate) || 0) / (parseInt(formData.capacity) || 1)} small /> per person
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Simple Revenue Preview for Single/BedSpacer rooms where model is fixed */}
            {(formData.roomType === "single" || formData.roomType === "bedSpacer") && (
              <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 dark:text-gray-400 font-medium">Estimated Monthly Revenue:</span>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                      <PriceRow 
                        amount={formData.roomType === 'bedSpacer'
                          ? (parseFloat(formData.monthlyRate) || 0) * (parseInt(formData.capacity) || 1)
                          : (parseFloat(formData.monthlyRate) || 0)
                        } 
                      />
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 dark:text-gray-500 mt-1 italic">
                    {formData.roomType === 'single' ? "* Based on single occupancy" : `* Based on ${formData.capacity} beds at the monthly rate`}
                  </p>
              </div>
            )}

            <PricingHelp
              open={showPricingHelp}
              onClose={() => setShowPricingHelp(false)}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description (Optional)
              </label>
              <textarea
                placeholder="Add room description..."
                value={formData.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Room Rules (optional) - placed after Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Room Rules (optional)
              </label>
              <div className="mb-4">
                <div className="grid grid-cols-3 gap-3">
                  {(propertyRules || []).map((rule) => (
                    <button
                      key={rule}
                      type="button"
                      onClick={() => toggleRule(rule)}
                      className={`px-4 py-3 rounded-lg border-2 text-left text-sm transition-all ${formData.rules.includes(rule) ? "border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400" : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500"}`}
                    >
                      {rule}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Add new rule (e.g., no smoking)"
                  value={newRule}
                  onChange={(e) => setNewRule(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addNewRule();
                    }
                  }}
                  className="flex-1 px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
                />
                <button
                  type="button"
                  onClick={addNewRule}
                  disabled={!newRule.trim()}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Add
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Select rules to include for this room or add a new rule to the
                property.
              </p>
            </div>
          </div>

          {/* Amenities */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Room Amenities
            </h3>

            {localAmenities.length > 0 ? (
              <>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Property Amenities:
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {localAmenities.map((amenity) => (
                    <button
                      key={amenity}
                      type="button"
                      onClick={() => toggleAmenity(amenity)}
                      className={`px-4 py-3 rounded-lg border-2 text-left text-sm transition-all ${
                        formData.amenities.includes(amenity)
                          ? "border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                          : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500"
                      }`}
                    >
                      {amenity}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8 bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  No amenities in property yet
                </p>
                <p className="text-gray-500 dark:text-gray-500 text-xs mt-1">
                  Add amenities below to get started
                </p>
              </div>
            )}

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Add New Amenity
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="e.g., Water Heater, Study Lamp"
                  value={newAmenity}
                  onChange={(e) => setNewAmenity(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addNewAmenity();
                    }
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50 dark:bg-gray-700 dark:text-white"
                />
                <button
                  type="button"
                  onClick={addNewAmenity}
                  disabled={!newAmenity.trim()}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Add amenities that will be available in this room and saved to
                property
              </p>
            </div>
          </div>

          {/* Images */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white shrink-0">
                Room Images
              </h3>
              {fieldErrors.images && (
                <p className="text-red-600 text-xs font-bold animate-in fade-in slide-in-from-left-2">
                  {fieldErrors.images}
                </p>
              )}
            </div>

            <div
              className={`border-2 border-dashed rounded-lg p-6 ${fieldErrors.images ? "border-red-500 bg-red-50/10" : "border-gray-300 dark:border-gray-600"}`}
            >
              <input
                type="file"
                multiple
                accept="image/png,image/jpeg,image/jpg"
                onChange={handleImageUpload}
                className="hidden"
                id="room-image-upload"
              />

              {previewImages.length === 0 ? (
                <label
                  htmlFor="room-image-upload"
                  className="cursor-pointer block text-center"
                >
                  <Upload className="w-10 h-10 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">
                    Click to upload room images
                  </p>
                  <p className="text-gray-500 dark:text-gray-500 text-xs">
                    PNG, JPG up to 10MB (Max 10 images)
                  </p>
                </label>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-5 gap-3">
                    {previewImages.map((img, index) => (
                      <div
                        key={index}
                        className="relative aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden group"
                      >
                        <img
                          src={img}
                          alt={`Room ${index + 1}`}
                          className="w-full h-full object-cover"
                        />

                        {/* Cover badge for first image */}
                        {index === 0 && (
                          <span className="absolute left-2 top-2 bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                            Cover
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          title="Remove image"
                          className="absolute top-2 right-2 p-1 bg-white dark:bg-gray-800 bg-opacity-90 text-gray-700 dark:text-gray-300 rounded-full shadow-sm hover:bg-opacity-100 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {formData.images.length < 10 && (
                      <label
                        htmlFor="room-image-upload"
                        className="aspect-square border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                      >
                        <Plus className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                      </label>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !isFormValid}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin h-5 w-5" />
                Adding...
              </>
            ) : (
              "Add Room"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
