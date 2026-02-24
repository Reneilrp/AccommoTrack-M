import React, { useRef, useEffect } from 'react';
import { View, ActivityIndicator, Alert } from 'react-native';
import homeStyles from '../../../../styles/Tenant/HomePage.js';
import { WebView } from 'react-native-webview';
import PaymentService from '../../../../services/PaymentService';

export default function PaymentRedirectWebview({ route, navigation }) {
  const { checkoutUrl, invoiceId } = route.params || {};
  const webviewRef = useRef(null);

  useEffect(() => {
    // noop
  }, []);

  const handleNavStateChange = async (navState) => {
    const url = navState.url || '';
    try {
      // If the return path hits our app return URL, refresh the invoice and close
      if (url.includes('/payments/return')) {
        // Attempt to refresh invoice/payment status by asking the backend to query PayMongo
        try {
          const refresh = await PaymentService.refreshInvoice(invoiceId);
          if (!refresh.success) {
            console.warn('Invoice refresh returned error', refresh.error);
          }
        } catch (e) {
          console.error('Error calling refreshInvoice', e);
        }
        // Close the WebView and let the Payments screen re-fetch on focus
        navigation.goBack();
      }
    } catch (e) {
      console.error('Error handling redirect navigation', e);
      Alert.alert('Error', 'Failed to refresh payment status');
      navigation.goBack();
    }
  };

  return (
    <View style={homeStyles.flex1}>
      <WebView
        ref={webviewRef}
        source={{ uri: checkoutUrl }}
        onNavigationStateChange={handleNavStateChange}
        startInLoadingState
        renderLoading={() => <ActivityIndicator size="large" style={homeStyles.flex1}/>}
      />
    </View>
  );
}
