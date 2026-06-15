import { useState, useRef, useContext, useEffect } from "react";
import { ApiContext } from "../context/ApiContext";
import { fetchFromLLM } from "../utils/api";

// ─── TEMPLATES ────────────────────────────────────────────────────────────────
const DEFAULT_TPL_SYSTEM = `You are an elite AI photography creative director and prompt engineer. Your job is to generate hyper-detailed, technically precise image generation prompts.

ABSOLUTE RULES:
1. DENSE DESCRIPTIONS: Write in thick, continuous sentences. Never use lazy one-liners.
2. SUBJECT IDENTITY IS SACRED: Use ONLY the character data in the SUBJECT IDENTITY block. Never add, modify, or invent any physical traits not present there.
3. STYLING RULE: In "Subject Identity & Styling", ONLY write clothing and accessories. Do NOT re-describe hair color, eye color, skin tone, or facial features — those are already locked in INSTRUCTION [LOCKED]. The only exception is the hairstyling line.
4. ANATOMICAL POSE: Use "WITH" chains for body mechanics. Track every arm, forearm, hand, and finger individually. Example: "Torso bladed 45 degrees left WITH right arm hanging naturally at side WITH left forearm folded upward WITH index finger resting lightly against lower lip."
5. FOREGROUND LOGIC: If Camera angle contains "aerial", "top-down", "overhead", "drone", or "bird's eye" → write "None." Otherwise, write a 20-25 word hyper-specific physical obstruction pressed against the lens: name the exact plant species, material, texture, color, and how it physically blocks the frame corners or bottom.
6. ENVIRONMENT — SIGN TEXT REQUIRED: Every scene MUST include one legible real-world sign, marker, or trail post with text in the local language. Format: 'Legible [language] text on [sign description] reading "[actual text in local language]".' Research realistic sign text for the specific named location.
7. COLOR PALETTE: Always end Environment with "Overall scene features a [vibe] color palette of [exactly 6 specific named colors]."
8. CAMERA — FILM STOCK REQUIRED: Specify exact lens mm, f/stop, shutter speed, ISO, and a real named film stock (Fujifilm Velvia 50 / Fujifilm Pro 400H / Kodak Portra 400 / Kodak Ektar 100 / Kodak Ultramax 400 / Ilford HP5 etc.). Describe the color science outcome in one sentence (e.g. "warm-leaning tones with lifted cyan shadows and fine grain").
9. OUTPUT FORMAT: Follow the structural template EXACTLY. No extra commentary.
10. Start output directly with "INSTRUCTION [LOCKED]:"`;

const DEFAULT_TPL_COUPLE = `=== COUPLE TEMPLATE ===
INSTRUCTION [LOCKED]: Use the provided character reference sheet as the primary visual guides. Maintain an extremely strong and accurate resemblance to both subjects shown in the references.
- For the female subject: Preserve facial features, facial structure, hair color/style, skin tone, eye shape, nose, lips, and distinctive facial markers.
- For the male subject: Preserve facial features, facial structure, hair color/style, skin tone, eye shape, nose, lips, and distinctive facial markers.
Do not stylize, exaggerate, or significantly modify the core identity, bone structure, or proportions of either person. Allow only small natural variations typical of real photography, lighting, and pose.
Positive Prompt:
Core Aesthetic: Photorealistic authentic lifestyle snapshot of two subjects in [LOCATION], [MOOD].
Foreground obstruction: [FOREGROUND LOGIC — 20-25 words, hyper-specific plant species or material pressed against lens].
Subject Identity & Styling (Female): Hairstyling matching the provided character reference sheet. Exact face matching the provided character reference sheet. Clothing: [30-word hyper-specific expansion — exact fabric, color, cut, fit, wear pattern. NO hair/face/skin]. Wearable Accessories: [Body/head/face accessories only, or "No accessories"].
Subject Identity & Styling (Male): Hairstyling matching the provided character reference sheet. Exact face matching the provided character reference sheet. Clothing: [30-word hyper-specific expansion — exact fabric, color, cut, fit, wear pattern. NO hair/face/skin]. Wearable Accessories: [Body/head/face accessories only, or "No accessories"].
Pose and Action (Shared Interaction): Two subjects [spatial proximity]. [Female: 20-word anatomical WITH-chain tracking each arm and hand]. [Male: 20-word anatomical WITH-chain tracking each arm and hand]. Female exhibiting [15-word micro-expression]. Male exhibiting [15-word micro-expression]. All other hands and limbs completely hidden from view out of frame. Cropped exactly at [CROP POINT].
Environment & Lighting: [LOCATION FULL NAME], [60-word hyper-specific background]. Legible [language] text on [sign type] reading "[local-language sign text]". [Lighting direction, quality, shadows]. Overall scene features a [vibe] color palette of [6 specific named colors].
Camera & Technical Specs: Shot on [camera type]. Framed as [SHOT TYPE] from [angle]. [Lens mm], f/[aperture], [shutter speed], ISO [ISO], [film stock name], [grain description], [color science outcome in one sentence].
Negative Prompt:
Semirealism, CGI, 3d render, airbrushed skin, doll face, wax figure, plastic skin, perfect symmetry, magazine editorial, stock photography, extra fingers, studio lighting, floating limbs, disconnected arms, amputated hands, professional retouching, artificial bounce light, rim light, full body, shallow depth of field, bokeh, blurred background, tilt shift, soft focus, watermark.`;

const DEFAULT_TPL_SOLO_F = `=== SOLO FEMALE TEMPLATE ===
INSTRUCTION [LOCKED]: Use the provided character reference sheet as the primary visual guide. Maintain an extremely strong and accurate resemblance to the subject shown in the reference. Preserve facial features, facial structure, hair color/style, skin tone, eye shape, nose, lips, and distinctive facial markers. Do not stylize, exaggerate, or significantly modify the core identity, bone structure, or proportions. Allow only small natural variations typical of real photography, lighting, and pose.
Positive Prompt:
Core Aesthetic: Photorealistic authentic lifestyle snapshot of one female subject in [LOCATION], [MOOD].
Foreground obstruction: [FOREGROUND LOGIC — 20-25 words, hyper-specific plant species or material pressed against lens].
Subject Identity & Styling (Female): Hairstyling matching the provided character reference sheet. Exact face matching the provided character reference sheet. Clothing: [30-word hyper-specific expansion — exact fabric, color, cut, fit, wear pattern. NO hair/face/skin]. Wearable Accessories: [Body/head/face accessories only, or "No accessories"].
Pose and Action (Female): [25-word anatomical WITH-chain tracking each arm individually]. Female exhibiting [15-word micro-expression and eye contact direction]. All other hands and limbs completely hidden from view out of frame. Cropped exactly at [CROP POINT].
Environment & Lighting: [LOCATION FULL NAME], [60-word hyper-specific background]. Legible [language] text on [sign type] reading "[local-language sign text]". [Lighting direction, quality, shadows]. Overall scene features a [vibe] color palette of [6 specific named colors].
Camera & Technical Specs: Shot on [camera type]. Framed as [SHOT TYPE] from [angle]. [Lens mm], f/[aperture], [shutter speed], ISO [ISO], [film stock name], [grain description], [color science outcome in one sentence].
Negative Prompt:
Semirealism, CGI, 3d render, airbrushed skin, doll face, wax figure, plastic skin, perfect symmetry, magazine editorial, stock photography, extra fingers, studio lighting, floating limbs, disconnected arms, amputated hands, professional retouching, glossy skin, artificial bounce light, rim light, arms, hands, fingers, torso, waist down, full body, shallow depth of field, bokeh, blurred background, portrait mode, tilt shift, macro, soft focus.`;

const DEFAULT_TPL_SOLO_M = `=== SOLO MALE TEMPLATE ===
INSTRUCTION [LOCKED]: Use the provided character reference sheet as the primary visual guide. Maintain an extremely strong and accurate resemblance to the subject shown in the reference. Preserve facial features, facial structure, hair color/style, skin tone, eye shape, nose, lips, and distinctive facial markers. Do not stylize, exaggerate, or significantly modify the core identity, bone structure, or proportions. Allow only small natural variations typical of real photography, lighting, and pose.
Positive Prompt:
Core Aesthetic: Photorealistic authentic lifestyle snapshot of one male subject in [LOCATION], [MOOD].
Foreground obstruction: [FOREGROUND LOGIC — 20-25 words, hyper-specific plant species or material pressed against lens].
Subject Identity & Styling (Male): Hairstyling matching the provided character reference sheet. Exact face matching the provided character reference sheet. Clothing: [30-word hyper-specific expansion — exact fabric, color, cut, fit, wear pattern. NO hair/face/skin]. Wearable Accessories: [Body/head/face accessories only, or "No accessories"].
Pose and Action (Male): [25-word anatomical WITH-chain tracking each arm individually]. Male exhibiting [15-word micro-expression and eye contact direction]. All other hands and limbs completely hidden from view out of frame. Cropped exactly at [CROP POINT].
Environment & Lighting: [LOCATION FULL NAME], [60-word hyper-specific background]. Legible [language] text on [sign type] reading "[local-language sign text]". [Lighting direction, quality, shadows]. Overall scene features a [vibe] color palette of [6 specific named colors].
Camera & Technical Specs: Shot on [camera type]. Framed as [SHOT TYPE] from [angle]. [Lens mm], f/[aperture], [shutter speed], ISO [ISO], [film stock name], [grain description], [color science outcome in one sentence].
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

// Analisis foto style — extract both scenario pattern AND camera aesthetic
const SYSTEM_ANALYZE_STYLE = `You are an expert photography AI analyst and creative director. Analyze the uploaded photo(s).

Extract TWO things:

A. PHOTOGRAPHIC STYLE (camera, light, color — for film stock selection):
- Overall visual aesthetic and feel
- Camera technique: lens feel, angle, depth of field
- Color grading, film stock character, grain
- Lighting setup and mood palette

B. SCENE SCENARIO (what's happening — for generating scene idea variations):
- What is the interaction type between subjects? (e.g. lying together looking at camera, walking side by side, facing each other)
- What is the pose/framing concept? (e.g. overhead high-angle close-up, straight-on eye-level waist-up)
- What is the emotional vibe and intimacy level?
- Is it a multi-panel/grid format? If so, how many panels and what varies between them?

Return ONLY a valid JSON object:
{
  "styleAnalysis": "2-3 sentence description of the photo's aesthetic and visual style",
  "inferredCameraStyle": "inferred lens mm, aperture feel, film stock or digital look",
  "inferredMoodPalette": "dominant mood and exactly 5-6 specific color names visible in the photo",
  "suggestedGenre": "one of: Lifestyle snapshot | Cinematic film still | Street photography | Travel editorial | Acubi / Korean aesthetic | Golden hour portrait",
  "locationContext": "if a specific place is identifiable, name it, else empty string",
  "scenarioPattern": "describe the SCENE TYPE and INTERACTION: what subjects are doing, how they're positioned, the emotional dynamic. Used as a template for variations. E.g. 'couple lying side by side on ground, faces close together, overhead bird's eye angle, looking up at camera with varied candid expressions across 3 panels'",
  "framingConcept": "shot framing and angle: e.g. 'high-angle overhead close-up, faces filling the frame, visible shoulders only'",
  "panelFormat": "if multi-panel: describe the grid format and how expressions/poses vary across panels. If single image, write 'single image'"
}`;

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

// Generate ideas
// Mode A — style photo uploaded, directives blank: generate 15 variations of the reference scenario
// Mode B — directives provided: generate from directives (style only influences camera/film at generation time)
const buildIdeasPrompt = (charFemale, charMale, userDirectives, styleAnalysis) => {
  const hasFemale = !!charFemale;
  const hasMale = !!charMale;
  const useScenarioMode = !!styleAnalysis?.scenarioPattern && !userDirectives?.trim();

  const genderCtx = hasFemale && hasMale ? "a couple (one female, one male)"
    : hasFemale ? "a solo female subject"
    : hasMale ? "a solo male subject"
    : "lifestyle subjects";

  if (useScenarioMode) {
    return `You are an elite photography creative director. Generate exactly 15 VARIED scene ideas for ${genderCtx}.

SCENE REFERENCE (uploaded by user — generate 15 variations of this scenario type):
- Scenario Pattern: ${styleAnalysis.scenarioPattern}
- Framing Concept: ${styleAnalysis.framingConcept}
- Panel Format: ${styleAnalysis.panelFormat}
- Genre Feel: ${styleAnalysis.suggestedGenre}

YOUR JOB: Keep the SAME interaction type, pose pattern, and framing concept — but change EVERYTHING ELSE across 15 ideas: location, setting, outfit, time of day, country, mood.

STRICT RULES:
1. SAME SCENARIO, DIFFERENT WORLD: Every idea must follow the same interaction pattern and framing as the reference. A person lying on grass with overhead angle → variations: lying on sand dunes, lying on flower field, lying on wooden dock, lying on autumn leaves, lying on rooftop, etc.
2. REAL WORLD LOCATIONS: Specific named places with city/country. Never generic.
3. OUTFIT ONLY: The "clothing" field = SHORT outfit concept max 15 words. NO hair/face/skin.
4. VARY LOCATIONS AGGRESSIVELY: Different countries, continents, settings. Mix outdoor/indoor, nature/urban.
5. CAMERA: Keep the same framing concept as the reference (angle, shot type). Leave cameraStyle as a brief concept — no film stock yet.

Return ONLY a valid JSON array of exactly 15 objects:
[
  {
    "id": 1,
    "sceneName": "max 5-word evocative title",
    "location": "Specific Place Name, City, Country",
    "mood": "atmospheric mood, max 10 words",
    "clothing": "BRIEF outfit concept only, max 15 words",
    "pose": "brief action/pose following the same scenario pattern as reference, max 20 words",
    "cameraStyle": "same framing/angle concept as reference, brief — no film stock",
    "suggestedShotType": "one of: Close-up (chin to crown) | Medium close-up (chest up) | Medium shot (waist up) | Full body | POV selfie | Over-the-shoulder",
    "suggestedCrop": "one of: lower chest | mid-torso | waist | mid-thigh | knees",
    "genre": "one of: Lifestyle snapshot | Cinematic film still | Street photography | Travel editorial | Acubi / Korean aesthetic | Golden hour portrait"
  }
]`;
  }

  return `You are an elite photography creative director. Generate exactly 15 VARIED scene ideas for ${genderCtx}.

USER DIRECTIVES: ${userDirectives}

STRICT RULES:
1. REAL WORLD LOCATIONS: Use specific named places with city/country (e.g., "% Arabica, Arashiyama, Kyoto, Japan"). Never generic places.
2. OUTFIT ONLY: The "clothing" field = SHORT outfit concept max 15 words. NO hair, face, or skin descriptions.
3. VARY AGGRESSIVELY: Mix indoor/outdoor, day/night, urban/nature, across different countries and continents. No two scenes should share the same vibe or setting type.
4. FOREGROUND: For overhead/drone/high-angle ideas, write "aerial" in cameraStyle. For all others, note a natural obstruction type (grass, flowers, leaves, etc.) to generate foreground later.
5. CAMERA: Leave cameraStyle as a brief concept (e.g. "85mm, f/2.8, golden hour, film grain") — the final film stock will be assigned during prompt generation.

Return ONLY a valid JSON array of exactly 15 objects:
[
  {
    "id": 1,
    "sceneName": "max 5-word evocative title",
    "location": "Specific Place Name, City, Country",
    "mood": "atmospheric mood, max 10 words",
    "clothing": "BRIEF outfit concept only, max 15 words",
    "pose": "brief action/pose, max 20 words",
    "cameraStyle": "lens concept and angle only — no film stock",
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

  // Saved characters from localStorage
  const [savedCharacters, setSavedCharacters] = useState(() => {
    const saved = localStorage.getItem("saved_characters");
    return saved ? JSON.parse(saved) : [];
  });

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
  const [showSavedCharsPanel, setShowSavedCharsPanel] = useState(false);
  const [editingCharName, setEditingCharName] = useState(null);

  // Drag states
  const [isDraggingStyle, setIsDraggingStyle] = useState(false);
  const [isDraggingCharF, setIsDraggingCharF] = useState(false);
  const [isDraggingCharM, setIsDraggingCharM] = useState(false);

  const styleInputRef = useRef(null);
  const charFInputRef = useRef(null);
  const charMInputRef = useRef(null);

  const [templates, setTemplates] = useState(() => {
    const saved = localStorage.getItem("pb_templates_v4");
    return saved ? JSON.parse(saved) : {
      system: DEFAULT_TPL_SYSTEM,
      couple: DEFAULT_TPL_COUPLE,
      solo_f: DEFAULT_TPL_SOLO_F,
      solo_m: DEFAULT_TPL_SOLO_M
    };
  });

  const triggerToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  // ─── SAVE TO LOCALSTORAGE ON CHANGE ───────────────────────────────────────────
  useEffect(() => {
    try {
      // Only save analysis data (small), not base64 images (too large for localStorage)
      const charsToSave = savedCharacters.map(c => ({
        id: c.id,
        name: c.name,
        gender: c.gender,
        analysis: c.analysis,
        created_at: c.created_at,
        updated_at: c.updated_at
      }));
      localStorage.setItem("saved_characters", JSON.stringify(charsToSave));
    } catch (e) {
      console.error('LocalStorage quota exceeded:', e);
      triggerToast("Storage full - cannot save more characters");
    }
  }, [savedCharacters]);

  // ─── CHARACTER MANAGEMENT (localStorage) ─────────────────────────────────────
  const saveCharacter = (charData, gender) => {
    const name = charData.analysis?.name || `Character ${savedCharacters.filter(c => c.gender === gender).length + 1}`;
    const newChar = {
      id: 'char_' + Date.now(),
      name,
      gender,
      // Don't save image data - too large for localStorage
      analysis: charData.analysis,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    setSavedCharacters(prev => [newChar, ...prev]);
    triggerToast(`Character saved: ${name}`);
  };

  const deleteCharacter = (id) => {
    if (!confirm("Delete this character?")) return;
    setSavedCharacters(prev => prev.filter(c => c.id !== id));
    triggerToast("Character deleted");
  };

  const updateCharacterName = (id, newName) => {
    setSavedCharacters(prev => prev.map(c =>
      c.id === id ? { ...c, name: newName, updated_at: new Date().toISOString() } : c
    ));
    setEditingCharName(null);
    triggerToast("Name updated");
  };

  const loadCharacter = (char) => {
    // Load analysis data, but user needs to re-upload image for the thumbnail
    const charData = {
      url: null, // No image stored
      b64: null,
      type: null,
      analysis: char.analysis
    };
    if (char.gender === 'female') setCharSheetF(charData);
    else setCharSheetM(charData);
    setShowSavedCharsPanel(false);
    triggerToast(`Loaded analysis for: ${char.name} (re-upload image if needed)`);
  };

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
      if (!activeConfig?.apiKey) { triggerToast("Set API Key first."); return; }
      const raw = await fetchFromLLM(activeConfig,
        `Analyze this ${gender} character reference sheet in extreme detail.`,
        SYSTEM_ANALYZE_CHARACTER(gender),
        true,
        [img]
      );
      const parsed = JSON.parse(raw.replace(/```json/g, '').replace(/```/g, '').trim());
      const charData = { ...img, analysis: parsed, analyzing: false };
      if (gender === 'female') setCharSheetF(charData);
      else setCharSheetM(charData);

      // Auto-save to localStorage
      saveCharacter(charData, gender);
    } catch (e) {
      if (gender === 'female') setCharSheetF(prev => ({ ...prev, analyzing: false, error: e.message }));
      else setCharSheetM(prev => ({ ...prev, analyzing: false, error: e.message }));
      triggerToast("Failed to analyze character: " + e.message);
    }
  };


  // ─── GENERATE IDEAS ───────────────────────────────────────────────────────
  const handleGenerateIdeas = async () => {
    // Validation: need either style photo OR directives
    if (styleImages.length === 0 && !userDirectives.trim()) {
      triggerToast("Upload a style reference photo, or fill in Directives.");
      return;
    }
    if (!activeConfig?.apiKey) { triggerToast("API Key not set."); return; }

    setStage("LOADING_IDEAS");

    try {
      // Fase 1: Analisis style photos
      // When directives blank + style uploaded → extract SCENARIO PATTERN for idea variation
      // When directives filled + style uploaded → extract CAMERA/FILM for injection at generation time
      let sAnalysis = styleAnalysis;
      if (styleImages.length > 0 && !sAnalysis) {
        const raw = await fetchFromLLM(activeConfig,
          "Analyze this photo for scene scenario pattern and photographic style.",
          SYSTEM_ANALYZE_STYLE,
          true,
          styleImages
        );
        sAnalysis = JSON.parse(raw.replace(/```json/g, '').replace(/```/g, '').trim());
        setStyleAnalysis(sAnalysis);
      }

      // Fase 2: Generate ideas
      // If style uploaded + no directives: use scenario pattern to generate variations
      // If directives provided: use directives (style only affects camera at generation time)
      const ideasPrompt = buildIdeasPrompt(
        charSheetF?.analysis,
        charSheetM?.analysis,
        userDirectives,
        sAnalysis
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
      triggerToast("Failed: " + err.message);
      setStage("INPUT");
    }
  };

  // ─── SELECTIONS ───────────────────────────────────────────────────────────
  const toggleSelection = (id) => setSelections(prev => {
    const u = { ...prev };
    if (u[id]) delete u[id]; else u[id] = 'MF';
    return u;
  });
  const setCardType = (id, type) => setSelections(prev => ({ ...prev, [id]: type }));
  const updateCardSetting = (id, field, val) =>
    setCardSettings(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [field]: val } }));
  const handleSelectAll = () => { const u = {}; ideas.forEach(i => { u[i.id] = 'MF'; }); setSelections(u); };
  const handleDeselectAll = () => setSelections({});
  const handleBlurEditable = (id, field, val) =>
    setIdeas(prev => prev.map(idea => idea.id === id ? { ...idea, [field]: val } : idea));

  // ─── GENERATE PROMPTS ─────────────────────────────────────────────────────
  const buildCharacterBlock = (apiType) => {
    const hasF = !!charSheetF?.analysis;
    const hasM = !!charSheetM?.analysis;

    if (!hasF && !hasM) return "SUBJECT IDENTITY: No character sheets provided. Generate a photorealistic person.";

    const fBlock = hasF ? (() => {
      const a = charSheetF.analysis;
      return `FEMALE CHARACTER (from character sheet):
- Hair: ${a.hair?.length}, ${a.hair?.texture}, ${a.hair?.color}, ${a.hair?.style}. ${a.hair?.special || ""}
- Eyes: ${a.face?.eyes}
- Brows: ${a.face?.brows}
- Nose: ${a.face?.nose}
- Lips: ${a.face?.lips}
- Face shape: ${a.face?.shape}, Jaw: ${a.face?.jaw}, Cheeks: ${a.face?.cheeks}
- Distinctive marks: ${a.face?.distinctiveMarks}
- Skin: ${a.skin?.tone}, ${a.skin?.undertone}
- Accessories always on: ${a.accessories}
- Build: ${a.bodyBuild}`;
    })() : null;

    const mBlock = hasM ? (() => {
      const a = charSheetM.analysis;
      return `MALE CHARACTER (from character sheet):
- Hair: ${a.hair?.length}, ${a.hair?.texture}, ${a.hair?.color}, ${a.hair?.style}. ${a.hair?.special || ""}
- Facial Hair: ${a.facialHair}
- Eyes: ${a.face?.eyes}
- Brows: ${a.face?.brows}
- Nose: ${a.face?.nose}
- Lips: ${a.face?.lips}
- Face shape: ${a.face?.shape}, Jaw: ${a.face?.jaw}, Cheeks: ${a.face?.cheeks}
- Distinctive marks: ${a.face?.distinctiveMarks}
- Skin: ${a.skin?.tone}, ${a.skin?.undertone}
- Accessories always on: ${a.accessories}
- Build: ${a.bodyBuild}`;
    })() : null;

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

    // Style camera/film is always injected at generation time regardless of how ideas were generated
    const styleBlock = styleAnalysis ? `
VISUAL STYLE REFERENCE — CAMERA & FILM ONLY (DO NOT let this influence location, pose, or clothing):
- Film Feel: ${styleAnalysis.inferredCameraStyle}
- Color Palette: ${styleAnalysis.inferredMoodPalette}
- Photographic Aesthetic: ${styleAnalysis.styleAnalysis}
APPLY to: exact film stock name, color science sentence, lighting feel, grain in Camera & Technical Specs ONLY.
` : '';

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
${styleBlock}
CHARACTER IDENTITY (CRITICAL — USE EXACTLY AS PROVIDED, DO NOT MODIFY):
${charBlock}

CRITICAL RULES:
- In "Subject Identity & Styling", write ONLY clothing and accessories. Use "character reference sheet" for hairstyling and face lines.
- Expand Clothing to 30 words: exact fabric, color, cut, fit, wear pattern.
- Expand Pose to full anatomical WITH-chain tracking each arm/hand/finger individually.
- Environment MUST include a legible local-language sign with realistic text for this specific location.
- Camera MUST name a real film stock (Fujifilm Velvia/Pro 400H, Kodak Portra/Ektar/Ultramax, etc.) and describe color science in one sentence.
- If Camera Style is NOT aerial/drone/top-down: write a 20-25 word hyper-specific foreground obstruction (exact plant species, material, texture).
- Follow the structural template EXACTLY.`;

    try {
      const res = await fetchFromLLM(activeConfig, userMsg, fullSystemPrompt, false, []);
      if (!res) throw new Error("Empty response.");
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

      if (type === '2x') {
        taskList.push({ taskKey: `${id}_F`, idea, settings, typeDisplay: 'SOLO F', apiType: 'SOLO FEMALE', status: 'pending' });
        taskList.push({ taskKey: `${id}_C`, idea, settings, typeDisplay: 'COUPLE', apiType: 'COUPLE', status: 'pending' });
      } else {
        const apiType = type === 'M' ? 'SOLO MALE' : type === 'F' ? 'SOLO FEMALE' : 'COUPLE';
        const typeDisplay = type === 'M' ? 'SOLO M' : type === 'F' ? 'SOLO F' : 'COUPLE';
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

  // ─── DRAG DROP ZONE COMPONENT ─────────────────────────────────────────────
  const DragDropZone = ({ onDrop, isDragging, setIsDragging, children, className = "", activeClassName = "" }) => (
    <div
      className={`${className} ${isDragging ? activeClassName : ''}`}
      onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={e => { e.preventDefault(); setIsDragging(false); onDrop(e.dataTransfer.files); }}
    >
      {children}
    </div>
  );

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col min-h-0">
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
        .char-box.drag-over { border-color:var(--accent-hover); background:rgba(212,175,55,0.1); }
        @keyframes pulse { 0%,100%{opacity:.7} 50%{opacity:1} }
        .action-bar { position: sticky; bottom: 0; z-index: 50; }
        .char-list-item { transition: all 0.2s; }
        .char-list-item:hover { background: var(--surface-2); }
      `}</style>

      {/* ── TOP BAR ── */}
      <div className="flex justify-end gap-3 py-4 px-8 border-b border-(--border) flex-shrink-0">
        <button onClick={() => setShowSavedCharsPanel(!showSavedCharsPanel)} className="bg-(--surface-2) text-(--text-1) px-4 py-2 rounded-lg border border-(--border) cursor-pointer text-[13px] hover:bg-(--border) transition-colors">
          Saved Characters ({savedCharacters.length})
        </button>
        <button onClick={() => setShowTplModal(true)} className="bg-(--surface-2) text-((--text-1) px-4 py-2 rounded-lg border border-(--border) cursor-pointer text-[13px] hover:bg-(--border) transition-colors">
          Templates
        </button>
      </div>

      {/* Saved Characters Sidebar */}
      {showSavedCharsPanel && (
        <div className="fixed inset-0 z-40 flex justify-end" onClick={() => setShowSavedCharsPanel(false)}>
          <div className="bg-(--surface) border-l border-(--border) w-100 max-w-[90vw] h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-(--border) flex justify-between items-center sticky top-0 bg-(--surface) z-10">
              <h3 className="m-0 text-base font-semibold">Saved Characters</h3>
              <button onClick={() => setShowSavedCharsPanel(false)} className="bg-transparent border-none text-(--text-2) cursor-pointer text-lg">x</button>
            </div>
            <div className="p-4">
              {savedCharacters.length === 0 ? (
                <div className="text-center py-10 text-(--text-3)">No saved characters yet</div>
              ) : (
                <div className="flex flex-col gap-3">
                  {savedCharacters.map(char => (
                    <div key={char.id} className="char-list-item bg-(--surface-2) border border-(--border) rounded-lg p-3 flex gap-3">
                      <div className="w-14 h-14 rounded-lg flex-shrink-0 cursor-pointer hover:opacity-80 flex items-center justify-center bg-(--surface) text-2xl" onClick={() => loadCharacter(char)}>
                        {char.gender === 'female' ? 'F' : 'M'}
                      </div>
                      <div className="flex-1 min-w-0">
                        {editingCharName === char.id ? (
                          <input
                            autoFocus
                            className="bg-(--surface) border border-(--accent) text-(--text-1) px-2 py-1 rounded text-sm w-full outline-none"
                            defaultValue={char.name}
                            onBlur={e => updateCharacterName(char.id, e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') updateCharacterName(char.id, e.target.value); }}
                            onClick={e => e.stopPropagation()}
                          />
                        ) : (
                          <div className="font-medium text-(--text-1) text-sm cursor-pointer hover:text-(--accent)" onClick={() => setEditingCharName(char.id)}>{char.name}</div>
                        )}
                        <div className="text-(--text-3) text-xs mt-1">{char.gender === 'female' ? 'Female' : 'Male'}</div>
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => loadCharacter(char)} className="text-(--accent) text-xs bg-transparent border-none cursor-pointer hover:underline">Load</button>
                          <button onClick={() => deleteCharacter(char.id)} className="text-(--error) text-xs bg-transparent border-none cursor-pointer hover:underline">Delete</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-8 py-6 max-w-375 mx-auto w-full">

        {/* ══ INPUT ══ */}
        {stage === "INPUT" && (
          <div className="flex flex-col gap-8 max-w-200 mx-auto">
            <h2 className="font-semibold text-(--text-1) text-2xl text-center m-0">Photo Prompt Builder</h2>

            {/* Row: Character Sheets */}
            <div>
              <div className="text-[11px] tracking-[1.5px] uppercase text-(--accent-dim) mb-3">Character Sheets <span className="text-(--text-3) normal-case tracking-normal">(optional — dari tab Character Reference)</span></div>
              <div className="grid grid-cols-2 gap-4">

                {/* Female Character */}
                <div>
                  <div className="text-xs text-(--text-3) mb-2">Female Character</div>
                  <input ref={charFInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleCharFile(e.target.files, 'female')} />
                  {!charSheetF ? (
                    <DragDropZone onDrop={files => handleCharFile(files, 'female')} isDragging={isDraggingCharF} setIsDragging={setIsDraggingCharF} className="char-box" activeClassName="char-box drag-over">
                      <div onClick={() => charFInputRef.current?.click()}>
                        <div className="text-xl mb-1.5">Drag sheet here</div>
                        <div className="text-(--text-3) text-xs">or click to upload</div>
                      </div>
                    </DragDropZone>
                  ) : (
                    <div className={`char-box loaded ${charSheetF.analyzing ? 'analyzing' : ''}`}>
                      <div className="flex items-center gap-3">
                        {charSheetF.url && <img src={charSheetF.url} className="w-14 h-14 object-cover rounded-lg flex-shrink-0" alt="char-f" />}
                        <div className="text-left flex-1 min-w-0">
                          {charSheetF.analyzing && <div className="text-(--accent) text-xs animate-pulse mb-1">Analyzing...</div>}
                          {charSheetF.analysis && (
                            <>
                              <div className="font-semibold text-(--text-1) text-sm">{charSheetF.analysis.name || "Female Character"}</div>
                              <div className="text-(--text-3) text-[11px] truncate">{charSheetF.analysis.hair?.color} · {charSheetF.analysis.face?.eyes?.split(',')[0]}</div>
                              <button onClick={() => setShowCharModal('female')} className="text-(--accent) text-[11px] bg-transparent border-none cursor-pointer p-0 mt-0.5 hover:opacity-70">View details</button>
                            </>
                          )}
                          {charSheetF.error && <div className="text-(--error) text-[11px]">Error: {charSheetF.error}</div>}
                        </div>
                        <button onClick={() => setCharSheetF(null)} className="bg-transparent border-none text-(--text-3) cursor-pointer hover:text-(--error) text-lg leading-none flex-shrink-0">x</button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Male Character */}
                <div>
                  <div className="text-xs text-(--text-3) mb-2">Male Character</div>
                  <input ref={charMInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleCharFile(e.target.files, 'male')} />
                  {!charSheetM ? (
                    <DragDropZone onDrop={files => handleCharFile(files, 'male')} isDragging={isDraggingCharM} setIsDragging={setIsDraggingCharM} className="char-box" activeClassName="char-box drag-over">
                      <div onClick={() => charMInputRef.current?.click()}>
                        <div className="text-xl mb-1.5">Drag sheet here</div>
                        <div className="text-(--text-3) text-xs">or click to upload</div>
                      </div>
                    </DragDropZone>
                  ) : (
                    <div className={`char-box loaded ${charSheetM.analyzing ? 'analyzing' : ''}`}>
                      <div className="flex items-center gap-3">
                        {charSheetM.url && <img src={charSheetM.url} className="w-14 h-14 object-cover rounded-lg flex-shrink-0" alt="char-m" />}
                        <div className="text-left flex-1 min-w-0">
                          {charSheetM.analyzing && <div className="text-(--accent) text-xs animate-pulse mb-1">Analyzing...</div>}
                          {charSheetM.analysis && (
                            <>
                              <div className="font-semibold text-(--text-1) text-sm">{charSheetM.analysis.name || "Male Character"}</div>
                              <div className="text-(--text-3) text-[11px] truncate">{charSheetM.analysis.hair?.color} · {charSheetM.analysis.face?.eyes?.split(',')[0]}</div>
                              <button onClick={() => setShowCharModal('male')} className="text-(--accent) text-[11px] bg-transparent border-none cursor-pointer p-0 mt-0.5 hover:opacity-70">View details</button>
                            </>
                          )}
                          {charSheetM.error && <div className="text-(--error) text-[11px]">Error: {charSheetM.error}</div>}
                        </div>
                        <button onClick={() => setCharSheetM(null)} className="bg-transparent border-none text-(--text-3) cursor-pointer hover:text-(--error) text-lg leading-none flex-shrink-0">x</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Style Reference Photos */}
            <div>
              <div className="text-[11px] tracking-[1.5px] uppercase text-(--accent-dim) mb-1.5">Style Reference Photo</div>
              <div className="text-(--text-3) text-xs mb-3">
                {!userDirectives.trim()
                  ? "Upload a photo to use as scene inspiration — AI will generate 15 variations of the same scenario in different settings. Or fill in Directives below instead."
                  : "Uploaded photo will contribute film stock, lighting, and color palette to the final prompts."}
              </div>
              <input ref={styleInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleStyleFiles(e.target.files)} />
              {styleImages.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-3">
                  {styleImages.map((img, i) => (
                    <div key={i} className="relative">
                      <img src={img.url} className="w-16 h-16 object-cover rounded-lg border border-(--border)" alt="style" />
                      <button onClick={() => setStyleImages(prev => prev.filter((_, j) => j !== i))} className="absolute -top-1.5 -right-1.5 bg-(--error) text-white border-none rounded-full w-5 h-5 cursor-pointer flex items-center justify-center text-xs">x</button>
                    </div>
                  ))}
                  <div className="w-16 h-16 border border-dashed border-(--border-hover) rounded-lg flex items-center justify-center cursor-pointer hover:border-(--accent) transition-colors text-xl text-(--text-3)" onClick={() => styleInputRef.current?.click()}>+</div>
                </div>
              )}
              {styleImages.length === 0 && (
                <DragDropZone
                  onDrop={handleStyleFiles}
                  isDragging={isDraggingStyle}
                  setIsDragging={setIsDraggingStyle}
                  className="border-[1.5px] border-dashed border-(--border-hover) rounded-lg p-6 text-center cursor-pointer hover:border-(--accent) transition-colors bg-(--surface)"
                  activeClassName="border-(--accent) bg-(--accent-faint)"
                >
                  <div className="text-xl mb-1">Drag photo here</div>
                  <div className="text-(--text-2) text-sm">or click to upload scene reference</div>
                  <div className="text-(--text-3) text-xs mt-1">Leave Directives blank to generate variations of this scene type</div>
                </DragDropZone>
              )}
              {styleAnalysis && (
                <div className="mt-2 p-3 bg-(--surface) border border-(--accent) rounded-lg text-[12px] text-(--text-2) flex flex-col gap-1">
                  <div className="text-(--accent) text-[10px] font-semibold uppercase tracking-wider">Camera/Film Extracted</div>
                  <div><span className="text-(--text-3)">Film feel: </span>{styleAnalysis.inferredCameraStyle}</div>
                  <div><span className="text-(--text-3)">Palette: </span>{styleAnalysis.inferredMoodPalette}</div>
                  <button onClick={() => { setStyleAnalysis(null); setStyleImages([]); }} className="mt-1 text-(--text-3) bg-transparent border-none cursor-pointer hover:text-(--error) text-xs text-left">Clear & re-upload</button>
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
              Generate 15 Ideas
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
          <div className="pb-24">
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
                      <div className="text-(--text-3) text-xs">Location: <span className="ef" contentEditable suppressContentEditableWarning onBlur={e => handleBlurEditable(idea.id, 'location', e.target.textContent)} onClick={e => e.stopPropagation()}>{idea.location}</span></div>
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
                        {['Male/Female', 'Female', 'Male', '2x'].map(t => {
                          const val = t === 'Male/Female' ? 'MF' : t === 'Female' ? 'F' : t === 'Male' ? 'M' : '2x';
                          return (
                            <button key={t} onClick={() => setCardType(idea.id, val)} className={`flex-1 py-1.5 rounded-md text-xs font-semibold border cursor-pointer transition-colors ${type === val ? 'bg-(--accent) text-(--bg) border-(--accent)' : 'bg-transparent text-(--text-2) border-(--border) hover:border-(--border-hover)'}`}>{t}</button>
                          );
                        })}
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
          <div className="pb-24">
            <div className="flex justify-between items-center mb-6">
              <div>
                <div className="text-[11px] tracking-[1.5px] uppercase text-(--accent-dim) mb-1">GENERATING</div>
                <div className="text-(--text-1) text-xl font-semibold">{results.filter(r => r.status === 'success').length} / {results.length} complete</div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStage("SELECT")} className="bg-transparent border border-(--border-hover) text-(--text-2) px-4 py-2 rounded-md cursor-pointer text-sm">Back</button>
                <button
                  onClick={() => {
                    const grouped = {};
                    results.filter(r => r.status === 'success').forEach(r => {
                      const g = r.typeDisplay.includes('COUPLE') ? 'COUPLE' : r.typeDisplay.includes('Female') ? 'SOLO FEMALE' : 'SOLO MALE';
                      if (!grouped[g]) grouped[g] = [];
                      grouped[g].push(`============= PROMPT ${grouped[g].length + 1} =============\n${r.resultText}`);
                    });
                    navigator.clipboard.writeText(Object.entries(grouped).map(([g, p]) => `${g}\n${p.join('\n\n\n')}`).join('\n\n\n'));
                    triggerToast("Copied All!");
                  }}
                  className="bg-(--text-1) text-(--bg) px-5 py-2 rounded-md cursor-pointer border-none font-semibold text-sm hover:opacity-90"
                >Copy All</button>
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
                      {task.status === 'loading' && <span className="text-(--accent) text-[13px] animate-pulse">Generating...</span>}
                      {task.status === 'success' && <button className="text-(--accent) bg-transparent border-none cursor-pointer font-semibold" onClick={() => { navigator.clipboard.writeText(task.resultText); triggerToast("Copied!"); }}>Copy</button>}
                      {task.status === 'error' && <button className="text-(--error) bg-transparent border-none cursor-pointer font-semibold" onClick={() => launchSingleTask(task.taskKey, task, `${templates.system}\n\n${templates.couple}\n\n${templates.solo_f}\n\n${templates.solo_m}`)}>Retry</button>}
                    </div>
                  </div>
                  {task.status === 'loading' && <div className="skeleton m-5" />}
                  {task.status === 'success' && <div className="p-5 font-mono text-[13px] whitespace-pre-wrap text-(--text-2) leading-relaxed">{task.resultText}</div>}
                  {task.status === 'error' && <div className="p-5 text-(--error) font-mono text-[13px]">Failed: {task.resultText}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM ACTION BAR - Sticky at bottom */}
      {stage === "SELECT" && (
        <div className="action-bar bg-(--bg) border-t border-(--border) px-8 py-4 flex justify-between items-center flex-shrink-0">
          <div>
            <div className="text-[11px] tracking-[1.5px] uppercase text-(--accent-dim)">SELECT SCENES</div>
            <div className="text-(--text-1) text-lg font-semibold">{Object.keys(selections).length} of {ideas.length} selected</div>
          </div>
          <div className="flex gap-2 items-center">
            {charSheetF?.analysis && (
              <button onClick={() => setShowCharModal('female')} className="bg-(--surface) border border-(--accent) text-(--accent) px-3 py-1.5 rounded-full text-[11px] cursor-pointer hover:bg-(--surface-2)">
                Female: {charSheetF.analysis.name || "Character"}
              </button>
            )}
            {charSheetM?.analysis && (
              <button onClick={() => setShowCharModal('male')} className="bg-(--surface) border border-(--accent) text-(--accent) px-3 py-1.5 rounded-full text-[11px] cursor-pointer hover:bg-(--surface-2)">
                Male: {charSheetM.analysis.name || "Character"}
              </button>
            )}
            <div className="w-px h-6 bg-(--border) mx-1" />
            <button onClick={resetAll} className="bg-transparent border border-(--border-hover) text-(--text-2) px-3 py-2 rounded-md cursor-pointer hover:text-(--text-1) text-sm">Reset</button>
            {Object.keys(selections).length > 0
              ? <button onClick={handleDeselectAll} className="bg-transparent border border-(--border-hover) text-(--text-2) px-3 py-2 rounded-md cursor-pointer hover:text-(--text-1) text-sm">Deselect All</button>
              : <button onClick={handleSelectAll} className="bg-transparent border border-(--border-hover) text-(--text-2) px-3 py-2 rounded-md cursor-pointer hover:text-(--text-1) text-sm">Select All</button>
            }
            {Object.keys(selections).length > 0 && (
              <button onClick={handleGeneratePrompts} className="bg-(--accent) text-(--bg) px-5 py-2 rounded-md cursor-pointer border-none font-semibold text-sm hover:bg-(--accent-hover)">
                Generate {Object.keys(selections).length}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ══ CHARACTER DETAIL MODAL ══ */}
      {showCharModal && (
        <div className="fixed inset-0 bg-black/85 flex justify-center items-center z-9999 backdrop-blur-sm" onClick={() => setShowCharModal(null)}>
          <div className="bg-(--surface) border border-(--border) rounded-xl w-175 max-w-[90vw] max-h-[85vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-(--border) flex justify-between items-center">
              <h3 className="m-0 text-lg font-semibold">{showCharModal === 'female' ? 'Female' : 'Male'} Character Analysis</h3>
              <button className="bg-transparent border-none text-(--text-2) cursor-pointer text-lg" onClick={() => setShowCharModal(null)}>x</button>
            </div>
            <div className="p-5 overflow-y-auto flex-1 font-mono text-[12px] text-(--text-2) flex gap-5">
              {(showCharModal === 'female' ? charSheetF : charSheetM)?.url && (
                <img src={(showCharModal === 'female' ? charSheetF : charSheetM).url} className="w-32 h-auto object-cover rounded-lg flex-shrink-0 self-start border border-(--border)" alt="char" />
              )}
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
              <h3 className="m-0 text-lg font-semibold">Master Templates</h3>
              <button className="bg-transparent border-none text-(--text-2) cursor-pointer text-lg" onClick={() => setShowTplModal(false)}>x</button>
            </div>
            <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-4">
              {[{ key:'system', label:'Base System Directives' }, { key:'couple', label:'Couple (Male/Female)' }, { key:'solo_f', label:'Solo Female' }, { key:'solo_m', label:'Solo Male' }].map(({ key, label }) => (
                <div key={key} className="flex flex-col gap-1.5">
                  <label className="text-(--text-2) text-[13px]">{label}</label>
                  <textarea className="bg-(--surface-2) border border-(--border) text-(--text-1) p-3 rounded-lg h-40 font-mono text-[12px] outline-none focus:border-(--accent) resize-y" value={templates[key]} onChange={e => setTemplates({ ...templates, [key]: e.target.value })} />
                </div>
              ))}
            </div>
            <div className="p-5 border-t border-(--border) flex justify-end gap-3 bg-(--surface-2) rounded-b-xl">
              <button className="bg-transparent border border-(--border) text-(--text-2) px-4 py-2 rounded-md cursor-pointer text-sm" onClick={() => { if (confirm("Reset to default?")) setTemplates({ system: DEFAULT_TPL_SYSTEM, couple: DEFAULT_TPL_COUPLE, solo_f: DEFAULT_TPL_SOLO_F, solo_m: DEFAULT_TPL_SOLO_M }); }}>Reset Default</button>
              <button className="bg-(--text-1) text-(--bg) px-4 py-2 rounded-md font-semibold cursor-pointer text-sm" onClick={() => { localStorage.setItem("pb_templates_v4", JSON.stringify(templates)); setShowTplModal(false); triggerToast("Saved!"); }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ TOAST ══ */}
      {toast && <div className="fixed bottom-8 right-8 bg-(--text-1) text-(--bg) px-7 py-3.5 rounded-lg font-semibold z-100000 shadow-xl">{toast}</div>}
    </div>
  );
}
