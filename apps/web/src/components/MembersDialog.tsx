import { useState } from 'react';
import { canManage, useMe } from '../lib/auth';
import { useAddMember, useMembers, useRemoveMember } from '../lib/queries';
import type { Workspace } from '../lib/types';
import { Modal } from './Modal';

export function MembersDialog({
  workspace,
  onClose,
}: {
  workspace: Workspace;
  onClose: () => void;
}) {
  const { data: me } = useMe();
  const members = useMembers(workspace.id);
  const addMember = useAddMember(workspace.id);
  const removeMember = useRemoveMember(workspace.id);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER');
  const isAdmin = canManage(workspace.role);

  return (
    <Modal title={`${workspace.name} · Members`} onClose={onClose}>
      <ul className="mb-6 divide-y divide-slate-800">
        {members.data?.map(({ user, role }) => (
          <li key={user.id} className="flex items-center gap-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">
                {user.name}
                {user.id === me?.id && <span className="text-slate-500"> (you)</span>}
              </p>
              <p className="truncate text-xs text-slate-400">{user.email}</p>
            </div>
            <span className="text-xs text-slate-400 lowercase">{role}</span>
            {isAdmin && role !== 'OWNER' && (
              <button
                onClick={() => {
                  if (confirm(`Remove ${user.name}? Their tasks will be unassigned.`)) {
                    removeMember.mutate(user.id);
                  }
                }}
                className="btn-danger px-2 py-1 text-xs"
              >
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>

      {isAdmin ? (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            addMember.mutate({ email, role }, { onSuccess: () => setEmail('') });
          }}
        >
          <label htmlFor="member-email" className="label">
            Add a teammate by email
          </label>
          <div className="flex gap-2">
            <input
              id="member-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@example.com"
              className="input"
            />
            <select
              aria-label="Role"
              value={role}
              onChange={(e) => setRole(e.target.value as 'ADMIN' | 'MEMBER')}
              className="input w-32"
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <p className="text-xs text-slate-500">They need to have signed up first.</p>
          <button type="submit" disabled={addMember.isPending} className="btn-primary self-start">
            Add member
          </button>
        </form>
      ) : (
        <p className="text-sm text-slate-400">Only admins and owners can add or remove members.</p>
      )}
    </Modal>
  );
}
