import React, { useState, useEffect } from 'react';
import { Sun, Moon, Scroll, Feather, Download, Upload, Settings, Lock, X } from 'lucide-react';

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
  { text: "Never esteem anything as of advantage to you that will make you break your word or lose your self-respect.", book: "Book III" },
  { text: "The soul becomes dyed with the color of its thoughts.", book: "Book V" },
  { text: "How much time he gains who does not look to see what his neighbor says or does or thinks.", book: "Book III" },
  { text: "Loss is nothing else but change, and change is Nature's delight.", book: "Book IX" },
  { text: "Think of yourself as dead. You have lived your life. Now, take what's left and live it properly.", book: "Book VII" },
  { text: "It is not death that a man should fear, but he should fear never beginning to live.", book: "Book XII" },
  { text: "When you arise in the morning, think of what a precious privilege it is to be alive.", book: "Book II" },
  { text: "Very little is needed to make a happy life; it is all within yourself, in your way of thinking.", book: "Book VII" },
  { text: "The best revenge is not to be like your enemy.", book: "Book VI" },
  { text: "To live happily is an inward power of the soul.", book: "Book XI" },
  { text: "Receive without conceit, release without struggle.", book: "Book VIII" },
  { text: "No man is free who is not master of himself.", book: "Book XI" },
  { text: "Everything we hear is an opinion, not a fact. Everything we see is a perspective, not the truth.", book: "Book IV" },
  { text: "He who lives in harmony with himself lives in harmony with the universe.", book: "Book V" },
  { text: "Adapt yourself to the things among which your lot has been cast and love sincerely the fellow creatures with whom destiny has ordained that you shall live.", book: "Book VI" },
  { text: "The universe is change; our life is what our thoughts make it.", book: "Book IV" },
  { text: "If someone is able to show me that what I think or do is not right, I will happily change.", book: "Book VI" },
  { text: "It is in your power to withdraw yourself whenever you desire. Perfect tranquility within consists in the good ordering of the mind.", book: "Book IV" },
];

// Use local date, not UTC — and extend "today" until 4 AM
const todayKey = () => {
  const now = new Date();
  if (now.getHours() < 4) {
    now.setDate(now.getDate() - 1);
  }
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + d;
};

import { cloudStorage } from './firebase.js';

// Migrate localStorage to Firebase on first load, then clear local
async function migrateLocalToCloud() {
  var migrated = localStorage.getItem('__migrated_to_firebase');
  if (migrated) return;
  var count = 0;
  for (var i = 0; i < localStorage.length; i++) {
    var k = localStorage.key(i);
    if (k && k !== '__migrated_to_firebase') {
      try {
        var v = JSON.parse(localStorage.getItem(k));
        await cloudStorage.set(k, v);
        count++;
      } catch (e) { /* skip non-JSON */ }
    }
  }
  localStorage.setItem('__migrated_to_firebase', 'true');
  if (count > 0) console.log('Migrated ' + count + ' items to Firebase');
}

export default function Meditationes() {
  const [view, setView] = useState('today');
  const [loading, setLoading] = useState(true);
  const [meditation, setMeditation] = useState(MEDITATIONS[0]);
  const [morningEntry, setMorningEntry] = useState({ intention: '', obstacle: '', gratitude: '' });
  const [eveningEntry, setEveningEntry] = useState({ didWell: '', didPoorly: '', toImprove: '' });
  const [journalHistory, setJournalHistory] = useState({});
  const [sealedDays, setSealedDays] = useState({});
  const [confirmSeal, setConfirmSeal] = useState(false);
  const [importStatus, setImportStatus] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const today = todayKey();
  const isTodaySealed = sealedDays[today];

  const totalDays = Object.keys(journalHistory).length;
  const streak = (() => {
    let s = 0; const d = new Date();
    while (true) {
      const k = d.toISOString().split('T')[0];
      const entry = k === today ? { morning: morningEntry, evening: eveningEntry } : journalHistory[k];
      if (entry) {
        const has = (entry.morning && (entry.morning.intention || entry.morning.obstacle || entry.morning.gratitude)) ||
                    (entry.evening && (entry.evening.didWell || entry.evening.didPoorly || entry.evening.toImprove));
        if (has) { s++; d.setDate(d.getDate() - 1); } else break;
      } else break;
    }
    return s;
  })();

  useEffect(() => {
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    setMeditation(MEDITATIONS[dayOfYear % MEDITATIONS.length]);

    async function loadAll() {
      try {
        await migrateLocalToCloud();
        const m = await cloudStorage.get('morning:' + today); if (m) setMorningEntry(m);
        const e = await cloudStorage.get('evening:' + today); if (e) setEveningEntry(e);
        const s = await cloudStorage.get('sealed:days'); if (s) setSealedDays(s);
        const hist = {};
        const mKeys = await cloudStorage.listKeys('morning:');
        for (const k of mKeys) { const entry = await cloudStorage.get(k); if (entry) hist[k.replace('morning:', '')] = { morning: entry }; }
        const eKeys = await cloudStorage.listKeys('evening:');
        for (const k of eKeys) { const entry = await cloudStorage.get(k); const date = k.replace('evening:', ''); if (entry) hist[date] = { ...(hist[date] || {}), evening: entry }; }
        setJournalHistory(hist);
      } catch (err) { console.error('Load error:', err); }
      finally { setLoading(false); }
    }
    loadAll();
  }, []);

  const saveMorning = async () => { await cloudStorage.set('morning:' + today, morningEntry); setJournalHistory(prev => ({ ...prev, [today]: { ...(prev[today] || {}), morning: morningEntry } })); };
  const saveEvening = async () => { await cloudStorage.set('evening:' + today, eveningEntry); setJournalHistory(prev => ({ ...prev, [today]: { ...(prev[today] || {}), evening: eveningEntry } })); };

  const sealDay = async () => {
    if (!confirmSeal) { setConfirmSeal(true); return; }
    await cloudStorage.set('morning:' + today, morningEntry);
    await cloudStorage.set('evening:' + today, eveningEntry);
    const newSealed = { ...sealedDays, [today]: new Date().toISOString() };
    setSealedDays(newSealed); await cloudStorage.set('sealed:days', newSealed); setConfirmSeal(false);
  };

  const exportData = async () => {
    const data = await cloudStorage.getAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'meditationes-backup-' + today + '.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const importData = (event) => {
    const file = event.target.files && event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (typeof data !== 'object' || data === null) throw new Error('Invalid');
        await cloudStorage.setAll(data);
        setImportStatus('Restored ' + Object.keys(data).length + ' items. Reloading...');
        setTimeout(function() { window.location.reload(); }, 1500);
      } catch (err) {
        setImportStatus('Error: not a valid backup file.');
        setTimeout(function() { setImportStatus(null); }, 4000);
      }
    };
    reader.readAsText(file);
  };

  const clearAllData = async () => {
    if (!confirmClear) { setConfirmClear(true); return; }
    await cloudStorage.clearAll(); localStorage.clear(); setConfirmClear(false); window.location.reload();
  };

  if (loading) return React.createElement('div', { style: ST.loadingScreen }, React.createElement('div', { style: ST.loadingText }, 'Memento...'));

  return (
    <div style={ST.app}>
      <style>{globalCSS}</style>

      <header style={ST.header}>
        <div style={ST.headerInner}>
          <div style={ST.brand}>
            <div style={ST.brandMark}>M&#183;A</div>
            <div>
              <div style={ST.brandTitle}>Meditationes</div>
              <div style={ST.brandSub}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
            </div>
          </div>
          <nav style={ST.nav}>
            {[{ id: 'today', label: 'Hodie', icon: Sun }, { id: 'scroll', label: 'Scroll', icon: Scroll }, { id: 'settings', label: 'Cura', icon: Settings }].map(function(item) {
              return (
                <button key={item.id} onClick={function() { setView(item.id); }}
                  style={Object.assign({}, ST.navBtn, view === item.id ? ST.navBtnActive : {})}>
                  <item.icon size={14} strokeWidth={1.5} /><span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <div style={ST.meditationBanner}>
        <Feather size={16} style={{ color: '#8a7a60', flexShrink: 0, marginTop: 4 }} strokeWidth={1.2} />
        <div>
          <div style={ST.meditationText}>&ldquo;{meditation.text}&rdquo;</div>
          <div style={ST.meditationSource}>&mdash; Marcus Aurelius, {meditation.book}</div>
        </div>
      </div>

      <main style={ST.main}>
        {view === 'today' && (
          <div style={ST.grid}>
            <div style={Object.assign({}, ST.statsBar, { gridColumn: '1 / -1' })}>
              <div style={ST.stat}><div style={ST.statNum}>{streak}</div><div style={ST.statLabel}>day streak</div></div>
              <div style={ST.statDivider} />
              <div style={ST.stat}><div style={ST.statNum}>{totalDays}</div><div style={ST.statLabel}>total entries</div></div>
              <div style={ST.statDivider} />
              <div style={ST.stat}><div style={ST.statNum}>{Object.keys(sealedDays).length}</div><div style={ST.statLabel}>days sealed</div></div>
            </div>

            {isTodaySealed && (
              <div style={Object.assign({}, ST.sealedBanner, { gridColumn: '1 / -1' })}>
                <Lock size={16} strokeWidth={1.5} />
                <div>
                  <div style={ST.sealedTitle}>This day is sealed.</div>
                  <div style={ST.sealedSub}>Committed at {new Date(sealedDays[today]).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}. What is written remains.</div>
                </div>
              </div>
            )}

            <section style={ST.card}>
              <div style={ST.cardHeader}>
                <Sun size={18} strokeWidth={1.3} style={{ color: '#c4a060' }} />
                <h2 style={ST.cardTitle}>Matutinus</h2>
                <span style={ST.cardSubtitle}>Morning intention</span>
              </div>
              <label style={ST.label}>Today I resolve to:</label>
              <textarea style={Object.assign({}, ST.textarea, isTodaySealed ? ST.sealedField : {})} value={morningEntry.intention}
                onChange={function(e) { if (!isTodaySealed) setMorningEntry(Object.assign({}, morningEntry, { intention: e.target.value })); }}
                onBlur={!isTodaySealed ? saveMorning : undefined} placeholder="One clear intention..." rows={2} readOnly={isTodaySealed} />
              <label style={ST.label}>An obstacle I may face:</label>
              <textarea style={Object.assign({}, ST.textarea, isTodaySealed ? ST.sealedField : {})} value={morningEntry.obstacle}
                onChange={function(e) { if (!isTodaySealed) setMorningEntry(Object.assign({}, morningEntry, { obstacle: e.target.value })); }}
                onBlur={!isTodaySealed ? saveMorning : undefined} placeholder="What may test me today?" rows={2} readOnly={isTodaySealed} />
              <label style={ST.label}>For this I am grateful:</label>
              <textarea style={Object.assign({}, ST.textarea, isTodaySealed ? ST.sealedField : {})} value={morningEntry.gratitude}
                onChange={function(e) { if (!isTodaySealed) setMorningEntry(Object.assign({}, morningEntry, { gratitude: e.target.value })); }}
                onBlur={!isTodaySealed ? saveMorning : undefined} placeholder="A quiet thing..." rows={2} readOnly={isTodaySealed} />
            </section>

            <section style={ST.card}>
              <div style={ST.cardHeader}>
                <Moon size={18} strokeWidth={1.3} style={{ color: '#6a8090' }} />
                <h2 style={ST.cardTitle}>Vespertinus</h2>
                <span style={ST.cardSubtitle}>Evening examen</span>
              </div>
              <label style={ST.label}>What did I do well?</label>
              <textarea style={Object.assign({}, ST.textarea, isTodaySealed ? ST.sealedField : {})} value={eveningEntry.didWell}
                onChange={function(e) { if (!isTodaySealed) setEveningEntry(Object.assign({}, eveningEntry, { didWell: e.target.value })); }}
                onBlur={!isTodaySealed ? saveEvening : undefined} rows={2} readOnly={isTodaySealed} />
              <label style={ST.label}>Where did I fall short?</label>
              <textarea style={Object.assign({}, ST.textarea, isTodaySealed ? ST.sealedField : {})} value={eveningEntry.didPoorly}
                onChange={function(e) { if (!isTodaySealed) setEveningEntry(Object.assign({}, eveningEntry, { didPoorly: e.target.value })); }}
                onBlur={!isTodaySealed ? saveEvening : undefined} rows={2} readOnly={isTodaySealed} />
              <label style={ST.label}>Tomorrow, I will:</label>
              <textarea style={Object.assign({}, ST.textarea, isTodaySealed ? ST.sealedField : {})} value={eveningEntry.toImprove}
                onChange={function(e) { if (!isTodaySealed) setEveningEntry(Object.assign({}, eveningEntry, { toImprove: e.target.value })); }}
                onBlur={!isTodaySealed ? saveEvening : undefined} rows={2} readOnly={isTodaySealed} />
            </section>

            {!isTodaySealed && (
              <div style={Object.assign({}, ST.sealSection, { gridColumn: '1 / -1' })}>
                <button onClick={sealDay} style={confirmSeal ? ST.sealBtnConfirm : ST.sealBtn}>
                  <Lock size={16} strokeWidth={1.5} />
                  {confirmSeal ? 'Are you sure? What is written cannot be changed.' : 'Seal this day'}
                </button>
                {confirmSeal && <button onClick={function() { setConfirmSeal(false); }} style={ST.sealCancel}>Not yet</button>}
              </div>
            )}
          </div>
        )}

        {view === 'scroll' && (
          <div>
            <div style={ST.sectionHeader}>
              <h2 style={ST.sectionTitle}>Scroll &mdash; Past Reflections</h2>
              <p style={ST.sectionLead}>Your own meditations, gathered.</p>
            </div>
            {Object.keys(journalHistory).length === 0 ? (
              <div style={ST.empty}>
                <Scroll size={32} strokeWidth={1} style={{ color: '#5a5040', marginBottom: 12 }} />
                <p style={ST.emptyText}>The scroll is blank. Begin today.</p>
              </div>
            ) : (
              <div style={ST.historyList}>
                {Object.entries(journalHistory).sort(function(a, b) { return b[0].localeCompare(a[0]); }).map(function(pair) {
                  var date = pair[0], entry = pair[1];
                  return (
                    <div key={date} style={ST.historyCard}>
                      <div style={ST.historyDate}>
                        {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        {sealedDays[date] && <Lock size={14} strokeWidth={1.5} style={{ marginLeft: '8px', color: '#78a050', verticalAlign: 'middle' }} />}
                      </div>
                      {entry.morning && (entry.morning.intention || entry.morning.obstacle || entry.morning.gratitude) && (
                        <div style={ST.historyBlock}>
                          <div style={ST.historyLabel}><Sun size={12} strokeWidth={1.4} /> Matutinus</div>
                          {entry.morning.intention && <div style={ST.historyText}><em>Intention.</em> {entry.morning.intention}</div>}
                          {entry.morning.obstacle && <div style={ST.historyText}><em>Obstacle.</em> {entry.morning.obstacle}</div>}
                          {entry.morning.gratitude && <div style={ST.historyText}><em>Gratitude.</em> {entry.morning.gratitude}</div>}
                        </div>
                      )}
                      {entry.evening && (entry.evening.didWell || entry.evening.didPoorly || entry.evening.toImprove) && (
                        <div style={ST.historyBlock}>
                          <div style={ST.historyLabel}><Moon size={12} strokeWidth={1.4} /> Vespertinus</div>
                          {entry.evening.didWell && <div style={ST.historyText}><em>Did well.</em> {entry.evening.didWell}</div>}
                          {entry.evening.didPoorly && <div style={ST.historyText}><em>Fell short.</em> {entry.evening.didPoorly}</div>}
                          {entry.evening.toImprove && <div style={ST.historyText}><em>Tomorrow.</em> {entry.evening.toImprove}</div>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {view === 'settings' && (
          <div>
            <div style={ST.sectionHeader}>
              <h2 style={ST.sectionTitle}>Cura &mdash; Data &amp; Settings</h2>
              <p style={ST.sectionLead}>Transfer, back up, or reset your practice.</p>
            </div>
            <div style={ST.settingsCard}><div style={ST.settingsItem}>
              <Download size={22} strokeWidth={1.3} style={{ color: '#78a050', flexShrink: 0 }} />
              <div style={{ flex: 1 }}><div style={ST.settingsTitle}>Export your data</div><div style={ST.settingsDesc}>Downloads a backup file with all your journal entries.</div></div>
              <button onClick={exportData} style={ST.settingsBtn}>Export</button>
            </div></div>
            <div style={ST.settingsCard}><div style={ST.settingsItem}>
              <Upload size={22} strokeWidth={1.3} style={{ color: '#c4a060', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={ST.settingsTitle}>Import data</div><div style={ST.settingsDesc}>Load a backup file from another device.</div>
                {importStatus && <div style={Object.assign({}, ST.settingsDesc, { color: importStatus.indexOf('Error') === 0 ? '#c87850' : '#78a050', marginTop: '8px', fontWeight: 500 })}>{importStatus}</div>}
              </div>
              <label style={ST.settingsBtn}>Import<input type="file" accept=".json" onChange={importData} style={{ position: 'absolute', width: 0, height: 0, opacity: 0 }} /></label>
            </div></div>
            <div style={ST.settingsCard}><div style={ST.settingsItem}>
              <X size={22} strokeWidth={1.3} style={{ color: '#c87850', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={ST.settingsTitle}>Clear all data</div>
                <div style={ST.settingsDesc}>Permanently deletes everything on this device.{confirmClear && <span style={{ color: '#c87850', fontWeight: 500, display: 'block', marginTop: '6px' }}>Are you sure? Tap again to confirm.</span>}</div>
              </div>
              <button onClick={clearAllData} style={Object.assign({}, ST.settingsBtn, { borderColor: '#c87850', color: '#c87850' })}>{confirmClear ? 'Confirm' : 'Clear'}</button>
            </div></div>
            <div style={ST.settingsHelp}>
              <div style={ST.settingsHelpTitle}>How to transfer to a new device</div>
              <div style={ST.step}><span style={ST.stepNum}>1</span> On your old device, tap <strong>Export</strong> above.</div>
              <div style={ST.step}><span style={ST.stepNum}>2</span> Send the file to your new device (AirDrop, email, etc).</div>
              <div style={ST.step}><span style={ST.stepNum}>3</span> On the new device, open Meditationes, go to Cura, tap <strong>Import</strong>.</div>
              <div style={ST.step}><span style={ST.stepNum}>4</span> Done. All your journal entries are restored.</div>
            </div>
          </div>
        )}
      </main>

      <footer style={ST.footer}><div style={ST.footerText}>{'\u03A4\u1F70 \u03B5\u1F30\u03C2 \u1F11\u03B1\u03C5\u03C4\u03CC\u03BD'} &middot; To Himself</div></footer>
    </div>
  );
}

var globalCSS = [
  "@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=EB+Garamond:ital,wght@0,400;0,500;1,400&display=swap');",
  "* { box-sizing: border-box; }",
  "body { margin: 0; background: #141210; }",
  "textarea:focus, input:focus { outline: none; border-color: #c4a060 !important; }",
  "textarea::placeholder { color: #5a5040; font-style: italic; }",
  "button { cursor: pointer; font-family: inherit; }"
].join('\n');

var ST = {
  app: { minHeight: '100vh', backgroundColor: '#141210', backgroundImage: "radial-gradient(ellipse at top left, rgba(100,80,50,0.08), transparent 50%), radial-gradient(ellipse at bottom right, rgba(80,60,30,0.06), transparent 50%)", color: '#e0d5c0', fontFamily: "'EB Garamond', Georgia, serif", paddingBottom: '80px' },
  loadingScreen: { minHeight: '100vh', backgroundColor: '#141210', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cormorant Garamond', serif" },
  loadingText: { fontSize: '2rem', fontStyle: 'italic', color: '#c4a060', letterSpacing: '0.1em' },
  header: { borderBottom: '1px solid rgba(196,160,96,0.15)', backgroundColor: 'rgba(20,18,16,0.9)', backdropFilter: 'blur(8px)', position: 'sticky', top: 0, zIndex: 10 },
  headerInner: { maxWidth: '800px', margin: '0 auto', padding: '20px 24px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' },
  brand: { display: 'flex', alignItems: 'center', gap: '14px' },
  brandMark: { width: '46px', height: '46px', border: '1.5px solid #c4a060', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cormorant Garamond', serif", fontSize: '0.95rem', fontWeight: 500, color: '#c4a060', letterSpacing: '0.05em' },
  brandTitle: { fontFamily: "'Cormorant Garamond', serif", fontSize: '1.75rem', fontWeight: 500, fontStyle: 'italic', lineHeight: 1, color: '#e0d5c0' },
  brandSub: { fontSize: '0.8rem', color: '#8a7a60', marginTop: '4px', letterSpacing: '0.02em' },
  nav: { display: 'flex', gap: '4px' },
  navBtn: { display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', border: '1px solid transparent', background: 'transparent', color: '#8a7a60', fontFamily: "'EB Garamond', serif", fontSize: '0.95rem', borderRadius: '2px', transition: 'all 0.2s', letterSpacing: '0.03em' },
  navBtnActive: { backgroundColor: 'rgba(196,160,96,0.1)', border: '1px solid rgba(196,160,96,0.25)', color: '#e0d5c0' },
  meditationBanner: { maxWidth: '800px', margin: '28px auto 0', padding: '0 24px', display: 'flex', gap: '14px', alignItems: 'flex-start' },
  meditationText: { fontFamily: "'Cormorant Garamond', serif", fontSize: '1.35rem', fontStyle: 'italic', lineHeight: 1.5, color: '#d0c4a8', fontWeight: 300 },
  meditationSource: { fontSize: '0.8rem', color: '#8a7a60', marginTop: '6px', letterSpacing: '0.05em' },
  main: { maxWidth: '800px', margin: '0 auto', padding: '32px 24px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' },
  statsBar: { display: 'flex', justifyContent: 'center', gap: '24px', alignItems: 'center', padding: '16px 20px', backgroundColor: 'rgba(28,25,22,0.6)', border: '1px solid rgba(196,160,96,0.08)', borderRadius: '2px' },
  stat: { textAlign: 'center' },
  statNum: { fontFamily: "'Cormorant Garamond', serif", fontSize: '1.8rem', fontWeight: 500, color: '#c4a060', lineHeight: 1 },
  statLabel: { fontSize: '0.7rem', color: '#8a7a60', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '4px' },
  statDivider: { width: '1px', height: '32px', backgroundColor: 'rgba(196,160,96,0.12)' },
  card: { backgroundColor: 'rgba(28,25,22,0.8)', border: '1px solid rgba(196,160,96,0.12)', borderRadius: '2px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' },
  cardHeader: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid rgba(196,160,96,0.1)' },
  cardTitle: { margin: 0, fontFamily: "'Cormorant Garamond', serif", fontSize: '1.5rem', fontWeight: 500, fontStyle: 'italic', color: '#e0d5c0' },
  cardSubtitle: { fontSize: '0.8rem', color: '#8a7a60', marginLeft: 'auto', letterSpacing: '0.04em', fontStyle: 'italic' },
  label: { display: 'block', fontSize: '0.85rem', color: '#8a7a60', marginBottom: '6px', marginTop: '14px', letterSpacing: '0.02em', fontStyle: 'italic' },
  textarea: { width: '100%', padding: '10px 12px', border: '1px solid rgba(196,160,96,0.15)', borderRadius: '2px', backgroundColor: 'rgba(22,20,17,0.6)', fontFamily: "'EB Garamond', serif", fontSize: '1rem', lineHeight: 1.5, color: '#d0c4a8', resize: 'vertical', transition: 'border-color 0.2s' },
  sealedBanner: { display: 'flex', gap: '14px', alignItems: 'center', padding: '18px 20px', backgroundColor: 'rgba(120,160,80,0.08)', border: '1px solid rgba(120,160,80,0.2)', borderRadius: '2px', color: '#78a050' },
  sealedTitle: { fontFamily: "'Cormorant Garamond', serif", fontSize: '1.2rem', fontStyle: 'italic', fontWeight: 500, color: '#8ab860' },
  sealedSub: { fontSize: '0.85rem', color: '#78a050', marginTop: '2px', fontStyle: 'italic' },
  sealedField: { backgroundColor: 'rgba(120,160,80,0.04)', borderColor: 'rgba(120,160,80,0.12)', color: '#9a8e78', cursor: 'default' },
  sealSection: { textAlign: 'center', padding: '8px 0' },
  sealBtn: { display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '14px 28px', border: '1px solid rgba(196,160,96,0.25)', backgroundColor: 'transparent', color: '#8a7a60', fontFamily: "'Cormorant Garamond', serif", fontSize: '1.15rem', fontStyle: 'italic', borderRadius: '2px', transition: 'all 0.25s' },
  sealBtnConfirm: { display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '14px 28px', border: '1px solid #c87850', backgroundColor: 'rgba(200,120,80,0.1)', color: '#c87850', fontFamily: "'Cormorant Garamond', serif", fontSize: '1.05rem', fontStyle: 'italic', borderRadius: '2px', transition: 'all 0.25s' },
  sealCancel: { display: 'inline-block', marginLeft: '12px', padding: '14px 20px', border: 'none', backgroundColor: 'transparent', color: '#8a7a60', fontFamily: "'EB Garamond', serif", fontSize: '0.95rem', fontStyle: 'italic' },
  sectionHeader: { marginBottom: '28px', borderBottom: '1px solid rgba(196,160,96,0.12)', paddingBottom: '16px' },
  sectionTitle: { fontFamily: "'Cormorant Garamond', serif", fontSize: '2.2rem', fontWeight: 400, fontStyle: 'italic', margin: 0, color: '#e0d5c0' },
  sectionLead: { fontSize: '0.95rem', color: '#8a7a60', marginTop: '6px', fontStyle: 'italic' },
  empty: { padding: '60px 20px', textAlign: 'center', backgroundColor: 'rgba(28,25,22,0.5)', border: '1px dashed rgba(196,160,96,0.15)', borderRadius: '2px' },
  emptyText: { fontStyle: 'italic', color: '#8a7a60', fontSize: '1.05rem' },
  historyList: { display: 'grid', gap: '18px' },
  historyCard: { backgroundColor: 'rgba(28,25,22,0.8)', border: '1px solid rgba(196,160,96,0.12)', borderRadius: '2px', padding: '22px' },
  historyDate: { fontFamily: "'Cormorant Garamond', serif", fontSize: '1.25rem', fontStyle: 'italic', color: '#e0d5c0', paddingBottom: '10px', marginBottom: '12px', borderBottom: '1px solid rgba(196,160,96,0.1)' },
  historyBlock: { marginBottom: '12px' },
  historyLabel: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#c4a060', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' },
  historyText: { fontSize: '0.98rem', color: '#b0a490', marginBottom: '4px', lineHeight: 1.5 },
  settingsCard: { backgroundColor: 'rgba(28,25,22,0.8)', border: '1px solid rgba(196,160,96,0.12)', borderRadius: '2px', padding: '20px', marginBottom: '14px' },
  settingsItem: { display: 'flex', gap: '16px', alignItems: 'flex-start' },
  settingsTitle: { fontFamily: "'Cormorant Garamond', serif", fontSize: '1.25rem', fontStyle: 'italic', fontWeight: 500, color: '#e0d5c0', marginBottom: '4px' },
  settingsDesc: { fontSize: '0.9rem', color: '#8a7a60', lineHeight: 1.5 },
  settingsBtn: { position: 'relative', flexShrink: 0, padding: '10px 20px', border: '1px solid #c4a060', backgroundColor: 'transparent', color: '#c4a060', fontFamily: "'EB Garamond', serif", fontSize: '0.95rem', borderRadius: '2px', cursor: 'pointer', alignSelf: 'flex-start', marginTop: '2px' },
  settingsHelp: { backgroundColor: 'rgba(28,25,22,0.8)', border: '1px solid rgba(196,160,96,0.12)', borderRadius: '2px', padding: '24px', marginTop: '28px' },
  settingsHelpTitle: { fontFamily: "'Cormorant Garamond', serif", fontSize: '1.3rem', fontStyle: 'italic', fontWeight: 500, color: '#e0d5c0', marginBottom: '16px' },
  step: { display: 'flex', gap: '12px', alignItems: 'flex-start', fontSize: '0.95rem', color: '#b0a490', lineHeight: 1.5, marginBottom: '12px' },
  stepNum: { flexShrink: 0, width: '26px', height: '26px', borderRadius: '50%', border: '1px solid #c4a060', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cormorant Garamond', serif", fontSize: '0.9rem', color: '#c4a060', fontWeight: 500 },
  footer: { maxWidth: '800px', margin: '40px auto 0', padding: '0 24px', textAlign: 'center' },
  footerText: { fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: '0.95rem', color: '#5a5040', letterSpacing: '0.08em' }
};
