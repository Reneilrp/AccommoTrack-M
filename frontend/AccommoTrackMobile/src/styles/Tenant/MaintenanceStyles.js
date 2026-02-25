import { StyleSheet } from 'react-native';

export const getStyles = (theme) => StyleSheet.create({
    header: {
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        backgroundColor: theme.colors.surface,
        borderBottomColor: theme.colors.border,
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
        color: theme.colors.text,
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
        color: theme.colors.textSecondary,
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
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
        color: theme.colors.text,
    },
    textArea: {
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        minHeight: 120,
        borderWidth: 1,
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
        color: theme.colors.text,
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
        backgroundColor: theme.colors.backgroundSecondary,
    },
    priorityChipActive: {
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        backgroundColor: theme.colors.primary,
    },
    priorityText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    priorityTextActive: {
        color: theme.colors.textInverse,
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
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    addPhotoText: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 4,
        color: theme.colors.textSecondary,
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
        backgroundColor: theme.colors.surface,
        borderRadius: 10,
        elevation: 2,
    },
    infoBox: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 12,
        backgroundColor: theme.colors.backgroundSecondary,
        alignItems: 'center',
        gap: 12,
        marginTop: 10,
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 18,
        color: theme.colors.textSecondary,
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        backgroundColor: theme.colors.surface,
        borderTopColor: theme.colors.border,
    },
    submitBtn: {
        height: 54,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.primary,
    },
    submitBtnText: {
        color: theme.colors.textInverse,
        fontSize: 16,
        fontWeight: 'bold',
    },
    container: {
        flex: 1,
        padding: 12,
        backgroundColor: theme.colors.background,
    },
    title: {
        fontSize: 18, 
        fontWeight: '600', 
        marginBottom: 8,
        color: theme.colors.text,
    },
    requestCard: {
        padding: 16, 
        borderRadius: 12, 
        marginBottom: 12,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    requestTitle: {
        fontWeight: '600',
        fontSize: 16,
        color: theme.colors.text,
    },
    requestText: {
        marginTop: 6,
        color: theme.colors.textSecondary,
    },
    centered: {
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: theme.colors.background,
    },
    safeArea: {
        flex: 1,
        backgroundColor: theme.colors.background,
    }
});

export default getStyles;
