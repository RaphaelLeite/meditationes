import React, { useState, useEffect } from 'react';
import { Sun, Moon, Scroll, Target, Feather, Check, Plus, X, Flame, Scale, Shield, Leaf, TrendingUp, Calendar, AlertCircle, Download, Upload, Settings, Lock } from 'lucide-react';

const MEDITATIONS = [
  { text: "You have power over your mind — not outside events. Realize this, and you will find strength.", book: "Book VI" },
  { text: "Waste no more time arguing what a good man should be. Be one.", book: "Book X" },
  { text: "The happiness of your life depends upon the quality of your thoughts.", book: "Book V" },
  { text: "If it is not right, do not do it; if it is not true, do not say it.", book: "Book XII" },
  { text: "Confine yourself to the present.", book: "Book VII" },
  { text: "The impediment to action advances action. What stands in the way becomes the way.", book: "Book V" },
  { text: "Begin the morning by saying to thyself, I shall meet with the busybody, the ungrateful, arrogant, deceitful, envious, unsocial.", book: "Book II" },
  { text: "Do every act of your life as though it were the very last act of your life.", book: "Book II" },
  { text: "Look well into thyself; there is a source of strength which will always spring up if thou wilt always look.", book: "Book VII" },
  { text: "Accept the things to which fate binds you, and love the people with whom fate brings you together.", book: "Book VII" },
  { text: "You have been formed of three parts — body, breath, and mind. Of these, only the mind is truly yours.", book: "Book XII" },
  { text: "Dwell on the beauty of life. Watch the stars, and see yourself running with them.", book: "Book VII" },
];

const VIRTUES = [
  { id: 'sapientia', name: 'Sapientia', english: 'Wisdom', icon: Scroll, description: 'Sound judgment; seeing things as they are.' },
  { id: 'iustitia', name: 'Iustitia', english: 'Justice', icon: Scale, description: 'Fairness, kindness, duty to others.' },
  { id: 'fortitudo', name: 'Fortitudo', english: 'Courage', icon: Shield, description: 'Facing what must be faced.' },
  { id: 'temperantia', name: 'Temperantia', english: 'Temperance', icon: Leaf, description: 'Moderation, self-discipline.' },
];

const TRACKER_TYPES = [
  { id: 'habit', label: 'Habit', icon: Flame, desc: 'Daily yes/no — build a streak' },
  { id: 'avoidance', label: 'Avoidance', icon: AlertCircle, desc: 'Break a bad habit — count days since' },
  { id: 'target', label: 'Target', icon: Target, desc: 'Reach a number by a date' },
  { id: 'average', label: 'Average', icon: TrendingUp, desc: 'Maintain a daily average' },
  { id: 'project', label: 'Project', icon: Calendar, desc: 'Complete a percentage' },
];

const todayKey = () => new Date().toISOString().split('T')[0];
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);

// --- Cloud storage (Firebase) ---
import { cloudStorage } from './firebase.js';

export default function StoicSystem() {
  const [view, setView] = useState('today');
  const [loading, setLoading] = useState(true);
  const [meditation, setMeditation] = useState(MEDITATIONS[0]);
  const [morningEntry, setMorningEntry] = useState({ intention: '', obstacle: '', gratitude: '' });
  const [eveningEntry, setEveningEntry] = useState({ didWell: '', didPoorly: '', toImprove: '' });
  const [virtueLog, setVirtueLog] = useState({});
  const [trackers, setTrackers] = useState([]);
  const [journalHistory, setJournalHistory] = useState({});

  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState('habit');
  const [formName, setFormName] = useState('');
  const [formVirtue, setFormVirtue] = useState('sapientia');
  const [formTargetValue, setFormTargetValue] = useState('');
  const [formUnit, setFormUnit] = useState('');
  const [formDeadline, setFormDeadline] = useState('');
  const [formStartValue, setFormStartValue] = useState('0');
  const [formAvgGoal, setFormAvgGoal] = useState('');
  const [formAvgDirection, setFormAvgDirection] = useState('at_least');
  const [logInputs, setLogInputs] = useState({});
  const [sealedDays, setSealedDays] = useState({});
  const [confirmSeal, setConfirmSeal] = useState(false);

  useEffect(() => {
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    setMeditation(MEDITATIONS[dayOfYear % MEDITATIONS.length]);

    async function loadAll() {
      try {
        const today = todayKey();
        const m = await cloudStorage.get(`morning:${today}`);
        if (m) setMorningEntry(m);
        const e = await cloudStorage.get(`evening:${today}`);
        if (e) setEveningEntry(e);
        const v = await cloudStorage.get('virtues:log');
        if (v) setVirtueLog(v);
        const t = await cloudStorage.get('trackers:list');
        if (t) setTrackers(t);
        const s = await cloudStorage.get('sealed:days');
        if (s) setSealedDays(s);

        const hist = {};
        const morningKeys = await cloudStorage.listKeys('morning:');
        for (const k of morningKeys.slice(-14)) {
          const entry = await cloudStorage.get(k);
          if (entry) hist[k.replace('morning:', '')] = { morning: entry };
        }
        const eveningKeys = await cloudStorage.listKeys('evening:');
        for (const k of eveningKeys.slice(-14)) {
          const entry = await cloudStorage.get(k);
          const date = k.replace('evening:', '');
          if (entry) hist[date] = { ...(hist[date] || {}), evening: entry };
        }
        setJournalHistory(hist);
      } catch (err) { console.error('Load error:', err); }
      finally { setLoading(false); }
    }
    loadAll();
  }, []);

  const saveMorning = async () => {
    await cloudStorage.set(`morning:${todayKey()}`, morningEntry);
    setJournalHistory(prev => ({ ...prev, [todayKey()]: { ...(prev[todayKey()] || {}), morning: morningEntry } }));
  };
  const saveEvening = async () => {
    await cloudStorage.set(`evening:${todayKey()}`, eveningEntry);
    setJournalHistory(prev => ({ ...prev, [todayKey()]: { ...(prev[todayKey()] || {}), evening: eveningEntry } }));
  };
  const toggleVirtue = async (virtueId) => {
    const today = todayKey();
    const newLog = { ...virtueLog, [today]: { ...(virtueLog[today] || {}), [virtueId]: !(virtueLog[today]?.[virtueId]) } };
    setVirtueLog(newLog);
    await cloudStorage.set('virtues:log', newLog);
  };
  const saveTrackers = async (next) => {
    setTrackers(next);
    await cloudStorage.set('trackers:list', next);
  };

  const isTodaySealed = sealedDays[todayKey()];

  const sealDay = async () => {
    if (!confirmSeal) { setConfirmSeal(true); return; }
    // Save any pending entries first
    await cloudStorage.set(`morning:${todayKey()}`, morningEntry);
    await cloudStorage.set(`evening:${todayKey()}`, eveningEntry);
    await cloudStorage.set('virtues:log', virtueLog);
    const newSealed = { ...sealedDays, [todayKey()]: new Date().toISOString() };
    setSealedDays(newSealed);
    await cloudStorage.set('sealed:days', newSealed);
    setConfirmSeal(false);
  };

  const resetForm = () => {
    setFormName(''); setFormTargetValue(''); setFormUnit(''); setFormDeadline('');
    setFormStartValue('0'); setFormAvgGoal(''); setFormAvgDirection('at_least');
    setShowForm(false);
  };
  const createTracker = async () => {
    if (!formName.trim()) return;
    const base = { id: Date.now(), name: formName.trim(), type: formType, virtue: formVirtue, created: todayKey(), log: {} };
    let tracker;
    if (formType === 'habit') tracker = { ...base };
    else if (formType === 'avoidance') tracker = { ...base, lastOccurrence: null };
    else if (formType === 'target') {
      if (!formTargetValue || !formDeadline) return;
      tracker = { ...base, targetValue: parseFloat(formTargetValue), startValue: parseFloat(formStartValue || '0'), currentValue: parseFloat(formStartValue || '0'), unit: formUnit.trim(), deadline: formDeadline };
    } else if (formType === 'average') {
      if (!formAvgGoal) return;
      tracker = { ...base, avgGoal: parseFloat(formAvgGoal), direction: formAvgDirection, unit: formUnit.trim() };
    } else if (formType === 'project') tracker = { ...base, progress: 0, deadline: formDeadline || null };
    await saveTrackers([...trackers, tracker]);
    resetForm();
  };
  const deleteTracker = async (id) => await saveTrackers(trackers.filter(t => t.id !== id));

  const toggleHabitToday = async (id) => {
    const today = todayKey();
    await saveTrackers(trackers.map(t => t.id === id ? { ...t, log: { ...t.log, [today]: !t.log[today] } } : t));
  };
  const markAvoidanceBreak = async (id) => await saveTrackers(trackers.map(t => t.id === id ? { ...t, lastOccurrence: todayKey() } : t));
  const logAvoidanceStart = async (id) => await saveTrackers(trackers.map(t => t.id === id && !t.lastOccurrence ? { ...t, lastOccurrence: todayKey() } : t));
  const logTargetValue = async (id, value) => await saveTrackers(trackers.map(t => t.id === id ? { ...t, currentValue: parseFloat(value) || 0 } : t));
  const logAverageValue = async (id, value) => {
    const val = parseFloat(value);
    if (isNaN(val)) return;
    const today = todayKey();
    await saveTrackers(trackers.map(t => t.id === id ? { ...t, log: { ...t.log, [today]: val } } : t));
    setLogInputs(prev => ({ ...prev, [id]: '' }));
  };
  const updateProjectProgress = async (id, delta) => {
    await saveTrackers(trackers.map(t => t.id === id ? { ...t, progress: Math.max(0, Math.min(100, (t.progress || 0) + delta)) } : t));
  };

  const habitStreak = (tracker) => {
    let streak = 0; const d = new Date();
    while (true) {
      const k = d.toISOString().split('T')[0];
      if (tracker.log?.[k]) { streak++; d.setDate(d.getDate() - 1); } else break;
    }
    return streak;
  };
  const virtueStreak = (virtueId) => {
    let streak = 0; const d = new Date();
    while (true) {
      const k = d.toISOString().split('T')[0];
      if (virtueLog[k]?.[virtueId]) { streak++; d.setDate(d.getDate() - 1); } else break;
    }
    return streak;
  };
  const daysSinceAvoidance = (tracker) => tracker.lastOccurrence ? daysBetween(tracker.lastOccurrence, todayKey()) : null;
  const averageStats = (tracker, days = 7) => {
    const values = []; const d = new Date();
    for (let i = 0; i < days; i++) {
      const k = d.toISOString().split('T')[0];
      if (tracker.log?.[k] !== undefined) values.push(tracker.log[k]);
      d.setDate(d.getDate() - 1);
    }
    if (values.length === 0) return { avg: 0, count: 0 };
    return { avg: values.reduce((a, b) => a + b, 0) / values.length, count: values.length };
  };

  const todayVirtues = virtueLog[todayKey()] || {};
  const todayVal = (t) => t.log?.[todayKey()];

  // --- Export: gather ALL cloud data into one JSON file and download it ---
  const exportData = async () => {
    const data = await cloudStorage.getAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meditationes-backup-${todayKey()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // --- Import: read a JSON file and write every key to cloud ---
  const [importStatus, setImportStatus] = useState(null);
  const importData = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (typeof data !== 'object' || data === null) throw new Error('Invalid file');
        const keyCount = Object.keys(data).length;
        await cloudStorage.setAll(data);
        setImportStatus(`Restored ${keyCount} items. Reloading...`);
        setTimeout(() => window.location.reload(), 1500);
      } catch (err) {
        setImportStatus('Error: file is not a valid Meditationes backup.');
        setTimeout(() => setImportStatus(null), 4000);
      }
    };
    reader.readAsText(file);
  };

  // --- Clear all data ---
  const [confirmClear, setConfirmClear] = useState(false);
  const clearAllData = async () => {
    if (!confirmClear) { setConfirmClear(true); return; }
    await cloudStorage.clearAll();
    setConfirmClear(false);
    window.location.reload();
  };

  if (loading) return <div style={styles.loadingScreen}><div style={styles.loadingText}>Memento...</div></div>;

  return (
    <div style={styles.app}>
      <style>{globalStyles}</style>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.brand}>
            <div style={styles.brandMark}>M·A</div>
            <div>
              <div style={styles.brandTitle}>Meditationes</div>
              <div style={styles.brandSub}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
            </div>
          </div>
          <nav style={styles.nav}>
            {[{ id: 'today', label: 'Hodie', icon: Sun }, { id: 'virtues', label: 'Virtutes', icon: Flame }, { id: 'opus', label: 'Opus', icon: Target }, { id: 'scroll', label: 'Scroll', icon: Scroll }, { id: 'settings', label: 'Cura', icon: Settings }].map(item => (
              <button key={item.id} onClick={() => setView(item.id)}
                style={{ ...styles.navBtn, ...(view === item.id ? styles.navBtnActive : {}) }}>
                <item.icon size={14} strokeWidth={1.5} /><span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      <div style={styles.meditationBanner}>
        <Feather size={16} style={{ color: '#8a7a60', flexShrink: 0, marginTop: 4 }} strokeWidth={1.2} />
        <div>
          <div style={styles.meditationText}>"{meditation.text}"</div>
          <div style={styles.meditationSource}>— Marcus Aurelius, {meditation.book}</div>
        </div>
      </div>

      <main style={styles.main}>
        {view === 'today' && (
          <div style={styles.grid}>
            {isTodaySealed && (
              <div style={{ ...styles.sealedBanner, gridColumn: '1 / -1' }}>
                <Lock size={16} strokeWidth={1.5} />
                <div>
                  <div style={styles.sealedTitle}>This day is sealed.</div>
                  <div style={styles.sealedSub}>Committed at {new Date(sealedDays[todayKey()]).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}. What is written remains.</div>
                </div>
              </div>
            )}

            <section style={styles.card}>
              <div style={styles.cardHeader}>
                <Sun size={18} strokeWidth={1.3} style={{ color: '#c4a060' }} />
                <h2 style={styles.cardTitle}>Matutinus</h2>
                <span style={styles.cardSubtitle}>Morning intention</span>
              </div>
              <label style={styles.label}>Today I resolve to:</label>
              <textarea style={{ ...styles.textarea, ...(isTodaySealed ? styles.sealedField : {}) }} value={morningEntry.intention}
                onChange={e => !isTodaySealed && setMorningEntry({ ...morningEntry, intention: e.target.value })}
                onBlur={!isTodaySealed ? saveMorning : undefined} placeholder="One clear intention..." rows={2} readOnly={isTodaySealed} />
              <label style={styles.label}>An obstacle I may face:</label>
              <textarea style={{ ...styles.textarea, ...(isTodaySealed ? styles.sealedField : {}) }} value={morningEntry.obstacle}
                onChange={e => !isTodaySealed && setMorningEntry({ ...morningEntry, obstacle: e.target.value })}
                onBlur={!isTodaySealed ? saveMorning : undefined} placeholder="What may test me today?" rows={2} readOnly={isTodaySealed} />
              <label style={styles.label}>For this I am grateful:</label>
              <textarea style={{ ...styles.textarea, ...(isTodaySealed ? styles.sealedField : {}) }} value={morningEntry.gratitude}
                onChange={e => !isTodaySealed && setMorningEntry({ ...morningEntry, gratitude: e.target.value })}
                onBlur={!isTodaySealed ? saveMorning : undefined} placeholder="A quiet thing..." rows={2} readOnly={isTodaySealed} />
            </section>

            <section style={styles.card}>
              <div style={styles.cardHeader}>
                <Moon size={18} strokeWidth={1.3} style={{ color: '#6a8090' }} />
                <h2 style={styles.cardTitle}>Vespertinus</h2>
                <span style={styles.cardSubtitle}>Evening examen</span>
              </div>
              <label style={styles.label}>What did I do well?</label>
              <textarea style={{ ...styles.textarea, ...(isTodaySealed ? styles.sealedField : {}) }} value={eveningEntry.didWell}
                onChange={e => !isTodaySealed && setEveningEntry({ ...eveningEntry, didWell: e.target.value })}
                onBlur={!isTodaySealed ? saveEvening : undefined} rows={2} readOnly={isTodaySealed} />
              <label style={styles.label}>Where did I fall short?</label>
              <textarea style={{ ...styles.textarea, ...(isTodaySealed ? styles.sealedField : {}) }} value={eveningEntry.didPoorly}
                onChange={e => !isTodaySealed && setEveningEntry({ ...eveningEntry, didPoorly: e.target.value })}
                onBlur={!isTodaySealed ? saveEvening : undefined} rows={2} readOnly={isTodaySealed} />
              <label style={styles.label}>Tomorrow, I will:</label>
              <textarea style={{ ...styles.textarea, ...(isTodaySealed ? styles.sealedField : {}) }} value={eveningEntry.toImprove}
                onChange={e => !isTodaySealed && setEveningEntry({ ...eveningEntry, toImprove: e.target.value })}
                onBlur={!isTodaySealed ? saveEvening : undefined} rows={2} readOnly={isTodaySealed} />
            </section>

            <section style={{ ...styles.card, gridColumn: '1 / -1' }}>
              <div style={styles.cardHeader}>
                <Flame size={18} strokeWidth={1.3} style={{ color: '#c87850' }} />
                <h2 style={styles.cardTitle}>The Four Virtues · Today</h2>
                <span style={styles.cardSubtitle}>Did I embody this?</span>
              </div>
              <div style={styles.virtueRow}>
                {VIRTUES.map(v => {
                  const active = todayVirtues[v.id];
                  const streak = virtueStreak(v.id);
                  return (
                    <button key={v.id} onClick={() => !isTodaySealed && toggleVirtue(v.id)}
                      style={{ ...styles.virtueCheck, ...(active ? styles.virtueCheckActive : {}), ...(isTodaySealed ? { opacity: 0.7, cursor: 'default' } : {}) }}>
                      <v.icon size={20} strokeWidth={1.3} />
                      <div style={styles.virtueCheckName}>{v.name}</div>
                      <div style={styles.virtueCheckEng}>{v.english}</div>
                      {streak > 0 && <div style={styles.streakBadge}>{streak}d</div>}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Seal button */}
            {!isTodaySealed && (
              <section style={{ ...styles.sealSection, gridColumn: '1 / -1' }}>
                <button onClick={sealDay} style={confirmSeal ? styles.sealBtnConfirm : styles.sealBtn}>
                  <Lock size={16} strokeWidth={1.5} />
                  {confirmSeal ? 'Are you sure? What is written cannot be changed.' : 'Seal this day'}
                </button>
                {confirmSeal && (
                  <button onClick={() => setConfirmSeal(false)} style={styles.sealCancel}>
                    Not yet
                  </button>
                )}
              </section>
            )}

            {trackers.length > 0 && (
              <section style={{ ...styles.card, gridColumn: '1 / -1' }}>
                <div style={styles.cardHeader}>
                  <Target size={18} strokeWidth={1.3} style={{ color: '#c4a060' }} />
                  <h2 style={styles.cardTitle}>Opus · Today</h2>
                  <span style={styles.cardSubtitle}>{trackers.length} {trackers.length === 1 ? 'tracker' : 'trackers'}</span>
                </div>
                <div style={styles.miniGrid}>
                  {trackers.slice(0, 6).map(t => {
                    const typeInfo = TRACKER_TYPES.find(x => x.id === t.type);
                    const TIcon = typeInfo?.icon || Target;
                    let status = '';
                    if (t.type === 'habit') status = todayVal(t) ? '✓ done' : 'pending';
                    else if (t.type === 'avoidance') { const d = daysSinceAvoidance(t); status = d === null ? 'not started' : `${d}d clean`; }
                    else if (t.type === 'target') status = `${t.currentValue}/${t.targetValue}${t.unit ? ' ' + t.unit : ''}`;
                    else if (t.type === 'average') { const { avg } = averageStats(t); status = `avg ${avg.toFixed(1)}`; }
                    else if (t.type === 'project') status = `${t.progress || 0}%`;
                    return (
                      <div key={t.id} style={styles.miniTracker}>
                        <TIcon size={14} strokeWidth={1.4} style={{ color: '#c4a060', flexShrink: 0 }} />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={styles.miniName}>{t.name}</div>
                          <div style={styles.miniStatus}>{status}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button onClick={() => setView('opus')} style={styles.linkBtn}>View all in Opus →</button>
              </section>
            )}
          </div>
        )}

        {view === 'virtues' && (
          <div>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>The Four Cardinal Virtues</h2>
              <p style={styles.sectionLead}>Tracked across the last fourteen days.</p>
            </div>
            <div style={styles.virtueGrid}>
              {VIRTUES.map(v => {
                const streak = virtueStreak(v.id);
                const days = [];
                for (let i = 13; i >= 0; i--) {
                  const d = new Date(); d.setDate(d.getDate() - i);
                  const key = d.toISOString().split('T')[0];
                  days.push({ key, active: virtueLog[key]?.[v.id] });
                }
                const count = days.filter(d => d.active).length;
                return (
                  <div key={v.id} style={styles.virtueCard}>
                    <div style={styles.virtueCardHead}>
                      <v.icon size={28} strokeWidth={1.2} style={{ color: '#c4a060' }} />
                      <div>
                        <div style={styles.virtueCardName}>{v.name}</div>
                        <div style={styles.virtueCardEng}>{v.english}</div>
                      </div>
                      <div style={styles.virtueStat}>
                        <div style={styles.virtueStatNum}>{streak}</div>
                        <div style={styles.virtueStatLabel}>streak</div>
                      </div>
                    </div>
                    <p style={styles.virtueDesc}>{v.description}</p>
                    <div style={styles.dotRow}>
                      {days.map(d => (<div key={d.key} title={d.key} style={{ ...styles.dot, ...(d.active ? styles.dotActive : {}) }} />))}
                    </div>
                    <div style={styles.virtueFooter}>
                      <span>{count} of 14 days</span>
                      <span>{Math.round(count / 14 * 100)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === 'opus' && (
          <div>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Opus — The Work</h2>
              <p style={styles.sectionLead}>Measure what you aim to change.</p>
            </div>

            {!showForm ? (
              <button onClick={() => setShowForm(true)} style={styles.newBtn}>
                <Plus size={16} strokeWidth={1.5} /> New tracker
              </button>
            ) : (
              <div style={styles.formCard}>
                <div style={styles.formHeader}>
                  <h3 style={styles.formTitle}>New tracker</h3>
                  <button onClick={resetForm} style={styles.closeBtn}><X size={16} strokeWidth={1.5} /></button>
                </div>
                <label style={styles.label}>Type of measurement</label>
                <div style={styles.typeGrid}>
                  {TRACKER_TYPES.map(tt => (
                    <button key={tt.id} onClick={() => setFormType(tt.id)}
                      style={{ ...styles.typeOption, ...(formType === tt.id ? styles.typeOptionActive : {}) }}>
                      <tt.icon size={16} strokeWidth={1.4} />
                      <div>
                        <div style={styles.typeLabel}>{tt.label}</div>
                        <div style={styles.typeDesc}>{tt.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
                <label style={styles.label}>Name</label>
                <input type="text" value={formName} onChange={e => setFormName(e.target.value)}
                  placeholder={
                    formType === 'habit' ? 'e.g., Read for 30 minutes' :
                    formType === 'avoidance' ? 'e.g., Days without soda' :
                    formType === 'target' ? 'e.g., Save for Greece trip' :
                    formType === 'average' ? 'e.g., Glasses of water per day' :
                    'e.g., Finish Meditations translation'
                  } style={styles.textInput} />
                <label style={styles.label}>Virtue it serves</label>
                <select value={formVirtue} onChange={e => setFormVirtue(e.target.value)} style={styles.textInput}>
                  {VIRTUES.map(v => <option key={v.id} value={v.id}>{v.name} · {v.english}</option>)}
                </select>
                {formType === 'target' && (
                  <>
                    <div style={styles.formRow}>
                      <div style={{ flex: 1, minWidth: '110px' }}>
                        <label style={styles.label}>Start</label>
                        <input type="number" value={formStartValue} onChange={e => setFormStartValue(e.target.value)} placeholder="0" style={styles.textInput} />
                      </div>
                      <div style={{ flex: 1, minWidth: '110px' }}>
                        <label style={styles.label}>Target</label>
                        <input type="number" value={formTargetValue} onChange={e => setFormTargetValue(e.target.value)} placeholder="5000" style={styles.textInput} />
                      </div>
                      <div style={{ flex: 1, minWidth: '110px' }}>
                        <label style={styles.label}>Unit</label>
                        <input type="text" value={formUnit} onChange={e => setFormUnit(e.target.value)} placeholder="$, km, lbs..." style={styles.textInput} />
                      </div>
                    </div>
                    <label style={styles.label}>Deadline</label>
                    <input type="date" value={formDeadline} onChange={e => setFormDeadline(e.target.value)} style={styles.textInput} />
                  </>
                )}
                {formType === 'average' && (
                  <div style={styles.formRow}>
                    <div style={{ flex: 1, minWidth: '110px' }}>
                      <label style={styles.label}>Direction</label>
                      <select value={formAvgDirection} onChange={e => setFormAvgDirection(e.target.value)} style={styles.textInput}>
                        <option value="at_least">At least</option>
                        <option value="at_most">At most</option>
                      </select>
                    </div>
                    <div style={{ flex: 1, minWidth: '110px' }}>
                      <label style={styles.label}>Daily goal</label>
                      <input type="number" value={formAvgGoal} onChange={e => setFormAvgGoal(e.target.value)} placeholder="8" style={styles.textInput} />
                    </div>
                    <div style={{ flex: 1, minWidth: '110px' }}>
                      <label style={styles.label}>Unit</label>
                      <input type="text" value={formUnit} onChange={e => setFormUnit(e.target.value)} placeholder="glasses, hrs..." style={styles.textInput} />
                    </div>
                  </div>
                )}
                {formType === 'project' && (<>
                  <label style={styles.label}>Deadline (optional)</label>
                  <input type="date" value={formDeadline} onChange={e => setFormDeadline(e.target.value)} style={styles.textInput} />
                </>)}
                <div style={styles.formActions}>
                  <button onClick={resetForm} style={styles.cancelBtn}>Cancel</button>
                  <button onClick={createTracker} style={styles.submitBtn}>Create</button>
                </div>
              </div>
            )}

            {trackers.length === 0 && !showForm ? (
              <div style={styles.empty}>
                <Feather size={32} strokeWidth={1} style={{ color: '#5a5040', marginBottom: 12 }} />
                <p style={styles.emptyText}>No work yet set. Begin with one small, honest thing.</p>
              </div>
            ) : (
              <div style={styles.trackerList}>
                {trackers.map(t => <TrackerCard key={t.id} tracker={t}
                  logInput={logInputs[t.id] || ''}
                  setLogInput={(v) => setLogInputs(prev => ({ ...prev, [t.id]: v }))}
                  onToggleHabit={() => toggleHabitToday(t.id)}
                  onMarkBreak={() => markAvoidanceBreak(t.id)}
                  onStartAvoidance={() => logAvoidanceStart(t.id)}
                  onLogTarget={(v) => logTargetValue(t.id, v)}
                  onLogAverage={(v) => logAverageValue(t.id, v)}
                  onProjectDelta={(d) => updateProjectProgress(t.id, d)}
                  onDelete={() => deleteTracker(t.id)}
                  habitStreak={habitStreak} daysSinceAvoidance={daysSinceAvoidance} averageStats={averageStats} />)}
              </div>
            )}
          </div>
        )}

        {view === 'scroll' && (
          <div>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Scroll — Past Reflections</h2>
              <p style={styles.sectionLead}>Your own meditations, gathered.</p>
            </div>
            {Object.keys(journalHistory).length === 0 ? (
              <div style={styles.empty}>
                <Scroll size={32} strokeWidth={1} style={{ color: '#5a5040', marginBottom: 12 }} />
                <p style={styles.emptyText}>The scroll is blank. Begin today.</p>
              </div>
            ) : (
              <div style={styles.historyList}>
                {Object.entries(journalHistory).sort((a, b) => b[0].localeCompare(a[0])).map(([date, entry]) => (
                  <div key={date} style={styles.historyCard}>
                    <div style={styles.historyDate}>
                      {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                      {sealedDays[date] && <Lock size={14} strokeWidth={1.5} style={{ marginLeft: '8px', color: '#78a050', verticalAlign: 'middle' }} />}
                    </div>
                    {entry.morning && (entry.morning.intention || entry.morning.obstacle || entry.morning.gratitude) && (
                      <div style={styles.historyBlock}>
                        <div style={styles.historyLabel}><Sun size={12} strokeWidth={1.4} /> Matutinus</div>
                        {entry.morning.intention && <div style={styles.historyText}><em>Intention.</em> {entry.morning.intention}</div>}
                        {entry.morning.obstacle && <div style={styles.historyText}><em>Obstacle.</em> {entry.morning.obstacle}</div>}
                        {entry.morning.gratitude && <div style={styles.historyText}><em>Gratitude.</em> {entry.morning.gratitude}</div>}
                      </div>
                    )}
                    {entry.evening && (entry.evening.didWell || entry.evening.didPoorly || entry.evening.toImprove) && (
                      <div style={styles.historyBlock}>
                        <div style={styles.historyLabel}><Moon size={12} strokeWidth={1.4} /> Vespertinus</div>
                        {entry.evening.didWell && <div style={styles.historyText}><em>Did well.</em> {entry.evening.didWell}</div>}
                        {entry.evening.didPoorly && <div style={styles.historyText}><em>Fell short.</em> {entry.evening.didPoorly}</div>}
                        {entry.evening.toImprove && <div style={styles.historyText}><em>Tomorrow.</em> {entry.evening.toImprove}</div>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'settings' && (
          <div>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Cura — Data & Settings</h2>
              <p style={styles.sectionLead}>Transfer, back up, or reset your practice.</p>
            </div>

            <div style={styles.settingsCard}>
              <div style={styles.settingsItem}>
                <Download size={22} strokeWidth={1.3} style={{ color: '#78a050', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={styles.settingsTitle}>Export your data</div>
                  <div style={styles.settingsDesc}>
                    Downloads a JSON file with all your journal entries, virtue logs, and trackers.
                    Save this file somewhere safe — it's your complete backup.
                  </div>
                </div>
                <button onClick={exportData} style={styles.settingsBtn}>Export</button>
              </div>
            </div>

            <div style={styles.settingsCard}>
              <div style={styles.settingsItem}>
                <Upload size={22} strokeWidth={1.3} style={{ color: '#c4a060', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={styles.settingsTitle}>Import data to this device</div>
                  <div style={styles.settingsDesc}>
                    Load a backup file from another device. This will merge with any existing data —
                    matching keys will be overwritten by the imported file.
                  </div>
                  {importStatus && (
                    <div style={{ ...styles.settingsDesc, color: importStatus.startsWith('Error') ? '#a84432' : '#5a7a3f', marginTop: '8px', fontWeight: 500 }}>
                      {importStatus}
                    </div>
                  )}
                </div>
                <label style={styles.settingsBtn}>
                  Import
                  <input type="file" accept=".json" onChange={importData}
                    style={{ position: 'absolute', width: 0, height: 0, opacity: 0 }} />
                </label>
              </div>
            </div>

            <div style={styles.settingsCard}>
              <div style={styles.settingsItem}>
                <X size={22} strokeWidth={1.3} style={{ color: '#c87850', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={styles.settingsTitle}>Clear all data</div>
                  <div style={styles.settingsDesc}>
                    Permanently deletes everything on this device. Export first if you want to keep it.
                    {confirmClear && <span style={{ color: '#c87850', fontWeight: 500, display: 'block', marginTop: '6px' }}>Are you sure? Tap again to confirm.</span>}
                  </div>
                </div>
                <button onClick={clearAllData}
                  style={{ ...styles.settingsBtn, borderColor: '#a84432', color: '#c87850' }}>
                  {confirmClear ? 'Confirm' : 'Clear'}
                </button>
              </div>
            </div>

            <div style={styles.settingsHelp}>
              <div style={styles.settingsHelpTitle}>How to transfer to a new device</div>
              <div style={styles.settingsHelpStep}><span style={styles.stepNum}>1</span> On your old device, tap <strong>Export</strong> above. A file downloads.</div>
              <div style={styles.settingsHelpStep}><span style={styles.stepNum}>2</span> Send that file to your new device (AirDrop, email, cloud drive — anything).</div>
              <div style={styles.settingsHelpStep}><span style={styles.stepNum}>3</span> On your new device, open Meditationes, go to Cura, tap <strong>Import</strong>, select the file.</div>
              <div style={styles.settingsHelpStep}><span style={styles.stepNum}>4</span> Done. All your journal entries, virtues, and trackers are restored.</div>
            </div>
          </div>
        )}
      </main>

      <footer style={styles.footer}>
        <div style={styles.footerText}>Τὰ εἰς ἑαυτόν · To Himself</div>
      </footer>
    </div>
  );
}

function TrackerCard({ tracker, logInput, setLogInput, onToggleHabit, onMarkBreak, onStartAvoidance,
  onLogTarget, onLogAverage, onProjectDelta, onDelete, habitStreak, daysSinceAvoidance, averageStats }) {
  const t = tracker;
  const virtue = VIRTUES.find(v => v.id === t.virtue);
  const VIcon = virtue?.icon || Scroll;
  const typeInfo = TRACKER_TYPES.find(x => x.id === t.type);
  const TIcon = typeInfo?.icon || Target;
  const today = todayKey();

  const days14 = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days14.push(d.toISOString().split('T')[0]);
  }

  return (
    <div style={styles.trackerCard}>
      <div style={styles.trackerTop}>
        <div style={styles.trackerMeta}>
          <div style={styles.trackerType}><TIcon size={12} strokeWidth={1.5} /> {typeInfo.label}</div>
          <div style={styles.trackerVirtue}><VIcon size={12} strokeWidth={1.4} /> {virtue?.english}</div>
        </div>
        <button onClick={onDelete} style={styles.deleteBtn}><X size={14} strokeWidth={1.5} /></button>
      </div>
      <div style={styles.trackerName}>{t.name}</div>

      {t.type === 'habit' && (<>
        <div style={styles.habitRow}>
          <button onClick={onToggleHabit}
            style={{ ...styles.habitToday, ...(t.log?.[today] ? styles.habitTodayActive : {}) }}>
            {t.log?.[today] ? <><Check size={14} strokeWidth={2} /> Done today</> : 'Mark done'}
          </button>
          <div style={styles.statBlock}>
            <div style={styles.statNum}>{habitStreak(t)}</div>
            <div style={styles.statLabel}>day streak</div>
          </div>
        </div>
        <div style={styles.dotRow}>
          {days14.map(k => (<div key={k} title={k} style={{ ...styles.dot, ...(t.log?.[k] ? styles.dotActive : {}) }} />))}
        </div>
      </>)}

      {t.type === 'avoidance' && (<>
        {t.lastOccurrence ? (<>
          <div style={styles.bigStatRow}>
            <div style={styles.bigStatNum}>{daysSinceAvoidance(t)}</div>
            <div style={styles.bigStatLabel}>days since last occurrence</div>
          </div>
          <button onClick={onMarkBreak} style={styles.resetBtn}>Reset — I slipped today</button>
        </>) : (<button onClick={onStartAvoidance} style={styles.habitToday}>Begin tracking from today</button>)}
      </>)}

      {t.type === 'target' && (() => {
        const pct = t.targetValue !== t.startValue ? Math.max(0, Math.min(100, ((t.currentValue - t.startValue) / (t.targetValue - t.startValue)) * 100)) : 0;
        const daysLeft = t.deadline ? daysBetween(today, t.deadline) : null;
        return (<>
          <div style={styles.targetRow}>
            <div>
              <div style={styles.targetCurrent}>{t.currentValue} <span style={styles.targetUnit}>/ {t.targetValue} {t.unit}</span></div>
              {t.deadline && (<div style={styles.targetDeadline}>
                {daysLeft > 0 ? `${daysLeft} days remaining` : daysLeft === 0 ? 'due today' : `${Math.abs(daysLeft)}d overdue`}
              </div>)}
            </div>
            <div style={styles.statBlock}>
              <div style={styles.statNum}>{Math.round(pct)}%</div>
              <div style={styles.statLabel}>of goal</div>
            </div>
          </div>
          <div style={styles.progressBar}><div style={{ ...styles.progressFill, width: `${pct}%` }} /></div>
          <div style={styles.logRow}>
            <input type="number" placeholder={`Update (${t.currentValue})`}
              value={logInput} onChange={e => setLogInput(e.target.value)} style={styles.logInput} />
            <button onClick={() => { onLogTarget(logInput); setLogInput(''); }} style={styles.logBtn}>Set</button>
          </div>
        </>);
      })()}

      {t.type === 'average' && (() => {
        const { avg, count } = averageStats(t, 7);
        const meeting = t.direction === 'at_least' ? avg >= t.avgGoal : avg <= t.avgGoal;
        const todayLogged = t.log?.[today];
        return (<>
          <div style={styles.targetRow}>
            <div>
              <div style={styles.targetCurrent}>{avg.toFixed(1)} <span style={styles.targetUnit}>/ {t.avgGoal} {t.unit}</span></div>
              <div style={styles.targetDeadline}>7-day avg · {t.direction === 'at_least' ? 'aim ≥' : 'aim ≤'} {t.avgGoal}</div>
            </div>
            <div style={styles.statBlock}>
              <div style={{ ...styles.statNum, color: count > 0 ? (meeting ? '#5a7a3f' : '#a84432') : '#8b7355' }}>
                {count > 0 ? (meeting ? '✓' : '✗') : '—'}
              </div>
              <div style={styles.statLabel}>{count} logged</div>
            </div>
          </div>
          <div style={styles.avgBars}>
            {days14.map(k => {
              const val = t.log?.[k];
              const h = val !== undefined ? Math.min(100, (val / Math.max(t.avgGoal, 1)) * 100) : 0;
              return (
                <div key={k} style={styles.avgBarWrap} title={`${k}: ${val ?? '—'}`}>
                  <div style={{ ...styles.avgBar, height: `${h}%`,
                    backgroundColor: val === undefined ? 'rgba(139,106,63,0.1)' :
                      (t.direction === 'at_least' ? (val >= t.avgGoal ? '#5a7a3f' : '#c87850') :
                        (val <= t.avgGoal ? '#5a7a3f' : '#c87850'))
                  }} />
                </div>
              );
            })}
          </div>
          <div style={styles.logRow}>
            <input type="number" placeholder={todayLogged !== undefined ? `Today: ${todayLogged}` : `Log today's ${t.unit || 'value'}`}
              value={logInput} onChange={e => setLogInput(e.target.value)} style={styles.logInput} />
            <button onClick={() => onLogAverage(logInput)} style={styles.logBtn}>Log</button>
          </div>
        </>);
      })()}

      {t.type === 'project' && (<>
        <div style={styles.targetRow}>
          <div style={styles.bigStatNum}>{t.progress || 0}%</div>
          {t.deadline && (<div style={styles.targetDeadline}>
            {(() => { const d = daysBetween(today, t.deadline); return d > 0 ? `${d} days left` : d === 0 ? 'due today' : `${Math.abs(d)}d overdue`; })()}
          </div>)}
        </div>
        <div style={styles.progressBar}><div style={{ ...styles.progressFill, width: `${t.progress || 0}%` }} /></div>
        <div style={styles.progressControls}>
          <button onClick={() => onProjectDelta(-10)} style={styles.progBtn}>−10</button>
          <button onClick={() => onProjectDelta(10)} style={styles.progBtn}>+10</button>
          <button onClick={() => onProjectDelta(25)} style={styles.progBtn}>+25</button>
          {t.progress === 100 && <span style={styles.completeBadge}><Check size={12} strokeWidth={2} /> Factum</span>}
        </div>
      </>)}
    </div>
  );
}

const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=EB+Garamond:ital,wght@0,400;0,500;1,400&display=swap');
  * { box-sizing: border-box; }
  body { margin: 0; background: #141210; }
  textarea:focus, input:focus, select:focus { outline: none; border-color: #c4a060 !important; }
  textarea::placeholder, input::placeholder { color: #5a5040; font-style: italic; }
  button { cursor: pointer; font-family: inherit; }
`;

const styles = {
  app: { minHeight: '100vh', backgroundColor: '#141210',
    backgroundImage: `radial-gradient(ellipse at top left, rgba(100, 80, 50, 0.08), transparent 50%), radial-gradient(ellipse at bottom right, rgba(80, 60, 30, 0.06), transparent 50%), url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3CfeColorMatrix values='0 0 0 0 0.1 0 0 0 0 0.08 0 0 0 0 0.06 0 0 0 0.15 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
    color: '#e0d5c0', fontFamily: "'EB Garamond', Georgia, serif", paddingBottom: '80px' },
  loadingScreen: { minHeight: '100vh', backgroundColor: '#141210', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cormorant Garamond', serif" },
  loadingText: { fontSize: '2rem', fontStyle: 'italic', color: '#c4a060', letterSpacing: '0.1em' },
  header: { borderBottom: '1px solid rgba(196, 160, 96, 0.15)', backgroundColor: 'rgba(20, 18, 16, 0.9)', backdropFilter: 'blur(8px)', position: 'sticky', top: 0, zIndex: 10 },
  headerInner: { maxWidth: '1100px', margin: '0 auto', padding: '20px 24px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' },
  brand: { display: 'flex', alignItems: 'center', gap: '14px' },
  brandMark: { width: '46px', height: '46px', border: '1.5px solid #c4a060', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cormorant Garamond', serif", fontSize: '0.95rem', fontWeight: 500, color: '#c4a060', letterSpacing: '0.05em' },
  brandTitle: { fontFamily: "'Cormorant Garamond', serif", fontSize: '1.75rem', fontWeight: 500, fontStyle: 'italic', lineHeight: 1, color: '#e0d5c0' },
  brandSub: { fontSize: '0.8rem', color: '#8a7a60', marginTop: '4px', letterSpacing: '0.02em' },
  nav: { display: 'flex', gap: '4px', flexWrap: 'wrap' },
  navBtn: { display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', border: '1px solid transparent', background: 'transparent', color: '#8a7a60', fontFamily: "'EB Garamond', serif", fontSize: '0.95rem', borderRadius: '2px', transition: 'all 0.2s ease', letterSpacing: '0.03em' },
  navBtnActive: { backgroundColor: 'rgba(196, 160, 96, 0.1)', border: '1px solid rgba(196, 160, 96, 0.25)', color: '#e0d5c0' },
  meditationBanner: { maxWidth: '1100px', margin: '28px auto 0', padding: '0 24px', display: 'flex', gap: '14px', alignItems: 'flex-start' },
  meditationText: { fontFamily: "'Cormorant Garamond', serif", fontSize: '1.35rem', fontStyle: 'italic', lineHeight: 1.5, color: '#d0c4a8', fontWeight: 300 },
  meditationSource: { fontSize: '0.8rem', color: '#8a7a60', marginTop: '6px', letterSpacing: '0.05em' },
  main: { maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' },
  card: { backgroundColor: 'rgba(28, 25, 22, 0.8)', border: '1px solid rgba(196, 160, 96, 0.12)', borderRadius: '2px', padding: '24px', boxShadow: '0 1px 4px rgba(0, 0, 0, 0.2)' },
  cardHeader: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid rgba(196, 160, 96, 0.1)' },
  cardTitle: { margin: 0, fontFamily: "'Cormorant Garamond', serif", fontSize: '1.5rem', fontWeight: 500, fontStyle: 'italic', color: '#e0d5c0', letterSpacing: '0.01em' },
  cardSubtitle: { fontSize: '0.8rem', color: '#8a7a60', marginLeft: 'auto', letterSpacing: '0.04em', fontStyle: 'italic' },
  label: { display: 'block', fontSize: '0.85rem', color: '#8a7a60', marginBottom: '6px', marginTop: '14px', letterSpacing: '0.02em', fontStyle: 'italic' },
  textarea: { width: '100%', padding: '10px 12px', border: '1px solid rgba(196, 160, 96, 0.15)', borderRadius: '2px', backgroundColor: 'rgba(22, 20, 17, 0.6)', fontFamily: "'EB Garamond', serif", fontSize: '1rem', lineHeight: 1.5, color: '#d0c4a8', resize: 'vertical', transition: 'border-color 0.2s' },
  textInput: { width: '100%', padding: '10px 12px', border: '1px solid rgba(196, 160, 96, 0.15)', borderRadius: '2px', backgroundColor: 'rgba(22, 20, 17, 0.6)', fontFamily: "'EB Garamond', serif", fontSize: '1rem', color: '#d0c4a8' },
  virtueRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' },
  virtueCheck: { position: 'relative', padding: '20px 16px', border: '1px solid rgba(196, 160, 96, 0.15)', borderRadius: '2px', backgroundColor: 'rgba(22, 20, 17, 0.5)', color: '#8a7a60', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', transition: 'all 0.25s ease' },
  virtueCheckActive: { backgroundColor: 'rgba(200, 120, 80, 0.12)', borderColor: '#c87850', color: '#c87850' },
  virtueCheckName: { fontFamily: "'Cormorant Garamond', serif", fontSize: '1.2rem', fontStyle: 'italic', fontWeight: 500, marginTop: '4px' },
  virtueCheckEng: { fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase' },
  streakBadge: { position: 'absolute', top: '8px', right: '8px', fontSize: '0.7rem', color: '#c87850', fontWeight: 500 },
  miniGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '12px' },
  miniTracker: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', backgroundColor: 'rgba(22, 20, 17, 0.5)', border: '1px solid rgba(196, 160, 96, 0.08)', borderRadius: '2px' },
  miniName: { fontSize: '0.95rem', color: '#d0c4a8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  miniStatus: { fontSize: '0.78rem', color: '#8a7a60', fontStyle: 'italic' },
  linkBtn: { background: 'transparent', border: 'none', color: '#c4a060', fontFamily: "'EB Garamond', serif", fontSize: '0.9rem', fontStyle: 'italic', padding: '4px 0' },
  sectionHeader: { marginBottom: '28px', borderBottom: '1px solid rgba(196, 160, 96, 0.12)', paddingBottom: '16px' },
  sectionTitle: { fontFamily: "'Cormorant Garamond', serif", fontSize: '2.2rem', fontWeight: 400, fontStyle: 'italic', margin: 0, color: '#e0d5c0' },
  sectionLead: { fontSize: '0.95rem', color: '#8a7a60', marginTop: '6px', fontStyle: 'italic' },
  virtueGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' },
  virtueCard: { backgroundColor: 'rgba(28, 25, 22, 0.8)', border: '1px solid rgba(196, 160, 96, 0.12)', borderRadius: '2px', padding: '24px' },
  virtueCardHead: { display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' },
  virtueCardName: { fontFamily: "'Cormorant Garamond', serif", fontSize: '1.5rem', fontStyle: 'italic', fontWeight: 500, color: '#e0d5c0', lineHeight: 1 },
  virtueCardEng: { fontSize: '0.78rem', color: '#8a7a60', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '4px' },
  virtueStat: { marginLeft: 'auto', textAlign: 'right' },
  virtueStatNum: { fontFamily: "'Cormorant Garamond', serif", fontSize: '1.75rem', fontWeight: 500, color: '#c87850', lineHeight: 1 },
  virtueStatLabel: { fontSize: '0.7rem', color: '#8a7a60', letterSpacing: '0.08em', textTransform: 'uppercase' },
  virtueDesc: { fontSize: '0.95rem', color: '#9a8e78', fontStyle: 'italic', marginBottom: '18px', lineHeight: 1.5 },
  dotRow: { display: 'flex', gap: '4px', margin: '12px 0' },
  dot: { flex: 1, height: '20px', backgroundColor: 'rgba(196, 160, 96, 0.1)', borderRadius: '1px' },
  dotActive: { backgroundColor: '#c87850' },
  virtueFooter: { display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#8a7a60', fontStyle: 'italic' },
  newBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', border: '1px solid rgba(196, 160, 96, 0.25)', backgroundColor: 'rgba(28, 25, 22, 0.8)', color: '#8a7a60', fontFamily: "'EB Garamond', serif", fontSize: '1rem', fontStyle: 'italic', borderRadius: '2px', marginBottom: '20px', transition: 'all 0.2s' },
  formCard: { backgroundColor: 'rgba(28, 25, 22, 0.9)', border: '1px solid rgba(196, 160, 96, 0.2)', borderRadius: '2px', padding: '24px', marginBottom: '24px' },
  formHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
  formTitle: { fontFamily: "'Cormorant Garamond', serif", fontSize: '1.4rem', fontStyle: 'italic', margin: 0, color: '#e0d5c0' },
  closeBtn: { background: 'transparent', border: 'none', color: '#8a7a60', padding: '4px' },
  typeGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', marginTop: '8px' },
  typeOption: { display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '12px', border: '1px solid rgba(196, 160, 96, 0.15)', backgroundColor: 'rgba(22, 20, 17, 0.5)', color: '#8a7a60', borderRadius: '2px', textAlign: 'left', transition: 'all 0.2s' },
  typeOptionActive: { backgroundColor: 'rgba(200, 120, 80, 0.12)', borderColor: '#c87850', color: '#e0d5c0' },
  typeLabel: { fontFamily: "'Cormorant Garamond', serif", fontSize: '1.05rem', fontStyle: 'italic', fontWeight: 500 },
  typeDesc: { fontSize: '0.78rem', color: '#8a7a60', marginTop: '2px' },
  formRow: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  formActions: { display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' },
  cancelBtn: { padding: '10px 18px', border: '1px solid rgba(196, 160, 96, 0.2)', background: 'transparent', color: '#8a7a60', fontFamily: "'EB Garamond', serif", fontSize: '0.95rem', borderRadius: '2px' },
  submitBtn: { padding: '10px 20px', border: '1px solid #c4a060', backgroundColor: '#c4a060', color: '#141210', fontFamily: "'EB Garamond', serif", fontSize: '0.95rem', borderRadius: '2px' },
  empty: { padding: '60px 20px', textAlign: 'center', backgroundColor: 'rgba(28, 25, 22, 0.5)', border: '1px dashed rgba(196, 160, 96, 0.15)', borderRadius: '2px' },
  emptyText: { fontStyle: 'italic', color: '#8a7a60', fontSize: '1.05rem' },
  trackerList: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' },
  trackerCard: { backgroundColor: 'rgba(28, 25, 22, 0.8)', border: '1px solid rgba(196, 160, 96, 0.12)', borderRadius: '2px', padding: '20px' },
  trackerTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  trackerMeta: { display: 'flex', gap: '12px' },
  trackerType: { display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: '#c4a060', letterSpacing: '0.08em', textTransform: 'uppercase' },
  trackerVirtue: { display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: '#8a7a60', letterSpacing: '0.06em', textTransform: 'uppercase' },
  deleteBtn: { background: 'transparent', border: 'none', color: '#5a5040', padding: '4px' },
  trackerName: { fontFamily: "'Cormorant Garamond', serif", fontSize: '1.35rem', fontStyle: 'italic', color: '#e0d5c0', marginBottom: '16px', lineHeight: 1.3 },
  habitRow: { display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' },
  habitToday: { flex: 1, padding: '12px', border: '1px solid rgba(196, 160, 96, 0.2)', backgroundColor: 'rgba(22, 20, 17, 0.5)', color: '#8a7a60', fontFamily: "'EB Garamond', serif", fontSize: '0.95rem', fontStyle: 'italic', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.25s' },
  habitTodayActive: { backgroundColor: 'rgba(120, 160, 80, 0.12)', borderColor: '#78a050', color: '#78a050' },
  statBlock: { textAlign: 'right', minWidth: '70px' },
  statNum: { fontFamily: "'Cormorant Garamond', serif", fontSize: '1.6rem', fontWeight: 500, color: '#c87850', lineHeight: 1 },
  statLabel: { fontSize: '0.7rem', color: '#8a7a60', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: '2px' },
  bigStatRow: { textAlign: 'center', padding: '14px 0' },
  bigStatNum: { fontFamily: "'Cormorant Garamond', serif", fontSize: '3rem', fontWeight: 400, color: '#78a050', lineHeight: 1 },
  bigStatLabel: { fontSize: '0.8rem', color: '#8a7a60', fontStyle: 'italic', marginTop: '6px' },
  resetBtn: { width: '100%', padding: '10px', border: '1px solid rgba(200, 120, 80, 0.3)', backgroundColor: 'transparent', color: '#c87850', fontFamily: "'EB Garamond', serif", fontSize: '0.9rem', fontStyle: 'italic', borderRadius: '2px', marginTop: '10px' },
  targetRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '10px' },
  targetCurrent: { fontFamily: "'Cormorant Garamond', serif", fontSize: '1.5rem', color: '#e0d5c0', fontWeight: 500 },
  targetUnit: { fontSize: '0.95rem', color: '#8a7a60', fontStyle: 'italic', fontWeight: 400 },
  targetDeadline: { fontSize: '0.78rem', color: '#8a7a60', marginTop: '4px', fontStyle: 'italic' },
  progressBar: { height: '4px', backgroundColor: 'rgba(196, 160, 96, 0.1)', borderRadius: '1px', overflow: 'hidden', margin: '4px 0 12px' },
  progressFill: { height: '100%', backgroundColor: '#c87850', transition: 'width 0.4s ease' },
  logRow: { display: 'flex', gap: '8px', marginTop: '10px' },
  logInput: { flex: 1, padding: '8px 10px', border: '1px solid rgba(196, 160, 96, 0.15)', borderRadius: '2px', backgroundColor: 'rgba(22, 20, 17, 0.6)', fontFamily: "'EB Garamond', serif", fontSize: '0.95rem', color: '#d0c4a8' },
  logBtn: { padding: '8px 16px', border: '1px solid #c4a060', backgroundColor: '#c4a060', color: '#141210', fontFamily: "'EB Garamond', serif", fontSize: '0.9rem', borderRadius: '2px' },
  avgBars: { display: 'flex', gap: '3px', height: '50px', alignItems: 'flex-end', margin: '8px 0 12px', padding: '4px', backgroundColor: 'rgba(196, 160, 96, 0.04)', borderRadius: '2px' },
  avgBarWrap: { flex: 1, height: '100%', display: 'flex', alignItems: 'flex-end' },
  avgBar: { width: '100%', minHeight: '2px', borderRadius: '1px', transition: 'height 0.3s' },
  progressControls: { display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' },
  progBtn: { padding: '6px 12px', border: '1px solid rgba(196, 160, 96, 0.2)', background: 'transparent', color: '#8a7a60', fontFamily: "'EB Garamond', serif", fontSize: '0.85rem', borderRadius: '2px' },
  completeBadge: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px', color: '#78a050', fontStyle: 'italic', fontSize: '0.9rem' },
  historyList: { display: 'grid', gap: '18px' },
  historyCard: { backgroundColor: 'rgba(28, 25, 22, 0.8)', border: '1px solid rgba(196, 160, 96, 0.12)', borderRadius: '2px', padding: '22px' },
  historyDate: { fontFamily: "'Cormorant Garamond', serif", fontSize: '1.25rem', fontStyle: 'italic', color: '#e0d5c0', paddingBottom: '10px', marginBottom: '12px', borderBottom: '1px solid rgba(196, 160, 96, 0.1)' },
  historyBlock: { marginBottom: '12px' },
  historyLabel: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#c4a060', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' },
  historyText: { fontSize: '0.98rem', color: '#b0a490', marginBottom: '4px', lineHeight: 1.5 },
  footer: { maxWidth: '1100px', margin: '40px auto 0', padding: '0 24px', textAlign: 'center' },
  footerText: { fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: '0.95rem', color: '#5a5040', letterSpacing: '0.08em' },
  settingsCard: { backgroundColor: 'rgba(28, 25, 22, 0.8)', border: '1px solid rgba(196, 160, 96, 0.12)', borderRadius: '2px', padding: '20px', marginBottom: '14px' },
  settingsItem: { display: 'flex', gap: '16px', alignItems: 'flex-start' },
  settingsTitle: { fontFamily: "'Cormorant Garamond', serif", fontSize: '1.25rem', fontStyle: 'italic', fontWeight: 500, color: '#e0d5c0', marginBottom: '4px' },
  settingsDesc: { fontSize: '0.9rem', color: '#8a7a60', lineHeight: 1.5 },
  settingsBtn: { position: 'relative', flexShrink: 0, padding: '10px 20px', border: '1px solid #c4a060', backgroundColor: 'transparent', color: '#c4a060', fontFamily: "'EB Garamond', serif", fontSize: '0.95rem', borderRadius: '2px', cursor: 'pointer', alignSelf: 'flex-start', marginTop: '2px' },
  settingsHelp: { backgroundColor: 'rgba(28, 25, 22, 0.8)', border: '1px solid rgba(196, 160, 96, 0.12)', borderRadius: '2px', padding: '24px', marginTop: '28px' },
  settingsHelpTitle: { fontFamily: "'Cormorant Garamond', serif", fontSize: '1.3rem', fontStyle: 'italic', fontWeight: 500, color: '#e0d5c0', marginBottom: '16px' },
  settingsHelpStep: { display: 'flex', gap: '12px', alignItems: 'flex-start', fontSize: '0.95rem', color: '#b0a490', lineHeight: 1.5, marginBottom: '12px' },
  stepNum: { flexShrink: 0, width: '26px', height: '26px', borderRadius: '50%', border: '1px solid #c4a060', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cormorant Garamond', serif", fontSize: '0.9rem', color: '#c4a060', fontWeight: 500 },
  sealedBanner: { display: 'flex', gap: '14px', alignItems: 'center', padding: '18px 20px', backgroundColor: 'rgba(120, 160, 80, 0.08)', border: '1px solid rgba(120, 160, 80, 0.2)', borderRadius: '2px', color: '#78a050' },
  sealedTitle: { fontFamily: "'Cormorant Garamond', serif", fontSize: '1.2rem', fontStyle: 'italic', fontWeight: 500, color: '#8ab860' },
  sealedSub: { fontSize: '0.85rem', color: '#78a050', marginTop: '2px', fontStyle: 'italic' },
  sealedField: { backgroundColor: 'rgba(120, 160, 80, 0.04)', borderColor: 'rgba(120, 160, 80, 0.12)', color: '#9a8e78', cursor: 'default' },
  sealSection: { textAlign: 'center', padding: '8px 0' },
  sealBtn: { display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '14px 28px', border: '1px solid rgba(196, 160, 96, 0.25)', backgroundColor: 'transparent', color: '#8a7a60', fontFamily: "'Cormorant Garamond', serif", fontSize: '1.15rem', fontStyle: 'italic', borderRadius: '2px', transition: 'all 0.25s' },
  sealBtnConfirm: { display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '14px 28px', border: '1px solid #c87850', backgroundColor: 'rgba(200, 120, 80, 0.1)', color: '#c87850', fontFamily: "'Cormorant Garamond', serif", fontSize: '1.05rem', fontStyle: 'italic', borderRadius: '2px', transition: 'all 0.25s' },
  sealCancel: { display: 'inline-block', marginLeft: '12px', padding: '14px 20px', border: 'none', backgroundColor: 'transparent', color: '#8a7a60', fontFamily: "'EB Garamond', serif", fontSize: '0.95rem', fontStyle: 'italic' }
};
