import type { PropsWithChildren } from "react";
import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
} from "react";

import { useCreateMember } from "@/src/features/members/hooks/useCreateMember";
import type { Member } from "@/src/features/members/model/Member";

type NewMemberContextValue = {
  displayName: string;
  setDisplayName: (displayName: string) => void;

  isCreating: boolean;
  canCreate: boolean;

  create: () => Promise<void>;
  cancel: () => void;
  reset: () => void;
};

const NewMemberContext = createContext<NewMemberContextValue | null>(null);

type NewMemberProviderProps = PropsWithChildren<{
  onCreated?: (member: Member) => void;
  onCancel?: () => void;
}>;

export function NewMemberProvider({
  onCreated,
  onCancel,
  children,
}: NewMemberProviderProps) {
  const [displayName, setDisplayName] = useState("");

  const { createMember, isCreating } = useCreateMember();

  const normalizedName = displayName.trim();

  const canCreate = !isCreating && normalizedName.length > 0;

  const reset = useCallback(() => {
    setDisplayName("");
  }, []);

  const create = useCallback(async () => {
    if (!canCreate) {
      throw new Error("Cannot create member: invalid state.");
    }

    const member = await createMember({
      displayName: normalizedName,
    });

    reset();

    onCreated?.(member);
  }, [canCreate, createMember, normalizedName, onCreated, reset]);

  const cancel = useCallback(() => {
    if (isCreating) {
      return;
    }

    reset();

    onCancel?.();
  }, [isCreating, onCancel, reset]);

  const value = useMemo<NewMemberContextValue>(
    () => ({
      displayName,
      setDisplayName,
      isCreating,
      canCreate,
      create,
      cancel,
      reset,
    }),
    [displayName, isCreating, canCreate, create, cancel, reset],
  );

  return (
    <NewMemberContext.Provider value={value}>
      {children}
    </NewMemberContext.Provider>
  );
}

export function useNewMember() {
  const context = useContext(NewMemberContext);

  if (!context) {
    throw new Error("useNewMember must be used inside NewMemberProvider.");
  }

  return context;
}
