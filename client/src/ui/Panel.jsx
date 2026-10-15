// Side panel: Chat, Up next (shared playlist), Polls, People (host tools), Sync stats.
import { useEffect, useRef, useState } from 'react';
import { Avatar, fmt, reactionColor, byId, Poster } from './common.jsx';
import { parseVideoLink } from '../Player.jsx';

export default function Panel(p) {
  const { tab, setTab, unread } = p;
  const tabs = [
    ['chat', 'Chat'], ['next', 'Queue'], ['moments', 'Moments'], ['polls', 'Polls'], ['people', 'People'], ['stats', 'Sync'],
  ];
  return (
    <aside className="panel glass">
      <div className="drawer-head">
        <span className="serif drawer-title">{tabs.find(([id]) => id === tab)?.[1]}</span>
        <span className="muted small">{p.room.members.filter((m) => m.connected).length} watching</span>
      </div>
      <div className="panel-tabs" role="tablist">
        {tabs.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={`ptab ${tab === id ? 'on' : ''}`} onClick={() => setTab(id)}>
            {label}{id === 'chat' && unread > 0 && tab !== 'chat' ? <span className="badge">{unread}</span> : null}
          </button>
        ))}
      </div>
      <div className="panel-body">
        {tab === 'chat' && <Chat {...p} />}
        {tab === 'next' && <UpNext {...p} />}
        {tab === 'moments' && <Moments {...p} />}
        {tab === 'polls' && <Polls {...p} />}
        {tab === 'people' && <People {...p} />}
        {tab === 'stats' && <Stats {...p} />}
      </div>
    </aside>
  );
}

function Chat({ room, me, onChat }) {
  const [text, setText] = useState('');
  const [spoiler, setSpoiler] = useState(false);
  const [revealed, setRevealed] = useState({});
  const end = useRef(null);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [room.chat.length]);
  const submit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onChat(text, spoiler);
    setText(''); setSpoiler(false);
  };
  return (
    <div className="chat">
      <div className="chat-list">
        {room.chat.map((c) => c.sys ? (
          <div key={c.id} className="chat-sys">{c.text}</div>
        ) : (
          <div key={c.id} className="chat-msg">
            <span className="chat-name" style={{ color: c.color }}>{c.by === me ? 'You' : c.name}</span>{' '}
            {c.spoiler && !revealed[c.id] && c.by !== me ? (
              <button className="spoiler" onClick={() => setRevealed((r) => ({ ...r, [c.id]: true }))}>
                <span className="blur">{c.text.slice(0, 40)}</span> Spoiler · tap to see
              </button>
            ) : <span className="chat-text">{c.text}</span>}
          </div>
        ))}
        <div ref={end} />
      </div>
      <form className="chat-form" onSubmit={submit}>
        <label htmlFor="msg" className="sr">Message</label>
        <input id="msg" className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Message" maxLength={500} autoComplete="off" />
        <button type="button" className={`btn sm ${spoiler ? 'warn' : 'ghost'}`} aria-pressed={spoiler} onClick={() => setSpoiler((s) => !s)} title="Hide this message until people tap it">Spoiler</button>
        <button type="submit" className="btn sm primary">Send</button>
      </form>
    </div>
  );
}

function UpNext({ room, me, isHost, canControl, onLoad, onRemove, onMove, onAddLink, onSetSrc, openDiscover }) {
  const [link, setLink] = useState('');
  const [srcFor, setSrcFor] = useState({});
  const parsed = parseVideoLink(link);
  const current = room.playback.item?.id;
  return (
    <div className="list">
      <div className="row">
        <input className="input" value={link} onChange={(e) => setLink(e.target.value)} placeholder="Paste YouTube or .mp4 link" aria-label="Video link" />
        <button className="btn sm" disabled={!parsed} onClick={() => { onAddLink(parsed, parsed.type === 'youtube' ? 'YouTube video' : 'Video'); setLink(''); }}>Add</button>
      </div>
      <button className="btn ghost" onClick={openDiscover}>Browse movies</button>
      {room.playlist.length === 0 && <div className="empty">Nothing queued yet. Add a link or pick from Browse.</div>}
      {room.playlist.map((it, i) => (
        <div key={it.id} className={`pl-item ${it.id === current ? 'now' : ''}`}>
          <div className="pl-main">
            <div className="pl-title">{it.id === current && <span className="now-dot" aria-hidden="true" />}{it.title}</div>
            <div className="muted small">{it.src ? (it.src.type === 'youtube' ? 'YouTube' : 'Video file') : 'Needs a link to play'}{it.genres?.length ? ` · ${it.genres.slice(0, 2).join(', ')}` : ''}</div>
            {!it.src && (
              <div className="row">
                <input className="input sm" placeholder="YouTube or .mp4 link" value={srcFor[it.id] || ''} onChange={(e) => setSrcFor({ ...srcFor, [it.id]: e.target.value })} aria-label={`Link for ${it.title}`} />
                <button className="btn sm" disabled={!parseVideoLink(srcFor[it.id])} onClick={() => onSetSrc(it.id, parseVideoLink(srcFor[it.id]))}>Set</button>
              </div>
            )}
          </div>
          <div className="pl-actions">
            {canControl && it.src && it.id !== current && <button className="btn sm" onClick={() => onLoad(it.id)}>Play</button>}
            {isHost && <button className="icon-btn sm" aria-label="Move up" disabled={i === 0} onClick={() => onMove(it.id, 'up')}>↑</button>}
            {(isHost || it.addedBy === me) && it.id !== current && <button className="icon-btn sm" aria-label="Remove" onClick={() => onRemove(it.id)}>×</button>}
          </div>
        </div>
      ))}
    </div>
  );
}

function Polls({ room, me, isHost, onPollCreate, onPollVote, onPollClose }) {
  const [q, setQ] = useState('');
  const [opts, setOpts] = useState(['', '']);
  const polls = [...room.polls].reverse();
  return (
    <div className="list">
      <form className="poll-form" onSubmit={(e) => { e.preventDefault(); onPollCreate(q, opts); setQ(''); setOpts(['', '']); }}>
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask the room something" aria-label="Poll question" />
        {opts.map((o, i) => (
          <input key={i} className="input sm" value={o} onChange={(e) => setOpts(opts.map((x, j) => j === i ? e.target.value : x))} placeholder={`Option ${i + 1}`} aria-label={`Option ${i + 1}`} />
        ))}
        <div className="row">
          {opts.length < 4 && <button type="button" className="btn sm ghost" onClick={() => setOpts([...opts, ''])}>Add option</button>}
          <button type="submit" className="btn sm primary" disabled={!q.trim() || opts.filter((o) => o.trim()).length < 2}>Start poll</button>
        </div>
      </form>
      {polls.map((poll) => {
        const total = Object.keys(poll.votes).length;
        return (
          <div key={poll.id} className="poll-box">
            <div className="poll-q">{poll.question}{!poll.open && <span className="muted small"> · closed</span>}</div>
            {poll.options.map((o) => {
              const n = Object.values(poll.votes).filter((v) => v === o.id).length;
              return (
                <button key={o.id} className={`poll-opt ${poll.votes[me] === o.id ? 'mine' : ''}`} disabled={!poll.open} onClick={() => onPollVote(poll.id, o.id)}>
                  <span className="poll-bar" style={{ width: total ? `${(n / total) * 100}%` : 0 }} />
                  <span className="poll-text">{o.text}</span><span className="poll-n">{n}</span>
                </button>
              );
            })}
            {poll.open && (isHost || poll.by === me) && <button className="btn sm ghost" onClick={() => onPollClose(poll.id)}>Close poll</button>}
          </div>
        );
      })}
    </div>
  );
}

function People({ room, me, isHost, onTransfer, onSettings }) {
  return (
    <div className="list">
      {room.members.map((m) => (
        <div key={m.id} className="person">
          <Avatar member={m} size={34} dim={!m.connected} />
          <div className="pl-main">
            <div className="pl-title">{m.id === me ? `${m.name} (you)` : m.name}</div>
            <div className="muted small">{m.id === room.hostId ? 'Host' : m.connected ? 'Watching' : 'Reconnecting… seat held 30 s'}</div>
          </div>
          {isHost && m.id !== me && m.connected && <button className="btn sm ghost" onClick={() => onTransfer(m.id)}>Make host</button>}
        </div>
      ))}
      {isHost && (
        <div className="settings">
          <div className="field-label">Host settings</div>
          <label className="toggle">
            <input type="checkbox" checked={room.controlMode === 'everyone'} onChange={(e) => onSettings({ controlMode: e.target.checked ? 'everyone' : 'host' })} />
            <span>Everyone can play, pause and seek</span>
          </label>
          <label className="toggle">
            <input type="checkbox" checked={room.teasing} onChange={(e) => onSettings({ teasing: e.target.checked })} />
            <span>Allow song dedications</span>
          </label>
        </div>
      )}
      {!isHost && <div className="muted small">{room.controlMode === 'host' ? 'Only the host controls playback.' : 'Everyone can control playback.'}</div>}
    </div>
  );
}

function Stats({ conn, sync, roomStats, onExport }) {
  const s = roomStats?.summary || {};
  const ms = (v) => (v == null ? '–' : `${Math.round(v)} ms`);
  return (
    <div className="list stats">
      <div className="stat-grid">
        <div className="stat"><div className="muted small">Round trip</div><div className="stat-v">{ms(conn?.rtt)}</div></div>
        <div className="stat"><div className="muted small">Clock offset</div><div className="stat-v">{ms(conn?.offset)}</div></div>
        <div className="stat"><div className="muted small">My drift now</div><div className="stat-v">{sync.drift == null ? '–' : `${Math.round(sync.drift * 1000)} ms`}</div></div>
        <div className="stat"><div className="muted small">Correction</div><div className="stat-v sm">{sync.action}</div></div>
      </div>
      <div className="field-label">Whole room</div>
      <div className="stat-grid">
        <div className="stat"><div className="muted small">Control latency p50</div><div className="stat-v">{ms(s.latencyP50)}</div></div>
        <div className="stat"><div className="muted small">Control latency p95</div><div className="stat-v">{ms(s.latencyP95)}</div><div className="muted tiny">target 250 ms</div></div>
        <div className="stat"><div className="muted small">Drift p50</div><div className="stat-v">{ms(s.driftP50)}</div></div>
        <div className="stat"><div className="muted small">Drift p95</div><div className="stat-v">{ms(s.driftP95)}</div><div className="muted tiny">target 500 ms</div></div>
      </div>
      <table className="stat-table">
        <thead><tr><th>Person</th><th>RTT</th><th>p95 lat</th><th>Drift</th></tr></thead>
        <tbody>
          {(roomStats?.members || []).map((m) => (
            <tr key={m.id}><td>{m.name}</td><td>{ms(m.rtt)}</td><td>{ms(m.p95)}</td><td>{m.drift == null ? '–' : `${Math.round(Math.abs(m.drift))} ms`}</td></tr>
          ))}
        </tbody>
      </table>
      <button className="btn ghost" onClick={onExport}>Download measurements (JSON)</button>
      <div className="muted tiny">Latency = time from one person pressing play, pause or seek to another device receiving it, using synced clocks. Drift = how far each player is from where the room says it should be.</div>
    </div>
  );
}

// Best moments: the stretches of the film the room reacted to most, plus saved moments.
function Moments({ room, me, canControl, onReplay, isHost, onNeverRemove }) {
  const item = room.playback.item;
  const rs = room.reactions.filter((r) => item && r.itemId === item.id);
  const buckets = {};
  for (const r of rs) {
    const b = Math.floor(r.pos / 10);
    (buckets[b] ||= { start: b * 10, kinds: {}, people: new Set(), saves: 0, n: 0 });
    buckets[b].kinds[r.kind] = (buckets[b].kinds[r.kind] || 0) + 1;
    buckets[b].people.add(r.by);
    buckets[b].n++;
    if (r.kind === 'save') buckets[b].saves++;
  }
  const top = Object.values(buckets).map((b) => ({ ...b, score: b.people.size * 2 + b.n + b.saves * 2 }))
    .sort((a, b) => b.score - a.score).slice(0, 6);
  const nameOf = (id) => (id === me ? 'You' : room.members.find((m) => m.id === id)?.name || 'Someone');
  return (
    <div className="list">
      {!item && <div className="empty">Moments appear once something is playing.</div>}
      {item && top.length === 0 && <div className="empty">No moments yet. React during the film or tap Save moment, and the best scenes collect here.</div>}
      {top.map((m, i) => (
        <div key={m.start} className="moment">
          <div className="moment-rank serif">#{i + 1}</div>
          <div className="pl-main">
            <div className="pl-title">{fmt(m.start)} – {fmt(m.start + 10)}</div>
            <div className="row" style={{ gap: 4, flexWrap: 'wrap' }}>
              {Object.entries(m.kinds).map(([k, n]) => <span key={k} className="kind-chip"><span className="burst-dot" style={{ background: reactionColor[k], width: 7, height: 7 }} />{k} {n}</span>)}
            </div>
            <div className="muted small">{m.people.size} {m.people.size === 1 ? 'person' : 'people'} reacted{m.saves ? ` · saved by ${[...new Set(rs.filter((r) => r.kind === 'save' && Math.floor(r.pos / 10) * 10 === m.start).map((r) => nameOf(r.by)))].join(', ')}` : ''}</div>
          </div>
          {canControl && <button className="btn sm" onClick={() => onReplay(Math.max(0, m.start - 3))}>Replay together</button>}
        </div>
      ))}
      {room.never?.length > 0 && (
        <>
          <div className="field-label">Never Again wall</div>
          <div className="never-mini">
            {room.never.map((id) => (
              <div key={id} className="never-item sm" title={byId[id]?.title || id}>
                {byId[id] ? <Poster movie={byId[id]} small /> : <div className="poster poster-sm title-poster"><div className="poster-title">{id}</div></div>}
                <svg className="cross" viewBox="0 0 64 94" preserveAspectRatio="none" aria-hidden="true"><path d="M8 10L56 84M56 10L8 84" /></svg>
                {isHost && <button className="never-x" aria-label={`Forgive ${byId[id]?.title || id}`} onClick={() => onNeverRemove(id)}>Forgive</button>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
