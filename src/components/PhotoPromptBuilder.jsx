import { useState, useRef, useContext, useEffect } from "react";
import { ApiContext } from "../context/ApiContext";
import { fetchFromLLM } from "../utils/api";

// ─── TEMPLATES ────────────────────────────────────────────────────────────────
const DEFAULT_TPL_SYSTEM = `You are an elite AI photography creative director and prompt engineer. Your job is to generate hyper-detailed, technically precise image generation prompts that produce ALIVE, NATURAL, authentic lifestyle photos — NOT empty museum shots, NOT staged studio, NOT editorial spreads.

ABSOLUTE RULES:
1. INSTRUCTION [LOCKED] IS SACRED: Always start with the exact INSTRUCTION [LOCKED] block from the template. This preserves character identity. Never modify its wording.
2. CORE AESTHETIC: First line must be "Photorealistic authentic lifestyle snapshot of [subject count] [gender] subject(s) in [specific real location], [2-3 word mood/vibe]." NEVER write "studio", "editorial", or "stock".
3. SUBJECT IDENTITY & STYLING: Split into "Hairstyling" line + "Exact face" line + "Clothing:" line + "Wearable Accessories:" line. NEVER re-describe hair color, eye color, skin tone, or facial features in clothing/accessories — those are locked in INSTRUCTION and the hairstyling/face lines.
4. POSE AND ACTION: Use "WITH" chains for body mechanics. Track every arm, forearm, hand, and finger individually. Specify torso angle, head angle, expression (15+ word micro-expression), eye contact direction, and crop point. End with "All other hands and limbs completely hidden from view out of frame. Cropped exactly at [crop point]."
   ⚠ CRITICAL EXCEPTION — POV SELFIE SHOT TYPE: When the shot type is "POV selfie", this image IS the selfie photo itself — it is shot FROM the smartphone camera's perspective looking at the subjects. Therefore:
   - DO NOT describe any subject holding a phone, smartphone, or camera. No arm extended. No device in hand.
   - Subjects face the camera naturally at close range with arms in relaxed, natural positions (by sides, in pockets, touching partner, etc.).
   - The "selfie" framing is established ONLY in the Camera & Technical Specs section (wide-angle lens, close distance, smartphone camera, slight upward or eye-level angle).
   - The Negative Prompt MUST include: "phone visible in frame, hand holding phone, arm extended toward camera, visible smartphone, device in frame, camera in hand, selfie arm, disembodied arm, arm reaching toward lens".
5. ENVIRONMENT & LIGHTING — THE SOUL OF THE IMAGE:
   a. Start with the SPECIFIC REAL LOCATION full name.
   b. Write 80+ words of SPECIFIC, ALIVE environment detail:
      - PUBLIC PLACES (tourist spots, observation decks, markets, plazas, landmarks): when Outdor place MUST include natural human activity — other visitors walking, taking photos, couples, families, groups of friends. Describe their approximate positions, activities, clothing colors. A famous place should NEVER look empty.
      - NATURE (mountains, beaches, forests, parks): Include visible wildlife (birds, insects), other hikers/visitors in the distance, movement of vegetation in wind.
      - URBAN STREETS: Include pedestrians, cyclists, cars, shop activity, street vendors.
      - INDOOR VENUES (cafes, museums, malls): Include other patrons, staff, ambient activity.
   c. Describe lighting with direction, quality, shadows, ambient fill.
   d. End with "Overall scene features a [vibe] color palette of [exactly 6-9 specific named colors]."
   e. MANDATORY BACKGROUND ACTIVITY: You MUST describe at least 2-3 specific groups of background people with clothing colors, positions, and activities. "A couple of tourists leaning over the railing snapping photos on their phones, a group of school children in matching jackets walking past, a jogger in a red hoodie in the far background" — this level of detail is REQUIRED. An empty scene is a failure. Do NOT write "quiet", "deserted", "peaceful empty", "secluded". Always include natural human presence scaled to the location type. When scene was private place it should be empty without activity of people.
6. CAMERA & TECHNICAL SPECS: Must include:
   - SPECIFIC REAL CAMERA MODEL — NEVER write "modern smartphone", "high-end camera", or any generic description. Always name the actual device. Examples by use case:
     * POV selfie / lifestyle: "iPhone 16 Pro Max", "Samsung Galaxy S25 Ultra", "Google Pixel 9 Pro", "iPhone 15 Pro"
     * Street / travel candid: "Fujifilm X100VI", "Fujifilm X-T5 + 56mm f/1.2 XF", "Sony A7C II + 35mm f/1.8"
     * Cinematic / editorial: "Sony A7 IV + 85mm f/1.4 G Master", "Canon EOS R5 + 50mm f/1.2L", "Leica Q3 28mm f/1.7"
     * Golden hour / portrait: "Nikon Z6 III + 50mm f/1.2 S", "Canon EOS R6 Mark II + 85mm f/1.8", "Leica M11 + 50mm Summilux f/1.4"
     * If "Camera Device" is specified in the user message — use that EXACT model verbatim, no substitution.
   - Shot framing and angle
   - Perspective description
   - Exact lens mm, f/stop, shutter speed
   - Depth of field description
   - ISO
   - REAL NAMED FILM STOCK (Fujifilm Velvia 50, Fujifilm Pro 400H, Kodak Portra 400/800, Kodak Ektar 100, Fujifilm Superia 400, Kodak Gold 200, Ilford HP5)
   - One sentence describing the color science outcome tied to that specific film stock
   - Grain description
7. NEGATIVE PROMPT: Comprehensive list preventing AI artifacts, empty scenes, studio look.
8. OUTPUT FORMAT: Follow the structural template EXACTLY. No extra commentary, no markdown, no code blocks. Start output directly with "INSTRUCTION [LOCKED]:".`;

const DEFAULT_TPL_COUPLE = `INSTRUCTION [LOCKED]: Use the provided reference image1 and image2 as the primary visual guides. Maintain an extremely strong and accurate resemblance to both subjects shown in the references.
- For the female subject: Preserve facial features, facial structure, hair color/style, skin tone, eye shape, nose, lips, and distinctive facial markers.
- For the male subject: Preserve facial features, facial structure, hair color/style, skin tone, eye shape, nose, lips, and distinctive facial markers.
Do not stylize, exaggerate, or significantly modify the core identity, bone structure, or proportions of either person. Allow only small natural variations typical of real photography, lighting, and pose.
Positive Prompt:
Core Aesthetic: Photorealistic authentic lifestyle snapshot of two subjects in [SPECIFIC REAL LOCATION], [2-3 WORD MOOD/VIBE].
Subject Identity & Styling (Female): Hairstyling matching the provided target reference image, [wind/pose-specific hair movement or adjustment]. Exact face matching the provided target reference image. Clothing: [hyper-specific expansion — exact brand, fabric, design, color, cut, fit, layering, wear pattern, how fabric interacts with body. all info must from real world. NO hair/face/skin re-description]. Wearable Accessories: [Body/head/face accessories only with specific detail, or "No accessories"].
Subject Identity & Styling (Male): Hairstyling matching the provided target reference image, [wind/pose-specific hair movement if any]. Exact face matching the provided target reference image. Clothing: [hyper-specific expansion — exact brand, fabric, design, color, cut, fit, layering, wear pattern. all info must from real world. NO hair/face/skin re-description]. Wearable Accessories: [Body/head/face accessories only with specific detail, or "No accessories"].
Pose and Action (Shared Interaction): Two subjects [spatial proximity description]. Female [torso angle + anatomical WITH-chain tracking each arm and hand individually]. Female exhibiting [micro-expression with eye contact direction]. Male [torso angle + anatomical WITH-chain tracking each arm and hand individually]. Male exhibiting [micro-expression with eye contact direction]. All other hands and limbs completely hidden from view out of frame. Cropped exactly at [CROP POINT].
Environment & Lighting: [LOCATION FULL REAL NAME], [ALIVE environment: terrain, vegetation, sky, landmarks — AND natural human/wildlife activity appropriate to this location's popularity. Tourist spots have visitors. Streets have pedestrians. Nature has birds/insects. Private place like bedroom, house, bathroom was completly empty from stranger/people activity. Make it feel lived-in and real/]. [Lighting: direction, quality, shadows, ambient fill]. Overall scene features a [vibe] color palette of [6-9 specific named colors].
Camera & Technical Specs: Shot on [SPECIFIC camera model — e.g. iPhone 16 Pro Max / Sony A7 IV + 85mm f/1.4 GM / Fujifilm X-T5 + 56mm f/1.2 XF]. Framed as [shot type] from [angle description]. [Perspective description], [depth of field description], [lens mm], f/[aperture], [shutter speed], ISO [number]. [Real film stock name], [one sentence color science outcome], [grain description].
Negative Prompt:
Semirealism, CGI, 3d render, airbrushed skin, doll face, wax figure, plastic skin, perfect symmetry, magazine editorial, stock photography, extra fingers, studio lighting, empty scene, abandoned feel, ghost town, no people, deserted, isolated subjects, floating limbs, disconnected arms, amputated hands, professional retouching, [context-specific: glossy skin / artificial bounce light / on camera flash / direct flash / harsh shadows / flash glare], [crop-specific exclusions: torso / waist down / bottom-wear / legwear / footwear / full body as appropriate], wide room, landscape, shallow depth of field, bokeh, blurred background, portrait mode, tilt shift, macro, soft focus, subject separation, [selfie-specific if POV: phone visible in frame, hand holding phone, smartphone visible, arm extended toward camera, device in hand, camera in frame, third person view, photographer visible, disembodied selfie arm, camera floating in air, amputated limb, finger over lens], both shoulders raised, self-touching, ghost hand, third arm, extra wrist, hand passing through body, fused bodies, floating hand, watermark.`;

const DEFAULT_TPL_SOLO_F = `INSTRUCTION [LOCKED]: Use the provided reference image as the primary visual guide. Maintain an extremely strong and accurate resemblance to the subject shown in the reference. Preserve facial features, facial structure, hairstyle, skin tone, eye shape, nose, lips, and distinctive facial markers. Do not stylize, exaggerate, or significantly modify the core identity, bone structure, or proportions. Allow only small natural variations typical of real photography, lighting, and pose.
Positive Prompt:
Core Aesthetic: Photorealistic authentic lifestyle snapshot of one female subject in [SPECIFIC REAL LOCATION], [2-3 WORD MOOD/VIBE].
Subject Identity & Styling (Female): Hairstyling matching the provided target reference image, [wind/pose-specific hair movement or adjustment]. Exact face matching the provided target reference image. Clothing: [hyper-specific expansion — exact brand, fabric, design, color, cut, fit, layering, wear pattern, how fabric interacts with body. NO hair/face/skin re-description]. Wearable Accessories: [Body/head/face accessories only with specific detail, or "No accessories"].
Pose and Action (Female): One subject [position/stance]. [Torso angle + anatomical WITH-chain tracking each arm and hand individually]. Female exhibiting [micro-expression with eye contact direction]. All other hands and limbs completely hidden from view out of frame. Cropped exactly at [CROP POINT].
Environment & Lighting: [LOCATION FULL REAL NAME], [ALIVE environment: terrain, vegetation, sky, landmarks — AND natural human/wildlife activity appropriate to this location's popularity. Tourist spots have visitors. Streets have pedestrians. Nature has birds/insects. Private place like bedroom, house, bathroom was completly empty from stranger/people activity. Make it feel lived-in and real]. [Lighting: direction, quality, shadows, ambient fill]. Overall scene features a [vibe] color palette of [6-9 specific named colors].
Camera & Technical Specs: Shot on [SPECIFIC camera model — e.g. iPhone 16 Pro Max / Sony A7 IV + 85mm f/1.4 GM / Fujifilm X-T5 + 56mm f/1.2 XF]. Framed as [shot type] from [angle description]. [Perspective description], [depth of field description], [lens mm], f/[aperture], [shutter speed], ISO [number]. [Real film stock name], [one sentence color science outcome], [grain description].
Negative Prompt:
Semirealism, CGI, 3d render, airbrushed skin, doll face, wax figure, plastic skin, perfect symmetry, magazine editorial, stock photography, extra fingers, studio lighting, empty scene, abandoned feel, ghost town, no people, deserted, isolated subject, floating limbs, disconnected arms, amputated hands, professional retouching, glossy skin, artificial bounce light, rim light, arms, hands, fingers, [crop-specific exclusions: torso / waist down / bottom-wear / legwear / footwear / full body as appropriate], shallow depth of field, bokeh, blurred background, portrait mode, tilt shift, macro, soft focus, subject separation.`;

const DEFAULT_TPL_SOLO_M = `INSTRUCTION [LOCKED]: Use the provided reference image as the primary visual guide. Maintain an extremely strong and accurate resemblance to the subject shown in the reference. Preserve facial features, facial structure, hairstyle, skin tone, eye shape, nose, lips, and distinctive facial markers. Do not stylize, exaggerate, or significantly modify the core identity, bone structure, or proportions. Allow only small natural variations typical of real photography, lighting, and pose.
Positive Prompt:
Core Aesthetic: Photorealistic authentic lifestyle snapshot of one male subject in [SPECIFIC REAL LOCATION], [2-3 WORD MOOD/VIBE].
Subject Identity & Styling (Male): Hairstyling matching the provided target reference image, [wind/pose-specific hair movement if any]. Exact face matching the provided target reference image. Clothing: [hyper-specific expansion — exact brand, fabric, design, color, cut, fit, layering, wear pattern, how fabric interacts with body. NO hair/face/skin re-description]. Wearable Accessories: [Body/head/face accessories only with specific detail, or "No accessories"].
Pose and Action (Male): One subject [position/stance]. [Torso angle + anatomical WITH-chain tracking each arm and hand individually]. Male exhibiting [micro-expression with eye contact direction]. All other hands and limbs completely hidden from view out of frame. Cropped exactly at [CROP POINT].
Environment & Lighting: [LOCATION FULL REAL NAME], [ALIVE environment: terrain, vegetation, sky, landmarks — AND natural human/wildlife activity appropriate to this location's popularity. Tourist spots have visitors. Streets have pedestrians. Nature has birds/insects. Private place like bedroom, house, bathroom was completly empty from stranger/people activity. Make it feel lived-in and real]. [Lighting: direction, quality, shadows, ambient fill]. Overall scene features a [vibe] color palette of [6-9 specific named colors].
Camera & Technical Specs: Shot on [SPECIFIC camera model — e.g. iPhone 16 Pro Max / Sony A7 IV + 85mm f/1.4 GM / Fujifilm X-T5 + 56mm f/1.2 XF]. Framed as [shot type] from [angle description]. [Perspective description], [depth of field description], [lens mm], f/[aperture], [shutter speed], ISO [number]. [Real film stock name], [one sentence color science outcome], [grain description].
Negative Prompt:
Semirealism, CGI, 3d render, airbrushed skin, doll face, wax figure, plastic skin, perfect symmetry, magazine editorial, stock photography, extra fingers, studio lighting, empty scene, abandoned feel, ghost town, no people, deserted, isolated subject, floating limbs, disconnected arms, amputated hands, professional retouching, glossy skin, artificial bounce light, rim light, [crop-specific exclusions: lower legs / footwear / feet / ground / floor / full body as appropriate], shallow depth of field, bokeh, blurred background, portrait mode, tilt shift, macro, soft focus, subject separation, on camera flash, flash glare, self-touching, ghost hand, third arm, extra wrist, hand passing through body, floating hand, object fused to body.`;

// ─── OPTIONS ──────────────────────────────────────────────────────────────────
const SHOT_TYPES = [
  "Close-up (chin to crown)", "Medium close-up (chest up)", "Medium shot (waist up)",
  "Medium-long shot (thigh up)", "Full body", "Extreme close-up (face only)",
  "Over-the-shoulder", "POV selfie", "Three-quarter shot (knees up)",
  "Cowboy shot (mid-thigh up)", "American shot (knees up)",
  "Italian shot (thighs up)", "Choker extreme close-up",
  "Bird's eye view", "Worm's eye view", "Dutch angle shot",
  "Low-angle hero shot", "High-angle vulnerable shot",
  "Profile silhouette", "Back view shot", "Split-screen duo"
];
const CROP_POINTS = [
  "lower chest", "mid-chest", "upper chest", "collarbone", "shoulders",
  "waist", "mid-torso", "hips", "mid-thigh", "knees",
  "upper thighs", "ankles", "just below shoulders", "neck",
  "forehead", "chin", "mid-calf", "elbows"
];
const GENRES = [
  "Lifestyle snapshot", "Cinematic film still", "Street photography",
  "Travel editorial", "Aesthetic OOTD", "Candid documentary",
  "Acubi / Korean aesthetic", "Moodboard editorial", "Golden hour portrait",
  "Film noir", "Retro vintage", "Editorial fashion", "High fashion",
  "Paparazzi candid", "Wedding photography", "Couple portrait",
  "Engagement shoot", "Dating app profile", "Social media aesthetic",
  "Instagram influencer", "TikTok aesthetic", "Pinterest mood",
  "Music video still", "K-pop idol concept", "J-drama still",
  "Anime-inspired", "Indie film aesthetic", "New retro",
  "Y2K aesthetic", "Cyberpunk neon", "Dreamy ethereal"
];

const CAMERAS = [
  // Smartphones
  "iPhone 16 Pro Max (48MP Fusion camera)",
  "iPhone 15 Pro (48MP main, f/1.78)",
  "iPhone 13 (12MP main, warm cinematic rendering)",
  "Samsung Galaxy S25 Ultra (200MP, f/1.7)",
  "Samsung Galaxy S24 Ultra (200MP, f/1.7, vivid punchy colors)",
  "Google Pixel 9 Pro (50MP, computational photography, clean clinical look)",
  "Google Pixel 8 Pro (50MP, hyper-realistic AI processing)",
  "Huawei P60 Pro (48MP XMAGE, variable aperture f/1.4–f/4.0)",
  "OnePlus 12 Pro (50MP Hasselblad-tuned, natural color science)",
  // Mirrorless / Interchangeable
  "Sony A7 IV + 85mm f/1.4 G Master (full-frame, creamy bokeh, neutral color science)",
  "Sony A7C II + 35mm f/1.8 (compact full-frame, street-friendly, natural rendering)",
  "Canon EOS R5 + 50mm f/1.2L (full-frame, smooth Canon color science, warm tones)",
  "Canon EOS R6 Mark II + 85mm f/1.8 (clean ISO, soft natural rendering)",
  "Nikon Z6 III + 50mm f/1.2 S (full-frame, sharp micro-contrast, neutral skin tones)",
  "Fujifilm X-T5 + 56mm f/1.2 XF (APS-C, strong film simulation, vintage organic rendering)",
  "Fujifilm X100VI (fixed 23mm f/2, compact candid, strong Classic Chrome simulation)",
  "Leica Q3 (28mm f/1.7 Summilux, signature Leica color rendering, micro-contrast)",
  "Leica M11 + 50mm Summilux f/1.4 (rangefinder, ultra-thin depth of field, analog warmth)",
  // DSLR
  "Canon EOS 5D Mark IV + 50mm f/1.4 (classic full-frame DSLR, rich shadow rolloff)",
  "Nikon D850 + 85mm f/1.4G (high-resolution, razor-sharp, warm golden rendering)",
];

const REMIX_ASPECTS = [
  { key: "camera", label: "Camera & Lens", desc: "Different lens, angle, film stock" },
  { key: "pose", label: "Pose & Action", desc: "Different body pose, expression, hand placement" },
  { key: "outfit", label: "Outfit & Styling", desc: "Different clothing, accessories, color palette" },
  { key: "mood", label: "Mood & Lighting", desc: "Different time of day, weather, emotional vibe" },
  { key: "genre", label: "Genre & Aesthetic", desc: "Different photographic genre (street, cinematic, etc.)" },
  { key: "crop", label: "Framing & Crop", desc: "Different shot type and crop point" }
];

// ─── PROMPTS ──────────────────────────────────────────────────────────────────

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

// ONE combined request: analyze reference images AND generate ideas simultaneously
const SYSTEM_GENERATE_ALL = `You are an elite AI photography creative director and prompt engineer. In ONE single response you will:
1. Analyze GROUP A (Style Reference) images if attached.
2. Analyze GROUP B (Location Reference) images if attached.
3. Generate exactly 15 scene ideas following ALL rules in the user message.

SMART AUTO-CATEGORIZATION FOR GROUP A:
- If GROUP A images contain human subjects posing or interacting → extract styleAnalysis (scenarioPattern, framingConcept, camera aesthetic, etc.)
- If GROUP A images contain NO human subjects and show only a location, landscape, architecture, or environment → automatically reclassify as location reference. Set styleAnalysis to null. Extract locationAnalysis from these images instead (physical facts: floor, railings, lighting, palette, verifiedFacts). This lets users drop a location photo into either slot and get the right result.

Return ONLY a single valid JSON object:
{
  "styleAnalysis": {
    "styleAnalysis": "2-3 sentence description of the photo's aesthetic and visual style",
    "inferredCameraStyle": "inferred lens mm, aperture feel, film stock or digital look",
    "inferredMoodPalette": "dominant mood and exactly 5-6 specific color names visible in the photo",
    "suggestedGenre": "one of: Lifestyle snapshot | Cinematic film still | Street photography | Travel editorial | Acubi / Korean aesthetic | Golden hour portrait",
    "locationContext": "if a specific place is identifiable, name it with country, else empty string",
    "scenarioPattern": "describe the SCENE TYPE and INTERACTION: what subjects are doing, how they're positioned, the emotional dynamic.",
    "framingConcept": "shot framing and angle: e.g. 'eye-level close-up, heads filling upper half of frame, shoulders visible'",
    "panelFormat": "if multi-panel: describe the grid format. If single image, write 'single image'"
  },
  "locationAnalysis": {
    "floor": "exact floor/ground surface description as seen in the photo",
    "railings": "any railings, barriers, or structural elements clearly visible",
    "lighting": "natural lighting conditions observed",
    "activity": "type and level of human activity visible",
    "palette": "exact color names seen in this environment",
    "verifiedFacts": "2-3 sentence factual summary of ONLY what is clearly visible in the location photo"
  },
  "ideas": [array of exactly 15 scene idea objects as specified in the user message]
}

If no style images or auto-reclassified as location: set styleAnalysis to null.
If no location images and GROUP A was not reclassified: set locationAnalysis to null.`;

// Detect if user directives contain a specific named location (smart parsing)
const detectLockedLocation = (directives) => {
  if (!directives?.trim()) return null;

  const text = directives.trim();

  // Style/camera keywords that are NOT part of location
  const styleKeywords = /style|shot|lens|camera|angle|framing|close-up|wide|portrait|lighting|mood|pose|aesthetic|film|vibe|pov|selfie|over-the-shoulder|dutch|bird'?s|worm'?s/i;

  // Pattern 1: Explicit location preposition with following geographic content
  // e.g. "POV selfie style, in London" → extracts "London"
  // e.g. "casual look, at Tower Bridge, London" → extracts "Tower Bridge, London"
  const locationPrepositionMatch = text.match(/(?:^|,\s*|\s+)(?:location|place|at|in|on|near|by|set\s+(?:at|in)|scene\s+(?:at|in)|shot\s+(?:at|in))[:\s]+([^,\n]+(?:,\s*[^,\n]+)?)/i);
  if (locationPrepositionMatch) {
    const loc = locationPrepositionMatch[1].trim();
    // Don't return if the extracted part itself is a style keyword
    if (loc.length > 2 && !styleKeywords.test(loc)) {
      return loc;
    }
  }

  // Pattern 2: Directive looks like a pure geographic string (no style keywords in front)
  // e.g. "Tower Bridge, London, UK" → valid location
  // e.g. "POV selfie style, London" → INVALID (has style keyword at start)
  const hasStylePrefix = styleKeywords.test(text.split(',')[0] || '');

  if (!hasStylePrefix) {
    // Check if it looks like a location (comma + city/country pattern)
    const commaCount = (text.match(/,/g) || []).length;
    const looksLikeLocation = commaCount >= 1 &&
      text.length < 200 &&
      !text.toLowerCase().includes('surprise') &&
      !text.toLowerCase().includes('any') &&
      !text.toLowerCase().includes('style');

    if (looksLikeLocation) {
      return text;
    }
  }

  // Pattern 3: Extract geographic entity at end of directive after comma
  // e.g. "POV selfie style, London" → "London"
  // e.g. "romantic mood, Paris, France" → "Paris, France"
  if (hasStylePrefix) {
    const parts = text.split(',');
    // Find the first part that doesn't contain style keywords
    for (let i = 1; i < parts.length; i++) {
      const candidate = parts.slice(i).join(',').trim();
      if (candidate.length > 2 && !styleKeywords.test(candidate)) {
        return candidate;
      }
    }
  }

  return null;
};

// Extract style directive from user input (removes location part if detected)
const extractStyleDirective = (directives, lockedLocation) => {
  if (!directives?.trim()) return '';
  if (!lockedLocation) return directives.trim();

  // Remove the location portion from the directive
  const stylePart = directives.replace(new RegExp(`,?\\s*${escapeRegExp(lockedLocation)}\\.?\\s*$`, 'i'), '').trim();
  return stylePart;
};

// Helper to escape regex special characters
const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Generate ideas — now emphasizing REAL locations with ALIVE atmosphere
const buildIdeasPrompt = (charFemale, charMale, userDirectives, styleAnalysis, locationAnalysis, existingLocations = []) => {
  const hasFemale = !!charFemale;
  const hasMale = !!charMale;
  const useScenarioMode = !!styleAnalysis?.scenarioPattern && !userDirectives?.trim();

  const genderCtx = hasFemale && hasMale ? "a couple (one female, one male)"
    : hasFemale ? "a solo female subject"
    : hasMale ? "a solo male subject"
    : "lifestyle subjects";

  const lockedLocation = detectLockedLocation(userDirectives);
  const styleDirective = extractStyleDirective(userDirectives, lockedLocation);

  const exclusionBlock = existingLocations.length > 0
    ? `\n\nCRITICAL: DO NOT reuse these already-generated locations. Generate COMPLETELY DIFFERENT locations:\n${existingLocations.map((loc, i) => `${i + 1}. ${loc}`).join('\n')}`
    : '';

  // When a specific location is locked, generate variations AT that location
  const locationLockBlock = lockedLocation
    ? `\n\nLOCATION LOCK [HIGHEST PRIORITY]: The user specified this exact location: "${lockedLocation}".
ALL 15 ideas MUST use this EXACT location. Do NOT change the city, country, or landmark.
Vary ONLY: mood, outfit, pose, camera angle, time of day, weather, and specific SPOTS within this location (e.g. different areas, viewpoints, rooms, floors of the same place).
For example, if the location is "Tower Bridge Walkway, London", vary across: the glass floor walkway, the north tower staircase, the south tower viewing platform, the engine room, the pedestrian walkway at sunset, etc. — but NEVER leave London or Tower Bridge.
The "location" field in EVERY object MUST contain "${lockedLocation}" or a sub-area of it (e.g. "${lockedLocation} - Glass Floor Walkway").
NEVER place the scene in a different city, country, or landmark. This is a strict constraint.`
    : '';

  const varyRule = lockedLocation
    ? `4. LOCATION IS LOCKED: Do NOT vary location. All 15 ideas use "${lockedLocation}" or specific sub-areas within it. Vary mood, outfit, pose, angle, time of day, and specific spot within the location instead.`
    : `4. VARY LOCATIONS AGGRESSIVELY: Different countries, continents, settings. Mix outdoor/indoor, nature/urban, coastal/mountain.`;

  const locationFactsBlock = locationAnalysis ? `
LOCATION REFERENCE — PHYSICAL FACTS LOCKED (use these in generated prompts for accurate environment descriptions):
- Floor: ${locationAnalysis.floor}
- Railings/Structures: ${locationAnalysis.railings}
- Lighting: ${locationAnalysis.lighting}
- Activity: ${locationAnalysis.activity}
- Palette: ${locationAnalysis.palette}
- Summary: ${locationAnalysis.verifiedFacts}
Use these facts when writing locationEnvironmentHint — they describe the ACTUAL place, not a generic version.` : '';

  const stylePatternBlock = styleAnalysis?.scenarioPattern ? `
STYLE REFERENCE — POSE & FRAMING TEMPLATE [REQUIRED]:
- Scenario Pattern: ${styleAnalysis.scenarioPattern}
- Framing Concept: ${styleAnalysis.framingConcept}
- Panel Format: ${styleAnalysis.panelFormat}
CRITICAL: All 15 ideas MUST follow this same pose/interaction type and framing concept. Vary only outfit, mood, time of day${lockedLocation ? '' : ', and location'} — but keep the same physical pose pattern and framing.` : '';

  // Style directive from user input (camera style, shot type, mood preferences)
  const styleDirectiveBlock = styleDirective ? `
USER STYLE DIRECTIVE [HIGH PRIORITY]: ${styleDirective}
Apply this style directive to ALL 15 variations. This influences cameraStyle, suggestedShotType, and overall aesthetic.
For "POV selfie": all variations should use POV selfie shot type with smartphone-style framing (arm extended, close-up, wide-angle lens).
For "cinematic": use film-like camera specs, dramatic lighting.
For specific moods: maintain that emotional tone across variations.` : '';

  if (useScenarioMode) {
    return `You are an elite photography creative director specializing in ALIVE, NATURAL lifestyle scenes at AUTHENTIC REAL-WORLD locations. Generate exactly 15 VARIED scene ideas for ${genderCtx}.

SCENE REFERENCE (uploaded by user — generate 15 variations of this scenario type):
- Scenario Pattern: ${styleAnalysis.scenarioPattern}
- Framing Concept: ${styleAnalysis.framingConcept}
- Panel Format: ${styleAnalysis.panelFormat}
- Genre Feel: ${styleAnalysis.suggestedGenre}
${locationFactsBlock}

YOUR JOB: Keep the SAME interaction type, pose pattern, and framing concept — but change outfit, time of day, mood${lockedLocation ? '' : ', location, country'} across 15 ideas.
${locationLockBlock}
${exclusionBlock}

CRITICAL RULES FOR NATURAL, ALIVE SCENES:
1. REAL WORLD ONLY: Every location must be a SPECIFIC NAMED REAL PLACE with city/region and country. NEVER use generic names.
2. ALIVE ATMOSPHERE [NON-NEGOTIABLE]: Famous landmarks, tourist spots, and bridges are ALWAYS populated — never empty. The locationEnvironmentHint MUST describe the specific crowd type (tourists, locals, commuters, etc.) and density. This hint will be used to enforce real human presence in the final generated prompt.
3. OUTFIT ONLY: The "clothing" field = SHORT outfit concept max 15 words. NO hair/face/skin.
${varyRule}
5. CAMERA: Keep the same framing concept as the reference.
6. NO FORCED ELEMENTS: No mandatory foreground obstruction. No mandatory signs. These are ONLY added if user explicitly requests them in directives.

Return ONLY a valid JSON array of exactly 15 objects:
[
  {
    "id": 1,
    "sceneName": "max 5-word evocative title",
    "location": "PLACE NAME ONLY — no style words like 'POV selfie'. Format: 'Place Name, City/Region, Country'",
    "locationEnvironmentHint": "10-15 word description: what makes this place visually unique + SPECIFIC crowd/activity level (e.g. 'blue steel railings, moderate tourist foot traffic, clear afternoon sky')",
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

  return `You are an elite photography creative director specializing in ALIVE, NATURAL lifestyle scenes at AUTHENTIC REAL-WORLD locations. Generate exactly 15 VARIED scene ideas for ${genderCtx}.

${styleDirectiveBlock}
${stylePatternBlock}
${locationFactsBlock}
${locationLockBlock}
${exclusionBlock}

CRITICAL RULES FOR NATURAL, ALIVE SCENES:
1. REAL WORLD ONLY: Every location must be a SPECIFIC NAMED REAL PLACE with city/region and country. NEVER use generic names.
2. ALIVE ATMOSPHERE [NON-NEGOTIABLE]: Famous landmarks, tourist spots, and bridges are ALWAYS populated — never empty. The locationEnvironmentHint MUST describe the specific crowd type (tourists, locals, commuters, etc.) and density. This hint will be used to enforce real human presence in the final generated prompt.
3. OUTFIT ONLY: The "clothing" field = SHORT outfit concept max 15 words. NO hair/face/skin.
${lockedLocation
    ? `4. LOCATION IS LOCKED: All 15 ideas MUST use "${lockedLocation}" or sub-areas within it. Vary mood, outfit, pose, angle, time of day, and specific spot within the location instead. Do NOT change the city, country, or landmark.`
    : `4. VARY AGGRESSIVELY: Mix indoor/outdoor, day/night, urban/nature, across different countries and continents. No two scenes should share the same vibe or setting type.`}
5. NO FORCED ELEMENTS: No mandatory foreground obstruction. No mandatory signs. Only add these if user explicitly mentions them.

Return ONLY a valid JSON array of exactly 15 objects:
[
  {
    "id": 1,
    "sceneName": "max 5-word evocative title",
    "location": "PLACE NAME ONLY — no style words like 'POV selfie'. Format: 'Place Name, City/Region, Country'",
    "locationEnvironmentHint": "10-15 word description: visual uniqueness + SPECIFIC crowd/activity level (e.g. 'blue steel railings, moderate tourist foot traffic, clear afternoon sky')",
    "mood": "atmospheric mood, max 10 words",
    "clothing": "BRIEF outfit concept only, max 15 words",
    "pose": "brief action/pose following the same scenario pattern as reference, max 20 words",
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
  const [stage, setStage] = useState(() => {
    const saved = localStorage.getItem("pb_stage");
    return saved || "INPUT";
  });
  const [userDirectives, setUserDirectives] = useState(() => {
    const saved = localStorage.getItem("pb_directives");
    return saved || "";
  });

  // Style reference photos — NOT persisted to localStorage (large b64 data)
  const [styleImages, setStyleImages] = useState([]);
  const [styleAnalysis, setStyleAnalysis] = useState(() => {
    try {
      const saved = localStorage.getItem("pb_styleAnalysis");
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  // Location reference photos — NOT persisted to localStorage (large b64 data)
  const [locationImages, setLocationImages] = useState([]);
  const [locationAnalysis, setLocationAnalysis] = useState(() => {
    try {
      const saved = localStorage.getItem("pb_locationAnalysis");
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  // Character sheets
  const [charSheetF, setCharSheetF] = useState(() => {
    try {
      const saved = localStorage.getItem("pb_charSheetF");
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [charSheetM, setCharSheetM] = useState(() => {
    try {
      const saved = localStorage.getItem("pb_charSheetM");
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  // Saved characters from localStorage
  const [savedCharacters, setSavedCharacters] = useState(() => {
    const saved = localStorage.getItem("saved_characters");
    return saved ? JSON.parse(saved) : [];
  });

  // Ideas + selections
  const [ideas, setIdeas] = useState(() => {
    try {
      const saved = localStorage.getItem("pb_ideas");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [selections, setSelections] = useState(() => {
    try {
      const saved = localStorage.getItem("pb_selections");
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const [cardSettings, setCardSettings] = useState(() => {
    try {
      const saved = localStorage.getItem("pb_cardSettings");
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  // Results
  const [results, setResults] = useState(() => {
    try {
      const saved = localStorage.getItem("pb_results");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // UI
  const [toast, setToast] = useState(null);
  const [showTplModal, setShowTplModal] = useState(false);
  const [showCharModal, setShowCharModal] = useState(null);
  const [showSavedCharsPanel, setShowSavedCharsPanel] = useState(false);
  const [editingCharName, setEditingCharName] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Remix / style variation state
  const [remixTaskKey, setRemixTaskKey] = useState(null);
  const [remixAspects, setRemixAspects] = useState({});
  const [remixCount, setRemixCount] = useState(3);
  const [remixVariations, setRemixVariations] = useState({});
  const [remixLoading, setRemixLoading] = useState(false);
  const [remixDirective, setRemixDirective] = useState("");

  // Drag states
  const [isDraggingStyle, setIsDraggingStyle] = useState(false);
  const [isDraggingLocation, setIsDraggingLocation] = useState(false);
  const [isDraggingCharF, setIsDraggingCharF] = useState(false);
  const [isDraggingCharM, setIsDraggingCharM] = useState(false);

  const styleInputRef = useRef(null);
  const locationInputRef = useRef(null);
  const charFInputRef = useRef(null);
  const charMInputRef = useRef(null);

  // AbortController for cancellable LLM requests
  const abortRef = useRef(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const cancelOngoing = () => {
    if (abortRef.current) {
      setIsCancelling(true);
      abortRef.current.abort();
    }
  };

  const [templates, setTemplates] = useState(() => {
    const saved = localStorage.getItem("pb_templates_v5");
    return saved ? JSON.parse(saved) : {
      system: DEFAULT_TPL_SYSTEM,
      couple: DEFAULT_TPL_COUPLE,
      solo_f: DEFAULT_TPL_SOLO_F,
      solo_m: DEFAULT_TPL_SOLO_M
    };
  });

  const triggerToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  // Prevent browser from navigating to dropped files outside drop zones
  useEffect(() => {
    const prevent = (e) => e.preventDefault();
    document.addEventListener('dragover', prevent);
    document.addEventListener('drop', prevent);
    return () => {
      document.removeEventListener('dragover', prevent);
      document.removeEventListener('drop', prevent);
    };
  }, []);

  // ─── SAVE TO LOCALSTORAGE ON CHANGE ───────────────────────────────────────────
  // Persist workflow state
  useEffect(() => { localStorage.setItem("pb_stage", stage); }, [stage]);
  useEffect(() => { localStorage.setItem("pb_directives", userDirectives); }, [userDirectives]);
  // styleImages and locationImages are NOT persisted — they're large b64 data
  useEffect(() => { localStorage.setItem("pb_styleAnalysis", JSON.stringify(styleAnalysis)); }, [styleAnalysis]);
  useEffect(() => { localStorage.setItem("pb_locationAnalysis", JSON.stringify(locationAnalysis)); }, [locationAnalysis]);
  useEffect(() => { localStorage.setItem("pb_charSheetF", JSON.stringify(charSheetF)); }, [charSheetF]);
  useEffect(() => { localStorage.setItem("pb_charSheetM", JSON.stringify(charSheetM)); }, [charSheetM]);
  useEffect(() => { localStorage.setItem("pb_ideas", JSON.stringify(ideas)); }, [ideas]);
  useEffect(() => { localStorage.setItem("pb_selections", JSON.stringify(selections)); }, [selections]);
  useEffect(() => { localStorage.setItem("pb_cardSettings", JSON.stringify(cardSettings)); }, [cardSettings]);
  useEffect(() => { localStorage.setItem("pb_results", JSON.stringify(results)); }, [results]);

  // Persist saved characters
  useEffect(() => {
    try {
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

  // ─── CHARACTER MANAGEMENT ─────────────────────────────────────────────────────
  const saveCharacter = (charData, gender) => {
    const name = charData.analysis?.name || `Character ${savedCharacters.filter(c => c.gender === gender).length + 1}`;
    const newChar = {
      id: 'char_' + Date.now(),
      name,
      gender,
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
    const charData = { url: null, b64: null, type: null, analysis: char.analysis };
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
    setStyleAnalysis(null); // Clear cached analysis when new images are uploaded
  };

  const handleLocationFiles = async (files) => {
    const imgs = await Promise.all(Array.from(files).filter(f => f.type.startsWith("image/")).map(readFile));
    setLocationImages(prev => [...prev, ...imgs]);
    setLocationAnalysis(null); // Clear cached analysis when new images are uploaded
  };

  const handleCharFile = async (files, gender) => {
    const file = Array.from(files).find(f => f.type.startsWith("image/"));
    if (!file) return;
    const img = await readFile(file);
    if (gender === 'female') setCharSheetF({ ...img, analysis: null, analyzing: true });
    else setCharSheetM({ ...img, analysis: null, analyzing: true });

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
      saveCharacter(charData, gender);
    } catch (e) {
      if (gender === 'female') setCharSheetF(prev => ({ ...prev, analyzing: false, error: e.message }));
      else setCharSheetM(prev => ({ ...prev, analyzing: false, error: e.message }));
      triggerToast("Failed to analyze character: " + e.message);
    }
  };

  // ─── GENERATE IDEAS ───────────────────────────────────────────────────────
  const handleGenerateIdeas = async () => {
    const hasStyleImages = styleImages.length > 0;
    const hasLocationImages = locationImages.length > 0;
    if (!hasStyleImages && !hasLocationImages && !userDirectives.trim()) {
      triggerToast("Upload a style/location reference photo, or fill in Directives.");
      return;
    }
    if (!activeConfig?.apiKey) { triggerToast("API Key not set."); return; }

    setStage("LOADING_IDEAS");
    setIsCancelling(false);
    abortRef.current = new AbortController();
    const { signal } = abortRef.current;

    try {
      const allImages = [...styleImages, ...locationImages];
      const hasImages = allImages.length > 0;

      // Build ideas rules (with whatever cached analysis we have as text context)
      const ideasRules = buildIdeasPrompt(
        charSheetF?.analysis, charSheetM?.analysis,
        userDirectives, styleAnalysis, locationAnalysis, []
      );

      let finalIdeas;

      if (hasImages) {
        // ONE combined call: analyze images + generate ideas simultaneously
        const imageGroupDesc = [
          hasStyleImages ? `- GROUP A (Style Reference): First ${styleImages.length} image(s). Analyze these for scenarioPattern, framingConcept, styleAnalysis, inferredCameraStyle, inferredMoodPalette, suggestedGenre, panelFormat. Use this pose/framing pattern as the REQUIRED template for all 15 ideas.` : null,
          hasLocationImages ? `- GROUP B (Location Reference): Last ${locationImages.length} image(s). Extract ONLY verified physical facts: floor surface, railings/structures, lighting conditions, human activity level, color palette. Use these facts in the ideas' locationEnvironmentHint.` : null,
        ].filter(Boolean).join('\n');

        const combinedUserMsg = `REFERENCE IMAGES ATTACHED:
${imageGroupDesc}

${ideasRules}

FINAL OUTPUT: Return the combined JSON with styleAnalysis${hasStyleImages ? ' (extracted from GROUP A images)' : ': null'}, locationAnalysis${hasLocationImages ? ' (extracted from GROUP B images)' : ': null'}, and ideas array.`;

        const raw = await fetchFromLLM(activeConfig, combinedUserMsg, SYSTEM_GENERATE_ALL, true, allImages, { signal });
        const result = JSON.parse(raw.replace(/```json/g, '').replace(/```/g, '').trim());

        if (result.styleAnalysis) setStyleAnalysis(result.styleAnalysis);
        if (result.locationAnalysis) setLocationAnalysis(result.locationAnalysis);
        finalIdeas = Array.isArray(result.ideas) ? result.ideas : result;
      } else {
        // No images — text-only ideas generation (one call, no analysis needed)
        const raw = await fetchFromLLM(activeConfig,
          "Generate 15 scene ideas with specific real-world locations.",
          ideasRules, true, [], { signal }
        );
        const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        finalIdeas = Array.isArray(parsed) ? parsed : (parsed.ideas || parsed);
      }

      setIdeas(finalIdeas.map((p, idx) => ({
        ...p,
        id: idx + 1,
        clothing: p.clothing || "Casual everyday wear",
        pose: p.pose || "Standing naturally",
        cameraStyle: p.cameraStyle || "50mm, f/2.0, natural light",
        suggestedShotType: p.suggestedShotType || "Medium close-up (chest up)",
        suggestedCrop: p.suggestedCrop || "lower chest",
        genre: p.genre || "Lifestyle snapshot",
        locationEnvironmentHint: p.locationEnvironmentHint || "",
        foregroundHint: p.foregroundHint || "none"
      })));
      setSelections({});
      setCardSettings({});
      setStage("SELECT");
    } catch (err) {
      if (signal.aborted) {
        triggerToast("Cancelled.");
      } else {
        triggerToast("Failed: " + err.message);
      }
      setStage("INPUT");
    } finally {
      abortRef.current = null;
      setIsCancelling(false);
    }
  };

  // ─── GENERATE MORE IDEAS ───────────────────────────────────────────────────
  const handleGenerateMoreIdeas = async () => {
    if (!activeConfig?.apiKey) { triggerToast("API Key not set."); return; }

    setIsLoadingMore(true);

    try {
      const existingLocations = ideas.map(i => i.location);
      const sAnalysis = styleAnalysis;

      const ideasPrompt = buildIdeasPrompt(
        charSheetF?.analysis,
        charSheetM?.analysis,
        userDirectives,
        sAnalysis,
        locationAnalysis,
        existingLocations
      );
      const rawIdeas = await fetchFromLLM(activeConfig,
        "Generate 15 MORE scene ideas with DIFFERENT real-world locations.",
        ideasPrompt,
        true,
        []
      );
      const cleaned = rawIdeas.replace(/```json/g, '').replace(/```/g, '').trim();
      let parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed) && parsed.ideas) parsed = parsed.ideas;

      const startingId = ideas.length + 1;
      const newIdeas = parsed.map((p, idx) => ({
        ...p,
        id: startingId + idx,
        clothing: p.clothing || "Casual everyday wear",
        pose: p.pose || "Standing naturally",
        cameraStyle: p.cameraStyle || "50mm, f/2.0, natural light",
        suggestedShotType: p.suggestedShotType || "Medium close-up (chest up)",
        suggestedCrop: p.suggestedCrop || "lower chest",
        genre: p.genre || "Lifestyle snapshot",
        locationEnvironmentHint: p.locationEnvironmentHint || "",
        foregroundHint: p.foregroundHint || "none"
      }));

      setIdeas(prev => [...prev, ...newIdeas]);
      triggerToast(`Added ${newIdeas.length} new ideas!`);
    } catch (err) {
      triggerToast("Failed: " + err.message);
    } finally {
      setIsLoadingMore(false);
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
      return `FEMALE CHARACTER (from character reference sheet):
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
      return `MALE CHARACTER (from character reference sheet):
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
    const shotType = settings.shotType !== undefined ? settings.shotType : (idea.suggestedShotType || "Medium close-up (chest up)");
    const cropPoint = settings.crop !== undefined ? settings.crop : (idea.suggestedCrop || "lower chest");
    const genre = settings.genre !== undefined ? settings.genre : (idea.genre || "Lifestyle snapshot");
    const cameraDevice = settings.camera && settings.camera.trim() ? settings.camera.trim() : null;

    const charBlock = buildCharacterBlock(targetTask.apiType);

    const styleBlock = styleAnalysis ? `
VISUAL STYLE REFERENCE — CAMERA & FILM ONLY (DO NOT let this influence location, pose, or clothing. The location is already specified above and MUST NOT change):
- Film Feel: ${styleAnalysis.inferredCameraStyle}
- Color Palette: ${styleAnalysis.inferredMoodPalette}
- Photographic Aesthetic: ${styleAnalysis.styleAnalysis}
APPLY TO: exact film stock name, color science sentence, lighting feel, grain in Camera & Technical Specs ONLY.
` : '';

    const locationBlock = locationAnalysis ? `
LOCATION PHYSICAL FACTS [VERIFIED — DO NOT CONTRADICT]:
- Floor/Ground: ${locationAnalysis.floor}
- Railings/Structures: ${locationAnalysis.railings}
- Lighting Conditions: ${locationAnalysis.lighting}
- Activity Level: ${locationAnalysis.activity}
- Environment Palette: ${locationAnalysis.palette}
Use these EXACT physical facts in the Environment & Lighting section. Do NOT invent different flooring, railings, or materials.
` : '';

    const envHint = idea.locationEnvironmentHint ? `\nLocation Hint: ${idea.locationEnvironmentHint}` : '';

    const cameraDeviceLine = cameraDevice ? `Camera Device: ${cameraDevice}` : '';

    const userMsg = `Generate a prompt for this scene.
Type: ${targetTask.apiType}
Scene Name: ${idea.sceneName}
Location: ${idea.location}${envHint}
Mood: ${idea.mood}
Clothing Concept: ${idea.clothing}
Pose Concept: ${idea.pose}
Camera Style: ${idea.cameraStyle}
Shot Type: ${shotType}
Crop Point: ${cropPoint}
Genre: ${genre}
${cameraDeviceLine}
${styleBlock}${locationBlock}
LOCATION INTEGRITY [CRITICAL]: The location for this scene is "${idea.location}". You MUST use this EXACT location. Do NOT substitute, change, relocate, or replace it with a different city, country, or landmark. The environment description must accurately describe THIS specific place.

CHARACTER IDENTITY (CRITICAL — USE EXACTLY AS PROVIDED, DO NOT MODIFY):
${charBlock}

CRITICAL RULES FOR THIS GENERATION:
1. INSTRUCTION [LOCKED]: Start with the exact INSTRUCTION [LOCKED] block from the template. Never modify its wording.
2. CORE AESTHETIC: Must read "Photorealistic authentic lifestyle snapshot of... in ${idea.location}" — never "studio", "editorial", "stock".
3. SUBJECT IDENTITY & STYLING: Hairstyling line references "the provided target reference image". Exact face line references "the provided target reference image". Clothing expands to 30+ words. Wearable Accessories lists body/head/face items.
4. POSE AND ACTION: Full anatomical WITH-chain tracking each arm/hand/finger. Micro-expression 15+ words. End with "All other hands and limbs hidden from view. Cropped exactly at ${cropPoint}."
5. ENVIRONMENT & LIGHTING — THE SOUL OF THE IMAGE [MOST CRITICAL RULE]:
   - Start with "${idea.location}" as the full real location name — do NOT change or replace this with another city or country
   - Write 100+ words of ALIVE, SPECIFIC, REAL-WORLD environment. THIS IS NOT OPTIONAL.
   - MANDATORY HUMAN ACTIVITY — YOU MUST INCLUDE THIS IN EVERY SINGLE PROMPT:
     * FAMOUS LANDMARKS / TOURIST SPOTS (bridges, observation decks, piazzas, markets): Describe 3-4 groups of other people. Example: "several tourist couples pausing to photograph the steel structure with their phones, a group of school children in matching yellow vests walking in a line, a jogger in a grey hoodie passing on the outer edge of the walkway, two women in summer dresses leaning against the blue railing taking a selfie". The main subjects are NOT ALONE.
     * URBAN STREETS / NEIGHBORHOODS: Describe passing pedestrians, nearby café tables with patrons, parked scooters, shop signage visible in background, cars at traffic lights.
     * NATURE / PARKS: Describe distant hikers on the same trail, birds flying overhead, leaves moving in the breeze, another couple visible far in the background.
     * INDOOR VENUES (cafes, lobbies, malls): Describe other tables occupied, staff behind the counter, ambient chatter, warm interior lighting sources.
   - ⚠ FAILURE CONDITION: If your Environment & Lighting section describes the location as empty, quiet, deserted, isolated, or without other people — the prompt is WRONG. Rewrite it with natural human presence.
   - Describe lighting: direction (front/side/back), quality (soft/harsh/diffused), color temperature, shadows cast, ambient fill.
   - End with: "Overall scene features a [vibe] color palette of [exactly 6-9 specific named colors]."
6. CAMERA & TECHNICAL SPECS: ${cameraDevice
  ? `CAMERA DEVICE IS LOCKED — you MUST use exactly "${cameraDevice}". Do not substitute or generalize it. Write the model name verbatim in "Shot on [model]".`
  : `Choose a SPECIFIC real camera model — NOT "smartphone" or "modern camera". Pick from: iPhone 16 Pro Max, iPhone 15 Pro, Samsung Galaxy S25 Ultra, Google Pixel 9 Pro (for POV selfie / lifestyle), OR Sony A7 IV + 85mm f/1.4 GM, Canon EOS R5 + 50mm f/1.2L, Fujifilm X-T5 + 56mm f/1.2 XF (for editorial / cinematic / street). Match the camera to the genre and shot type.`} Must also name a REAL film stock (Kodak Portra 400, Fujifilm Pro 400H, Fujifilm Velvia 50, etc.). One sentence color science outcome. Specific ISO and grain description.
7. NEGATIVE PROMPT: Must include "empty scene, deserted location, no bystanders, ghost town, no pedestrians, isolated subjects, abandoned feel, wrong location, different country, relocated scene, no background activity, studio backdrop, fake background".
8. Follow the structural template EXACTLY. No extra commentary or markdown.`;

    try {
      const res = await fetchFromLLM(activeConfig, userMsg, fullSystemPrompt, false, [], { signal: abortRef.current?.signal });
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
    setIsCancelling(false);
    abortRef.current = new AbortController();
    setRemixTaskKey(null);
    setRemixVariations({});
    setRemixAspects({});
    setRemixDirective("");
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

  // ─── REMIX / STYLE VARIATIONS ──────────────────────────────────────────────
  const handleRemix = async (taskKey) => {
    if (!activeConfig?.apiKey) { triggerToast("API Key not set."); return; }

    const task = results.find(r => r.taskKey === taskKey);
    if (!task || task.status !== 'success') return;

    const selectedAspects = Object.entries(remixAspects)
      .filter(([, on]) => on)
      .map(([key]) => REMIX_ASPECTS.find(a => a.key === key)?.label)
      .filter(Boolean);

    if (selectedAspects.length === 0) {
      triggerToast("Select at least one aspect to vary.");
      return;
    }

    setRemixLoading(true);
    setRemixVariations(prev => ({ ...prev, [taskKey]: [] }));
    abortRef.current = new AbortController();

    const charBlock = buildCharacterBlock(task.apiType);
    const location = task.idea.location;

    const remixSystemPrompt = `You are an elite AI photography creative director and prompt engineer. You will receive an EXISTING fully-written image generation prompt and must create STYLE VARIATIONS of it.

ABSOLUTE RULES:
1. INSTRUCTION [LOCKED] block: Copy it VERBATIM from the original. Do NOT modify a single word.
2. CHARACTER IDENTITY: Copy the Subject Identity & Styling section VERBATIM from the original — same hair, same face description, same clothing/accessories — UNLESS "Outfit & Styling" is one of the aspects being varied. In that case, generate NEW outfit/accessories but keep hair and face lines identical.
3. LOCATION IS FROZEN: The location "${location}" must appear EXACTLY as-is in the Core Aesthetic line AND the Environment & Lighting section. Do NOT change city, country, or landmark. The environment description should describe the SAME place but may adjust lighting/time of day if "Mood & Lighting" is being varied.
4. VARY ONLY the selected aspects. Everything else stays identical to the original.
5. Each variation must feel like a DISTINCTLY DIFFERENT photo of the same people at the same place — not a minor tweak.
6. Follow the same structural template format. No extra commentary or markdown.
7. Output each variation separated by a line containing only "===VARIATION===" (including the first one).`;

    const aspectList = selectedAspects.join(", ");
    const directiveBlock = remixDirective.trim()
      ? `\nUSER STYLE DIRECTIVE [HIGHEST PRIORITY]: ${remixDirective.trim()}\nApply this directive to EVERY variation. This overrides any default choices for the varied aspects. For example, if the directive says "selfie style", all variations must be framed as POV selfie shots with smartphone camera specs, appropriate arm positioning, and close-up perspective.\n`
      : '';

    const userMsg = `Here is the original prompt. Generate exactly ${remixCount} style variations, varying ONLY these aspects: ${aspectList}.
${directiveBlock}
TITLE REQUIREMENT: Each variation must begin with a single line in this exact format:
VARIATION TITLE: [2-5 word descriptive label that captures what makes THIS variation unique — e.g. "Rainy Night Silhouette" or "Overhead Intimate Close-up" or "Film Noir Street Mood"]
Do NOT use generic labels like "Variation 1" or "Version A". The title should describe the specific visual feel of that variation.

ASPECTS TO VARY — guidance:
${remixAspects.camera ? "- CAMERA & LENS: Change lens focal length, angle, film stock, depth of field, camera type (smartphone vs premium). Each variation should feel like a completely different photographer shot it.\n" : ""}${remixAspects.pose ? "- POSE & ACTION: Change body angle, arm/hand positions, expression, interaction type. Each variation should show a different moment captured at the same place.\n" : ""}${remixAspects.outfit ? "- OUTFIT & STYLING: Change the ENTIRE silhouette structure — not just fabric or color. Each variation MUST use a completely different garment CATEGORY and silhouette shape. Examples of distinct silhouette categories: (1) single fitted layer with no outer jacket, (2) oversized structured blazer or suit, (3) hoodie or athletic wear, (4) formal dress shirt / blouse, (5) knitwear-only with no outer layer, (6) vest or gilet over a shirt. NEVER repeat the same formula of 'outer jacket worn open over inner top' across variations. For male: do NOT default to jacket-over-tshirt every time — vary between single-layer, formal, sporty, and knitwear silhouettes. For female: vary between single-piece, layered-without-jacket, structured blazer, and casual silhouettes. Keep hair and face lines identical. Accessories may change but must be specific and distinct per variation.\n" : ""}${remixAspects.mood ? "- MOOD & LIGHTING: Change time of day, weather, lighting direction/quality, emotional vibe. Describe the SAME location under different conditions.\n" : ""}${remixAspects.genre ? "- GENRE & AESTHETIC: Change the photographic genre — street photography, cinematic film still, travel editorial, golden hour portrait, etc.\n" : ""}${remixAspects.crop ? "- FRAMING & CROP: Change shot type (close-up, medium, full body, etc.) and crop point.\n" : ""}ASPECTS TO KEEP IDENTICAL: Everything not listed above — especially INSTRUCTION [LOCKED], character identity (hair/face), location, and the negative prompt.

CHARACTER IDENTITY (use exactly as-is unless outfit is being varied):
${charBlock}

ORIGINAL PROMPT:
${task.resultText}

Generate ${remixCount} variations now. Separate each with "===VARIATION===". Start the first variation immediately after this line.`;

    try {
      const res = await fetchFromLLM(activeConfig, userMsg, remixSystemPrompt, false, [], { signal: abortRef.current?.signal });
      if (!res) throw new Error("Empty response.");

      const cleaned = res.replace(/^```[\s\S]*?\n/, '').replace(/```$/, '').trim();
      const rawParts = cleaned.split("===VARIATION===").map(p => p.trim()).filter(p => p.length > 50);
      const parts = rawParts.map((part, i) => {
        const firstNewline = part.indexOf('\n');
        const firstLine = firstNewline > -1 ? part.slice(0, firstNewline).trim() : part.trim();
        const titleMatch = firstLine.match(/^VARIATION TITLE:\s*(.+)$/i);
        if (titleMatch) {
          return { title: titleMatch[1].trim(), body: part.slice(firstNewline).trim() };
        }
        return { title: null, body: part };
      });

      setRemixVariations(prev => ({ ...prev, [taskKey]: parts }));
      triggerToast(`Generated ${parts.length} variations!`);
    } catch (err) {
      triggerToast("Remix failed: " + err.message);
      setRemixVariations(prev => ({ ...prev, [taskKey]: [] }));
    } finally {
      setRemixLoading(false);
      abortRef.current = null;
      setIsCancelling(false);
    }
  };

  const resetAll = () => {
    setStage("INPUT"); setUserDirectives(""); setStyleImages([]); setStyleAnalysis(null);
    setLocationImages([]); setLocationAnalysis(null);
    setCharSheetF(null); setCharSheetM(null);
    setIdeas([]); setSelections({}); setCardSettings({}); setResults([]);
    // Clear localStorage
    localStorage.removeItem("pb_stage");
    localStorage.removeItem("pb_directives");
    localStorage.removeItem("pb_styleImages");
    localStorage.removeItem("pb_styleAnalysis");
    localStorage.removeItem("pb_locationImages");
    localStorage.removeItem("pb_locationAnalysis");
    localStorage.removeItem("pb_charSheetF");
    localStorage.removeItem("pb_charSheetM");
    localStorage.removeItem("pb_ideas");
    localStorage.removeItem("pb_selections");
    localStorage.removeItem("pb_cardSettings");
    localStorage.removeItem("pb_results");
  };

  // ─── DRAG DROP ZONE COMPONENT ─────────────────────────────────────────────
  const DragDropZone = ({ onDrop, isDragging, setIsDragging, onClick, children, className = "", activeClassName = "" }) => (
    <div
      className={`${className} ${isDragging ? activeClassName : ''}`}
      onClick={onClick}
      onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false); }}
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
        .csel:focus { border-color:var(--accent); box-shadow:0 0 0 2px var(--accent-faint); }
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
        <button onClick={() => setShowTplModal(true)} className="bg-(--surface-2) text-(--text-1) px-4 py-2 rounded-lg border border-(--border) cursor-pointer text-[13px] hover:bg-(--border) transition-colors">
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
                  ? "Upload a photo to use as scene inspiration — AI will generate 15 variations of the same scenario in different real-world settings. Or fill in Directives below instead."
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
                  onClick={() => styleInputRef.current?.click()}
                  className="border-[1.5px] border-dashed border-(--border-hover) rounded-lg p-6 text-center cursor-pointer hover:border-(--accent) transition-colors bg-(--surface)"
                  activeClassName="border-(--accent) bg-(--accent-faint)"
                >
                  <div className="text-xl mb-1">Drag photo here</div>
                  <div className="text-(--text-2) text-sm">or click to upload scene reference</div>
                  <div className="text-(--text-3) text-xs mt-1">Leave Directives blank to generate variations of this scene type</div>
                </DragDropZone>
              )}
              {styleAnalysis && (
                <div className="mt-2 p-3 bg-(--surface) border border-(--accent) rounded-lg text-[12px] text-(--text-2) flex flex-col gap-1.5">
                  <div className="text-(--accent) text-[10px] font-semibold uppercase tracking-wider">Style Analysis from Reference</div>
                  <div className="text-(--text-1) leading-relaxed">{styleAnalysis.styleAnalysis}</div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                    <div><span className="text-(--text-3)">Scenario:</span> {styleAnalysis.scenarioPattern}</div>
                    <div><span className="text-(--text-3)">Framing:</span> {styleAnalysis.framingConcept}</div>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <div><span className="text-(--text-3)">Film feel:</span> {styleAnalysis.inferredCameraStyle}</div>
                    <div><span className="text-(--text-3)">Palette:</span> {styleAnalysis.inferredMoodPalette}</div>
                  </div>
                  <button onClick={() => { setStyleAnalysis(null); setStyleImages([]); }} className="mt-1 text-(--text-3) bg-transparent border-none cursor-pointer hover:text-(--error) text-xs text-left">Clear & re-upload</button>
                </div>
              )}
            </div>

            {/* Location Reference Photo */}
            <div>
              <div className="text-[11px] tracking-[1.5px] uppercase text-(--accent-dim) mb-1.5">
                Location Reference Photo <span className="text-(--text-3) normal-case tracking-normal">(optional)</span>
              </div>
              <div className="text-(--text-3) text-xs mb-3">
                Upload a real photo of your target location. The AI will extract ONLY verified physical details (flooring, railings, materials, lighting) from this image — preventing hallucinated or wrong environment descriptions.
              </div>
              <input ref={locationInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleLocationFiles(e.target.files)} />
              {locationImages.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-3">
                  {locationImages.map((img, i) => (
                    <div key={i} className="relative">
                      <img src={img.url} className="w-16 h-16 object-cover rounded-lg border border-(--border)" alt="location" />
                      <button onClick={() => { setLocationImages(prev => prev.filter((_, j) => j !== i)); setLocationAnalysis(null); }} className="absolute -top-1.5 -right-1.5 bg-(--error) text-white border-none rounded-full w-5 h-5 cursor-pointer flex items-center justify-center text-xs">x</button>
                    </div>
                  ))}
                  <div className="w-16 h-16 border border-dashed border-(--border-hover) rounded-lg flex items-center justify-center cursor-pointer hover:border-(--accent) transition-colors text-xl text-(--text-3)" onClick={() => locationInputRef.current?.click()}>+</div>
                </div>
              )}
              {locationImages.length === 0 && (
                <DragDropZone
                  onDrop={handleLocationFiles}
                  isDragging={isDraggingLocation}
                  setIsDragging={setIsDraggingLocation}
                  onClick={() => locationInputRef.current?.click()}
                  className="border-[1.5px] border-dashed border-(--border-hover) rounded-lg p-6 text-center cursor-pointer hover:border-(--accent) transition-colors bg-(--surface)"
                  activeClassName="border-(--accent) bg-(--accent-faint)"
                >
                  <div className="text-xl mb-1">Drag location photo here</div>
                  <div className="text-(--text-2) text-sm">or click to upload</div>
                  <div className="text-(--text-3) text-xs mt-1">AI extracts physical facts only — no hallucinations</div>
                </DragDropZone>
              )}
              {locationAnalysis && (
                <div className="mt-2 p-3 bg-(--surface) border border-[#10b981]/40 rounded-lg text-[12px] text-(--text-2) flex flex-col gap-1.5">
                  <div className="text-[#10b981] text-[10px] font-semibold uppercase tracking-wider">Location Verified — Physical Facts Extracted</div>
                  <div><span className="text-(--text-3)">Floor:</span> {locationAnalysis.floor}</div>
                  <div><span className="text-(--text-3)">Railings:</span> {locationAnalysis.railings}</div>
                  <div><span className="text-(--text-3)">Lighting:</span> {locationAnalysis.lighting}</div>
                  <div><span className="text-(--text-3)">Activity:</span> {locationAnalysis.activity}</div>
                  <div><span className="text-(--text-3)">Palette:</span> {locationAnalysis.palette}</div>
                  <button onClick={() => { setLocationAnalysis(null); setLocationImages([]); }} className="mt-1 text-(--text-3) bg-transparent border-none cursor-pointer hover:text-(--error) text-xs text-left">Replace photo</button>
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
                placeholder="e.g. Tower Bridge Walkway, London / or: Korean mountain and coastal locations, golden hour, cinematic / or: surprise me with real places / TIP: specify a location name to LOCK it — AI will not change the place"
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
            <div className="text-(--text-3) text-sm">
            {styleImages.length > 0 || locationImages.length > 0
              ? "Reading reference photos and generating 15 ideas in one request..."
              : "Generating 15 scene ideas with real-world locations..."}
          </div>
          <button
            onClick={cancelOngoing}
            disabled={isCancelling}
            className="mt-6 px-5 py-2.5 rounded-lg cursor-pointer text-sm font-semibold bg-(--error) text-white border-none hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-wait"
          >
            {isCancelling ? "Cancelling..." : "✕ Cancel"}
          </button>
          </div>
        )}

        {/* ══ SELECT ══ */}
        {stage === "SELECT" && (
          <div className="pb-24">
            {/* Style Analysis Summary Bar */}
            {(styleAnalysis || locationAnalysis) && (
              <div className="mb-5 flex flex-col gap-3">
                {styleAnalysis && (
                  <div className="p-4 bg-(--surface) border border-(--accent-faint) rounded-xl">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="text-[11px] tracking-[1.5px] uppercase text-(--accent) mb-2 font-semibold">Reference Style Analysis</div>
                        <div className="text-(--text-2) text-[13px] leading-relaxed">{styleAnalysis.styleAnalysis}</div>
                      </div>
                      <button onClick={() => { setStyleAnalysis(null); setStyleImages([]); triggerToast("Style cleared"); }} className="text-(--text-3) bg-transparent border-none cursor-pointer hover:text-(--error) text-xs flex-shrink-0">Clear</button>
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3 text-[12px]">
                      <div><span className="text-(--text-3)">Scenario:</span> <span className="text-(--text-1)">{styleAnalysis.scenarioPattern}</span></div>
                      <div><span className="text-(--text-3)">Framing:</span> <span className="text-(--text-1)">{styleAnalysis.framingConcept}</span></div>
                      <div><span className="text-(--text-3)">Film feel:</span> <span className="text-(--text-1)">{styleAnalysis.inferredCameraStyle}</span></div>
                      <div><span className="text-(--text-3)">Palette:</span> <span className="text-(--text-1)">{styleAnalysis.inferredMoodPalette}</span></div>
                    </div>
                  </div>
                )}
                {locationAnalysis && (
                  <div className="p-4 bg-(--surface) border border-[#10b981]/30 rounded-xl">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="text-[11px] tracking-[1.5px] uppercase text-[#10b981] mb-2 font-semibold">Location Reference — Physical Facts Locked</div>
                        <div className="text-(--text-2) text-[13px] leading-relaxed">{locationAnalysis.verifiedFacts}</div>
                      </div>
                      <button onClick={() => { setLocationAnalysis(null); setLocationImages([]); triggerToast("Location cleared"); }} className="text-(--text-3) bg-transparent border-none cursor-pointer hover:text-(--error) text-xs flex-shrink-0">Clear</button>
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3 text-[12px]">
                      <div><span className="text-(--text-3)">Floor:</span> <span className="text-(--text-1)">{locationAnalysis.floor}</span></div>
                      <div><span className="text-(--text-3)">Railings:</span> <span className="text-(--text-1)">{locationAnalysis.railings}</span></div>
                      <div><span className="text-(--text-3)">Lighting:</span> <span className="text-(--text-1)">{locationAnalysis.lighting}</span></div>
                      <div><span className="text-(--text-3)">Palette:</span> <span className="text-(--text-1)">{locationAnalysis.palette}</span></div>
                    </div>
                  </div>
                )}
              </div>
            )}
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
                      {idea.locationEnvironmentHint && <div className="text-(--text-3) text-[10px] mt-0.5 italic">{idea.locationEnvironmentHint}</div>}
                    </div>
                    <div className="px-4 pb-3 flex flex-col gap-1 text-[12px] text-(--text-2)">
                      <div><span className="text-(--text-3)">Mood: </span><span className="ef" contentEditable suppressContentEditableWarning onBlur={e => handleBlurEditable(idea.id, 'mood', e.target.textContent)}>{idea.mood}</span></div>
                      <div><span className="text-(--text-3)">Outfit: </span><span className="ef" contentEditable suppressContentEditableWarning onBlur={e => handleBlurEditable(idea.id, 'clothing', e.target.textContent)}>{idea.clothing}</span></div>
                      <div><span className="text-(--text-3)">Pose: </span><span className="ef" contentEditable suppressContentEditableWarning onBlur={e => handleBlurEditable(idea.id, 'pose', e.target.textContent)}>{idea.pose}</span></div>
                      <div><span className="text-(--text-3)">Camera: </span><span className="ef" contentEditable suppressContentEditableWarning onBlur={e => handleBlurEditable(idea.id, 'cameraStyle', e.target.textContent)}>{idea.cameraStyle}</span></div>
                      {idea.foregroundHint && idea.foregroundHint !== 'none' && idea.foregroundHint !== '' && <div><span className="text-(--text-3)">FG: </span>{idea.foregroundHint}</div>}
                    </div>
                    <div className="px-4 pb-3 flex flex-wrap gap-2">
                      <input
                        type="text"
                        list="shot-types"
                        className="csel flex-1 min-w-0"
                        placeholder="Shot type..."
                        value={settings.shotType !== undefined ? settings.shotType : (idea.suggestedShotType || "")}
                        onChange={e => updateCardSetting(idea.id, 'shotType', e.target.value)}
                        onClick={e => e.stopPropagation()}
                      />
                      <datalist id="shot-types">
                        {SHOT_TYPES.map(s => <option key={s} value={s} />)}
                      </datalist>
                      <input
                        type="text"
                        list="crop-points"
                        className="csel flex-1 min-w-0"
                        placeholder="Crop at..."
                        value={settings.crop !== undefined ? settings.crop : (idea.suggestedCrop || "")}
                        onChange={e => updateCardSetting(idea.id, 'crop', e.target.value)}
                        onClick={e => e.stopPropagation()}
                      />
                      <datalist id="crop-points">
                        {CROP_POINTS.map(c => <option key={c} value={c} />)}
                      </datalist>
                      <input
                        type="text"
                        list="genres"
                        className="csel w-full"
                        placeholder="Genre/style..."
                        value={settings.genre !== undefined ? settings.genre : (idea.genre || "")}
                        onChange={e => updateCardSetting(idea.id, 'genre', e.target.value)}
                        onClick={e => e.stopPropagation()}
                      />
                      <datalist id="genres">
                        {GENRES.map(g => <option key={g} value={g} />)}
                      </datalist>
                      <input
                        type="text"
                        list="cameras"
                        className="csel w-full"
                        placeholder="Camera / Device..."
                        value={settings.camera !== undefined ? settings.camera : ""}
                        onChange={e => updateCardSetting(idea.id, 'camera', e.target.value)}
                        onClick={e => e.stopPropagation()}
                      />
                      <datalist id="cameras">
                        {CAMERAS.map(c => <option key={c} value={c} />)}
                      </datalist>
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
                <button
                  onClick={cancelOngoing}
                  disabled={isCancelling}
                  className="bg-(--error) text-white px-4 py-2 rounded-md cursor-pointer text-sm font-semibold border-none hover:opacity-90 disabled:opacity-50 disabled:cursor-wait"
                >
                  {isCancelling ? "Cancelling..." : "✕ Cancel"}
                </button>
                <button onClick={() => setStage("SELECT")} className="bg-transparent border border-(--border-hover) text-(--text-2) px-4 py-2 rounded-md cursor-pointer text-sm">Back</button>
                <button
                  onClick={() => {
                    const grouped = {};
                    results.filter(r => r.status === 'success').forEach(r => {
                      const g = r.typeDisplay.includes('COUPLE') ? 'COUPLE' : r.typeDisplay.includes('Female') || r.typeDisplay.includes('SOLO F') ? 'SOLO FEMALE' : 'SOLO MALE';
                      if (!grouped[g]) grouped[g] = [];
                      let text = `============= PROMPT ${grouped[g].length + 1} =============\n${r.resultText}`;
                      const vars = remixVariations[r.taskKey];
                      if (vars?.length > 0) {
                        vars.forEach((v) => { text += `\n\n\n============= ${v.title || 'VARIATION'} =============\n${v.body}`; });
                      }
                      grouped[g].push(text);
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
                      {task.status === 'success' && (
                        <div className="flex items-center gap-3">
                          <button className="text-(--text-2) bg-transparent border-none cursor-pointer text-[13px] hover:text-(--text-1) transition-colors" title="Regenerate this prompt" onClick={() => launchSingleTask(task.taskKey, task, `${templates.system}\n\n${templates.couple}\n\n${templates.solo_f}\n\n${templates.solo_m}`)}>Regen</button>
                          <button className="text-(--accent) bg-transparent border-none cursor-pointer font-semibold" onClick={() => { navigator.clipboard.writeText(task.resultText); triggerToast("Copied!"); }}>Copy</button>
                          <button
                            className={`text-[12px] px-2.5 py-1 rounded-md cursor-pointer border font-semibold transition-colors ${remixTaskKey === task.taskKey ? 'bg-(--accent) text-(--bg) border-(--accent)' : 'bg-transparent text-(--text-2) border-(--border) hover:border-(--accent) hover:text-(--accent)'}`}
                            onClick={() => {
                              if (remixTaskKey !== task.taskKey) {
                                setRemixAspects({});
                                setRemixDirective("");
                                setRemixCount(3);
                              }
                              setRemixTaskKey(remixTaskKey === task.taskKey ? null : task.taskKey);
                            }}
                          >Remix</button>
                        </div>
                      )}
                      {task.status === 'error' && <button className="text-(--error) bg-transparent border-none cursor-pointer font-semibold" onClick={() => launchSingleTask(task.taskKey, task, `${templates.system}\n\n${templates.couple}\n\n${templates.solo_f}\n\n${templates.solo_m}`)}>Retry</button>}
                    </div>
                  </div>
                  {task.status === 'loading' && <div className="skeleton m-5" />}
                  {task.status === 'success' && <div className="p-5 font-mono text-[13px] whitespace-pre-wrap text-(--text-2) leading-relaxed">{task.resultText}</div>}
                  {task.status === 'error' && <div className="p-5 text-(--error) font-mono text-[13px]">Failed: {task.resultText}</div>}

                  {/* REMIX PANEL */}
                  {task.status === 'success' && remixTaskKey === task.taskKey && (
                    <div className="border-t border-(--border)">
                      <div className="p-4 bg-(--surface-2) flex flex-col gap-3">
                        <div className="text-[11px] tracking-[1.5px] uppercase text-(--accent-dim) font-semibold">Remix — Choose what to vary</div>
                        <div className="flex flex-wrap gap-2">
                          {REMIX_ASPECTS.map(a => (
                            <button
                              key={a.key}
                              onClick={() => setRemixAspects(prev => ({ ...prev, [a.key]: !prev[a.key] }))}
                              className={`px-3 py-1.5 rounded-md text-xs font-semibold border cursor-pointer transition-colors ${remixAspects[a.key] ? 'bg-(--accent) text-(--bg) border-(--accent)' : 'bg-transparent text-(--text-2) border-(--border) hover:border-(--accent)'}`}
                              title={a.desc}
                            >{a.label}</button>
                          ))}
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] text-(--accent) font-semibold uppercase tracking-wider">Style Directive</label>
                          <input
                            type="text"
                            className="w-full bg-(--surface) border border-(--border) text-(--text-1) p-2.5 rounded-lg text-sm outline-none focus:border-(--accent) transition-colors"
                            placeholder='e.g. selfie style / paparazzi shot from behind / cinematic film noir / golden hour backlit / over-the-shoulder whisper'
                            value={remixDirective}
                            onChange={e => setRemixDirective(e.target.value)}
                          />
                          <div className="text-[10px] text-(--text-3)">Type any style, camera angle, or mood — it overrides all variations</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="text-[12px] text-(--text-3)">Variations:</label>
                          <select
                            className="csel"
                            value={remixCount}
                            onChange={e => setRemixCount(parseInt(e.target.value))}
                          >
                            {[2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                          </select>
                          <div className="flex-1" />
                          <button
                            onClick={() => handleRemix(task.taskKey)}
                            disabled={remixLoading || Object.values(remixAspects).every(v => !v)}
                            className="bg-(--accent) text-(--bg) px-4 py-2 rounded-md cursor-pointer border-none font-semibold text-[13px] hover:bg-(--accent-hover) transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >{remixLoading ? "Generating..." : "Generate Variations"}</button>
                        </div>
                      </div>

                      {/* VARIATION RESULTS */}
                      {remixLoading && remixTaskKey === task.taskKey && (
                        <div className="p-4 border-t border-(--border)">
                          <div className="skeleton" style={{ height: '120px' }} />
                          <div className="text-center mt-3">
                            <button
                              onClick={cancelOngoing}
                              disabled={isCancelling}
                              className="bg-(--error) text-white px-4 py-2 rounded-md cursor-pointer text-sm font-semibold border-none hover:opacity-90 disabled:opacity-50 disabled:cursor-wait"
                            >
                              {isCancelling ? "Cancelling..." : "✕ Cancel"}
                            </button>
                          </div>
                        </div>
                      )}
                      {remixVariations[task.taskKey]?.length > 0 && (
                        <div className="border-t border-(--border)">
                          {remixVariations[task.taskKey].map((v, vi) => (
                            <div key={vi} className={vi > 0 ? 'border-t border-(--border)' : ''}>
                              <div className="flex justify-between items-center px-4 py-2.5 bg-(--bg)">
                                <span className="text-[12px] text-(--accent) font-semibold">{v.title || `Variation ${vi + 1}`}</span>
                                <button
                                  className="text-(--accent) bg-transparent border-none cursor-pointer text-[12px] font-semibold"
                                  onClick={() => { navigator.clipboard.writeText(v.body); triggerToast("Copied!"); }}
                                >Copy</button>
                              </div>
                              <div className="px-4 py-3 font-mono text-[12px] whitespace-pre-wrap text-(--text-2) leading-relaxed max-h-80 overflow-y-auto">{v.body}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM ACTION BAR */}
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
            <button onClick={handleGenerateMoreIdeas} disabled={isLoadingMore} className="bg-transparent border border-(--accent-dim) text-(--accent) px-3 py-2 rounded-md cursor-pointer hover:bg-(--accent-faint) text-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
              {isLoadingMore ? <span className="animate-pulse">...</span> : <span className="text-base">+</span>}
              {isLoadingMore ? "Loading..." : "More Ideas"}
            </button>
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
              <button className="bg-(--text-1) text-(--bg) px-4 py-2 rounded-md font-semibold cursor-pointer text-sm" onClick={() => { localStorage.setItem("pb_templates_v5", JSON.stringify(templates)); setShowTplModal(false); triggerToast("Saved!"); }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ TOAST ══ */}
      {toast && <div className="fixed bottom-8 right-8 bg-(--text-1) text-(--bg) px-7 py-3.5 rounded-lg font-semibold z-100000 shadow-xl">{toast}</div>}
    </div>
  );
}
