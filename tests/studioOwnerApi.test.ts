import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ slots: [] as any[], index: 0, user: null as any, signOut: vi.fn(), expired: vi.fn() }));
vi.mock('react', async (original) => {
  const real = await original<typeof import('react')>();
  const useState = (initial: any) => { const i = h.index++; if (!(i in h.slots)) h.slots[i] = typeof initial === 'function' ? initial() : initial; return [h.slots[i], (v: any) => { h.slots[i] = typeof v === 'function' ? v(h.slots[i]) : v; }]; };
  const useRef = (initial: any) => { const i = h.index++; return h.slots[i] ??= { current: initial }; };
  return { ...real, useState, useRef, useEffect: () => {}, useMemo: (fn: any) => fn(), default: { ...real, useState, useRef, useEffect: () => {}, useMemo: (fn: any) => fn() } };
});
vi.mock('../src/firebase', () => ({
  auth: { get currentUser() { return h.user; }, signOut: h.signOut }, db: {}, onAuthStateChanged: vi.fn(),
  apiFetch: (...args: any[]) => import('../src/lib/apiClient').then((m) => (m.apiFetch as any)(...args)),
  authorizedFetch: vi.fn(), handleFirestoreError: vi.fn(), OperationType: {}, compressBase64Image: vi.fn(),
}));
vi.mock('../src/components/AvatarGenerator', () => ({ default: () => null }));
vi.mock('../src/components/Integrations', () => ({ default: () => null }));
import { useWorkspaceStore, isWorkspaceTokenCurrent } from '../src/store/ownedWorkspaceStore';
import Repurposer from '../src/components/ContentRepurposer';
import Planner from '../src/components/ScenePlanner';
import Retention from '../src/components/RetentionHookLab';
import Templates from '../src/components/ViralTemplatesLibrary';
import Profile from '../src/components/Profile';

function find(node: any, pred: (n: any) => boolean): any {
  if (!node || typeof node !== 'object') return;
  if (pred(node)) return node;
  for (const child of React.Children.toArray(node.props?.children)) { const found = find(child, pred); if (found) return found; }
}
function text(node: any): string { return typeof node === 'string' ? node : React.isValidElement(node) ? React.Children.toArray((node.props as any).children).map(text).join('') : ''; }
function button(tree: any, label: string) { const b = find(tree, n => n.type === 'button' && text(n).includes(label)); expect(b, label).toBeTruthy(); return b; }
function deferred<T>() { let resolve!: (v: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
const response = (status: number) => new Response('{}', { status });
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  h.slots = []; h.index = 0; h.signOut.mockReset(); h.expired.mockReset();
  h.user = { uid: 'A', metadata: {}, getIdToken: vi.fn(async () => 'A-token') };
  fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock); vi.stubGlobal('window', { location: { origin: 'http://localhost' }, dispatchEvent: h.expired });
});

describe('actual inspector request pathways', () => {
  it.each(['repurpose', 'planner', 'retention', 'templates'])('%s does not replay a delayed A 401 as B or apply stale state', async (kind) => {
    const token = useWorkspaceStore.getState().changeAccount('A')!;
    const owner = { uid: 'A', isCurrent: () => isWorkspaceTokenCurrent(useWorkspaceStore.getState(), token) };
    const delayed = deferred<Response>(); const started = deferred<void>();
    fetchMock.mockImplementation(() => { started.resolve(); return delayed.promise; });
    const toast = vi.fn(); const props: any = { owner, currentContent: 'private A', currentScript: 'private A', currentText: 'private A', showToast: toast, brand: { name: 'private A' }, onSelectTemplate: vi.fn() };
    const render = () => { h.index = 0; return kind === 'repurpose' ? Repurposer(props) : kind === 'planner' ? Planner(props) : kind === 'retention' ? Retention(props) : Templates(props); };
    if (kind === 'templates') { const card = find(render(), n => n.props?.onClick && text(n).includes('The Contrarian Thread')); expect(card).toBeTruthy(); card.props.onClick(); }
    const label = kind === 'repurpose' ? 'Repurpose Content' : kind === 'planner' ? 'Segment Script into Visual Beats' : kind === 'retention' ? 'Diagnose & Optimize' : 'Tailor to my Brand with AI';
    const pending = button(render(), label).props.onClick();
    await started.promise;
    useWorkspaceStore.getState().changeAccount('B'); h.user = { uid: 'B', getIdToken: vi.fn(async () => 'B-token') };
    delayed.resolve(response(401)); await pending;
    expect(fetchMock).toHaveBeenCalledTimes(1); expect(h.user.getIdToken).not.toHaveBeenCalled(); expect(h.expired).not.toHaveBeenCalled(); expect(toast).not.toHaveBeenCalled();
  });
  it('suppresses a stale profile revocation after A-B-A', async () => {
    const token = useWorkspaceStore.getState().changeAccount('A')!;
    const owner = { uid: 'A', isCurrent: () => isWorkspaceTokenCurrent(useWorkspaceStore.getState(), token) };
    const delayed = deferred<Response>(); const started = deferred<void>(); fetchMock.mockImplementation(() => { started.resolve(); return delayed.promise; });
    h.index = 0; const tree = Profile({ user: h.user, userData: {}, brand: null, owner } as any);
    const pending = button(tree, 'Revoke sessions on all devices').props.onClick(); await started.promise;
    expect(fetchMock.mock.calls[0][1].credentials).toBe('omit');
    useWorkspaceStore.getState().changeAccount('B'); useWorkspaceStore.getState().changeAccount('A');
    delayed.resolve(response(200)); await pending;
    expect(h.signOut).not.toHaveBeenCalled(); expect(h.expired).not.toHaveBeenCalled();
  });
});

describe('owner boundaries beyond the first 401', () => {
  it.each(['repurpose', 'planner', 'retention', 'templates'])('%s renders a successful response for the current owner', async (kind) => {
    const token = useWorkspaceStore.getState().changeAccount('A')!;
    const owner = { uid: 'A', isCurrent: () => isWorkspaceTokenCurrent(useWorkspaceStore.getState(), token) };
    const values: Record<string, any> = {
      repurpose: { platforms: [{ platform: 'CURRENT RESULT', icon: 'x', color: '#000', ideas: [] }] },
      planner: { video_plan: { working_title: 'current', aspect_ratio: '16:9', wpm_assumed: 150, target_length_seconds_estimate: 120, length_flag: 'under', sections: [{ section_id: '1', section_type: 'hook', section_label: 'CURRENT RESULT', beats: [] }] } },
      retention: { retention_analysis: { retention_score: 80, verdict: 'CURRENT RESULT', summary_critique: 'ok', dropoff_reasons: [], first_5s_heatmap: [], optimized_hooks: [], mid_video_pacing_tips: [] } },
      templates: { tailored_title: 'CURRENT RESULT', tailored_hook: 'hook', tailored_body: 'body' },
    };
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ text: JSON.stringify(values[kind]) }), { status: 200 }));
    const props: any = { owner, currentContent: 'private A', currentScript: 'private A', currentText: 'private A', brand: { name: 'private A' }, showToast: vi.fn(), onSelectTemplate: vi.fn() };
    const render = () => { h.index = 0; return kind === 'repurpose' ? Repurposer(props) : kind === 'planner' ? Planner(props) : kind === 'retention' ? Retention(props) : Templates(props); };
    if (kind === 'templates') find(render(), n => n.props?.onClick && text(n).includes('The Contrarian Thread')).props.onClick();
    const label = kind === 'repurpose' ? 'Repurpose Content' : kind === 'planner' ? 'Segment Script into Visual Beats' : kind === 'retention' ? 'Diagnose & Optimize' : 'Tailor to my Brand with AI';
    await button(render(), label).props.onClick();
    expect(text(render())).toContain('CURRENT RESULT'); expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('suppresses a result whose JSON arrives after an account switch', async () => {
    const token = useWorkspaceStore.getState().changeAccount('A')!;
    const owner = { uid: 'A', isCurrent: () => isWorkspaceTokenCurrent(useWorkspaceStore.getState(), token) };
    const delayed = deferred<any>(); const started = deferred<void>();
    fetchMock.mockResolvedValue({ status: 200, ok: true, json: () => { started.resolve(); return delayed.promise; } });
    const props = { owner, currentContent: 'private A' };
    const render = () => { h.index = 0; return Repurposer(props); };
    const pending = button(render(), 'Repurpose Content').props.onClick(); await started.promise;
    useWorkspaceStore.getState().changeAccount(null); h.user = null;
    delayed.resolve({ text: JSON.stringify({ platforms: [{ platform: 'STALE RESULT', icon: 'x', color: '#000', ideas: [] }] }) });
    await pending; expect(text(render())).not.toContain('STALE RESULT'); expect(h.expired).not.toHaveBeenCalled();
  });
  it.each(['repurpose', 'planner', 'retention', 'templates'])('%s blocks A-B-A while its token is pending', async (kind) => {
    const token = useWorkspaceStore.getState().changeAccount('A')!;
    const owner = { uid: 'A', isCurrent: () => isWorkspaceTokenCurrent(useWorkspaceStore.getState(), token) };
    const delayed = deferred<string>(); const started = deferred<void>();
    h.user.getIdToken = () => { started.resolve(); return delayed.promise; };
    const props: any = { owner, currentContent: 'private A', currentScript: 'private A', currentText: 'private A', brand: { name: 'private A' }, showToast: vi.fn(), onSelectTemplate: vi.fn() };
    const render = () => { h.index = 0; return kind === 'repurpose' ? Repurposer(props) : kind === 'planner' ? Planner(props) : kind === 'retention' ? Retention(props) : Templates(props); };
    if (kind === 'templates') find(render(), n => n.props?.onClick && text(n).includes('The Contrarian Thread')).props.onClick();
    const label = kind === 'repurpose' ? 'Repurpose Content' : kind === 'planner' ? 'Segment Script into Visual Beats' : kind === 'retention' ? 'Diagnose & Optimize' : 'Tailor to my Brand with AI';
    const pending = button(render(), label).props.onClick(); await started.promise;
    useWorkspaceStore.getState().changeAccount('B'); useWorkspaceStore.getState().changeAccount('A');
    delayed.resolve('A-token'); await pending;
    expect(fetchMock).not.toHaveBeenCalled(); expect(h.expired).not.toHaveBeenCalled(); expect(props.showToast).not.toHaveBeenCalled();
  });
  it.each([200, 401])('profile ignores stale %s after switching to B', async (status) => {
    const token = useWorkspaceStore.getState().changeAccount('A')!;
    const owner = { uid: 'A', isCurrent: () => isWorkspaceTokenCurrent(useWorkspaceStore.getState(), token) };
    const delayed = deferred<Response>(); const started = deferred<void>(); fetchMock.mockImplementation(() => { started.resolve(); return delayed.promise; });
    h.index = 0; const tree = Profile({ user: h.user, userData: {}, brand: null, owner } as any);
    const pending = button(tree, 'Revoke sessions on all devices').props.onClick(); await started.promise;
    useWorkspaceStore.getState().changeAccount('B'); h.user = { uid: 'B', getIdToken: vi.fn(async () => 'B-token') };
    delayed.resolve(response(status)); await pending;
    expect(h.signOut).not.toHaveBeenCalled(); expect(h.expired).not.toHaveBeenCalled(); expect(fetchMock).toHaveBeenCalledTimes(1); expect(h.user.getIdToken).not.toHaveBeenCalled();
  });
  it('refuses stale sign-out and null-user actions before dispatch', async () => {
    const token = useWorkspaceStore.getState().changeAccount('A')!;
    const owner = { uid: 'A', isCurrent: () => isWorkspaceTokenCurrent(useWorkspaceStore.getState(), token) };
    h.index = 0; const tree = Profile({ user: h.user, userData: {}, brand: null, owner } as any);
    useWorkspaceStore.getState().changeAccount('B'); h.user = null;
    await button(tree, 'Revoke sessions on all devices').props.onClick();
    expect(fetchMock).not.toHaveBeenCalled(); expect(h.signOut).not.toHaveBeenCalled();
  });
  it('revokes the current owner without starting SDK sign out and reports its limits', async () => {
    const token = useWorkspaceStore.getState().changeAccount('A')!;
    const owner = { uid: 'A', isCurrent: () => isWorkspaceTokenCurrent(useWorkspaceStore.getState(), token) };
    fetchMock.mockResolvedValue(response(200));
    h.index = 0; const tree = Profile({ user: h.user, userData: {}, brand: null, owner } as any);
    await button(tree, 'Revoke sessions on all devices').props.onClick();
    expect(fetchMock).toHaveBeenCalledTimes(1); expect(h.signOut).not.toHaveBeenCalled();
    h.index = 0; const updated = Profile({ user: h.user, userData: {}, brand: null, owner } as any);
    expect(text(updated)).toContain('Refresh tokens revoked');
    expect(text(updated)).toContain('already issued');
    expect(text(updated)).toContain('same second');
    expect(text(updated)).toContain('until expiration');
    expect(button(updated, 'Revoke sessions on all devices').props.disabled).toBe(false);
  });
  it('does not trigger global sign out on a current-owner revocation 401', async () => {
    const token = useWorkspaceStore.getState().changeAccount('A')!;
    const owner = { uid: 'A', isCurrent: () => isWorkspaceTokenCurrent(useWorkspaceStore.getState(), token) };
    fetchMock.mockResolvedValue(response(401));
    h.index = 0; const tree = Profile({ user: h.user, userData: {}, brand: null, owner } as any);
    await button(tree, 'Revoke sessions on all devices').props.onClick();
    expect(fetchMock).toHaveBeenCalledTimes(1); expect(h.expired).not.toHaveBeenCalled();
    expect(h.user.getIdToken).toHaveBeenCalledTimes(1);
    expect(h.signOut).not.toHaveBeenCalled();
  });
  it('only issues one revocation on rapid repeated clicks and re-enables the action', async () => {
    const token = useWorkspaceStore.getState().changeAccount('A')!;
    const owner = { uid: 'A', isCurrent: () => isWorkspaceTokenCurrent(useWorkspaceStore.getState(), token) };
    const delayed = deferred<Response>(); const started = deferred<void>();
    fetchMock.mockImplementation(() => { started.resolve(); return delayed.promise; });
    const render = () => { h.index = 0; return Profile({ user: h.user, userData: {}, brand: null, owner } as any); };
    const click = button(render(), 'Revoke sessions on all devices').props.onClick;
    const first = click(); const second = click(); await started.promise; await second;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(button(render(), 'Revoke sessions on all devices').props.disabled).toBe(true);
    delayed.resolve(response(200)); await first;
    expect(button(render(), 'Revoke sessions on all devices').props.disabled).toBe(false);
  });
  it('does not initiate a sign out that could clear B after a delayed SDK operation', async () => {
    const token = useWorkspaceStore.getState().changeAccount('A')!;
    const owner = { uid: 'A', isCurrent: () => isWorkspaceTokenCurrent(useWorkspaceStore.getState(), token) };
    const delayedSignOut = deferred<void>();
    h.signOut.mockImplementation(async () => { await delayedSignOut.promise; h.user = null; });
    fetchMock.mockResolvedValue(response(200));
    h.index = 0; const tree = Profile({ user: h.user, userData: {}, brand: null, owner } as any);
    const pending = button(tree, 'Revoke sessions on all devices').props.onClick();
    for (let i = 0; i < 20; i++) await Promise.resolve();
    useWorkspaceStore.getState().changeAccount('B'); h.user = { uid: 'B', getIdToken: vi.fn(async () => 'B-token') };
    delayedSignOut.resolve(); await pending;
    expect(h.signOut).not.toHaveBeenCalled(); expect(h.user.uid).toBe('B');
  });
});
