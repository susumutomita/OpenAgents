import {
  type PlayLog,
  type StoredAgentBirth,
  createAgentBirthDraft,
} from '@openagents/shared/browser';
import { useState } from 'react';
import { AgentDashboard } from './components/AgentDashboard';
import { BirthArcade } from './components/BirthArcade';
import type { Archetype } from './game/runtime';

export function App() {
  const [playerName, setPlayerName] = useState('Kotetsu');
  const [birth, setBirth] = useState<StoredAgentBirth | null>(null);
  const [archetype, setArchetype] = useState<Archetype | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleComplete(playLog: PlayLog, derivedArchetype: Archetype) {
    try {
      setSubmitting(true);
      setError('');
      const draft = await createAgentBirthDraft(
        playerName.trim() || 'Pilot',
        playLog
      );
      const stored: StoredAgentBirth = {
        ...draft,
        createdAt: new Date().toISOString(),
      };
      setArchetype(derivedArchetype);
      setBirth(stored);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : 'Forge failed.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <span className="hero-kicker">
            Gr@diusWeb3 · Vercel-ready · pure web
          </span>
          <h1>
            Web3、<span className="hero-y">Gradius</span>で<em>覚える</em>。
          </h1>
          <p>
            ウォレット作成・トランザクション署名・ポートフォリオ設計 — Web3
            の入口は壁だらけ。 だから 60
            秒のシューティングに翻訳しました。プレイし終えた頃には、
            あなたの判断がそのまま on-chain Agent のポリシーになっています。
          </p>
          <ul className="hero-bullets">
            <li>
              <strong>1 コイン · 60 秒</strong> でエージェントが完成
            </li>
            <li>
              <strong>3 つの archetype</strong>: Conservative / Balanced /
              Aggressive
            </li>
            <li>
              <strong>backend なし</strong>のピュア Web3 アプリ (Vercel
              静的配信)
            </li>
          </ul>
        </div>
        <div className="hero-card">
          <label htmlFor="player-name">PILOT NAME</label>
          <input
            id="player-name"
            value={playerName}
            onChange={(event) => setPlayerName(event.target.value)}
            placeholder="Kotetsu"
            maxLength={16}
          />
          <p>
            <kbd>←→↑↓ / WASD</kbd> 移動 · <kbd>SPACE</kbd> ショット ·{' '}
            <kbd>Z</kbd> パワーアップ commit
          </p>
          <p className="muted">
            Konami's Gradius (1985) is the inspiration. Gr@diusWeb3 ships
            original sprites and code.
          </p>
          {error ? <p className="error-banner">{error}</p> : null}
          {submitting ? (
            <p className="status-banner">エージェントを鋳造中…</p>
          ) : null}
        </div>
      </section>

      <BirthArcade
        disabled={submitting}
        playerName={playerName}
        onComplete={handleComplete}
      />

      {birth && archetype ? (
        <AgentDashboard birth={birth} archetype={archetype} />
      ) : null}
    </main>
  );
}
