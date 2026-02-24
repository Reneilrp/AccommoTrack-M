import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
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
    scrollContent: {
        padding: 20,
    },
    section: {
        marginBottom: 24,
    },
    label: {
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1,
        marginBottom: 10,
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    input: {
        height: 50,
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: 16,
        borderWidth: 1,
    },
    textArea: {
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        minHeight: 120,
        borderWidth: 1,
    },
    priorityRow: {
        flexDirection: 'row',
        gap: 10,
    },
    priorityChip: {
        flex: 1,
        height: 44,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    priorityChipActive: {
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    priorityText: {
        fontSize: 14,
        fontWeight: '600',
    },
    photoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    addPhotoBtn: {
        width: 100,
        height: 100,
        borderRadius: 12,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addPhotoText: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 4,
    },
    photoWrapper: {
        width: 100,
        height: 100,
        position: 'relative',
    },
    photo: {
        width: '100%',
        height: '100%',
        borderRadius: 12,
    },
    removePhotoBtn: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: '#fff',
        borderRadius: 10,
    },
    infoBox: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.03)',
        alignItems: 'center',
        gap: 12,
        marginTop: 10,
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 18,
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
    },
    submitBtn: {
        height: 54,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    submitBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    container: {
        flex: 1,
        padding: 12,
    },
    title: {
        fontSize: 18, 
        fontWeight: '600', 
        marginBottom: 8,
    },
    requestCard: {
        padding: 12, 
        borderRadius: 8, 
        marginBottom: 8,
    },
    requestTitle: {
        fontWeight: '600',
    },
    requestText: {
        marginTop: 6,
    },
    centered: {
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
    },
    safeArea: {
        flex: 1,
    }
});
