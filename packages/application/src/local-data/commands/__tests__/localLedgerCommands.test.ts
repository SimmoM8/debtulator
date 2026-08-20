import { describe, expect, it } from '@jest/globals';

import { EMPTY_APP_SNAPSHOT } from '../../../model/emptyAppSnapshot';
import type { AppSnapshot } from '../../../model/AppSnapshot';
import { SnapshotCoordinator } from '../../../state/SnapshotCoordinator';
import type {
  LocalLedgerPort,
  LocalLedgerUnitOfWork,
} from '../../LocalLedgerPort';
import { createMemberCommands } from '../memberCommands';
import type { Member } from '@debtulator/domain/models';

function deferred() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

function copySnapshot(snapshot: AppSnapshot): AppSnapshot {
  return {
    ...snapshot,
    members: snapshot.members.map((member) => ({
      ...member,
      tags: [...member.tags],
    })),
    settings: { ...snapshot.settings },
  };
}

const member: Member = {
  id: 'member-1',
  displayName: 'Original',
  notes: null,
  email: null,
  phone: null,
  remoteId: null,
  linkedUserId: null,
  linkStatus: 'unlinked',
  linkRequestId: null,
  linkedProfileDisplayName: null,
  linkedProfileEmail: null,
  linkedProfilePhone: null,
  syncStatus: 'local_only',
  tags: [],
  archived: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

class MemberPort implements LocalLedgerPort {
  state: AppSnapshot = {
    ...copySnapshot(EMPTY_APP_SNAPSHOT),
    members: [{ ...member }],
  };
  readonly receivedMembers: Member[] = [];
  updateGate: Promise<void> | null = null;

  async load(): Promise<AppSnapshot> {
    return copySnapshot(this.state);
  }

  async transaction<TResult>(
    operation: (unitOfWork: LocalLedgerUnitOfWork) => Promise<TResult>,
  ): Promise<TResult> {
    const port = this;
    const unitOfWork = {
      load: () => port.load(),
      updateMember: async (
        current: Member,
        patch: Partial<{
          displayName: string;
          notes: string | null;
          archived: boolean;
        }>,
      ) => {
        port.receivedMembers.push({ ...current, tags: [...current.tags] });
        if (port.updateGate) {
          const gate = port.updateGate;
          port.updateGate = null;
          await gate;
        }
        const updated: Member = {
          ...current,
          ...patch,
          updatedAt: `${port.receivedMembers.length}`,
        };
        port.state = {
          ...port.state,
          members: port.state.members.map((item) =>
            item.id === updated.id ? updated : item,
          ),
        };
        return updated;
      },
    } as unknown as LocalLedgerUnitOfWork;
    return operation(unitOfWork);
  }
}

describe('local member command facade', () => {
  it('resolves IDs from transaction-current state instead of a rendered snapshot', async () => {
    const port = new MemberPort();
    const coordinator = new SnapshotCoordinator(port);
    const commands = createMemberCommands(coordinator);
    const firstGate = deferred();
    port.updateGate = firstGate.promise;

    const first = commands.updateMember('member-1', { notes: 'Fresh note' });
    await Promise.resolve();
    const second = commands.updateMember('member-1', {
      displayName: 'Renamed',
    });
    firstGate.release();
    await Promise.all([first, second]);

    expect(port.receivedMembers).toHaveLength(2);
    expect(port.receivedMembers[0]).toMatchObject({
      displayName: 'Original',
      notes: null,
    });
    expect(port.receivedMembers[1]).toMatchObject({
      displayName: 'Original',
      notes: 'Fresh note',
    });
    expect(port.state.members[0]).toMatchObject({
      displayName: 'Renamed',
      notes: 'Fresh note',
    });
    expect(coordinator.getCurrent()).toMatchObject({
      revision: 2,
      snapshot: {
        members: [{ displayName: 'Renamed', notes: 'Fresh note' }],
      },
    });
  });

  it('does not publish a failed ID lookup and lets the following command run', async () => {
    const port = new MemberPort();
    const coordinator = new SnapshotCoordinator(port);
    const commands = createMemberCommands(coordinator);

    await expect(
      commands.updateMember('missing', { displayName: 'Nope' }),
    ).rejects.toThrow('Member not found.');
    expect(coordinator.getCurrent()).toBeNull();

    await expect(
      commands.updateMember('member-1', { displayName: 'Recovered' }),
    ).resolves.toMatchObject({ displayName: 'Recovered' });
    expect(coordinator.getCurrent()?.revision).toBe(1);
  });
});
