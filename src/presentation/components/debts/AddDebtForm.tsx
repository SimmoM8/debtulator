import { StyleSheet, Text, View } from "react-native";

import { FormSheet } from "@/src/presentation/components/forms/FormSheet";
import { textStyles } from "@/src/theme";

type AddDebtFormProps = {
  isPresented: boolean;
  onDismiss: () => void;
};

export function AddDebtForm({ isPresented, onDismiss }: AddDebtFormProps) {
  return (
    <FormSheet isPresented={isPresented} onDismiss={onDismiss}>
      <View style={styles.container}>
        <Text style={styles.title}>Add Debt</Text>
      </View>
    </FormSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
  },

  title: {
    ...textStyles.title,
  },
});
