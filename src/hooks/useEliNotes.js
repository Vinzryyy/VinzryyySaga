import { useEffect, useState } from 'react';
import { publishedNotes } from '../lib/eliNotes';

// One fetch per page load, shared by /eli-notes and Album Momen.
let notesPromise = null;
export const loadEliNotes = () => {
  if (!notesPromise) {
    notesPromise = fetch('/data/eli-notes.json')
      .then((r) => (r.ok ? r.json() : null))
      .then(publishedNotes)
      .catch(() => []);
  }
  return notesPromise;
};

/** → { notes, loading } with only published notes, newest first. */
export const useEliNotes = () => {
  const [state, setState] = useState({ notes: [], loading: true });
  useEffect(() => {
    let alive = true;
    loadEliNotes().then((notes) => alive && setState({ notes, loading: false }));
    return () => { alive = false; };
  }, []);
  return state;
};
