import { useState, useRef, useCallback } from "react";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const C = {
  bg:        "#07080a",
  surf:      "#0f1012",
  surf2:     "#141618",
  surf3:     "#191b1e",
  border:    "#1e2024",
  border2:   "#262a2e",
  gold:      "#c09050",
  goldBright:"#d4a868",
  goldDim:   "#7a5c30",
  goldFaint: "rgba(192,144,80,0.08)",
  cream:     "#ece4d2",
  cream2:    "#f4ecd8",
  dim:       "#4a4840",
  mid:       "#8a8278",
  muted:     "#b0a898",
  green:     "#3d6e52",
  greenBright:"#5a8a6a",
  red:       "rgba(180,70,60,0.25)",
  redText:   "#c08070",
};

const STEPS = [
  { num:1, key:"headshots", label:"Headshots",     ratio:"3:4",  desc:"4×3 Grid · 12 Panels",         icon:"⊞" },
  { num:2, key:"fullbody",  label:"Full Body",      ratio:"16:9", desc:"5-Panel Horizontal",            icon:"⬜" },
  { num:3, key:"portrait",  label:"Main Portrait",  ratio:"9:16", desc:"Single Shot · Vertical",        icon:"⬛" },
  { num:4, key:"feature",   label:"Feature Chart",  ratio:"3:4",  desc:"3×2 Grid · Macro",              icon:"⊟" },
];

// ─── PROMPT TEMPLATES ─────────────────────────────────────────────────────────
const HEADSHOTS_PROMPT =
`CHARACTER REFERENCE - HEADSHOTS
{
  "reference_image_utilization": {
    "identity_consistency": "Strictly maintain the exact face identity, facial structure, facial features, makeup, and hairstyling from the reference photo across all 12 panels. The subject must be unmistakably the same person in every single image.",
    "character_anchor": "The person in every panel of the grid must be the same person from the uploaded reference image."
  },
  "image_structure": {
    "format": "A single, seamless 4x3 grid collage (4 rows, 3 columns)",
    "total_panels": 12,
    "subject_framing": "All shots are headshots and medium close-ups (shoulders up). The subject's head should occupy a consistent scale and proportion within each frame, ensuring visual harmony across the grid.",
    "background": "Uniform, neutral, minimalist off-white studio wall throughout.",
    "collage_spacing": "Absolutely no spacing, gaps, or divider lines between panels.",
    "panel_borders": "No borders or frames on panels or the overall image.",
    "seamless_collage": true
  },
  "lighting_and_aesthetic": {
    "style": "Professional model digitals, also known as agency polaroids. Unedited, raw photography look.",
    "lighting": "Soft, even, flattering natural daylight. High-key with minimal, soft shadows.",
    "camera_specs": "Shot on an 85mm portrait lens, f/2.8, extremely sharp focus on the eyes.",
    "color_profile": "Natural, true-to-life colors, realistic skin textures, slightly desaturated tones. Preserve all natural skin textures, pores, and micro-details. No airbrushing or skin smoothing.",
    "styling_restrictions": {
      "accessories": "No jewelry, no distracting elements."
    },
    "panel_descriptions": {
      "row_1": [
        "Full frontal portrait, neutral expression, looking directly at the camera, eye-level.",
        "Perfect 90-degree right profile, neutral expression, showing jawline and nose silhouette.",
        "Perfect 90-degree left profile, neutral expression, showing jawline and nose silhouette."
      ],
      "row_2": [
        "Three-quarter view, head turned 45 degrees to the right, looking off-camera.",
        "Three-quarter view, head turned 45 degrees to the left, looking off-camera.",
        "Slightly angled three-quarter view with a soft, gentle gaze directly at the camera."
      ],
      "row_3": [
        "Low angle shot (worm's eye view), chin tilted slightly upward, neutral expression.",
        "High angle shot (bird's eye view), looking down at the top of the head and hair parting.",
        "Full frontal portrait, eyes peacefully closed, neutral and relaxed expression."
      ],
      "row_4": [
        "Full frontal portrait, slight, subtle closed-mouth smile.",
        "Full frontal portrait, radiant and genuine closed-mouth smile.",
        "Full frontal portrait, genuine open-mouth laugh, looking happy and relaxed."
      ]
    }
  },
  "negative_prompt": "different person, inconsistent identity, distorted features, sketches, painting, illustration, artistic filters, busy background, colored background, hard shadows, jewelry, accessories, white lines, white borders, panel gaps, spacing between panels, divider lines, framed layout, text, watermarks, wrong format, blurry, out of focus"
}`;

const FULLBODY_PROMPT =
`CHARACTER REFERENCE - FULL BODY | SLIM HOURGLASS
{
  "generation_priority": {
    "priority_order": [
      "Preserve face identity from the reference image only",
      "Apply extreme body-shape override exactly as written - maximize hips, waist contrast, and glute projection to the absolute limit",
      "Maintain the 5-panel horizontal collage layout and specific angles",
      "Keep neutral studio styling and lighting"
    ]
  },
  "reference_image_utilization": {
    "identity_consistency": "Strictly maintain the exact face identity, facial structure, facial features, makeup, and hairstyling from the reference image across all 5 panels.",
    "character_anchor": "The subject in every panel must clearly be the same person as the reference image.",
    "reference_scope": "Use the reference image for face identity only.",
    "override_statement": "Force an extreme exaggerated hourglass figure with extreme exaggerated wide dramatically flared hips and massive projected shelf-like glutes regardless of the reference. Maximize hip width and glute projection to the absolute maximum possible. Make the waist extremely tiny and sharply cinched for maximum contrast. The body must show massive heavy bust, tiny waist, extreme exaggerated wide hips, and massive jutting glutes in every panel."
  },
  "physique_and_proportions": {
    "body_type": "extreme exaggerated hourglass figure with massive heavy bust, extremely tiny sharply cinched waist, extreme exaggerated wide dramatically flared hips, very full thick soft thighs, and massive rounded projected shelf-like glutes",
    "bust_chest_volume": "very large, heavy, and voluminous bust. Breasts are massive, round, and prominently projected forward with significant weight, creating deep symmetrical cleavage with heavily exposed skin and visible upper fullness that noticeably overflows the garment. The fabric strains and stretches taut to the breaking point, pushing the breasts into a dramatic, pushed-up display. They sit high on the chest with excellent lift yet look naturally soft and heavy, forming a pronounced shelf-like effect",
    "waist_definition": "extremely tiny, sharply cinched and snatched waist for maximum dramatic contrast with the extreme exaggerated wide hips",
    "hip_structure": "extreme exaggerated wide, dramatically flared voluptuous hips that flare out extremely sharply and widely from the tiny waist. Maximize hip width to the absolute limit. Extreme waist-to-hip ratio. Hyper exaggerated hip flare",
    "leg_and_lower_body": "very full thick, soft thighs with substantial volume and curve",
    "glute_definition": "massive, full, very thick, and rounded glutes with an extremely prominently projected dramatic shelf-like shape that juts out sharply and dramatically. Incredibly plush, soft, heart-shaped with very high projection and voluptuous volume. Maximize glute size and projection to the absolute maximum. Strong shelf butt visible especially from side and back",
    "overall_silhouette": "highly exaggerated extreme hourglass with massive heavy bust, tiny waist, extreme exaggerated wide flared hips, very full thick thighs, and massive dramatically projected shelf-like glutes. Push proportions to the extreme",
    "panel_consistency": "These extreme proportions must remain clearly visible and consistent in every single panel."
  },
  "image_structure": {
    "format": "5-panel horizontal collage",
    "total_panels": 5,
    "subject_framing": "Full body in all panels",
    "background": "Simple off-white studio background",
    "floor": "Plain seamless studio floor",
    "orientation": "Horizontal",
    "grid_spacing": "No borders, no gutters, no panel dividers, no white lines, no spacing between panels, seamless collage"
  },
  "lighting_and_aesthetic": {
    "style": "Neutral studio casting sheet. Unedited, raw photography look.",
    "lighting": "Soft, even, flattering natural daylight. High-key with minimal, soft shadows.",
    "camera_specs": "Shot on a 50mm lens look for full-body shots, sharp focus, hyper-realistic proportions",
    "color_profile": "Natural, true-to-life colors, realistic skin textures, slightly desaturated tones. Preserve all natural skin textures, pores, and micro-details. No airbrushing or skin smoothing."
  },
  "wardrobe_and_styling": {
    "outfit": "Simple fitted tank top and fitted athletic shorts in light grey. The tank top is low-cut and supportive, extremely tight and stretched taut to the breaking point around the massive heavy bust, creating deep symmetrical cleavage with heavily exposed skin and visible upper fullness that noticeably overflows. The shorts are very tight and hugging, stretched extremely taut by the extreme exaggerated wide hips and massive projected glutes.",
    "preferred_colors": ["light grey"],
    "fit": "Extremely tight and form-fitting. Tank top stretched dramatically by massive bust. Shorts stretched to the limit by extreme exaggerated wide hips and massive projected glutes.",
    "no_accessories": "No jewelry, no distracting elements"
  },
  "panel_descriptions": {
    "panels": [
      "Full body Front View, arms relaxed at sides, neutral expression, massive heavy bust overflowing the top with deep cleavage, extremely tiny snatched waist dramatically flaring out into extreme exaggerated wide voluptuous hips, wearing tight light grey tank top and tight shorts",
      "Full body 3/4 Front view (turned slightly to the right), massive projected bust, extremely tiny waist flaring dramatically into extreme exaggerated wide hips, round massive shelf-like glutes in tight shorts",
      "Full body Profile view (90-degree side profile, facing right), massive heavy bust with strong forward projection, extremely tiny waist, extreme exaggerated wide hips, extremely rounded and dramatically projected shelf-like glutes in tight shorts, very full thick soft thighs",
      "Full body 3/4 Back view (turned slightly from the back), extreme exaggerated wide voluptuous hips and massive full rounded shelf-like glutes prominently visible and tightly hugged by the shorts",
      "Full body Rear View, arms relaxed naturally, massive rounded glutes with prominently projected dramatic shelf-like shape that juts out sharply, extreme exaggerated wide hips, and very full thick thighs visible from behind"
    ]
  },
  "negative_prompt": "narrow hips, slim hips, moderate hips, average hips, athletic build, fitness model proportions, small glutes, flat glutes, subtle curves, rectangular figure, straight body shape, small bust, no cleavage, thin legs, minimal hip width, low projection glutes, no shelf butt, long leggy model body, realistic average proportions"
}`;

const PORTRAIT_PROMPT =
`REFERENCE CHARACTER - MAIN PORTRAIT
{
  "generation_priority": {
    "priority_order": [
      "Preserve face identity from the reference image only",
      "Apply the body-shape from the reference image override exactly as written",
      "Generate balanced upper chest to head framing with headroom",
      "Keep neutral studio styling and lighting"
    ]
  },
  "reference_image_utilization": {
    "identity_consistency": "Strictly maintain the exact face identity, facial structure, facial features, makeup, and hairstyling from the reference image.",
    "character_anchor": "The subject must clearly be the same person as the uploaded reference image.",
    "reference_scope": "Use the reference image for face identity only.",
    "ignore_from_reference": [
      "body shape", "body frame", "body proportions", "bust size",
      "waist width", "hip width", "shoulder-to-hip ratio", "wardrobe"
    ],
    "override_statement": "Specifically, adjust the chest volume to a very large, heavy, and voluminous bust with massive, round breasts that are prominently projected forward with significant weight, creating deep symmetrical cleavage with heavily exposed skin and visible upper fullness that slightly overflows the garment. The sheer size and softness cause the fabric to strain and stretch taut to the breaking point, pushing the breasts into a dramatic, pushed-up display. They sit high on her chest with excellent lift yet look naturally soft and heavy, forming a pronounced shelf-like effect."
  },
  "physique_and_proportions": {
    "body_type": "extreme exaggerated hourglass figure with massive bust and sharply cinched waist",
    "bust_chest_volume": "very large, heavy, and voluminous bust. Breasts are massive, round, and prominently projected forward with significant weight, creating deep symmetrical cleavage with heavily exposed skin and visible upper fullness slightly overflowing the garment. Fabric strains and stretches taut to breaking point. They sit high on the chest with excellent lift yet look naturally soft and heavy, forming a pronounced shelf-like effect.",
    "waist_definition": "extremely tiny, sharply cinched waist visible just below the bust",
    "overall_silhouette": "highly exaggerated upper hourglass with massive heavy overflowing bust"
  },
  "image_structure": {
    "format": "A single image with balanced upper chest to head framing",
    "subject_framing": "Tight close-up framing from just below the bust / upper chest to the top of the head, with generous headroom (20-30% empty space) above the crown of the head and hair. Do not crop the top of the head or hair. Show the full face, neck, shoulders, and prominent bust area with deep cleavage.",
    "background": "Uniform, clean, bright white studio background",
    "orientation": "Vertical",
    "grid_spacing": "Single clean image, no collage"
  },
  "lighting_and_aesthetic": {
    "style": "Neutral studio casting sheet. Unedited, raw photography look.",
    "lighting": "Soft, even, flattering natural daylight. High-key with minimal, soft shadows.",
    "camera_specs": "Shot on an 85mm lens look for close-up portrait from upper chest to head, sharp focus on face and bust, hyper-realistic proportions, ensure generous headroom above the head with no cropping at the top of the hair or head",
    "color_profile": "Natural, true-to-life colors, realistic skin textures, slightly desaturated tones. Preserve all natural skin textures, pores, and micro-details. No airbrushing or skin smoothing."
  },
  "wardrobe_and_styling": {
    "outfit": "Fitted ribbed tank top in light grey. The tank top is a low-cut or supportive fitted style that strongly accentuates the massive, heavy bust — the fabric strains and stretches taut to the breaking point around the very large, voluminous breasts, creating deep symmetrical cleavage with heavily exposed skin and visible upper fullness that slightly overflows the garment.",
    "preferred_colors": ["light grey"],
    "fit": "Extremely tight and form-fitting on the bust. The tank top is stretched dramatically by the massive bust with visible strain, deep cleavage, and slight overflow at the neckline."
  },
  "pose_description": "Tight close-up portrait, facing the camera directly with a soft neutral expression. Both hands are gently resting on the upper chest, fingers with natural nails spread naturally with palms lightly touching the skin just above the bust and collarbone area. Shoulders relaxed, bust prominently visible and centered, with generous headroom above the head.",
  "negative_prompt": "cropped head, cropped hair, no headroom, tight crop at top of head, cut off top of head, full body, mid-thigh framing, waist up, head and shoulders only, small bust, no cleavage, modest bust, flat chest, loose clothing, dramatic lighting, busy background, distorted proportions, unrealistic anatomy, hands at sides, hands on hips, arms crossed"
}`;

function buildFeatureChart(f) {
  const safe = (val, fallback) => (val && !["none notable","none","n/a","unknown","not visible"].includes(val.toLowerCase())) ? val : fallback;

  const p1a = f
    ? `Extreme macro close-up of the subject's two eyes. Focus on the unique ${f.eyes_color} iris color${safe(f.eyes_iris_detail, null) ? ` and the ${f.eyes_iris_detail}` : ""}. Capture the ${f.eyes_lashes || "eyelashes in precise macro detail"}.`
    : "Extreme macro close-up of the subject's two eyes. Focus on the unique iris color, limbal ring, and capture the eyelashes in precise macro detail.";

  const p1b = f
    ? `Close-up of the lower face, focusing on the ${f.lips_description || "natural lip shape and color"}. ${safe(f.skin_details, null) ? `Highlight the ${f.skin_details} visible on the upper lip and chin area.` : "Show the natural skin texture and subtle pores around the mouth."}`
    : "Close-up of the lower face, focusing on the natural lip shape and color. Show the natural skin texture and pores around the mouth and chin.";

  const p2a = f
    ? `Macro photography of the subject's cheek and nose bridge. Focus on the ${safe(f.skin_details, "natural skin texture and micro-detail")} combined with the ${f.skin_blush || "natural cheek coloring and undertones"} visible across the cheeks and nose.`
    : "Macro photography of the subject's cheek and nose bridge. Focus on the skin texture, pore detail, natural coloring, and any distinctive skin characteristics.";

  const p2b = f
    ? `Extreme macro close-up of the ${f.hair_style || "hair"}. Focus on the ${f.hair_texture ? `${f.hair_texture} texture` : "texture and movement"}, the ${f.hair_color || "precise hair color"}, and the detail of the ${f.hair_length ? "styled ends and individual strands" : "cut and strand detail"}.`
    : "Extreme macro close-up of the hair. Focus on the precise color, texture, movement, and detail of the individual strands and styled ends.";

  const p3a = f
    ? `A clean shot of the subject's hand, showing ${f.nail_length || "medium"}-length, ${f.nail_shape || "almond"}-shaped nails with a ${safe(f.nail_color, "sheer, natural light pink")} manicure.`
    : "A clean shot of the subject's hand, showing the nail shape, length, and natural manicure in precise detail.";

  const p3b = f
    ? `A macro beauty shot focused on the side of the subject's face, showcasing the ${f.jaw_description || "elegant curve of her jawline"} and ear. Her hair is tucked neatly behind her ear to reveal the detail. A single, small, delicate diamond stud earring is visible on her earlobe, catching the light subtly.`
    : "A macro beauty shot focused on the side of the subject's face, showcasing the elegant jawline curve and ear. Hair tucked neatly behind the ear. A single, small, delicate diamond stud earring catches the light softly.";

  return `CHARACTER REFERENCE - FEATURE CHART
{
  "reference_image_utilization": {
    "identity_consistency": "Strictly maintain the exact face identity, skin tone, eye color, makeup, and hairstyling from the reference photo for all relevant panels. The hand in the manicure panel must match the subject's skin tone.",
    "character_anchor": "The person and features shown in the grid must belong to the same person from the uploaded reference image."
  },
  "image_structure": {
    "format": "A clean 3x2 grid collage (3 rows, 2 columns).",
    "total_panels": 6,
    "subject_framing": "A mix of extreme close-ups, macro shots, and detail shots. Framing will vary by panel.",
    "background": "Uniform, clean, bright white studio background for all panels.",
    "collage_spacing": "Clean, thin, light gray hairline borders separating each panel.",
    "panel_borders": "Thin borders are required.",
    "seamless_collage": false
  },
  "lighting_and_aesthetic": {
    "style": "High-end cosmetic brand chart, beauty feature breakdown, model card details.",
    "lighting": "Bright, even, clinical studio lighting with no harsh shadows.",
    "camera_specs": "Shot with a 100mm Macro lens, f/8, extremely high detail and sharpness.",
    "color_profile": "Natural, true-to-life colors, realistic skin textures, slightly desaturated tones. Preserve all natural skin textures, pores, and micro-details. No airbrushing or skin smoothing.",
    "styling_restrictions": {
      "accessories": "Only the specified small diamond stud earring is allowed. No other jewelry or accessories."
    },
    "panel_descriptions": {
      "row_1": [
        {
          "panel": "1A (Top Left)",
          "content": "${p1a}"
        },
        {
          "panel": "1B (Top Right)",
          "content": "${p1b}"
        }
      ],
      "row_2": [
        {
          "panel": "2A (Middle Left)",
          "content": "${p2a}"
        },
        {
          "panel": "2B (Middle Right)",
          "content": "${p2b}"
        }
      ],
      "row_3": [
        {
          "panel": "3A (Bottom Left)",
          "content": "${p3a}"
        },
        {
          "panel": "3B (Bottom Right)",
          "content": "${p3b}"
        }
      ]
    }
  },
  "negative_prompt": "text, labels, words, different people, inconsistent identity, blurry, out of focus, bad anatomy, distorted hands, artistic filters, busy background, full body shots, seamless collage, wrong grid format, different grid format, wrong panel description, different eye color, no makeup, different hair color"
}`;
}

// ─── CLAUDE API ───────────────────────────────────────────────────────────────
async function extractCharacterFeatures(base64, mediaType) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: "You are a visual character analyst for AI image generation. Analyze the uploaded image and return ONLY a valid JSON object. No preamble, no markdown backticks, no explanation — raw JSON only.",
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: `Extract precise visual details from this person image for use in AI image generation prompts. Return ONLY valid JSON:

{
  "eyes_color": "precise eye color with descriptive comparison (e.g., warm hazel with amber flecks, deep espresso brown, cool steel grey)",
  "eyes_iris_detail": "any distinctive iris marking or limbal ring detail, or 'none notable'",
  "eyes_lashes": "lash description (e.g., long and wispy naturally separated, short and sparse, thick and full)",
  "lips_description": "lip shape and natural color (e.g., soft bow-shaped lips with a dusty rose tone, full lips with warm nude pink)",
  "skin_tone": "precise skin tone with warmth note (e.g., warm ivory, cool porcelain, light golden tan, warm medium brown, deep mahogany)",
  "skin_details": "any distinctive texture details (e.g., scattered bridge-of-nose freckles, dense sun-kissed freckle constellation, clear smooth skin, faint freckling)",
  "skin_blush": "natural cheek coloring (e.g., rosy flush across the cheekbones, warm peachy undertone, even complexion with subtle warmth)",
  "hair_color": "precise color using a vivid comparison (e.g., buttery honey blonde, deep obsidian black with blue undertones, warm auburn like fallen leaves, cool ash brown)",
  "hair_texture": "texture description (e.g., silky and pin-straight, soft loose waves, tight natural coils, wavy and voluminous)",
  "hair_style": "current hairstyle (e.g., voluminous 90s blowout with swooping layers, sleek straight bob, loose beach waves, high tight bun)",
  "hair_length": "length (e.g., pixie-short, chin-length, collarbone-length, mid-back, waist-length)",
  "nail_length": "visible nail length or 'medium' as default",
  "nail_shape": "visible nail shape or 'almond' as default",
  "nail_color": "visible nail color or 'natural/bare'",
  "jaw_description": "jawline description (e.g., elegantly defined jaw with a soft curve, sharp angular jawline, soft round jaw)",
  "distinctive_features": "any moles, birthmarks, dimples, piercings visible, or 'none notable'",
  "overall_aesthetic": "character vibe in 2-3 evocative words (e.g., ethereal editorial, sun-kissed natural, dark academia cool)"
}` }
        ]
      }]
    })
  });

  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();
  const raw = data.content.filter(b => b.type === "text").map(b => b.text).join("");
  const clean = raw.replace(/```json\s*|```\s*/g, "").trim();
  return JSON.parse(clean);
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function CharRefGenerator() {
  const [preview,    setPreview]    = useState(null);
  const [b64,        setB64]        = useState(null);
  const [mtype,      setMtype]      = useState("image/jpeg");
  const [analyzing,  setAnalyzing]  = useState(false);
  const [features,   setFeatures]   = useState(null);
  const [prompts,    setPrompts]    = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  const [copied,     setCopied]     = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error,      setError]      = useState(null);

  // ── Step-4 refine upload ───
  const [refPreview, setRefPreview] = useState(null);
  const [refAnalyzing, setRefAnalyzing] = useState(false);

  const inputRef    = useRef(null);
  const refInputRef = useRef(null);

  const runAnalysis = useCallback(async (base64, mediaType) => {
    setAnalyzing(true);
    setError(null);
    setFeatures(null);
    setPrompts(null);
    try {
      const f = await extractCharacterFeatures(base64, mediaType);
      setFeatures(f);
      setPrompts({
        headshots: HEADSHOTS_PROMPT,
        fullbody:  FULLBODY_PROMPT,
        portrait:  PORTRAIT_PROMPT,
        feature:   buildFeatureChart(f),
      });
    } catch (err) {
      console.error(err);
      setError("Analisis karakter gagal — prompt dibuat dengan deskripsi generik. Coba upload ulang.");
      setPrompts({
        headshots: HEADSHOTS_PROMPT,
        fullbody:  FULLBODY_PROMPT,
        portrait:  PORTRAIT_PROMPT,
        feature:   buildFeatureChart(null),
      });
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    setMtype(file.type || "image/jpeg");
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target.result.split(",")[1];
      setB64(data);
      runAnalysis(data, file.type || "image/jpeg");
    };
    reader.readAsDataURL(file);
  }, [runAnalysis]);

  const handleRefineFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setRefPreview(URL.createObjectURL(file));
    setRefAnalyzing(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const data = e.target.result.split(",")[1];
      try {
        const f = await extractCharacterFeatures(data, file.type || "image/jpeg");
        setFeatures(f);
        setPrompts(prev => ({ ...prev, feature: buildFeatureChart(f) }));
      } catch (err) {
        console.error(err);
      } finally {
        setRefAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const handleCopy = (key, text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2200);
    });
  };

  const reset = () => {
    setPreview(null); setB64(null); setFeatures(null);
    setPrompts(null); setError(null); setActiveStep(0);
    setRefPreview(null);
  };

  const activeKey  = STEPS[activeStep]?.key;
  const activeText = prompts?.[activeKey] || "";

  const featureRows = features ? [
    { label: "Eyes",     val: features.eyes_color },
    { label: "Lashes",   val: features.eyes_lashes },
    { label: "Lips",     val: features.lips_description },
    { label: "Skin",     val: features.skin_tone },
    { label: "Detail",   val: features.skin_details },
    { label: "Blush",    val: features.skin_blush },
    { label: "Hair",     val: features.hair_color },
    { label: "Style",    val: features.hair_style },
    { label: "Vibe",     val: features.overall_aesthetic },
  ].filter(r => r.val && !["none notable","n/a"].includes(r.val.toLowerCase())) : [];

  // ─── STYLES ─────────────────────────────────────────────────────────────────
  const s = {
    root: {
      minHeight: "100vh",
      background: C.bg,
      fontFamily: "'DM Sans', 'Helvetica Neue', system-ui, sans-serif",
      color: C.cream,
    },
    header: {
      background: C.surf,
      borderBottom: `1px solid ${C.border}`,
      padding: "18px 28px",
      display: "flex", alignItems: "center", gap: 14,
    },
    logo: {
      width: 34, height: 34,
      background: `linear-gradient(135deg, ${C.goldDim} 0%, ${C.gold} 100%)`,
      borderRadius: 5,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 16, color: C.bg, userSelect: "none",
    },
    logoTitle: {
      fontFamily: "'Cormorant Garamond', Georgia, 'Times New Roman', serif",
      fontSize: 19, fontWeight: 600, letterSpacing: 3,
      color: C.cream2, textTransform: "uppercase", lineHeight: 1,
    },
    logoSub: {
      fontSize: 10, color: C.dim, letterSpacing: 1.5,
      textTransform: "uppercase", marginTop: 4,
    },
    body: { maxWidth: 820, margin: "0 auto", padding: "32px 20px 60px" },
    sectionLabel: {
      fontFamily: "'Cormorant Garamond', Georgia, serif",
      fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase",
      color: C.goldDim, marginBottom: 14,
    },
    uploadZone: {
      border: `1.5px dashed ${C.border2}`,
      borderRadius: 8, padding: "56px 32px", textAlign: "center",
      background: C.surf, cursor: "pointer", transition: "all 0.2s",
    },
    uploadZoneDrag: {
      borderColor: C.gold,
      background: C.goldFaint,
    },
    uploadIcon: {
      fontSize: 32, opacity: 0.25, marginBottom: 16, display: "block",
    },
    uploadTitle: {
      fontFamily: "'Cormorant Garamond', Georgia, serif",
      fontSize: 22, color: C.cream, marginBottom: 8,
    },
    uploadSub: { fontSize: 13, color: C.mid, lineHeight: 1.7 },
    analyzeCard: {
      background: C.surf, border: `1px solid ${C.border}`,
      borderRadius: 8, padding: "20px",
      display: "flex", gap: 20, alignItems: "center",
    },
    analyzeImg: {
      width: 80, height: 80, objectFit: "cover",
      borderRadius: 6, border: `1px solid ${C.border2}`, flexShrink: 0,
    },
    progressBar: {
      height: 3, background: C.border2, borderRadius: 2,
      overflow: "hidden", marginTop: 10,
    },
    profileCard: {
      background: C.surf, border: `1px solid ${C.border}`,
      borderRadius: 8, padding: 20, marginBottom: 24,
      display: "flex", gap: 20, alignItems: "flex-start",
    },
    profileImg: {
      width: 74, height: 74, objectFit: "cover",
      borderRadius: 6, border: `1px solid ${C.border2}`, flexShrink: 0,
    },
    profileTitle: {
      fontFamily: "'Cormorant Garamond', Georgia, serif",
      fontSize: 14, letterSpacing: 2, textTransform: "uppercase",
      color: C.gold, marginBottom: 12,
    },
    featureGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
      gap: "6px 24px",
    },
    featureRow: { display: "flex", gap: 8, alignItems: "baseline" },
    featureLabel: {
      fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase",
      color: C.dim, flexShrink: 0, width: 48,
    },
    featureVal: { fontSize: 12, color: C.mid, lineHeight: 1.5 },
    tabBar: {
      display: "flex", gap: 3, overflowX: "auto",
      paddingBottom: 2, marginBottom: 0,
    },
    promptPanel: {
      background: C.surf2, border: `1px solid ${C.border2}`,
      borderRadius: "0 8px 8px 8px", overflow: "hidden",
    },
    promptHeader: {
      padding: "14px 20px", borderBottom: `1px solid ${C.border}`,
      display: "flex", alignItems: "center", justifyContent: "space-between",
    },
    promptTitle: {
      fontFamily: "'Cormorant Garamond', Georgia, serif",
      fontSize: 16, color: C.cream, letterSpacing: 0.5,
    },
    promptRatio: {
      fontSize: 10, color: C.dim, letterSpacing: 1.5,
      textTransform: "uppercase", marginLeft: 10,
    },
    promptScroll: {
      padding: "20px", maxHeight: 400, overflowY: "auto",
    },
    promptText: {
      fontFamily: "'Space Mono', 'Courier New', Courier, monospace",
      fontSize: 11.5, lineHeight: 1.75, color: C.muted,
      whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0,
    },
    promptFooter: {
      padding: "12px 20px", borderTop: `1px solid ${C.border}`,
      display: "flex", gap: 8, alignItems: "center",
    },
    footNote: { fontSize: 11, color: C.dim },
    navBtn: {
      background: "transparent", border: `1px solid ${C.border2}`,
      color: C.mid, borderRadius: 4, padding: "4px 11px",
      fontSize: 11, cursor: "pointer",
    },
    nextBtn: {
      background: C.border2, border: "none",
      color: C.cream, borderRadius: 4, padding: "4px 11px",
      fontSize: 11, cursor: "pointer",
    },
    workflowCard: {
      marginTop: 24, background: C.surf,
      border: `1px solid ${C.border}`, borderRadius: 8, padding: "18px 20px",
    },
    workflowRow: { display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 9 },
    workflowNum: {
      fontFamily: "'Cormorant Garamond', Georgia, serif",
      fontSize: 14, color: C.goldDim, flexShrink: 0, paddingTop: 1, width: 22,
    },
    workflowText: { fontSize: 12.5, color: C.mid, lineHeight: 1.5 },
    refineBox: {
      margin: "16px 20px", background: C.surf3,
      border: `1px solid ${C.border}`, borderRadius: 7, padding: "16px",
    },
    refineLabel: {
      fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase",
      color: C.goldDim, marginBottom: 10,
    },
    refineUpload: {
      border: `1px dashed ${C.border2}`, borderRadius: 6,
      padding: "14px", textAlign: "center", cursor: "pointer",
      transition: "all 0.2s",
    },
    errBar: {
      background: C.red, border: `1px solid rgba(180,70,60,0.3)`,
      borderRadius: 6, padding: "10px 16px", fontSize: 12,
      color: C.redText, marginBottom: 20,
    },
    resetBtn: {
      background: "transparent", border: `1px solid ${C.border2}`,
      color: C.mid, borderRadius: 4, padding: "4px 10px",
      fontSize: 11, cursor: "pointer", letterSpacing: 0.5, textTransform: "uppercase",
    },
  };

  return (
    <div style={s.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Space+Mono&family=DM+Sans:wght@300;400;500&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:${C.border2}; border-radius:2px; }
        .upload-hover:hover { border-color:${C.gold} !important; background:${C.goldFaint} !important; }
        .tab-btn:hover { opacity:0.85; }
        .copy-btn:hover { filter:brightness(1.15); }
        .nav-btn:hover { background:${C.border2} !important; }
        @keyframes sweep {
          0%   { transform:translateX(-120%); }
          100% { transform:translateX(220%); }
        }
        @keyframes fadein { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .fadein { animation: fadein 0.35s ease forwards; }
        .refine-hover:hover { border-color:${C.gold} !important; }
      `}</style>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div style={s.header}>
        <div style={s.logo}>◆</div>
        <div>
          <div style={s.logoTitle}>Char · Ref</div>
          <div style={s.logoSub}>Character Reference Sheet Generator</div>
        </div>
      </div>

      <div style={s.body}>

        {/* ── UPLOAD STATE ───────────────────────────────────────────────── */}
        {!prompts && !analyzing && (
          <div className="fadein">
            <div style={s.sectionLabel}>Langkah 01 — Upload Foto Referensi</div>
            {!preview ? (
              <div
                className="upload-hover"
                style={{ ...s.uploadZone, ...(isDragging ? s.uploadZoneDrag : {}) }}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
              >
                <span style={s.uploadIcon}>◈</span>
                <div style={s.uploadTitle}>Drop foto karakter kamu di sini</div>
                <div style={s.uploadSub}>
                  atau klik untuk pilih file · JPG, PNG, WEBP<br />
                  <span style={{ color: C.goldDim, marginTop: 6, display: "block" }}>
                    Claude akan analisis wajah, rambut, kulit, dan mata secara otomatis
                  </span>
                </div>
                <input
                  ref={inputRef} type="file" accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => handleFile(e.target.files[0])}
                />
              </div>
            ) : null}
          </div>
        )}

        {/* ── ANALYZING STATE ────────────────────────────────────────────── */}
        {analyzing && preview && (
          <div style={s.analyzeCard} className="fadein">
            <img src={preview} style={s.analyzeImg} alt="ref" />
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: 18, color: C.cream, marginBottom: 10,
              }}>
                Mengekstrak karakter…
              </div>
              <div style={s.progressBar}>
                <div style={{
                  height: "100%", width: "55%",
                  background: `linear-gradient(90deg, ${C.goldDim}, ${C.goldBright}, ${C.goldDim})`,
                  borderRadius: 2, animation: "sweep 1.6s linear infinite",
                }} />
              </div>
              <div style={{ fontSize: 12, color: C.dim, marginTop: 9 }}>
                Claude sedang menganalisis: warna mata, rambut, kulit, fitur wajah…
              </div>
            </div>
          </div>
        )}

        {/* ── ERROR ──────────────────────────────────────────────────────── */}
        {error && <div style={s.errBar}>{error}</div>}

        {/* ── RESULTS ────────────────────────────────────────────────────── */}
        {prompts && (
          <div className="fadein">

            {/* Character Profile Card */}
            <div style={s.profileCard}>
              {preview && <img src={preview} style={s.profileImg} alt="character" />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={s.profileTitle}>
                    {features?.overall_aesthetic || "Karakter"} — Profil Terekstrak
                  </div>
                  <button style={s.resetBtn} onClick={reset}>↺ Reset</button>
                </div>
                {featureRows.length > 0 ? (
                  <div style={s.featureGrid}>
                    {featureRows.map(r => (
                      <div key={r.label} style={s.featureRow}>
                        <span style={s.featureLabel}>{r.label}</span>
                        <span style={s.featureVal}>{r.val}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: C.dim }}>
                    Analisis gagal — prompt generik digunakan. Upload ulang untuk hasil lebih akurat.
                  </div>
                )}
              </div>
            </div>

            {/* Step Tabs */}
            <div style={s.tabBar}>
              {STEPS.map((step, i) => {
                const isActive = activeStep === i;
                const isCustomized = step.key === "feature" && !!features;
                return (
                  <button
                    key={step.key}
                    className="tab-btn"
                    onClick={() => setActiveStep(i)}
                    style={{
                      background: isActive ? C.surf2 : C.surf,
                      border: `1px solid ${isActive ? C.border2 : C.border}`,
                      borderBottom: isActive ? `1px solid ${C.surf2}` : `1px solid ${C.border}`,
                      color: isActive ? C.cream : C.mid,
                      padding: "10px 15px 9px",
                      borderRadius: "6px 6px 0 0",
                      cursor: "pointer",
                      textAlign: "left",
                      minWidth: 138,
                      flexShrink: 0,
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
                      <span style={{
                        background: isActive ? C.gold : C.goldDim,
                        color: C.bg, borderRadius: 3,
                        padding: "1px 5px", fontSize: 9, fontWeight: 700,
                        letterSpacing: 0.5,
                      }}>{step.ratio}</span>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{step.label}</span>
                      {isCustomized && (
                        <span style={{ color: C.goldBright, fontSize: 9 }}>◆</span>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: C.dim, letterSpacing: 0.3 }}>{step.desc}</div>
                  </button>
                );
              })}
            </div>

            {/* Prompt Panel */}
            <div style={s.promptPanel}>
              <div style={s.promptHeader}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span style={s.promptTitle}>{STEPS[activeStep].label} Prompt</span>
                  <span style={s.promptRatio}>Ratio {STEPS[activeStep].ratio}</span>
                </div>
                <button
                  className="copy-btn"
                  onClick={() => handleCopy(activeKey, activeText)}
                  style={{
                    background: copied === activeKey ? C.green : C.goldDim,
                    color: C.bg, border: "none", borderRadius: 5,
                    padding: "7px 16px", fontSize: 12, fontWeight: 500,
                    letterSpacing: 0.5, cursor: "pointer", transition: "all 0.2s",
                    display: "flex", alignItems: "center", gap: 6,
                  }}
                >
                  {copied === activeKey ? "✓ Tersalin" : "⎘ Copy Prompt"}
                </button>
              </div>

              <div style={s.promptScroll}>
                <pre style={s.promptText}>{activeText}</pre>
              </div>

              {/* Step 4: Refine Upload */}
              {activeStep === 3 && (
                <div style={s.refineBox}>
                  <div style={s.refineLabel}>
                    ◆ Perhalus Feature Chart — Upload hasil Main Portrait (opsional)
                  </div>
                  {!refPreview ? (
                    <div
                      className="refine-hover"
                      style={s.refineUpload}
                      onClick={() => refInputRef.current?.click()}
                    >
                      <div style={{ fontSize: 12, color: C.mid }}>
                        Upload hasil generate Step 3 → Claude re-analisis → Feature Chart lebih akurat
                      </div>
                      <input
                        ref={refInputRef} type="file" accept="image/*"
                        style={{ display: "none" }}
                        onChange={(e) => handleRefineFile(e.target.files[0])}
                      />
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <img src={refPreview} style={{
                        width: 52, height: 52, objectFit: "cover",
                        borderRadius: 5, border: `1px solid ${C.border2}`,
                      }} alt="portrait result" />
                      <div style={{ fontSize: 12, color: refAnalyzing ? C.gold : C.greenBright }}>
                        {refAnalyzing ? "Re-analisis portrait…" : "✓ Feature Chart diperbarui dari Main Portrait"}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div style={s.promptFooter}>
                <span style={s.footNote}>Step {activeStep + 1} / 4</span>
                {activeStep < 3 && (
                  <span style={{ ...s.footNote, marginLeft: 6 }}>
                    — Generate gambar ini dulu, lalu lanjut ke step berikutnya
                  </span>
                )}
                {activeStep === 3 && features && (
                  <span style={{ ...s.footNote, color: C.goldDim, marginLeft: 6 }}>
                    — Feature Chart dikustomisasi dari analisis karakter kamu
                  </span>
                )}
                <div style={{ flex: 1 }} />
                {activeStep > 0 && (
                  <button
                    className="nav-btn"
                    style={s.navBtn}
                    onClick={() => setActiveStep(s => s - 1)}
                  >← Prev</button>
                )}
                {activeStep < 3 && (
                  <button
                    className="nav-btn"
                    style={s.nextBtn}
                    onClick={() => setActiveStep(s => s + 1)}
                  >Next →</button>
                )}
              </div>
            </div>

            {/* Workflow Guide */}
            <div style={s.workflowCard}>
              <div style={{ ...s.sectionLabel, marginBottom: 16 }}>Panduan Alur Kerja</div>
              {[
                { n:"01", t:`Copy prompt Headshots → generate di tool kamu dengan ratio 3:4` },
                { n:"02", t:`Upload hasil headshots → copy prompt Full Body → generate dengan ratio 16:9` },
                { n:"03", t:`Upload hasil headshots + full body → copy prompt Main Portrait → generate 9:16` },
                { n:"04", t:`Upload hasil main portrait → Feature Chart otomatis diperbarui → generate dengan ratio 3:4` },
              ].map(r => (
                <div key={r.n} style={s.workflowRow}>
                  <span style={s.workflowNum}>{r.n}</span>
                  <span style={s.workflowText}>{r.t}</span>
                </div>
              ))}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}