import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StatusBar,
  Alert,
  Linking,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../../../styles/Landlord/HelpSupport';
import { useTheme } from '../../../contexts/ThemeContext';
import Button from '../components/Button';

export default function HelpSupportScreen({ navigation }) {
  const { theme } = useTheme();
  
  const faqs = [
    { question: "How do I add a new room type to my Dorm Profile?", screen: 'FAQDetail', detail: "To add a new room type, navigate to 'Dorm Profile' in Settings, find the 'Room Inventory' section, and tap 'Add New Type'. Fill in the required details like capacity and base rent." },
    { question: "My Tenants list isn't updating. What should I do?", screen: 'FAQDetail', detail: "First, pull down on the Tenants screen to refresh the list. If the issue persists, please contact technical support with the time the issue occurred." },
    { question: "How can I change my payment notification settings?", screen: 'Settings', detail: "Go to Settings > Notifications, and toggle the switch next to 'Payment Notifications'." },
    { question: "Where can I view past monthly revenue reports?", screen: 'Analytics', detail: "Navigate to the 'Analytics' screen. You can change the time range filter (Week, Month, Year) at the top of the screen to view historical data." },
  ];

  const supportOptions = [
    { 
      id: 'email', 
      title: 'Email Support Team', 
      subtitle: 'Average response time: 24 hours', 
      icon: 'mail-outline', 
      color: '#2196F3', 
      action: () => Linking.openURL('mailto:support@landlordapp.com?subject=App%20Support%20Request') 
    },
    { 
      id: 'chat', 
      title: 'Live Chat (9am - 5pm PST)', 
      subtitle: 'Connect with a live agent instantly', 
      icon: 'chatbubbles-outline', 
      color: '#16a34a',
      action: () => Alert.alert("Live Chat", "Connecting you to a support agent...") 
    },
    { 
      id: 'call', 
      title: 'Emergency Bug Hotline', 
      subtitle: 'For critical bugs only', 
      icon: 'call-outline', 
      color: '#FF9800',
      action: () => Linking.openURL('tel:+1234567890')
    },
  ];

  const navigateToFAQDetail = (faq) => {
    Alert.alert(faq.question, faq.detail); 
  };
  
  // Custom back button handler
  const handleBack = () => {
    navigation.goBack();
  }

  // --- Reusable Component for Support Links ---
  const SupportOption = ({ title, subtitle, icon, color, action }) => (
    <Button style={styles.supportOptionItem} onPress={action} type="transparent">
      <View style={styles.supportLeft}>
        <Ionicons name={icon} size={26} color={color} />
        <View style={styles.supportTextContainer}>
          <Text style={styles.supportTitle}>{title}</Text>
          <Text style={styles.supportSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
    </Button>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Support Channels Section */}
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Support</Text>
            <View style={styles.card}>
                {supportOptions.map((option, index) => (
                    <SupportOption
                        key={option.id}
                        title={option.title}
                        subtitle={option.subtitle}
                        icon={option.icon}
                        color={option.color}
                        action={option.action}
                    />
                ))}
            </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
            <View style={styles.card}>
                {faqs.map((faq, index) => (
                  <Button
                    key={index}
                    style={[
                      styles.faqItem,
                      index < faqs.length - 1 && styles.faqItemBorder
                    ]}
                    onPress={() => navigateToFAQDetail(faq)}
                    type="transparent"
                  >
                    <Text style={styles.faqQuestion}>{faq.question}</Text>
                    <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                  </Button>
                ))}
            </View>
        </View>
        
        {/* Version Info */}
        <View style={styles.versionContainer}>
            <Text style={styles.versionText}>Landlord App v1.2.0</Text>
            <Text style={styles.versionText}>Need to report a specific bug? Use the Emergency Bug Hotline.</Text>
        </View>
        
      </ScrollView>
    </View>
  );
}