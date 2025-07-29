import { ActivityIndicator, View, StyleSheet } from 'react-native';

export default function LoadingSpinner() {
    return (
        <View style={styles.container}>
            <ActivityIndicator size="medium" color="#007bff" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});