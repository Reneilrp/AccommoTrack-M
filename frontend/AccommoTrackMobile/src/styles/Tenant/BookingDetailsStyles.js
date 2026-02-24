import { StyleSheet, Dimensions, Platform } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

export const styles = StyleSheet.create({
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    headerOverlay: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 10,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        zIndex: 100,
    },
    headerCircleBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    headerTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 10,
        flex: 1,
        textAlign: 'center',
        marginHorizontal: 10
    },
    heroSection: {
        height: 280,
        width: screenWidth,
        position: 'relative'
    },
    heroImage: {
        width: '100%',
        height: '100%'
    },
    heroGradient: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)'
    },
    heroContent: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20
    },
    heroBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
        marginBottom: 10
    },
    heroBadgeText: {
        fontSize: 12,
        fontWeight: 'bold'
    },
    heroTitle: {
        color: '#fff',
        fontSize: 26,
        fontWeight: 'bold',
        marginBottom: 4
    },
    heroLocation: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    heroLocationText: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 14,
        marginLeft: 4
    },
    content: {
        padding: 20,
        marginTop: -20,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        backgroundColor: 'transparent'
    },
    sectionCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3
    },
    refRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    refText: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 4
    },
    copyBtn: {
        padding: 8
    },
    dateCard: {
        flexDirection: 'row',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    dateBlock: {
        flex: 1,
        alignItems: 'center'
    },
    dateLabel: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 6
    },
    dateValue: {
        fontSize: 15,
        fontWeight: 'bold'
    },
    dateDivider: {
        alignItems: 'center',
        paddingHorizontal: 10
    },
    durationLine: {
        width: 1,
        height: 30,
        marginVertical: 4
    },
    durationText: {
        fontSize: 11,
        fontWeight: '600'
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
        marginTop: 4
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4
    },
    iconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center'
    },
    infoLabel: {
        fontSize: 12
    },
    infoValue: {
        fontSize: 15,
        fontWeight: '600',
        marginTop: 2
    },
    separator: {
        height: 1,
        marginVertical: 12,
        opacity: 0.5
    },
    paymentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8
    },
    paymentLabel: {
        fontSize: 14
    },
    paymentValue: {
        fontSize: 16
    },
    paymentStatusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4
    },
    statusPill: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20
    },
    statusPillText: {
        fontSize: 11,
        fontWeight: 'bold'
    },
    itemCard: {
        borderRadius: 12,
        padding: 14,
        marginBottom: 12
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4
    },
    itemName: {
        fontSize: 15,
        fontWeight: 'bold'
    },
    itemSub: {
        fontSize: 13
    },
    itemAction: {
        marginTop: 10,
        alignSelf: 'flex-end'
    },
    cancelText: {
        color: '#EF4444',
        fontSize: 13,
        fontWeight: '600'
    },
    viewText: {
        fontSize: 13,
        fontWeight: '600'
    },
    statusPillSmall: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4
    },
    statusPillTextSmall: {
        fontSize: 10,
        fontWeight: 'bold'
    },
    footer: {
        padding: 16,
        borderTopWidth: 1,
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 10
    },
    actionRow: {
        flexDirection: 'row',
        gap: 10
    },
    actionBtn: {
        height: 50,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        flex: 1
    },
    secondaryActionBtn: {
        height: 44,
        borderRadius: 10,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1
    },
    outlineBtn: {
        borderWidth: 1.5,
        backgroundColor: 'transparent'
    },
    actionBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold'
    },
    errorText: {
        fontSize: 16,
        marginTop: 16,
        marginBottom: 20
    },
    backBtn: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 10
    },
    backBtnText: {
        color: '#fff', 
        fontWeight: '600'
    },
    cancelBookingText: {
        color: '#EF4444', 
        fontWeight: '600'
    },
    secondaryActionText: {
        fontWeight: '600', 
        marginLeft: 6
    },
    spacing: {
        height: 100
    }
});
