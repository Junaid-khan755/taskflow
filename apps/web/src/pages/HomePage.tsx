import { useState } from 'react';
import { Link } from 'react-router';
import { AddInline } from '../components/InlineForm';
import { MembersDialog } from '../components/MembersDialog';
import { useBoards, useCreateBoard, useCreateWorkspace, useWorkspaces } from '../lib/queries';
import type { Workspace } from '../lib/types';

// "Acme Inc!" -> "acme-inc-k3f9". Slugs are unique across all users, so a
// short random suffix stops two people's "My Team" workspaces from clashing.
const slugify = (name: string) => {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  const suffix = Math.random().toString(36).slice(2, 6);
  return [base, suffix].filter(Boolean).join('-');
};

function WorkspaceSection({ workspace }: { workspace: Workspace }) {
  const { data: boards, isPending } = useBoards(workspace.id);
  const createBoard = useCreateBoard(workspace.id);
  const [showMembers, setShowMembers] = useState(false);

  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <h2 className="text-lg font-semibold">{workspace.name}</h2>
        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400 lowercase">
          {workspace.role}
        </span>
        <button onClick={() => setShowMembers(true)} className="btn-ghost ml-auto">
          Members
        </button>
      </div>
      {showMembers && <MembersDialog workspace={workspace} onClose={() => setShowMembers(false)} />}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {isPending && <p className="text-sm text-slate-400">Loading boards...</p>}
        {boards?.map((board) => (
          <Link
            key={board.id}
            to={`/boards/${board.id}`}
            className="rounded-xl border border-slate-800 bg-slate-900 p-4 transition-colors hover:border-indigo-500"
          >
            <h3 className="font-medium">{board.name}</h3>
            {board.description && (
              <p className="mt-1 line-clamp-2 text-sm text-slate-400">{board.description}</p>
            )}
          </Link>
        ))}
        <div className="rounded-xl border border-dashed border-slate-800 p-3">
          <AddInline
            label="+ New board"
            placeholder="Board name"
            closeOnSubmit
            onAdd={(name) => createBoard.mutate({ name })}
          />
        </div>
      </div>
    </section>
  );
}

export function HomePage() {
  const { data: workspaces, isPending, error } = useWorkspaces();
  const createWorkspace = useCreateWorkspace();
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState('');

  if (isPending) return <p className="p-8 text-slate-400">Loading...</p>;
  if (error) return <p className="p-8 text-red-400">Couldn't load workspaces: {error.message}</p>;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-8 sm:px-6">
      <title>Your boards · TaskFlow</title>
      {workspaces.length === 0 && (
        <p className="text-slate-400">No workspaces yet. Create one to start adding boards.</p>
      )}
      {workspaces.map((workspace) => (
        <WorkspaceSection key={workspace.id} workspace={workspace} />
      ))}

      <div className="max-w-sm">
        {showNew ? (
          <form
            className="flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              createWorkspace.mutate(
                { name: name.trim(), slug: slugify(name) },
                {
                  onSuccess: () => {
                    setName('');
                    setShowNew(false);
                  },
                },
              );
            }}
          >
            <label htmlFor="workspace-name" className="label">
              Workspace name
            </label>
            <input
              id="workspace-name"
              autoFocus
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setShowNew(false)}
              className="input"
            />
            <div className="flex gap-2">
              <button type="submit" disabled={createWorkspace.isPending} className="btn-primary">
                Create workspace
              </button>
              <button type="button" onClick={() => setShowNew(false)} className="btn-ghost">
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button onClick={() => setShowNew(true)} className="btn-ghost">
            + New workspace
          </button>
        )}
      </div>
    </div>
  );
}
