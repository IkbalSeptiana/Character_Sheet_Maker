import { useState, useRef, useContext } from "react";
import { ApiContext } from "../context/ApiContext";
import { fetchFromLLM } from "../utils/api";

// ─── TEMPLATES ────────────────────────────────────────────────────────────────
const DEFAULT_TPL_SYSTEM = `You are an elite AI photography creative director and prompt engineer. Your job is to generate hyper-detailed, technically precise image generation prompts.

ABSOLUTE RULES:
1. DENSE DESCRIPTIONS: Write in thick, continuous sentences. Never use lazy one-liners.
2. SUBJECT IDENTITY IS SACRED: Use ONLY the character data in the SUBJECT IDENTITY block. Never add, modify, or invent any physical traits not present there.
3. STYLING RULE: In "Subject Identity & Styling", ONLY write clothing and accessories. Do NOT re-describe hair color, eye color, skin tone, or facial features — those are already locked in INSTRUCTION [LOCKED]. The only exception is "Hairstyling matching the provided character reference sheet" for the hairstyling line.
4. ANATOMICAL POSE: Use "WITH" chains for body mechanics.
5. FOREGROUND LOGIC: If angle is "high-angle", "top-down", "overhead", "drone", or "bird's eye" → foreground = "None". Otherwise write a specific 20-word physical object blocking part of the lens.
6. COLOR PALETTE: Always end Environment with "Overall scene features a [vibe] color palette of [exactly 6 specific named colors]."
7. OUTPUT FORMAT: Follow the structural template EXACTLY. No extra commentary.
8. Start output directly with "INSTRUCTION [LOCKED]:"`;

const DEFAULT_TPL_COUPLE = `=== COUPLE TEMPLATE ===
INSTRUCTION [LOCKED]: Use the provided character reference sheets as the primary visual guides. Maintain an extremely strong and accurate resemblance to both characters.
- For the female character: Preserve all facial features, facial structure, hair, skin tone, eye shape, and every distinctive marker exactly as shown in the character sheet.
- For the male character: Preserve all facial features, facial structure, hair, skin tone, eye shape, and every distinctive marker exactly as shown in the character sheet.
Do not stylize, exaggerate, or modify the core identity of either person.
Positive Prompt:
Core Aesthetic: Photorealistic authentic lifestyle snapshot of two subjects in [LOCATION], [MOOD].
Foreground obstruction: [FOREGROUND LOGIC].
Subject Identity & Styling (Female): Hairstyling matching the provided character reference sheet. Exact face matching the provided character reference sheet. Clothing: [30-word hyper-specific expansion — exact fabric, color, cut, fit, wear pattern. NO hair/face/skin]. Wearable Accessories: [Body/head/face accessories only, or "No accessories"].
Subject Identity & Styling (Male): Hairstyling matching the provided character reference sheet. Exact face matching the provided character reference sheet. Clothing: [30-word hyper-specific expansion — exact fabric, color, cut, fit, wear pattern. NO hair/face/skin]. Wearable Accessories: [Body/head/face accessories only, or "No accessories"].
Pose and Action (Shared Interaction): Two subjects [spatial proximity]. [Female: 20-word anatomical WITH-chain]. [Male: 20-word anatomical WITH-chain]. Female exhibiting [15-word micro-expression]. Male exhibiting [15-word micro-expression]. All other hands and limbs completely hidden from view out of frame. Cropped exactly at [CROP POINT].
Environment & Lighting: [LOCATION FULL NAME], [60-word hyper-specific background]. [Lighting setup]. Overall scene features a [vibe] color palette of [6 specific named colors].
Camera & Technical Specs: Shot framed as [SHOT TYPE] from [angle]. [Lens mm, f/aperture, shutter speed, ISO, film stock, grain, color science].
Negative Prompt:
Semirealism, CGI, 3d render, airbrushed skin, doll face, wax figure, plastic skin, perfect symmetry, magazine editorial, stock photography, extra fingers, studio lighting, floating limbs, disconnected arms, amputated hands, professional retouching, artificial bounce light, rim light, full body, shallow depth of field, bokeh, blurred background, tilt shift, soft focus, watermark.`;

const DEFAULT_TPL_SOLO_F = `=== SOLO FEMALE TEMPLATE ===
INSTRUCTION [LOCKED]: Use the provided female character reference sheet as the primary visual guide. Maintain an extremely strong and accurate resemblance to the character shown. Preserve every facial feature, structure, hair, skin tone, and distinctive marker exactly as in the sheet.
Positive Prompt:
Core Aesthetic: Photorealistic authentic lifestyle snapshot of one female subject in [LOCATION], [MOOD].
Foreground obstruction: [FOREGROUND LOGIC].
Subject Identity & Styling (Female): Hairstyling matching the provided character reference sheet. Exact face matching the provided character reference sheet. Clothing: [30-word hyper-specific expansion — exact fabric, color, cut, fit, wear pattern. NO hair/face/skin]. Wearable Accessories: [Body/head/face accessories only, or "No accessories"].
Pose and Action (Female): [25-word anatomical WITH-chain]. Female exhibiting [15-word micro-expression and eye contact direction]. All other hands and limbs completely hidden from view out of frame. Cropped exactly at [CROP POINT].
Environment & Lighting: [LOCATION FULL NAME], [60-word hyper-specific background]. [Lighting setup]. Overall scene features a [vibe] color palette of [6 specific named colors].
Camera & Technical Specs: Shot framed as [SHOT TYPE] from [angle]. [Lens mm, f/aperture, shutter speed, ISO, film stock, grain, color science].
Negative Prompt:
Semirealism, CGI, 3d render, airbrushed skin, doll face, wax figure, plastic skin, perfect symmetry, magazine editorial, stock photography, extra fingers, studio lighting, floating limbs, disconnected arms, amputated hands, professional retouching, glossy skin, artificial bounce light, rim light, arms, hands, fingers, torso, waist down, full body, shallow depth of field, bokeh, blurred background, portrait mode, tilt shift, macro, soft focus.`;

const DEFAULT_TPL_SOLO_M = `=== SOLO MALE TEMPLATE ===
INSTRUCTION [LOCKED]: Use the provided male character reference sheet as the primary visual guide. Maintain an extremely strong and accurate resemblance to the character shown. Preserve every facial feature, structure, hair, skin tone, and distinctive marker exactly as in the sheet.
Positive Prompt:
Core Aesthetic: Photorealistic authentic lifestyle snapshot of one male subject in [LOCATION], [MOOD].
Foreground obstruction: [FOREGROUND LOGIC].
Subject Identity & Styling (Male): Hairstyling matching the provided character reference sheet. Exact face matching the provided character reference sheet. Clothing: [30-word hyper-specific expansion — exact fabric, color, cut, fit, wear pattern. NO hair/face/skin]. Wearable Accessories: [Body/head/face accessories only, or "No accessories"].
Pose and Action (Male): [25-word anatomical WITH-chain]. Male exhibiting [15-word micro-expression and eye contact direction]. All other hands and limbs completely hidden from view out of frame. Cropped exactly at [CROP POINT].
Environment & Lighting: [LOCATION FULL NAME], [60-word hyper-specific background]. [Lighting setup]. Overall scene features a [vibe] color palette of [6 specific named colors].
Camera & Technical Specs: Shot framed as [SHOT TYPE] from [angle]. [Lens mm, f/aperture, shutter speed, ISO, film stock, grain, color science].
Negative Prompt:
Semirealism, CGI, 3d render, airbrushed skin, doll face, wax figure, plastic skin, perfect symmetry, magazine editorial, stock photography, extra fingers, studio lighting, floating limbs, disconnected arms, amputated hands, professional retouching, glossy skin, artificial bounce light, rim light, arms, hands, fingers, torso, waist down, full body, shallow depth of field, bokeh, blurred background, portrait mode, tilt shift, macro, soft focus.`;

// ─── OPTIONS ──────────────────────────────────────────────────────────────────
const SHOT_TYPES = [
  "Close-up (chin to crown)", "Medium close-up (chest up)", "Medium shot (waist up)",
  "Medium-long shot (thigh up)", "Full body", "Extreme close-up (face only)",
  "Over-the-shoulder", "POV selfie"
];
const CROP_POINTS = [
  "lower chest", "mid-chest", "upper chest", "collarbone", "shoulders",
  "waist", "mid-torso", "hips", "mid-thigh", "knees"
];
const GENRES = [
  "Lifestyle snapshot", "Cinematic film still", "Street photography",
  "Travel editorial", "Aesthetic OOTD", "Candid documentary",
  "Acubi / Korean aesthetic", "Moodboard editorial", "Golden hour portrait"
];

// ─── PROMPTS ──────────────────────────────────────────────────────────────────

// Analisis foto style — HANYA aesthetic/mood/kamera, BUKAN orang
const SYSTEM_ANALYZE_STYLE = `You are an expert photography AI analyst. Analyze the uploaded photo(s) for their VISUAL AESTHETIC ONLY — not the people in them.

Extract:
1. The overall photography style and aesthetic feel
2. Camera technique, lens feel, angle
3. Color grading and film stock character
4. Mood and atmosphere

Return ONLY a valid JSON object:
{
  "styleAnalysis": "2-3 sentence description of the photo's aesthetic, vibe, and visual style",
  "inferredCameraStyle": "inferred lens mm, aperture feel, film stock or digital look",
  "inferredMoodPalette": "dominant mood and exactly 5-6 specific color names visible in the photo",
  "suggestedGenre": "one of: Lifestyle snapshot | Cinematic film still | Street photography | Travel editorial | Acubi / Korean aesthetic | Golden hour portrait",
  "locationContext": "if a specific place is identifiable, name it, else empty string"
}

IMPORTANT: Do NOT describe or analyze any people, faces, hair, clothing, or body in this response. Focus ONLY on the photographic style, lighting, colors, and atmosphere.`;

// Analisis character sheet — extract identitas penuh dari sheet
const SYSTEM_ANALYZE_CHARACTER = (gender) => `You are an expert AI character analyst. You are looking at a CHARACTER REFERENCE SHEET for a ${gender} character.

The sheet contains sections: Feature Details (eye/lips/cheek/hair/hand/profile macro shots), Headshots (4x3 grid of face angles), Full Body Shots (5 body angle panels), and Main Portrait.

Extract EVERY physical detail you can observe. Be extremely precise — this data will be used to recreate this exact person in AI image generation.

Return ONLY a valid JSON object:
{
  "name": "character name if visible on sheet, else empty string",
  "gender": "${gender}",
  "hair": {
    "length": "exact length description",
    "texture": "texture and quality",
    "color": "precise color with highlights/lowlights",
    "style": "how it's cut and styled",
    "special": "any distinctive styling features"
  },
  "face": {
    "shape": "face shape",
    "eyes": "eye shape, size, color, double/monolid, any distinctive features",
    "brows": "brow shape, thickness, color",
    "nose": "nose bridge height, tip shape, width",
    "lips": "lip shape, fullness, color",
    "cheeks": "cheekbone prominence, face width",
    "jaw": "jawline shape and definition",
    "chin": "chin shape",
    "distinctiveMarks": "freckles, moles, dimples, scars, or 'none'"
  },
  "skin": {
    "tone": "precise skin tone",
    "undertone": "warm/cool/neutral undertone",
    "texture": "texture notes — smooth, pores visible, etc"
  },
  "facialHair": "${gender === 'male' ? 'describe facial hair exactly — beard, mustache, stubble, clean-shaven' : 'N/A'}",
  "accessories": "any glasses, piercings, or permanent features always visible",
  "bodyBuild": "overall build and body type as seen in full body shots",
  "height": "estimated height impression — tall/average/petite",
  "hands": "nail shape, length, color, hand skin tone from hand detail panel"
}`;

// Generate ideas dari style analysis
const buildIdeasPrompt = (styleAnalysis, charFemale, charMale, userDirectives) => {
  const hasStyle = !!styleAnalysis;
  const hasFemale = !!charFemale;
  const hasMale = !!charMale;

  const genderCtx = hasFemale && hasMale ? "a couple (one female, one male)"
    : hasFemale ? "a solo female subject"
    : hasMale ? "a solo male subject"
    : "lifestyle subjects";

  const styleBlock = hasStyle
    ? `STYLE REFERENCE (from uploaded mood/style photos — use this to anchor ALL ideas visually):
- Overall Aesthetic: ${styleAnalysis.styleAnalysis}
- Camera Feel: ${styleAnalysis.inferredCameraStyle}
- Mood & Colors: ${styleAnalysis.inferredMoodPalette}
- Genre: ${styleAnalysis.suggestedGenre}
RULE: Every idea's cameraStyle and mood MUST feel like a natural extension of this aesthetic.`
    : "No style reference — use warm, natural, clean lifestyle aesthetic.";

  return `You are an elite photography creative director. Generate exactly 15 VARIED scene ideas for ${genderCtx}.

${styleBlock}

USER DIRECTIVES: ${userDirectives || "Generate lifestyle scenes — romantic, candid, cinematic."}

STRICT RULES:
1. REAL WORLD LOCATIONS: Use specific named places with city/country (e.g., "% Arabica, Arashiyama, Kyoto, Japan").
2. OUTFIT ONLY: The "clothing" field = SHORT outfit concept max 15 words. NO hair, face, or skin descriptions.
3. VARY: Mix indoor/outdoor, day/night, urban/nature, different countries across 15 ideas.
4. FOREGROUND: For overhead/drone/high-angle ideas, note "aerial" in cameraStyle so foreground = None later.

Return ONLY a valid JSON array of exactly 15 objects:
[
  {
    "id": 1,
    "sceneName": "max 5-word evocative title",
    "location": "Specific Place Name, City, Country",
    "mood": "atmospheric mood, max 10 words",
    "clothing": "BRIEF outfit concept only, max 15 words",
    "pose": "brief action/pose, max 20 words",
    "cameraStyle": "lens feel, angle, film stock inspired by style reference",
    "suggestedShotType": "one of: Close-up (chin to crown) | Medium close-up (chest up) | Medium shot (waist up) | Full body | POV selfie | Over-the-shoulder",
    "suggestedCrop": "one of: lower chest | mid-torso | waist | mid-thigh | knees",
    "genre": "one of: Lifestyle snapshot | Cinematic film still | Street photography | Travel editorial | Acubi / Korean aesthetic | Golden hour portrait"
  }
]`;
};

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export default function PhotoPromptBuilder() {
  const { activeConfig } = useContext(ApiContext);

  // Stage: INPUT | LOADING_IDEAS | SELECT | GENERATING
  const [stage, setStage] = useState("INPUT");
  const [userDirectives, setUserDirectives] = useState("");

  // Style reference photos (untuk aesthetic/mood/ideas)
  const [styleImages, setStyleImages] = useState([]);
  const [styleAnalysis, setStyleAnalysis] = useState(null);

  // Character sheets
  const [charSheetF, setCharSheetF] = useState(null);  // { url, b64, type, analysis }
  const [charSheetM, setCharSheetM] = useState(null);

  // Ideas + selections
  const [ideas, setIdeas] = useState([]);
  const [selections, setSelections] = useState({});
  const [cardSettings, setCardSettings] = useState({});

  // Results
  const [results, setResults] = useState([]);

  // UI
  const [toast, setToast] = useState(null);
  const [showTplModal, setShowTplModal] = useState(false);
  const [showCharModal, setShowCharModal] = useState(null); // 'female' | 'male' | null

  const styleInputRef = useRef(null);
  const charFInputRef = useRef(null);
  const charMInputRef = useRef(null);

  const [templates, setTemplates] = useState(() => {
    const saved = localStorage.getItem("pb_templates_v3");
    return saved ? JSON.parse(saved) : {
      system: DEFAULT_TPL_SYSTEM,
      couple: DEFAULT_TPL_COUPLE,
      solo_f: DEFAULT_TPL_SOLO_F,
      solo_m: DEFAULT_TPL_SOLO_M
    };
  });

  const triggerToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  // ─── FILE HANDLERS ────────────────────────────────────────────────────────
  const readFile = (file) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve({ url: URL.createObjectURL(file), b64: e.target.result.split(",")[1], type: file.type });
    reader.readAsDataURL(file);
  });

  const handleStyleFiles = async (files) => {
    const imgs = await Promise.all(Array.from(files).filter(f => f.type.startsWith("image/")).map(readFile));
    setStyleImages(prev => [...prev, ...imgs]);
  };

  const handleCharFile = async (files, gender) => {
    const file = Array.from(files).find(f => f.type.startsWith("image/"));
    if (!file) return;
    const img = await readFile(file);
    if (gender === 'female') setCharSheetF({ ...img, analysis: null, analyzing: true });
    else setCharSheetM({ ...img, analysis: null, analyzing: true });

    // Auto-analyze character sheet immediately on upload
    try {
      if (!activeConfig?.apiKey) { triggerToast("⚠️ Set API Key dulu."); return; }
      const raw = await fetchFromLLM(activeConfig,
        `Analyze this ${gender} character reference sheet in extreme detail.`,
        SYSTEM_ANALYZE_CHARACTER(gender),
        true,
        [img]
      );
      const parsed = JSON.parse(raw.replace(/```json/g, '').replace(/```/g, '').trim());
      if (gender === 'female') setCharSheetF({ ...img, analysis: parsed, analyzing: false });
      else setCharSheetM({ ...img, analysis: parsed, analyzing: false });
    } catch (e) {
      if (gender === 'female') setCharSheetF(prev => ({ ...prev, analyzing: false, error: e.message }));
      else setCharSheetM(prev => ({ ...prev, analyzing: false, error: e.message }));
      triggerToast("❌ Gagal analisis character: " + e.message);
    }
  };

  // ─── GENERATE IDEAS ───────────────────────────────────────────────────────
  const handleGenerateIdeas = async () => {
    if (styleImages.length === 0 && !userDirectives.trim() && !charSheetF && !charSheetM) {
      triggerToast("⚠️ Upload style photo, character sheet, atau isi direktif.");
      return;
    }
    if (!activeConfig?.apiKey) { triggerToast("⚠️ API Key belum diset."); return; }

    setStage("LOADING_IDEAS");

    try {
      // Fase 1: Analisis style photos (jika ada)
      let sAnalysis = styleAnalysis;
      if (styleImages.length > 0 && !sAnalysis) {
        const raw = await fetchFromLLM(activeConfig,
          "Analyze the visual aesthetic and style of these photos.",
          SYSTEM_ANALYZE_STYLE,
          true,
          styleImages
        );
        sAnalysis = JSON.parse(raw.replace(/```json/g, '').replace(/```/g, '').trim());
        setStyleAnalysis(sAnalysis);
      }

      // Fase 2: Generate ideas
      const ideasPrompt = buildIdeasPrompt(
        sAnalysis,
        charSheetF?.analysis,
        charSheetM?.analysis,
        userDirectives
      );
      const rawIdeas = await fetchFromLLM(activeConfig,
        "Generate 15 scene ideas.",
        ideasPrompt,
        true,
        []
      );
      const cleaned = rawIdeas.replace(/```json/g, '').replace(/```/g, '').trim();
      let parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed) && parsed.ideas) parsed = parsed.ideas;

      setIdeas(parsed.map(p => ({
        ...p,
        clothing: p.clothing || "Casual everyday wear",
        pose: p.pose || "Standing naturally",
        cameraStyle: p.cameraStyle || "50mm, f/2.0, natural light",
        suggestedShotType: p.suggestedShotType || "Medium close-up (chest up)",
        suggestedCrop: p.suggestedCrop || "lower chest",
        genre: p.genre || "Lifestyle snapshot"
      })));
      setSelections({});
      setCardSettings({});
      setStage("SELECT");
    } catch (err) {
      triggerToast("❌ Gagal: " + err.message);
      setStage("INPUT");
    }
  };

  // ─── SELECTIONS ───────────────────────────────────────────────────────────
  const toggleSelection = (id) => setSelections(prev => {
    const u = { ...prev };
    if (u[id]) delete u[id]; else u[id] = '♂♀';
    return u;
  });
  const setCardType = (id, type) => setSelections(prev => ({ ...prev, [id]: type }));
  const updateCardSetting = (id, field, val) =>
    setCardSettings(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [field]: val } }));
  const handleSelectAll = () => { const u = {}; ideas.forEach(i => { u[i.id] = '♂♀'; }); setSelections(u); };
  const handleDeselectAll = () => setSelections({});
  const handleBlurEditable = (id, field, val) =>
    setIdeas(prev => prev.map(idea => idea.id === id ? { ...idea, [field]: val } : idea));

  // ─── GENERATE PROMPTS ─────────────────────────────────────────────────────
  const buildCharacterBlock = (apiType) => {
    const hasF = charSheetF?.analysis;
    const hasM = charSheetM?.analysis;

    if (!hasF && !hasM) return "SUBJECT IDENTITY: No character sheets provided. Generate a photorealistic person.";

    const fBlock = hasF ? `FEMALE CHARACTER (from character sheet):
- Hair: ${hasF.hair?.length}, ${hasF.hair?.texture}, ${hasF.hair?.color}, ${hasF.hair?.style}. ${hasF.hair?.special || ""}
- Eyes: ${hasF.face?.eyes}
- Brows: ${hasF.face?.brows}
- Nose: ${hasF.face?.nose}
- Lips: ${hasF.face?.lips}
- Face shape: ${hasF.face?.shape}, Jaw: ${hasF.face?.jaw}, Cheeks: ${hasF.face?.cheeks}
- Distinctive marks: ${hasF.face?.distinctiveMarks}
- Skin: ${hasF.skin?.tone}, ${hasF.skin?.undertone}
- Accessories always on: ${hasF.accessories}
- Build: ${hasF.bodyBuild}` : null;

    const mBlock = hasM ? `MALE CHARACTER (from character sheet):
- Hair: ${hasM.hair?.length}, ${hasM.hair?.texture}, ${hasM.hair?.color}, ${hasM.hair?.style}. ${hasM.hair?.special || ""}
- Facial Hair: ${hasM.facialHair}
- Eyes: ${hasM.face?.eyes}
- Brows: ${hasM.face?.brows}
- Nose: ${hasM.face?.nose}
- Lips: ${hasM.face?.lips}
- Face shape: ${hasM.face?.shape}, Jaw: ${hasM.face?.jaw}, Cheeks: ${hasM.face?.cheeks}
- Distinctive marks: ${hasM.face?.distinctiveMarks}
- Skin: ${hasM.skin?.tone}, ${hasM.skin?.undertone}
- Accessories always on: ${hasM.accessories}
- Build: ${hasM.bodyBuild}` : null;

    if (apiType === 'COUPLE') return [fBlock, mBlock].filter(Boolean).join("\n\n");
    if (apiType === 'SOLO FEMALE') return fBlock || "No female character sheet provided.";
    if (apiType === 'SOLO MALE') return mBlock || "No male character sheet provided.";
    return [fBlock, mBlock].filter(Boolean).join("\n\n");
  };

  const launchSingleTask = async (taskKey, targetTask, fullSystemPrompt) => {
    setResults(prev => prev.map(r => r.taskKey === taskKey ? { ...r, status: 'loading' } : r));

    const idea = targetTask.idea;
    const settings = targetTask.settings || {};
    const shotType = settings.shotType || idea.suggestedShotType || "Medium close-up (chest up)";
    const cropPoint = settings.crop || idea.suggestedCrop || "lower chest";

    const charBlock = buildCharacterBlock(targetTask.apiType);

    const userMsg = `Generate a prompt for this scene.
Type: ${targetTask.apiType}
Scene Name: ${idea.sceneName}
Location: ${idea.location}
Mood: ${idea.mood}
Clothing Concept: ${idea.clothing}
Pose Concept: ${idea.pose}
Camera Style: ${idea.cameraStyle}
Shot Type: ${shotType}
Crop Point: ${cropPoint}
Genre: ${settings.genre || idea.genre || "Lifestyle snapshot"}

CHARACTER IDENTITY (CRITICAL — USE EXACTLY AS PROVIDED, DO NOT MODIFY OR ADD TO IT):
${charBlock}

CRITICAL RULES FOR THIS GENERATION:
- In "Subject Identity & Styling", write ONLY clothing and accessories. DO NOT re-describe hair color, eye color, skin tone, or face. Just write "Hairstyling matching the provided character reference sheet" and "Exact face matching the provided character reference sheet".
- Expand Clothing into a 30-word hyper-specific description (fabric, color, cut, fit, texture).
- Expand Pose into precise anatomical WITH-chain mechanics.
- Expand Camera Style into exact lens/aperture/shutter/ISO/film stock.
- Follow the structural template precisely.`;

    try {
      const res = await fetchFromLLM(activeConfig, userMsg, fullSystemPrompt, false, []);
      if (!res) throw new Error("Respons kosong.");
      setResults(prev => prev.map(r => r.taskKey === taskKey
        ? { ...r, status: 'success', resultText: res.replace(/^```[\s\S]*?\n/, '').replace(/```$/, '').trim() }
        : r));
    } catch (err) {
      setResults(prev => prev.map(r => r.taskKey === taskKey ? { ...r, status: 'error', resultText: err.message } : r));
    }
  };

  const handleGeneratePrompts = () => {
    setStage("GENERATING");
    const fullSystemPrompt = `${templates.system}\n\n${templates.couple}\n\n${templates.solo_f}\n\n${templates.solo_m}`;
    const taskList = [];

    Object.entries(selections).forEach(([idStr, type]) => {
      const id = parseInt(idStr);
      const idea = ideas.find(i => i.id === id);
      if (!idea) return;
      const settings = cardSettings[id] || {};

      if (type === '2×') {
        taskList.push({ taskKey: `${id}_F`, idea, settings, typeDisplay: 'SOLO ♀', apiType: 'SOLO FEMALE', status: 'pending' });
        taskList.push({ taskKey: `${id}_C`, idea, settings, typeDisplay: 'COUPLE ♂♀', apiType: 'COUPLE', status: 'pending' });
      } else {
        const apiType = type === '♂' ? 'SOLO MALE' : type === '♀' ? 'SOLO FEMALE' : 'COUPLE';
        const typeDisplay = type === '♂' ? 'SOLO ♂' : type === '♀' ? 'SOLO ♀' : 'COUPLE ♂♀';
        taskList.push({ taskKey: `${id}_${type}`, idea, settings, typeDisplay, apiType, status: 'pending' });
      }
    });

    setResults(taskList);
    taskList.forEach(task => launchSingleTask(task.taskKey, task, fullSystemPrompt));
  };

  const resetAll = () => {
    setStage("INPUT"); setUserDirectives(""); setStyleImages([]); setStyleAnalysis(null);
    setIdeas([]); setSelections({}); setCardSettings({}); setResults([]);
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col">
      <style>{`
        .skeleton { background: linear-gradient(90deg, var(--surface) 25%, var(--border) 50%, var(--surface) 75%); background-size: 200% 100%; animation: shim 1.5s infinite; border-radius: 8px; height: 160px; }
        @keyframes shim { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .ef { outline:none; padding:2px 4px; margin:-2px -4px; border-radius:4px; border:1px solid transparent; transition:all .2s; display:inline-block; max-width:100%; }
        .ef:hover { border:1px dashed var(--border-hover); }
        .ef:focus { background:black; border:1px dashed var(--accent); color:var(--accent); }
        .csel { background:var(--surface-2); border:1px solid var(--border); color:var(--text-2); border-radius:6px; padding:4px 8px; font-size:11px; cursor:pointer; outline:none; }
        .csel:hover { border-color:var(--border-hover); }
        .char-box { border:1.5px dashed var(--border-hover); border-radius:12px; padding:16px; cursor:pointer; transition:all .2s; text-align:center; }
        .char-box:hover { border-color:var(--accent); background:var(--surface); }
        .char-box.loaded { border-style:solid; border-color:var(--accent); cursor:default; }
        .char-box.analyzing { border-color:var(--accent); opacity:.7; animation:pulse 1.5s infinite; }
        @keyframes pulse { 0%,100%{opacity:.7} 50%{opacity:1} }
      `}</style>

      {/* ── TOP BAR ── */}
      <div className="flex justify-end gap-3 py-4 px-8 border-b border-(--border)">
        <button onClick={() => setShowTplModal(true)} className="bg-(--surface-2) text-(--text-1) px-4 py-2 rounded-lg border border-(--border) cursor-pointer text-[13px] hover:bg-(--border) transition-colors">
          📝 Templates
        </button>
      </div>

      <div className="flex-1 px-8 py-6 max-w-375 mx-auto w-full">

        {/* ══ INPUT ══ */}
        {stage === "INPUT" && (
          <div className="flex flex-col gap-8 max-w-200 mx-auto">
            <h2 className="font-semibold text-(--text-1) text-2xl text-center m-0">Photo Prompt Builder</h2>

            {/* Row: Character Sheets */}
            <div>
              <div className="text-[11px] tracking-[1.5px] uppercase text-(--accent-dim) mb-3">Character Sheets <span className="text-(--text-3) normal-case tracking-normal">(optional — untuk mengunci identitas)</span></div>
              <div className="grid grid-cols-2 gap-4">

                {/* Female Character */}
                <div>
                  <div className="text-xs text-(--text-3) mb-2">♀ Female Character</div>
                  <input ref={charFInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleCharFile(e.target.files, 'female')} />
                  {!charSheetF ? (
                    <div className="char-box" onClick={() => charFInputRef.current?.click()}>
                      <div className="text-2xl mb-2">👩</div>
                      <div className="text-(--text-3) text-xs">Upload female character sheet</div>
                    </div>
                  ) : (
                    <div className={`char-box loaded ${charSheetF.analyzing ? 'analyzing' : ''}`}>
                      <div className="flex items-center gap-3">
                        <img src={charSheetF.url} className="w-14 h-14 object-cover rounded-lg flex-shrink-0" alt="char-f" />
                        <div className="text-left flex-1 min-w-0">
                          {charSheetF.analyzing && <div className="text-(--accent) text-xs animate-pulse mb-1">Analyzing...</div>}
                          {charSheetF.analysis && (
                            <>
                              <div className="font-semibold text-(--text-1) text-sm">{charSheetF.analysis.name || "Female Character"}</div>
                              <div className="text-(--text-3) text-[11px] truncate">{charSheetF.analysis.hair?.color} · {charSheetF.analysis.face?.eyes?.split(',')[0]}</div>
                              <button onClick={() => setShowCharModal('female')} className="text-(--accent) text-[11px] bg-transparent border-none cursor-pointer p-0 mt-0.5 hover:opacity-70">View details →</button>
                            </>
                          )}
                          {charSheetF.error && <div className="text-(--error) text-[11px]">Error: {charSheetF.error}</div>}
                        </div>
                        <button onClick={() => setCharSheetF(null)} className="bg-transparent border-none text-(--text-3) cursor-pointer hover:text-(--error) text-lg leading-none flex-shrink-0">✕</button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Male Character */}
                <div>
                  <div className="text-xs text-(--text-3) mb-2">♂ Male Character</div>
                  <input ref={charMInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleCharFile(e.target.files, 'male')} />
                  {!charSheetM ? (
                    <div className="char-box" onClick={() => charMInputRef.current?.click()}>
                      <div className="text-2xl mb-2">👨</div>
                      <div className="text-(--text-3) text-xs">Upload male character sheet</div>
                    </div>
                  ) : (
                    <div className={`char-box loaded ${charSheetM.analyzing ? 'analyzing' : ''}`}>
                      <div className="flex items-center gap-3">
                        <img src={charSheetM.url} className="w-14 h-14 object-cover rounded-lg flex-shrink-0" alt="char-m" />
                        <div className="text-left flex-1 min-w-0">
                          {charSheetM.analyzing && <div className="text-(--accent) text-xs animate-pulse mb-1">Analyzing...</div>}
                          {charSheetM.analysis && (
                            <>
                              <div className="font-semibold text-(--text-1) text-sm">{charSheetM.analysis.name || "Male Character"}</div>
                              <div className="text-(--text-3) text-[11px] truncate">{charSheetM.analysis.hair?.color} · {charSheetM.analysis.face?.eyes?.split(',')[0]}</div>
                              <button onClick={() => setShowCharModal('male')} className="text-(--accent) text-[11px] bg-transparent border-none cursor-pointer p-0 mt-0.5 hover:opacity-70">View details →</button>
                            </>
                          )}
                          {charSheetM.error && <div className="text-(--error) text-[11px]">Error: {charSheetM.error}</div>}
                        </div>
                        <button onClick={() => setCharSheetM(null)} className="bg-transparent border-none text-(--text-3) cursor-pointer hover:text-(--error) text-lg leading-none flex-shrink-0">✕</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Style Reference Photos */}
            <div>
              <div className="text-[11px] tracking-[1.5px] uppercase text-(--accent-dim) mb-3">Style Reference Photos <span className="text-(--text-3) normal-case tracking-normal">(optional — untuk aesthetic & mood)</span></div>
              <input ref={styleInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleStyleFiles(e.target.files)} />
              {styleImages.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-3">
                  {styleImages.map((img, i) => (
                    <div key={i} className="relative">
                      <img src={img.url} className="w-16 h-16 object-cover rounded-lg border border-(--border)" alt="style" />
                      <button onClick={() => setStyleImages(prev => prev.filter((_, j) => j !== i))} className="absolute -top-1.5 -right-1.5 bg-(--error) text-white border-none rounded-full w-5 h-5 cursor-pointer flex items-center justify-center text-xs">✕</button>
                    </div>
                  ))}
                  <div className="w-16 h-16 border border-dashed border-(--border-hover) rounded-lg flex items-center justify-center cursor-pointer hover:border-(--accent) transition-colors text-xl text-(--text-3)" onClick={() => styleInputRef.current?.click()}>+</div>
                </div>
              )}
              {styleImages.length === 0 && (
                <div className="border-[1.5px] border-dashed border-(--border-hover) rounded-lg p-6 text-center cursor-pointer hover:border-(--accent) transition-colors bg-(--surface)" onClick={() => styleInputRef.current?.click()}>
                  <div className="text-xl mb-1">🎨</div>
                  <div className="text-(--text-2) text-sm">Upload style/mood reference photos</div>
                  <div className="text-(--text-3) text-xs mt-1">Aesthetic, camera feel, and color palette will be extracted</div>
                </div>
              )}
              {styleAnalysis && (
                <div className="mt-2 p-3 bg-(--surface) border border-(--accent) rounded-lg text-[12px] text-(--text-2)">
                  ✅ Style analyzed: {styleAnalysis.styleAnalysis?.slice(0, 100)}...
                  <button onClick={() => setStyleAnalysis(null)} className="ml-2 text-(--text-3) bg-transparent border-none cursor-pointer hover:text-(--error) text-xs">re-analyze</button>
                </div>
              )}
            </div>

            {/* Directives */}
            <div>
              <div className="text-[11px] tracking-[1.5px] uppercase text-(--accent-dim) mb-3">Directives / Ideas</div>
              <textarea
                className="w-full h-28 resize-none p-4 bg-(--surface) border border-(--border) rounded-xl text-(--text-1) text-sm outline-none focus:border-(--accent) transition-colors"
                value={userDirectives}
                onChange={e => setUserDirectives(e.target.value)}
                placeholder="e.g. Tokyo scenes, golden hour, cinematic / or: surprise me / or: add rooftop and market scenes"
              />
            </div>

            <button
              className="bg-(--text-1) text-(--bg) px-7 py-3.5 font-semibold rounded-xl border-none cursor-pointer text-[15px] hover:opacity-90 transition-opacity w-full"
              onClick={handleGenerateIdeas}
            >
              Generate 15 Ideas →
            </button>
          </div>
        )}

        {/* ══ LOADING ══ */}
        {stage === "LOADING_IDEAS" && (
          <div className="text-center py-20">
            <div className="text-2xl text-(--accent) mb-3 animate-pulse">Generating ideas...</div>
            <div className="text-(--text-3) text-sm">{styleImages.length > 0 ? "Analyzing style reference, then" : ""}  generating 15 scene ideas</div>
          </div>
        )}

        {/* ══ SELECT ══ */}
        {stage === "SELECT" && (
          <div>
            {/* Sticky Action Bar */}
            <div className="sticky top-[72px] z-50 bg-(--bg) border-b border-(--border) -mx-8 px-8 py-3.5 mb-6 flex justify-between items-center">
              <div>
                <div className="text-[11px] tracking-[1.5px] uppercase text-(--accent-dim)">SELECT SCENES</div>
                <div className="text-(--text-1) text-lg font-semibold">{Object.keys(selections).length} of {ideas.length} selected</div>
              </div>
              <div className="flex gap-2 items-center">
                {/* Character status pills */}
                {charSheetF?.analysis && (
                  <button onClick={() => setShowCharModal('female')} className="bg-(--surface) border border-(--accent) text-(--accent) px-3 py-1.5 rounded-full text-[11px] cursor-pointer hover:bg-(--surface-2)">
                    ♀ {charSheetF.analysis.name || "Female"}
                  </button>
                )}
                {charSheetM?.analysis && (
                  <button onClick={() => setShowCharModal('male')} className="bg-(--surface) border border-(--accent) text-(--accent) px-3 py-1.5 rounded-full text-[11px] cursor-pointer hover:bg-(--surface-2)">
                    ♂ {charSheetM.analysis.name || "Male"}
                  </button>
                )}
                <div className="w-px h-6 bg-(--border) mx-1" />
                <button onClick={resetAll} className="bg-transparent border border-(--border-hover) text-(--text-2) px-3 py-2 rounded-md cursor-pointer hover:text-(--text-1) text-sm">↺</button>
                {Object.keys(selections).length > 0
                  ? <button onClick={handleDeselectAll} className="bg-transparent border border-(--border-hover) text-(--text-2) px-3 py-2 rounded-md cursor-pointer hover:text-(--text-1) text-sm">Deselect All</button>
                  : <button onClick={handleSelectAll} className="bg-transparent border border-(--border-hover) text-(--text-2) px-3 py-2 rounded-md cursor-pointer hover:text-(--text-1) text-sm">Select All</button>
                }
                {Object.keys(selections).length > 0 && (
                  <button onClick={handleGeneratePrompts} className="bg-(--accent) text-(--bg) px-5 py-2 rounded-md cursor-pointer border-none font-semibold text-sm hover:bg-(--accent-hover)">
                    Generate {Object.keys(selections).length} →
                  </button>
                )}
              </div>
            </div>

            {/* Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ideas.map(idea => {
                const isSelected = !!selections[idea.id];
                const type = selections[idea.id];
                const settings = cardSettings[idea.id] || {};
                return (
                  <div key={idea.id} className={`bg-(--surface) border rounded-xl overflow-hidden transition-all ${isSelected ? 'border-(--accent)' : 'border-(--border) opacity-70 hover:opacity-100'}`}>
                    <div className="p-4 cursor-pointer" onClick={() => toggleSelection(idea.id)}>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[11px] text-(--text-3)">{String(idea.id).padStart(2, '0')}</span>
                        <span className={`w-4 h-4 rounded-full border flex-shrink-0 ${isSelected ? 'bg-(--accent) border-(--accent)' : 'border-(--border-hover)'}`} />
                      </div>
                      <div className="font-semibold text-(--text-1) text-sm mb-1 ef" contentEditable suppressContentEditableWarning onBlur={e => handleBlurEditable(idea.id, 'sceneName', e.target.textContent)} onClick={e => e.stopPropagation()}>{idea.sceneName}</div>
                      <div className="text-(--text-3) text-xs">📍 <span className="ef" contentEditable suppressContentEditableWarning onBlur={e => handleBlurEditable(idea.id, 'location', e.target.textContent)} onClick={e => e.stopPropagation()}>{idea.location}</span></div>
                    </div>
                    <div className="px-4 pb-3 flex flex-col gap-1 text-[12px] text-(--text-2)">
                      <div><span className="text-(--text-3)">Mood: </span><span className="ef" contentEditable suppressContentEditableWarning onBlur={e => handleBlurEditable(idea.id, 'mood', e.target.textContent)}>{idea.mood}</span></div>
                      <div><span className="text-(--text-3)">Outfit: </span><span className="ef" contentEditable suppressContentEditableWarning onBlur={e => handleBlurEditable(idea.id, 'clothing', e.target.textContent)}>{idea.clothing}</span></div>
                      <div><span className="text-(--text-3)">Pose: </span><span className="ef" contentEditable suppressContentEditableWarning onBlur={e => handleBlurEditable(idea.id, 'pose', e.target.textContent)}>{idea.pose}</span></div>
                      <div><span className="text-(--text-3)">Camera: </span><span className="ef" contentEditable suppressContentEditableWarning onBlur={e => handleBlurEditable(idea.id, 'cameraStyle', e.target.textContent)}>{idea.cameraStyle}</span></div>
                    </div>
                    <div className="px-4 pb-3 flex flex-wrap gap-2">
                      <select className="csel flex-1 min-w-0" value={settings.shotType || idea.suggestedShotType || ""} onChange={e => updateCardSetting(idea.id, 'shotType', e.target.value)} onClick={e => e.stopPropagation()}>
                        {SHOT_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <select className="csel flex-1 min-w-0" value={settings.crop || idea.suggestedCrop || ""} onChange={e => updateCardSetting(idea.id, 'crop', e.target.value)} onClick={e => e.stopPropagation()}>
                        {CROP_POINTS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <select className="csel w-full" value={settings.genre || idea.genre || ""} onChange={e => updateCardSetting(idea.id, 'genre', e.target.value)} onClick={e => e.stopPropagation()}>
                        {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                    {isSelected && (
                      <div className="px-4 pb-4 flex gap-2 border-t border-(--border) pt-3">
                        {['♂♀', '♀', '♂', '2×'].map(t => (
                          <button key={t} onClick={() => setCardType(idea.id, t)} className={`flex-1 py-1.5 rounded-md text-xs font-semibold border cursor-pointer transition-colors ${type === t ? 'bg-(--accent) text-(--bg) border-(--accent)' : 'bg-transparent text-(--text-2) border-(--border) hover:border-(--border-hover)'}`}>{t}</button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══ GENERATING ══ */}
        {stage === "GENERATING" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <div className="text-[11px] tracking-[1.5px] uppercase text-(--accent-dim) mb-1">GENERATING</div>
                <div className="text-(--text-1) text-xl font-semibold">{results.filter(r => r.status === 'success').length} / {results.length} complete</div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStage("SELECT")} className="bg-transparent border border-(--border-hover) text-(--text-2) px-4 py-2 rounded-md cursor-pointer text-sm">← Back</button>
                <button
                  onClick={() => {
                    const grouped = {};
                    results.filter(r => r.status === 'success').forEach(r => {
                      const g = r.typeDisplay.includes('COUPLE') ? 'COUPLE' : r.typeDisplay.includes('♀') ? 'SOLO FEMALE' : 'SOLO MALE';
                      if (!grouped[g]) grouped[g] = [];
                      grouped[g].push(`============= PROMPT ${grouped[g].length + 1} =============\n${r.resultText}`);
                    });
                    navigator.clipboard.writeText(Object.entries(grouped).map(([g, p]) => `${g}\n${p.join('\n\n\n')}`).join('\n\n\n'));
                    triggerToast("✓ Copied All!");
                  }}
                  className="bg-(--text-1) text-(--bg) px-5 py-2 rounded-md cursor-pointer border-none font-semibold text-sm hover:opacity-90"
                >⎘ Copy All</button>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              {results.map(task => (
                <div key={task.taskKey} className="bg-(--surface) border border-(--border) rounded-xl overflow-hidden">
                  <div className="flex justify-between items-center px-5 py-4 bg-(--surface-2) border-b border-(--border) text-sm">
                    <div className="flex items-center gap-3">
                      <span className="text-(--text-2)">{String(task.idea.id).padStart(2, '0')}</span>
                      <span className="font-semibold text-(--text-1)">{task.idea.sceneName}</span>
                      <span className="bg-(--bg) border border-(--border) px-2.5 py-1 rounded-full text-[11px] text-(--text-2) font-semibold">{task.typeDisplay}</span>
                    </div>
                    <div>
                      {task.status === 'loading' && <span className="text-(--accent) text-[13px] animate-pulse">● Generating...</span>}
                      {task.status === 'success' && <button className="text-(--accent) bg-transparent border-none cursor-pointer font-semibold" onClick={() => { navigator.clipboard.writeText(task.resultText); triggerToast("Copied!"); }}>⎘ Copy</button>}
                      {task.status === 'error' && <button className="text-(--error) bg-transparent border-none cursor-pointer font-semibold" onClick={() => launchSingleTask(task.taskKey, task, `${templates.system}\n\n${templates.couple}\n\n${templates.solo_f}\n\n${templates.solo_m}`)}>⟳ Retry</button>}
                    </div>
                  </div>
                  {task.status === 'loading' && <div className="skeleton m-5" />}
                  {task.status === 'success' && <div className="p-5 font-mono text-[13px] whitespace-pre-wrap text-(--text-2) leading-relaxed">{task.resultText}</div>}
                  {task.status === 'error' && <div className="p-5 text-(--error) font-mono text-[13px]">Gagal: {task.resultText}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ══ CHARACTER DETAIL MODAL ══ */}
      {showCharModal && (
        <div className="fixed inset-0 bg-black/85 flex justify-center items-center z-9999 backdrop-blur-sm" onClick={() => setShowCharModal(null)}>
          <div className="bg-(--surface) border border-(--border) rounded-xl w-175 max-w-[90vw] max-h-[85vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-(--border) flex justify-between items-center">
              <h3 className="m-0 text-lg font-semibold">{showCharModal === 'female' ? '♀ Female' : '♂ Male'} Character Analysis</h3>
              <button className="bg-transparent border-none text-(--text-2) cursor-pointer text-lg" onClick={() => setShowCharModal(null)}>✕</button>
            </div>
            <div className="p-5 overflow-y-auto flex-1 font-mono text-[12px] text-(--text-2) flex gap-5">
              {/* Thumbnail */}
              {(showCharModal === 'female' ? charSheetF : charSheetM)?.url && (
                <img src={(showCharModal === 'female' ? charSheetF : charSheetM).url} className="w-32 h-auto object-cover rounded-lg flex-shrink-0 self-start border border-(--border)" alt="char" />
              )}
              {/* Data */}
              <div className="flex-1 flex flex-col gap-3">
                {(() => {
                  const a = (showCharModal === 'female' ? charSheetF : charSheetM)?.analysis;
                  if (!a) return <div>No analysis data.</div>;
                  return (
                    <>
                      {a.name && <div><span className="text-(--accent)">Name:</span> {a.name}</div>}
                      <div><span className="text-(--accent)">Hair:</span> {a.hair?.color}, {a.hair?.length}, {a.hair?.texture}, {a.hair?.style}. {a.hair?.special}</div>
                      {a.facialHair && a.facialHair !== 'N/A' && <div><span className="text-(--accent)">Facial Hair:</span> {a.facialHair}</div>}
                      <div><span className="text-(--accent)">Eyes:</span> {a.face?.eyes}</div>
                      <div><span className="text-(--accent)">Brows:</span> {a.face?.brows}</div>
                      <div><span className="text-(--accent)">Nose:</span> {a.face?.nose}</div>
                      <div><span className="text-(--accent)">Lips:</span> {a.face?.lips}</div>
                      <div><span className="text-(--accent)">Face:</span> {a.face?.shape}, jaw: {a.face?.jaw}, cheeks: {a.face?.cheeks}</div>
                      <div><span className="text-(--accent)">Marks:</span> {a.face?.distinctiveMarks}</div>
                      <div><span className="text-(--accent)">Skin:</span> {a.skin?.tone}, {a.skin?.undertone} undertones. {a.skin?.texture}</div>
                      <div><span className="text-(--accent)">Accessories:</span> {a.accessories}</div>
                      <div><span className="text-(--accent)">Build:</span> {a.bodyBuild}</div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ TEMPLATES MODAL ══ */}
      {showTplModal && (
        <div className="fixed inset-0 bg-black/85 flex justify-center items-center z-9999 backdrop-blur-sm">
          <div className="bg-(--surface) border border-(--border) rounded-xl w-200 max-w-[90vw] max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-5 border-b border-(--border) flex justify-between items-center">
              <h3 className="m-0 text-lg font-semibold">📝 Master Templates</h3>
              <button className="bg-transparent border-none text-(--text-2) cursor-pointer text-lg" onClick={() => setShowTplModal(false)}>✕</button>
            </div>
            <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-4">
              {[{ key:'system', label:'Base System Directives' }, { key:'couple', label:'Couple (♂♀)' }, { key:'solo_f', label:'Solo Female (♀)' }, { key:'solo_m', label:'Solo Male (♂)' }].map(({ key, label }) => (
                <div key={key} className="flex flex-col gap-1.5">
                  <label className="text-(--text-2) text-[13px]">{label}</label>
                  <textarea className="bg-(--surface-2) border border-(--border) text-(--text-1) p-3 rounded-lg h-40 font-mono text-[12px] outline-none focus:border-(--accent) resize-y" value={templates[key]} onChange={e => setTemplates({ ...templates, [key]: e.target.value })} />
                </div>
              ))}
            </div>
            <div className="p-5 border-t border-(--border) flex justify-end gap-3 bg-(--surface-2) rounded-b-xl">
              <button className="bg-transparent border border-(--border) text-(--text-2) px-4 py-2 rounded-md cursor-pointer text-sm" onClick={() => { if (confirm("Reset ke default?")) setTemplates({ system: DEFAULT_TPL_SYSTEM, couple: DEFAULT_TPL_COUPLE, solo_f: DEFAULT_TPL_SOLO_F, solo_m: DEFAULT_TPL_SOLO_M }); }}>Reset Default</button>
              <button className="bg-(--text-1) text-(--bg) px-4 py-2 rounded-md font-semibold cursor-pointer text-sm" onClick={() => { localStorage.setItem("pb_templates_v3", JSON.stringify(templates)); setShowTplModal(false); triggerToast("Tersimpan!"); }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ TOAST ══ */}
      {toast && <div className="fixed bottom-8 right-8 bg-(--text-1) text-(--bg) px-7 py-3.5 rounded-lg font-semibold z-100000 shadow-xl">{toast}</div>}
    </div>
  );
}