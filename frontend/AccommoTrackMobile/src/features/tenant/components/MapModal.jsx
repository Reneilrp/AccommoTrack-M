import React from 'react';
import { Modal, View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';

export default function MapModal({ visible, onClose, properties = [], userRole = 'guest', onSelectProperty }) {
  // Debug: log properties received in MapModal
  React.useEffect(() => {
    console.log('🗺️ MapModal received properties:', properties && properties.length, properties && properties.slice(0, 2));
  }, [properties]);

  // Serialize properties and escape '<' so injected JSON can't close the <script> tag
  const markers = JSON.stringify(properties || []).replace(/</g, '\\u003c');

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
      html,body,#map{height:100%;margin:0;padding:0;}
      .leaflet-popup-content{font-family: Arial, Helvetica, sans-serif; font-size:14px;}
      .navButtons{position:absolute;right:12px;bottom:12px;display:flex;gap:8px;background:rgba(255,255,255,0.95);padding:6px;border-radius:8px;box-shadow:0 2px 6px rgba(0,0,0,0.15);z-index:9999}
      .navButtons button{border:0;background:#fff;padding:6px 10px;border-radius:6px;cursor:pointer;font-size:13px}
      .navButtons button:active{transform:translateY(1px)}
      .infoCard{position:absolute;left:12px;bottom:12px;z-index:9999;background:rgba(255,255,255,0.95);padding:8px;border-radius:8px;display:flex;align-items:center;gap:8px;box-shadow:0 2px 6px rgba(0,0,0,0.12);max-width:260px;cursor:pointer}
      .infoCard img{width:80px;height:60px;object-fit:cover;border-radius:6px}
      .infoCard .title{font-size:13px;font-weight:600;color:#111}
    </style>
  </head>
  <body>
    <div id="map"></div>
    <div id="card" class="infoCard" role="button" tabindex="0"></div>
    <div id="nav" class="navButtons">
      <button id="prev">◀ Prev</button>
      <button id="open">Open</button>
      <button id="next">Next ▶</button>
    </div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
      (function(){
        const properties = ${markers};
        // send init info back to RN for debugging
        if(window.ReactNativeWebView && window.ReactNativeWebView.postMessage){
          try{ window.ReactNativeWebView.postMessage(JSON.stringify({ action: 'init', count: properties.length, preview: properties.slice(0,3) })); }catch(e){}
        }
        // Default center: WMSU School campus (main green complex)
        const defaultCenter = [6.9134, 122.0625];
        // Start centered on WMSU School with zoom level 16
        const map = L.map('map').setView(defaultCenter, 16);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        const bounds = [];
        const markerObjs = [];
        // card rendering helper
        function renderCard(prop){
          const card = document.getElementById('card');
          if(!card) return;
          if(!prop){ card.innerHTML = ''; return; }
          const imgSrc = prop.image || (prop.images && prop.images[0]) || prop.image_url || '';
          const title = prop.title || prop.name || '';
          const imgHtml = imgSrc ? '<img src="'+imgSrc+'"/>' : '<div style="width:80px;height:60px;border-radius:6px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:22px">🏠</div>';
          card.innerHTML = '<div style="display:flex;align-items:center">'+imgHtml+'<div class="title">'+title+'</div></div>';
        }

        properties.forEach((p, idx) => {
          const lat = parseFloat(p.latitude || p.lat || p.latitude_raw);
          const lng = parseFloat(p.longitude || p.lng || p.longitude_raw);
          // Debug: log extraction attempt
          if(window.ReactNativeWebView && window.ReactNativeWebView.postMessage){
            try{ window.ReactNativeWebView.postMessage(JSON.stringify({ action: 'coord_debug', index: idx, lat_raw: p.latitude || p.lat || p.latitude_raw, lng_raw: p.longitude || p.lng || p.longitude_raw, lat_parsed: lat, lng_parsed: lng, property_keys: Object.keys(p).slice(0,10) })); }catch(e){}
          }
          // Use fallback center if no valid coordinates (WMSU School campus)
          const markerLat = !isNaN(lat) ? lat : 6.9134;
          const markerLng = !isNaN(lng) ? lng : 122.0625;
          if(true){ // Always add marker, even with fallback coords
            const marker = L.marker([markerLat, markerLng]).addTo(map);
            const title = p.title || p.name || '';
            const addr = p.address || p.location || '';
            const price = p.price ? ('<br><b>Price:</b> ' + p.price) : '';
            const popup = '<div><b>' + title + '</b><br>' + addr + price + '</div>';
            marker.bindPopup(popup);
            bounds.push([markerLat, markerLng]);
            markerObjs.push({ marker, property: p });
            // notify RN a marker was added (debug)
            if(window.ReactNativeWebView && window.ReactNativeWebView.postMessage){
              try{ window.ReactNativeWebView.postMessage(JSON.stringify({ action: 'marker_added', index: idx, lat: markerLat, lng: markerLng, id: p.id || p._id || null })); }catch(e){}
            }
            // postMessage when marker clicked to allow RN to handle opening
            marker.on('click', function(){
              currentIndex = idx;
              renderCard(p);
              const msg = JSON.stringify({ action: 'marker_click', property: p });
              if(window.ReactNativeWebView && window.ReactNativeWebView.postMessage) window.ReactNativeWebView.postMessage(msg);
            });
          }
        });

        let currentIndex = 0;
        function showIndex(i){
          if(!markerObjs.length) return;
          currentIndex = (i + markerObjs.length) % markerObjs.length;
          const obj = markerObjs[currentIndex];
          if(obj){
            map.setView(obj.marker.getLatLng(), 16);
            obj.marker.openPopup();
            renderCard(obj.property);
          }
        }

        // wire buttons
        document.addEventListener('DOMContentLoaded', function(){
          const prev = document.getElementById('prev');
          const next = document.getElementById('next');
          const open = document.getElementById('open');
          const card = document.getElementById('card');
          if(prev) prev.addEventListener('click', function(){ showIndex(currentIndex - 1); });
          if(next) next.addEventListener('click', function(){ showIndex(currentIndex + 1); });
          if(open) open.addEventListener('click', function(){
            if(!markerObjs.length) return;
            const prop = markerObjs[currentIndex].property;
            const msg = JSON.stringify({ action: 'open_property', property: prop });
            if(window.ReactNativeWebView && window.ReactNativeWebView.postMessage) window.ReactNativeWebView.postMessage(msg);
          });
          if(card) card.addEventListener('click', function(){
            if(!markerObjs.length) return;
            const prop = markerObjs[currentIndex].property;
            const msg = JSON.stringify({ action: 'open_property', property: prop });
            if(window.ReactNativeWebView && window.ReactNativeWebView.postMessage) window.ReactNativeWebView.postMessage(msg);
          });
        });

        if(bounds.length) {
          map.fitBounds(bounds, {padding: [40,40]});
          // after fitting, show first marker
          setTimeout(function(){ showIndex(0); }, 500);
        } else {
          // No property markers: keep the chosen default center (WMSU School)
          map.setView(defaultCenter, 16);
        }
      })();
    </script>
  </body>
  </html>
  `;

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={26} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Map</Text>
      </View>
      <WebView
        originWhitelist={["*"]}
        source={{ html }}
        style={{ flex: 1 }}
        onMessage={(event) => {
          // Always log messages from the WebView so you can debug in Metro/console
          try { console.log('MapModal onMessage:', event.nativeEvent.data); } catch(e){}
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if(onSelectProperty && data){
              onSelectProperty(data);
            }
          } catch (err) {
            // ignore malformed messages
          }
        }}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 56,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  closeButton: {
    padding: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
    color: '#111827'
  }
});
