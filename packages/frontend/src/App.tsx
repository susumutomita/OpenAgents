import type { PlayLog, StoredAgentBirth } from '@openagents/shared/browser';
import { useState } from 'react';
import { forgeAgent } from './api';
import { AgentDashboard } from './components/AgentDashboard';
import { BirthArcade } from './components/BirthArcade';

export function App() {
  const [playerName, setPlayerName] = useState('Kotetsu');
  const [birth, setBirth] = useState<StoredAgentBirth | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleComplete(playLog: PlayLog) {
    try {
      setSubmitting(true);
      setError('');
      const createdBirth = await forgeAgent(playerName, playLog);
      setBirth(createdBirth);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : 'Birth failed.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <span className="hero-kicker">Gr@diusWeb3</span>
          <h1>Forge an onchain agent by surviving a Moai stage.</h1>
          <p>
            Shoot to choose, pass to reject, commit on the Gradius bar to lock a
            capability. In 45 seconds, the run becomes an ENS identity, policy
            profile, and AXL-ready runtime draft.
          </p>
        </div>
        <div className="hero-card">
          <label htmlFor="player-name">Pilot Name</label>
          <input
            id="player-name"
            value={playerName}
            onChange={(event) => setPlayerName(event.target.value)}
            placeholder="Kotetsu"
          />
          <p>
            Keyboard: arrows or WASD to move, Space to fire, Enter to commit the
            highlighted slot.
          </p>
          {error ? <p className="error-banner">{error}</p> : null}
          {submitting ? (
            <p className="status-banner">Forging agent from play log...</p>
          ) : null}
        </div>
      </section>

      <BirthArcade
        disabled={submitting}
        playerName={playerName}
        onComplete={handleComplete}
      />

      {birth ? <AgentDashboard birth={birth} /> : null}
    </main>
  );
}
