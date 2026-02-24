import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 12,
    },
    reviewCard: {
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    propertyName: {
        fontWeight: '600',
    },
    propertyLocation: {
        fontSize: 12,
    },
    ratingContainer: {
        alignItems: 'flex-end',
    },
    ratingText: {
        fontWeight: '600',
    },
    timeText: {
        fontSize: 12,
    },
    commentText: {
        marginTop: 8,
    },
    actionRow: {
        flexDirection: 'row',
        marginTop: 10,
    },
    editBtn: {
        padding: 8,
        borderRadius: 8,
        marginRight: 8,
    },
    deleteBtn: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: '#EF4444',
    },
    btnText: {
        fontWeight: '600',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
    },
    submitBtnContainer: {
        marginTop: 16,
    },
    submitBtn: {
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    submitBtnText: {
        fontWeight: '600',
    },
});
