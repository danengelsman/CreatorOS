import React, { useEffect, useRef, useState } from 'react';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { db, serverTimestamp } from '../firebase';
import { generateContentIdeas } from '../services/gemini';

type Idea = { title: string; hook: string; description: string };

export default function FirstCreationMission({ brand, user, onOpenDraft }: {
  brand: any;
  user: any;
  onOpenDraft: (project: any) => void;
}) {
  const [ideas, setIdeas] = useState<Idea[]>(() => brand?.content_ideas || []);
  const [selected, setSelected] = useState(0);
  const [customIdea, setCustomIdea] = useState('');
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const requestedFor = useRef<string | null>(null);

  useEffect(() => {
    if (brand?.content_ideas?.length) {
      setIdeas(brand.content_ideas);
      setSelected(0);
    }
  }, [brand?.content_ideas]);

  const prepareIdeas = async () => {
    if (!user?.uid || !brand || loading) return;
    setLoading(true);
    setError('');
    try {
      const generated = (await generateContentIdeas(brand)).filter((idea: Idea) => idea?.title && idea?.description);
      if (!generated.length) throw new Error('No ideas were returned.');
      await updateDoc(doc(db, 'projects', `brand_${user.uid}`), {
        'data.content_ideas': generated,
        updatedAt: serverTimestamp()
      });
      setIdeas(generated);
      setSelected(0);
    } catch (err) {
      console.error('Could not prepare first content ideas:', err);
      setError('Ideas could not load. Try again, or start with your own topic below.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.uid || !brand || brand.content_ideas?.length || requestedFor.current === user.uid) return;
    requestedFor.current = user.uid;
    void prepareIdeas();
  }, [user?.uid, brand]);

  const startDraft = async () => {
    const ownTopic = customIdea.trim();
    const idea = ownTopic
      ? { title: ownTopic, hook: '', description: `What would help your audience understand ${ownTopic}?` }
      : ideas[selected];
    if (!user?.uid || !idea || starting) return;
    setStarting(true);
    setError('');
    const body = idea.hook ? `Hook: ${idea.hook}\n\nConcept: ${idea.description}` : `Concept: ${idea.description}`;
    try {
      const project = {
        userId: user.uid,
        name: idea.title.slice(0, 99),
        type: 'content',
        status: 'Draft',
        journeyStep: 'first_content',
        data: { title: idea.title, body, platform: 'youtube', score: 0 },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      const ref = await addDoc(collection(db, 'projects'), project);
      onOpenDraft({ ...project, id: ref.id });
    } catch (err) {
      console.error('Could not create first draft:', err);
      setError('Your draft could not be saved. Please try again.');
    } finally {
      setStarting(false);
    }
  };

  return (
    <section aria-label="Your first creator mission" className="mb-6 rounded-[28px] border border-[var(--accent)]/30 bg-[var(--bg-secondary)] p-6 md:p-8">
      <p className="text-xs font-bold uppercase tracking-widest text-[var(--accent)]">Your first mission</p>
      <h2 className="mt-2 text-2xl font-bold">Make one piece for your audience</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--label-secondary)]">
        Your brand has a direction. Now let's turn it into a first draft you can shape in your own voice. Pick a starting idea; you can change every word in Studio.
      </p>

      {loading && <p className="mt-5 text-sm" role="status">Preparing ideas from your brand...</p>}
      {!loading && ideas.length > 0 && (
        <div className="mt-5 grid gap-3 md:grid-cols-3" role="group" aria-label="Choose a starting idea">
          {ideas.slice(0, 3).map((idea, index) => (
            <button key={`${idea.title}-${index}`} type="button" aria-pressed={!customIdea && selected === index}
              onClick={() => { setSelected(index); setCustomIdea(''); }}
              className={`rounded-2xl border p-4 text-left transition-colors ${!customIdea && selected === index ? 'border-[var(--accent)] bg-[var(--accent)]/10' : 'border-[var(--separator)] hover:border-[var(--accent)]/50'}`}>
              <span className="block text-xs font-semibold text-[var(--accent)]">{index === 0 ? 'Recommended' : 'Another option'}</span>
              <span className="mt-2 block font-semibold">{idea.title}</span>
              <span className="mt-2 block text-sm text-[var(--label-secondary)]">{idea.description}</span>
            </button>
          ))}
        </div>
      )}

      <label className="mt-5 block text-sm font-medium" htmlFor="first-idea">Or use your own topic</label>
      <input id="first-idea" value={customIdea} onChange={event => setCustomIdea(event.target.value)}
        placeholder="Something I want to help people with..."
        className="mt-2 w-full max-w-lg rounded-xl border border-[var(--separator)] bg-[var(--bg-primary)] px-4 py-3 text-[var(--label-primary)]" />
      {error && <p className="mt-3 text-sm text-[var(--system-red)]" role="alert">{error}</p>}
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button type="button" onClick={startDraft} disabled={starting || (!customIdea.trim() && !ideas.length)}
          className="ios-button ios-button-filled px-5 disabled:opacity-50">
          {starting ? 'Saving your draft...' : 'Start this draft'}
        </button>
        <button type="button" onClick={() => void prepareIdeas()} disabled={loading} className="text-sm font-semibold text-[var(--accent)] disabled:opacity-50">
          Suggest different ideas
        </button>
      </div>
    </section>
  );
}
