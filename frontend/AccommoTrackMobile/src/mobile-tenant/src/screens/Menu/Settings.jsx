import ProfileService from '../../../../services/ProfileService';

export default function Settings({ onLogout, isGuest, onLoginPress }) {
  const navigation = useNavigation();
  const { theme } = useTheme();
  
  const [notificationSettings, setNotificationSettings] = useState({
    notifications: true,
    emailNotifications: true,
    pushNotifications: true,
    locationServices: true
  });
  const [refreshing, setRefreshing] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkGuestMode();
  }, [isGuest]);

  const checkGuestMode = async () => {
    let guest = false;
    if (isGuest !== undefined) {
      guest = isGuest;
    } else {
      try {
        const userJson = await AsyncStorage.getItem('user');
        guest = !userJson;
      } catch (error) {
        console.error('Error checking guest mode:', error);
      }
    }
    setIsGuestMode(guest);
    
    if (!guest) {
      loadSettings();
    } else {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await ProfileService.getProfile();
      if (res.success && res.data) {
        const prefs = res.data.notification_preferences;
        if (prefs) {
          const parsed = typeof prefs === 'string' ? JSON.parse(prefs) : prefs;
          setNotificationSettings({
            notifications: parsed.notifications ?? true,
            emailNotifications: parsed.emailNotifications ?? true,
            pushNotifications: parsed.pushNotifications ?? true,
            locationServices: parsed.locationServices ?? true
          });
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key, value) => {
    if (isGuestMode) return;
    
    const newSettings = { ...notificationSettings, [key]: value };
    setNotificationSettings(newSettings);
    
    try {
      await ProfileService.updateSettings({
        notification_preferences: newSettings
      });
      
      // Update local storage too for consistency
      const userJson = await AsyncStorage.getItem('user');
      if (userJson) {
        const user = JSON.parse(userJson);
        user.notification_preferences = newSettings;
        await AsyncStorage.setItem('user', JSON.stringify(user));
      }
    } catch (error) {
      console.error('Error updating setting:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (!isGuestMode) {
        await loadSettings();
      }
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSettingPress = (label) => {
    switch(label) {
      case "Profile":
        navigation.navigate('Profile');
        break;
      case "Notification Preferences":
        // Scroll to notifications or navigate if separate
        break;
      case "Account Security":
        navigation.navigate('UpdatePassword');
        break;
      case "Help Center":
        navigation.navigate('HelpSupport');
        break;
      case "Report a Problem":
        Alert.alert('Report a Problem', 'This feature will be implemented soon');
        break;
      case "Terms of Service":
        Alert.alert('Terms of Service', 'This feature will be implemented soon');
        break;
      case "Privacy Policy":
        Alert.alert('Privacy Policy', 'This feature will be implemented soon');
        break;
      case "Login / Sign Up":
        handleLoginPress();
        break;
      case "Become a Landlord":
        handleBecomeLandlord();
        break;
      default:
        console.log('Setting pressed:', label);
    }
  };

  const handleLoginPress = () => {
    if (onLoginPress) {
      onLoginPress();
    } else {
      navigation.navigate('Auth');
    }
  };

  const handleBecomeLandlord = () => {
    Alert.alert(
      'Become a Landlord',
      'You will be redirected to our web portal to register as a landlord.\n\nAfter creating your account, you can login here in the app as a landlord.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Open Web Portal', 
          onPress: () => {
            // Open web admin portal for landlord registration
            Linking.openURL(`${WEB_BASE_URL}/become-landlord`);
          }
        }
      ]
    );
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              if (onLogout) {
                await onLogout();
              } else {
                await AsyncStorage.clear();
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Auth' }]
                });
              }
            } catch (error) {
              console.error('Logout error:', error);
            }
          }
        }
      ]
    );
  };

  // Settings sections - different for guests vs logged in users
  const getSettingSections = () => {
    if (isGuestMode) {
      return [
        {
          title: "Account",
          items: [
            { id: 1, label: "Login / Sign Up", icon: "log-in-outline", arrow: true, highlight: true },
            { id: 2, label: "Become a Landlord", icon: "business-outline", arrow: true },
          ]
        },
        {
          title: "Support",
          items: [
            { id: 12, label: "Help Center", icon: "help-circle-outline", arrow: true },
            { id: 13, label: "Report a Problem", icon: "flag-outline", arrow: true },
            { id: 14, label: "Terms of Service", icon: "document-text-outline", arrow: true },
            { id: 15, label: "Privacy Policy", icon: "shield-outline", arrow: true },
          ]
        }
      ];
    }

    // Logged in user - full options
    return [
      {
        title: "Account",
        items: [
          { id: 1, label: "Profile", icon: "person-outline", arrow: true },
          { id: 2, label: "Account Security", icon: "lock-closed-outline", arrow: true },
          { id: 4, label: "Become a Landlord", icon: "business-outline", arrow: true },
        ]
      },
      {
        title: "Notifications",
        items: [
          { 
            id: 8, 
            label: "Push Notifications", 
            icon: "notifications-outline", 
            toggle: true, 
            value: notificationSettings.pushNotifications,
            onChange: (val) => updateSetting('pushNotifications', val)
          },
          { 
            id: 9, 
            label: "Email Notifications", 
            icon: "mail-outline", 
            toggle: true, 
            value: notificationSettings.emailNotifications,
            onChange: (val) => updateSetting('emailNotifications', val)
          },
        ]
      },
      {
        title: "Support",
        items: [
          { id: 12, label: "Help Center", icon: "help-circle-outline", arrow: true },
          { id: 13, label: "Report a Problem", icon: "flag-outline", arrow: true },
          { id: 14, label: "Terms of Service", icon: "document-text-outline", arrow: true },
          { id: 15, label: "Privacy Policy", icon: "shield-outline", arrow: true },
        ]
      }
    ];
  };

  const settingSections = getSettingSections();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar barStyle="light-content" />
        <Header
          title="Settings"
          onBack={navigation.canGoBack() ? () => navigation.goBack() : null}
          showProfile={false}
        />
      {/* Content Area */}
      <View style={homeStyles.flex1}>
        {loading ? (
          <ScrollView style={homeStyles.contentContainerPadding} showsVerticalScrollIndicator={false}>
            <ListItemSkeleton />
            <ListItemSkeleton />
            <ListItemSkeleton />
          </ScrollView>
        ) : (
          <ScrollView 
            style={styles.content} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={homeStyles.contentContainerPadding}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[theme.colors.primary]}
                tintColor={theme.colors.primary}
              />
            }
          >

        {settingSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>{section.title}</Text>
            <View style={[styles.settingsCard, { backgroundColor: theme.colors.surface }]}>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.settingItem,
                    itemIndex !== section.items.length - 1 && [styles.settingItemBorder, { borderBottomColor: theme.colors.border }],
                    item.highlight && styles.settingItemHighlight,
                    item.highlight && { backgroundColor: theme.colors.primary + '10' }
                  ]}
                  disabled={item.toggle || item.label === "App Version"}
                  onPress={() => handleSettingPress(item.label)}
                  activeOpacity={item.toggle ? 1 : 0.7}
                >
                  <View style={styles.settingLeft}>
                    <View style={[styles.settingIcon, item.highlight && styles.settingIconHighlight, item.highlight && { backgroundColor: theme.colors.primary }]}>
                      <Ionicons name={item.icon} size={22} color={item.highlight ? "#FFFFFF" : theme.colors.primary} />
                    </View>
                    <Text style={[styles.settingLabel, item.highlight && styles.settingLabelHighlight, item.highlight && { color: theme.colors.primary }, { color: theme.colors.text }]}>{item.label}</Text>
                  </View>
                  
                  <View style={styles.settingRight}>
                    {item.toggle ? (
                        <Switch
                        value={item.value}
                        onValueChange={item.onChange}
                        trackColor={{ false: '#D1D5DB', true: theme.colors.brand200 }}
                        thumbColor={item.value ? theme.colors.primary : '#F3F4F6'}
                      />
                    ) : (
                      <>
                        {item.value && (
                          <Text style={[styles.settingValue, { color: theme.colors.textSecondary }]}>{item.value}</Text>
                        )}
                        {item.arrow && (
                          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                        )}
                      </>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Logout Button - Only show for logged in users */}
        {!isGuestMode && (
          <View style={styles.section}>
            <TouchableOpacity 
              style={[styles.dangerButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.error + '20' }]}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={20} color={theme.colors.error} />
              <Text style={[styles.dangerButtonText, { color: theme.colors.error }]}>Logout</Text>
            </TouchableOpacity>
          </View>
        )}

            <View style={homeStyles.spacer} />
          </ScrollView>
        )}
      </View>
    </View>
  );
}