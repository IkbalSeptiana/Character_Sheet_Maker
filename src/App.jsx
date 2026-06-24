import { useContext, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { ApiProvider, ApiContext } from './context/ApiContext';
import CharRefGenerator from './components/CharRefGenerator';
import PhotoPromptBuilder from './components/PhotoPromptBuilder';
import CharacterFileGenerator from './components/CharacterFileGenerator';

// ─── KOMPONEN GLOBAL API MODAL ───────────────────────────────────────────────
function GlobalApiModal() {
  const { 
    defaultProviders, apiKeys, setApiKeys, 
    activeProviderId, setActiveProviderId, 
    activeKeyId, setActiveKeyId, 
    orModel, setOrModel,
    geminiModel, setGeminiModel, setIsApiModalOpen 
  } = useContext(ApiContext);

  const [showAddForm, setShowAddForm] = useState(false);
  const [formKey, setFormKey] = useState({ label: '', format: 'openai', key: '' });
  const [isCustomModel, setIsCustomModel] = useState(false);

  const currentProvider = defaultProviders.find(p => p.id === activeProviderId);
  const compatibleKeys = apiKeys.filter(k => k.format === currentProvider?.format);

  // Daftar Model Populer sebagai preset jalan pintas
  const orPresets = [
    'anthropic/claude-3.5-sonnet',
    'deepseek/deepseek-chat',
    'meta-llama/llama-3.3-70b-instruct',
    'google/gemini-2.5-pro',
    'nousresearch/hermes-3-llama-3.1-405b',
    'mistralai/mixtral-8x22b-instruct'
  ];

  const geminiPresets = [
    'gemini-3.5-flash',
    'gemini-3-flash-preview',
    'gemini-3.1-flash-lite',
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite'
  ];

  const currentModelList = activeProviderId === 'prov_or' ? orPresets : geminiPresets;
  const currentModelValue = activeProviderId === 'prov_or' ? orModel : geminiModel;
  const setCurrentModelValue = activeProviderId === 'prov_or' ? setOrModel : setGeminiModel;

  const handleProviderChange = (provId) => {
    setActiveProviderId(provId);
    const targetProv = defaultProviders.find(p => p.id === provId);
    const validKeysForProv = apiKeys.filter(k => k.format === targetProv.format);
    setActiveKeyId(validKeysForProv.length > 0 ? validKeysForProv[0].id : '');
    setIsCustomModel(false);
  };

  const saveKeyForm = () => {
    if (!formKey.label || !formKey.key) return alert("Isi Label dan API Key!");
    const newKey = { ...formKey, id: 'key_' + Date.now() };
    setApiKeys(prev => [...prev, newKey]);
    if (newKey.format === currentProvider.format) setActiveKeyId(newKey.id);
    setShowAddForm(false);
    setFormKey({ label: '', format: 'openai', key: '' });
  };

  const deleteKey = (id) => {
    if (confirm("Hapus API Key ini?")) {
      setApiKeys(prev => prev.filter(k => k.id !== id));
      if (activeKeyId === id) setActiveKeyId('');
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', width: '650px', maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
        
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>⚙ Global API Settings</h2>
          <button onClick={() => setIsApiModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-2)', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* BARIS 1: PROVIDER & KEYS LINKED */}
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-2)', fontWeight: 600, letterSpacing: '1px' }}>1. ACTIVE PROVIDER</label>
              <select style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-1)', padding: '12px', borderRadius: '8px', cursor: 'pointer', outline: 'none' }} value={activeProviderId} onChange={e => handleProviderChange(e.target.value)}>
                {defaultProviders.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-2)', fontWeight: 600, letterSpacing: '1px' }}>2. ATTACHED API KEY</label>
              <select style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-1)', padding: '12px', borderRadius: '8px', cursor: 'pointer', outline: 'none' }} value={activeKeyId} onChange={e => setActiveKeyId(e.target.value)}>
                <option value="">-- Pilih Kunci Vault --</option>
                {compatibleKeys.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
              </select>
            </div>
          </div>

          {/* BARIS 2: DINAMIS SELEKSI MODEL */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(214,175,55,0.03)', border: '1px solid rgba(214,175,55,0.15)', padding: '16px', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 600, letterSpacing: '1px' }}>3. ENGINE MODEL SELECTION</label>
              <button 
                onClick={() => setIsCustomModel(!isCustomModel)} 
                style={{ background: 'transparent', border: 'none', color: 'var(--text-2)', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
              >
                {isCustomModel ? "← Gunakan Daftar Preset" : "✍ Tulis Model ID Kustom"}
              </button>
            </div>

            {isCustomModel ? (
              <input 
                type="text" 
                style={{ background: 'var(--surface)', border: '1px solid var(--accent)', color: 'var(--text-1)', padding: '12px', borderRadius: '8px', outline: 'none', fontFamily: 'var(--font-mono)', fontSize: '13px' }} 
                value={currentModelValue} 
                onChange={e => setCurrentModelValue(e.target.value)} 
                placeholder={activeProviderId === 'prov_or' ? "e.g. meta-llama/llama-3.1-70b-instruct" : "e.g. gemini-1.5-pro"} 
              />
            ) : (
              <select 
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-1)', padding: '12px', borderRadius: '8px', cursor: 'pointer', outline: 'none' }} 
                value={currentModelList.includes(currentModelValue) ? currentModelValue : ""} 
                onChange={e => {
                  if (e.target.value === "custom") { setIsCustomModel(true); } 
                  else { setCurrentModelValue(e.target.value); }
                }}
              >
                {!currentModelList.includes(currentModelValue) && <option value="">Custom Model Active: {currentModelValue}</option>}
                {currentModelList.map(m => <option key={m} value={m}>{m}</option>)}
                <option value="custom">-- Ketik nama model kustom lainnya... --</option>
              </select>
            )}
            <div style={{ fontSize: '11px', color: 'var(--text-2)', marginTop: '2px' }}>Model yang sedang berjalan: <strong style={{ color: 'var(--text-1)' }}>{currentModelValue}</strong></div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '4px 0' }} />

          {/* VAULT KEY MANAGEMENT */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-2)', fontWeight: 600, letterSpacing: '1px' }}>🔑 SAVED KEYS VAULT</label>
            
            {apiKeys.length === 0 && <div style={{ color: 'var(--text-3)', fontSize: '13px', fontStyle: 'italic' }}>Belum ada API Key tersimpan di dalam Brankas.</div>}
            
            {apiKeys.map(k => (
              <div key={k.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-2)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontWeight: '600', color: 'var(--text-1)', fontSize: '14px' }}>{k.label}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>Format: {k.format.toUpperCase()} · {k.key.substring(0, 10)}...</div>
                </div>
                <button onClick={() => deleteKey(k.id)} style={{ background: 'transparent', border: '1px solid var(--danger-faint)', color: 'var(--error)', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Hapus</button>
              </div>
            ))}

            {!showAddForm && (
              <button onClick={() => setShowAddForm(true)} style={{ background: 'transparent', border: '1px dashed var(--border)', color: 'var(--text-2)', padding: '12px', borderRadius: '8px', cursor: 'pointer', width: '100%', marginTop: '4px' }}>+ Simpan Key Baru ke Vault</button>
            )}

            {showAddForm && (
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '16px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}><label style={{ fontSize: '12px', color: 'var(--text-2)' }}>Label Key</label><input type="text" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-1)', padding: '10px', borderRadius: '6px', outline: 'none' }} value={formKey.label} onChange={e => setFormKey({...formKey, label: e.target.value})} placeholder="e.g. Akun Utama OpenRouter" /></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}><label style={{ fontSize: '12px', color: 'var(--text-2)' }}>Tipe Kunci</label><select style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-1)', padding: '10px', borderRadius: '6px', outline: 'none' }} value={formKey.format} onChange={e => setFormKey({...formKey, format: e.target.value})}><option value="openai">OpenRouter / OpenAI</option><option value="google">Google Gemini Native</option></select></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}><label style={{ fontSize: '12px', color: 'var(--text-2)' }}>Paste API Key</label><input type="password" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-1)', padding: '10px', borderRadius: '6px', outline: 'none' }} value={formKey.key} onChange={e => setFormKey({...formKey, key: e.target.value})} placeholder="sk-..." /></div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                  <button onClick={() => setShowAddForm(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-2)', cursor: 'pointer' }}>Batal</button>
                  <button onClick={saveKeyForm} style={{ background: 'var(--text-1)', color: 'var(--bg)', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>Simpan Ke Vault</button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── KOMPONEN APLIKASI UTAMA ─────────────────────────────────────────────────
function AppShell() {
  const { isApiModalOpen, setIsApiModalOpen, activeConfig } = useContext(ApiContext);
  const location = useLocation();

  const linkStyle = (path) => ({
    padding: '10px 16px', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: '500',
    background: location.pathname === path ? 'var(--surface-2)' : 'transparent',
    color: location.pathname === path ? 'var(--text-1)' : 'var(--text-2)',
    transition: 'all 0.2s ease', border: location.pathname === path ? '1px solid var(--border)' : '1px solid transparent'
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* HEADER NAVIGASI GLOBAL */}
      <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '12px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link to="/" style={linkStyle('/')}>👤 Character Reference</Link>
          <Link to="/photo-prompt" style={linkStyle('/photo-prompt')}>◈ Photo Prompt Builder</Link>
          <Link to="/character-file" style={linkStyle('/character-file')}>📝 Character File</Link>
        </div>

        <button 
          onClick={() => setIsApiModalOpen(true)}
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-1)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '500' }}
        >
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: activeConfig ? 'var(--success)' : 'var(--error)' }}></span>
          {activeConfig ? activeConfig.name : "Setup API"} ⚙
        </button>

      </header>

      {/* RENDER KONTEN TAB */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Routes>
          <Route path="/" element={<CharRefGenerator />} />
          <Route path="/photo-prompt" element={<PhotoPromptBuilder />} />
          <Route path="/character-file" element={<CharacterFileGenerator />} />
        </Routes>
      </main>

      {isApiModalOpen && <GlobalApiModal />}
    </div>
  );
}

export default function App() {
  return (
    <ApiProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </ApiProvider>
  );
}