import { createContext, useState, useEffect } from 'react';

// eslint-disable-next-line react-refresh/only-export-components
export const ApiContext = createContext();

export function ApiProvider({ children }) {
  // Data dasar provider tanpa mengunci nama modelnya secara permanen
  const defaultProviders = [
    { id: 'prov_or', name: 'OpenRouter (Claude/Llama/DeepSeek)', format: 'openai', url: 'https://openrouter.ai/api/v1/chat/completions' },
    { id: 'prov_gem', name: 'Google Gemini Native', format: 'google', url: 'https://generativelanguage.googleapis.com/v1beta/models/' }
  ];

  const [apiKeys, setApiKeys] = useState(() => {
    const saved = localStorage.getItem("global_api_keys");
    return saved ? JSON.parse(saved) : [];
  });

  const [activeProviderId, setActiveProviderId] = useState(() => localStorage.getItem("global_active_provider") || 'prov_or');
  const [activeKeyId, setActiveKeyId] = useState(() => localStorage.getItem("global_active_key") || '');
  
  // 🔥 STATE BARU: Menyimpan pilihan model dinamis per provider
  const [orModel, setOrModel] = useState(() => localStorage.getItem("global_or_model") || 'anthropic/claude-3.5-sonnet');
  const [geminiModel, setGeminiModel] = useState(() => localStorage.getItem("global_gemini_model") || 'gemini-2.5-flash');

  const [isApiModalOpen, setIsApiModalOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("global_api_keys", JSON.stringify(apiKeys));
    localStorage.setItem("global_active_provider", activeProviderId);
    localStorage.setItem("global_active_key", activeKeyId);
    localStorage.setItem("global_or_model", orModel);
    localStorage.setItem("global_gemini_model", geminiModel);
  }, [apiKeys, activeProviderId, activeKeyId, orModel, geminiModel]);

  const baseProvider = defaultProviders.find(p => p.id === activeProviderId) || defaultProviders[0];
  const selectedKey = apiKeys.find(k => k.id === activeKeyId);
  
  // Menggabungkan konfigurasi provider aktif, model aktif, dan key aktif
  const activeConfig = {
    ...baseProvider,
    model: activeProviderId === 'prov_or' ? orModel : geminiModel,
    apiKey: selectedKey ? selectedKey.key : ''
  };

  return (
    <ApiContext.Provider value={{ 
      defaultProviders, apiKeys, setApiKeys, 
      activeProviderId, setActiveProviderId, 
      activeKeyId, setActiveKeyId, 
      orModel, setOrModel,
      geminiModel, setGeminiModel,
      activeConfig, isApiModalOpen, setIsApiModalOpen 
    }}>
      {children}
    </ApiContext.Provider>
  );
}