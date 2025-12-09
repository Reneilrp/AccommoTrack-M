import React from 'react';
import { View, ActivityIndicator, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import PaymentService from '../../../services/PaymentService';

export default function PaymentCardWebview({ route, navigation }) {
  const { tokenizeUrl, invoiceId } = route.params || {};

  const onMessage = async (event) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data || '{}');
      if (payload.payment_method_id) {
        // Send payment_method_id to backend to create payment
        const resp = await PaymentService.createPaymongoPayment(invoiceId, { payment_method_id: payload.payment_method_id });
        if (resp.success) {
          Alert.alert('Payment initiated', 'Payment is processing; refresh payments after webhook confirmation.');
          navigation.goBack();
        } else {
          Alert.alert('Payment failed', resp.error || 'Could not create payment');
        }
      } else {
        Alert.alert('Tokenization failed', 'No payment_method_id returned');
      }
    } catch (e) {
      console.error('WebView message error', e);
      Alert.alert('Error', 'Invalid response from payment page');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <WebView
        source={{ uri: tokenizeUrl }}
        onMessage={onMessage}
        startInLoadingState
        renderLoading={() => <ActivityIndicator size="large" style={{flex:1}}/>}
      />
    </View>
  );
}
