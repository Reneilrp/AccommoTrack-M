import { StyleSheet } from 'react-native';

export const getStyles = (theme) => StyleSheet.create({
    container: {
        flex: 1,
        padding: 12,
        backgroundColor: theme.colors.background,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 12,
        color: theme.colors.text,
    },
    reviewCard: {
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: theme.isDark ? 0.3 : 0.05,
        shadowRadius: 5,
        backgroundColor: theme.colors.surface,
        borderWidth: theme.isDark ? 1 : 0,
        borderColor: theme.colors.border,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    propertyName: {
        fontWeight: '600',
        color: theme.colors.text,
    },
    propertyLocation: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    ratingContainer: {
        alignItems: 'flex-end',
    },
    ratingText: {
        fontWeight: '600',
        color: '#F59E0B',
    },
    timeText: {
        fontSize: 12,
        color: theme.colors.textTertiary,
    },
    commentText: {
        marginTop: 8,
        color: theme.colors.text,
    },
    actionRow: {
        flexDirection: 'row',
        marginTop: 10,
    },
    editBtn: {
        padding: 8,
        borderRadius: 8,
        marginRight: 8,
        backgroundColor: theme.colors.primaryLight,
    },
    deleteBtn: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: theme.colors.error,
    },
    btnText: {
        fontWeight: '600',
        color: theme.colors.text,
    },
    btnTextInverse: {
        fontWeight: '600',
        color: theme.colors.textInverse,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
    },
    starsContainer: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    starBtn: {
        marginRight: 8,
    },
    textInput: {
        minHeight: 120,
        padding: 12,
        borderRadius: 8,
        textAlignVertical: 'top',
        backgroundColor: theme.colors.surface,
        color: theme.colors.text,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    submitBtnContainer: {
        marginTop: 16,
    },
    submitBtn: {
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        backgroundColor: theme.colors.primary,
    },
    submitBtnText: {
        fontWeight: '600',
        color: theme.colors.textInverse,
    },
});

export default getStyles;
