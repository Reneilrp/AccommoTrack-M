import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export const styles = StyleSheet.create({
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    header: {
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        borderBottomWidth: 1,
    },
    backBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center'
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    listContent: {
        padding: 20,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    requestCard: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },
    requestHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    requestName: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    requestSub: {
        fontSize: 13,
    },
    cancelBtn: {
        marginTop: 12,
        alignSelf: 'flex-end',
    },
    cancelBtnText: {
        color: '#EF4444',
        fontSize: 13,
        fontWeight: '600',
    },
    addonCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    addonInfo: {
        flexDirection: 'row',
        gap: 12,
    },
    addonTextContent: {
        flex: 1,
    },
    addonName: {
        fontSize: 17,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    addonDesc: {
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 8,
    },
    addonPrice: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    addonImage: {
        width: 80,
        height: 80,
        borderRadius: 12,
    },
    separator: {
        height: 1,
        marginVertical: 16,
        opacity: 0.5,
    },
    addonFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    qtyContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    qtyBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    qtyText: {
        fontSize: 16,
        fontWeight: 'bold',
        minWidth: 20,
        textAlign: 'center',
    },
    requestActionBtn: {
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 10,
        minWidth: 100,
        alignItems: 'center',
    },
    requestActionText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    noteInput: {
        marginTop: 16,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 13,
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 60,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 16,
    },
    emptySub: {
        fontSize: 14,
        marginTop: 4,
    }
});
