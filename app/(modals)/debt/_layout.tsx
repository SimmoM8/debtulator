import { router, Stack, useLocalSearchParams } from "expo-router";
import { Alert } from "react-native";

import { renderToolbarAction } from "@/src/navigation/toolbarActions";
import { toolbarIcons } from "@/src/navigation/toolbarIcons";
import {
  NewDebtDraftProvider,
  useNewDebtDraft,
} from "@/src/presentation/providers/NewDebtDraftProvider";
import {
  NewDebtFlowProvider,
  useNewDebtFlow,
} from "@/src/presentation/providers/NewDebtFlowProvider";
import { useAppTheme } from "@/src/theme";

export default function DebtModalLayout() {
  return (
    <NewDebtDraftProvider>
      <NewDebtFlowProvider>
        <DebtModalNavigator />
      </NewDebtFlowProvider>
    </NewDebtDraftProvider>
  );
}

function DebtModalNavigator() {
  const theme = useAppTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: true,

        headerLargeTitle: false,

        headerTitleAlign: "center",

        headerStyle: {
          backgroundColor: theme.colors.appBackground,
        },

        headerTintColor: theme.colors.text,

        headerShadowVisible: false,

        contentStyle: {
          backgroundColor: theme.colors.appBackground,
        },
      }}
    >
      <Stack.Screen
        name="new"
        options={{
          title: "New Debt",

          animation:
            process.env.EXPO_OS === "android" ? "slide_from_left" : "default",

          animationTypeForReplace: "pop",

          headerLeft: () => <NewDebtCancelButton />,

          headerRight: () => <NewDebtCreateButton />,
        }}
      />

      <Stack.Screen
        name="select-member"
        options={{
          title: "Select Member",

          headerLeft: () => <SelectMemberLeadingAction />,

          headerRight: () => (
            <Stack.Toolbar.Button
              icon={toolbarIcons.plus}
              accessibilityLabel="Add member"
              onPress={() => {
                // Add Member flow later.
              }}
            />
          ),
        }}
      />
    </Stack>
  );
}

function NewDebtCancelButton() {
  const draft = useNewDebtDraft();

  const flow = useNewDebtFlow();

  function cancel() {
    if (flow.isCreating) {
      return;
    }

    draft.reset();

    router.dismissTo("/(tabs)/debts");
  }

  return (
    <Stack.Toolbar.Button
      icon={toolbarIcons.close}
      accessibilityLabel="Cancel new debt"
      disabled={flow.isCreating}
      onPress={cancel}
    />
  );
}

function NewDebtCreateButton() {
  const draft = useNewDebtDraft();

  const flow = useNewDebtFlow();

  async function create() {
    if (!flow.canCreate) {
      return;
    }

    try {
      await flow.createDebt();

      draft.reset();

      router.dismissTo("/(tabs)/debts");
    } catch (error) {
      console.error("Failed to create debt", error);

      Alert.alert(
        "Couldn’t create debt",
        "Your debt wasn’t saved. Your entered details have been kept so you can try again.",
      );
    }
  }

  return renderToolbarAction({
    label: flow.isCreating ? "Creating…" : "Create",

    androidIcon: toolbarIcons.check,

    accessibilityLabel: flow.isCreating ? "Creating debt" : "Create debt",

    disabled: !flow.canCreate,

    onPress: () => {
      void create();
    },
  });
}

function SelectMemberLeadingAction() {
  const draft = useNewDebtDraft();

  const { from } = useLocalSearchParams<{
    from?: string;
  }>();

  if (from === "new-debt") {
    return <Stack.Screen.BackButton displayMode="minimal" />;
  }

  function close() {
    draft.reset();

    router.dismiss();
  }

  return (
    <Stack.Toolbar.Button
      icon={toolbarIcons.close}
      accessibilityLabel="Close"
      onPress={close}
    />
  );
}
