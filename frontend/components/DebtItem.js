import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import colors from '../styles/colors';
import typography from '../styles/typography';

export default function DebtItem({ debt, onTogglePaid }) {
    return (
        <View style={[styles.debtItem, debt.paid && styles.debtItemPaid]}>
            <View style={debt.paid && styles.greyedContent}>
                <Text style={typography.body}>
                    {debt.owedBySelf
                        ? `You owe ${debt.person} ${debt.amount} kr`
                        : `${debt.person} owes you ${debt.amount} kr`}
                </Text>
                {debt.reason ? (
                    <Text style={styles.reason}>Reason: {debt.reason}</Text>
                ) : null}
            </View>
            <Pressable
                onPress={onTogglePaid}
                style={[
                    styles.markPaidButton,
                    debt.paid ? styles.markUnpaidButton : null,
                ]}
            >
                <Text style={styles.markPaidText}>
                    {debt.paid ? 'Mark as Unpaid' : 'Mark as Paid'}
                </Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    debtItem: {
        marginBottom: 15,
        padding: 20,
        backgroundColor: colors.primary,
        borderRadius: 5,
        width: '100%',
    },
    debtItemPaid: {
        backgroundColor: colors.disabledBackground,
    },
    greyedContent: {
        opacity: 0.6,
    },
    reason: {
        fontStyle: 'italic',
        fontSize: 12,
        marginTop: 5,
        color: colors.textSecondary,
    },
    markPaidButton: {
        marginTop: 10,
        backgroundColor: colors.success,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 4,
        alignSelf: 'flex-start',
    },
    markUnpaidButton: {
        backgroundColor: colors.warning,
    },
    markPaidText: {
        color: 'white',
        fontWeight: 'bold',
    },
});
