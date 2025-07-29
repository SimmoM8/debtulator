import { View, Text, StyleSheet, FlatList } from 'react-native';
import colors from '../styles/colors';
import typography from '../styles/typography';
import LoadingSpinner from './LoadingSpinner';

export default function List({
    data,
    renderItem,
    loading,
    error,
    emptyMessage = 'No items found.',
    style,
    contentContainerStyle,
}) {
    if (loading) {
        return (
            <View style={[styles.center, style]}>
                <LoadingSpinner />
            </View>
        );
    }

    if (error) {
        return (
            <View style={[styles.center, style]}>
                <Text style={typography.body}>{error}</Text>
            </View>
        );
    }

    if (!data || data.length === 0) {
        return (
            <View style={[styles.center, style]}>
                <Text style={typography.body}>{emptyMessage}</Text>
            </View>
        );
    }

    return (
        <View style={[styles.listContainer, style]}>
            <FlatList
                data={data}
                renderItem={renderItem}
                keyExtractor={(item, index) => item.id?.toString() || index.toString()}
                contentContainerStyle={[styles.centerContent, contentContainerStyle]}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContainer: {
        backgroundColor: '#e0e0e0',
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: colors.border,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 0,
        width: '100%',
    },
    centerContent: {
        alignItems: 'stretch',
    },
});
