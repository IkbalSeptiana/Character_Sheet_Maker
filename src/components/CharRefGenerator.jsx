import { useState, useRef, useContext } from "react";
import { ApiContext } from "../context/ApiContext";
import { fetchFromLLM } from "../utils/api";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const STEPS = [
  { num: 1, key: "headshots", label: "Headshots", ratio: "3:4", desc: "4×3 Grid" },
  { num: 2, key: "fullbody", label: "Full Body", ratio: "16:9", desc: "5-Panel" },
  { num: 3, key: "portrait", label: "Main Portrait", ratio: "9:16", desc: "Vertical" },
  { num: 4, key: "feature", label: "Feature Chart", ratio: "3:4", desc: "3×2 Grid" }
];

const PANEL_OPTIONS = [
  { value: "eyes", label: "Mata & Bulu Mata" }, { value: "lips", label: "Bibir & Mulut" },
  { value: "nose_cheeks", label: "Hidung & Pipi" }, { value: "hair", label: "Rambut" },
  { value: "hands", label: "Tangan & Kuku" }, { value: "jaw_ear", label: "Rahang & Telinga" },
  { value: "neck", label: "Leher & Bahu" }, { value: "outfit", label: "Detail Pakaian" }
];

// ─── [FIX L2-1] ANALYSIS PROMPT — Split per gender, tidak bias ke kurvy ──────
const getAnalysisPrompt = (gender) => {
  const isFemale = gender === "Wanita";

  const bodyInstructions = isFemale
    ? `For body proportions, describe EXACTLY what you see in the image — do not exaggerate or invent proportions. 
       Use accurate, vivid adjectives that truthfully reflect the actual body in the photo.
       Examples of honest descriptions: "naturally proportioned hourglass with moderate curves", 
       "slim athletic build with lean legs", "full-figured with wide hips and generous bust".
       DO NOT default to extreme or hyperbolic terms unless the image actually shows extreme proportions.`
    : `For body proportions, describe EXACTLY what you see in the image — do not exaggerate or invent proportions.
       Use accurate, vivid adjectives that truthfully reflect the actual male body in the photo.
       Examples of honest descriptions: "lean athletic build with broad shoulders and defined arms",
       "stocky muscular frame with thick neck and wide chest", "slim frame with narrow shoulders and long limbs".
       DO NOT default to extreme or hyperbolic terms unless the image actually shows extreme proportions.`;

  const schema = isFemale
    ? `{
        "eyes_description": "detailed description of iris color, eyelashes, and limbal ring",
        "lips_description": "detailed description of lip shape, color, and surrounding skin features",
        "skin_cheeks_nose": "detailed description of cheek and nose skin texture, freckles, blush, and tone",
        "hair_description": "detailed description of hair texture, color, volume, styling, and cut",
        "hands_description": "detailed description of nail length, shape, color, and skin tone of hands",
        "jaw_ear_description": "detailed description of jawline shape and ear structure",
        "body_type": "honest and accurate description of the overall female figure as seen in the image",
        "bust_chest_volume": "accurate description of bust size, shape, and prominence as seen in the image",
        "waist_definition": "accurate description of waist width and cinching as seen in the image",
        "hip_structure": "accurate description of hip width and shape as seen in the image",
        "leg_and_lower_body": "accurate description of thigh and leg shape as seen in the image",
        "glute_definition": "accurate description of glute shape and projection as seen in the image",
        "overall_silhouette": "honest summary of the full body shape and proportions",
        "body_category": "ONE of: curvy | athletic | slim | petite | plus-size | average — pick the most accurate"
      }`
    : `{
        "eyes_description": "detailed description of iris color, eyelashes, and limbal ring",
        "lips_description": "detailed description of lip shape, color, and surrounding skin features",
        "skin_cheeks_nose": "detailed description of cheek and nose skin texture, facial hair, and tone",
        "hair_description": "detailed description of hair texture, color, volume, styling, and cut",
        "hands_description": "detailed description of nail condition, finger shape, and skin tone of hands",
        "jaw_ear_description": "detailed description of jawline shape, facial hair, and ear structure",
        "body_type": "honest and accurate description of the overall male physique as seen in the image",
        "bust_chest_volume": "accurate description of chest width, pec definition, and upper body mass as seen in the image",
        "waist_definition": "accurate description of waist width, core definition, and midsection as seen in the image",
        "shoulder_width": "accurate description of shoulder width and breadth as seen in the image",
        "hip_structure": "accurate description of hip width and lower torso shape as seen in the image",
        "arm_definition": "accurate description of arm size, muscle definition, and proportions as seen in the image",
        "leg_and_lower_body": "accurate description of leg size, quad/calf development as seen in the image",
        "glute_definition": "accurate description of glute shape and projection as seen in the image",
        "overall_silhouette": "honest summary of the full male physique and proportions",
        "body_category": "ONE of: muscular | athletic | slim | average | stocky | lean — pick the most accurate"
      }`;

  return `You are an expert AI photography prompt engineer. Analyze these images of a ${gender}. Return ONLY a valid JSON object describing the physical traits seen in the images.

CRITICAL RULES:
1. NEVER output null. If a feature is not visible, infer it naturally based on the subject's overall look or leave as an empty string "".
2. Use highly descriptive, expressive, and detailed language for facial features (e.g., "unique hazel-green iris color and prominent dark limbal ring" instead of just "brown").
3. ${bodyInstructions}
4. The "body_category" field is critical — it will be used to generate accurate negative prompts. Be precise.

JSON SCHEMA TO RETURN:
${schema}`;
};

// ─── [FIX L2-2] NEGATIVE PROMPT — Dinamis berdasarkan body_category ──────────
const getNegativePromptFullBody = (f, gender) => {
  const base = "panel gaps, white borders, dividers, text, watermarks, blurry, out of focus, loose clothing, baggy clothes, accessories, distorted anatomy, wrong number of panels";
  const isFemale = gender === "Wanita";
  const category = (f.body_category || "").toLowerCase();

  if (isFemale) {
    const byCategory = {
      "curvy":     "narrow hips, flat glutes, small bust, no cleavage, slim figure, rectangular silhouette, straight body, athletic build, thin legs",
      "athletic":  "exaggerated curves, oversized bust, wide flared hips, massive glutes, hourglass exaggeration, thick thighs, heavy frame",
      "slim":      "wide hips, large bust, thick thighs, heavy frame, exaggerated curves, plus-size proportions, wide silhouette",
      "petite":    "tall frame, long limbs, wide hips, large bust, heavy proportions, oversized features",
      "plus-size": "slim figure, narrow frame, thin legs, flat glutes, small bust, petite proportions",
      "average":   "extreme curves, exaggerated hourglass, massive bust, dramatic hip flare, bodybuilder proportions"
    };
    return `${base}, ${byCategory[category] || "exaggerated proportions, unrealistic anatomy, altered body shape"}`;
  } else {
    const byCategory = {
      "muscular":  "slim build, narrow shoulders, small arms, no muscle definition, feminine curves, lanky frame",
      "athletic":  "oversized muscles, bodybuilder bulk, massive traps, extreme vascularity, feminine curves",
      "slim":      "wide shoulders, bulky muscles, thick neck, heavy frame, bodybuilder proportions",
      "average":   "extreme muscles, bodybuilder proportions, massive arms, shredded abs, feminine curves",
      "stocky":    "lanky frame, long limbs, slim build, no muscle mass, narrow frame",
      "lean":      "bulky frame, heavy muscles, wide hips, thick waist, oversized proportions"
    };
    return `${base}, feminine features, wide hips, bust, cleavage, ${byCategory[category] || "exaggerated proportions, unrealistic anatomy"}`;
  }
};

const getNegativePromptPortrait = (f, gender) => {
  const base = "cropped head, cropped hair, no headroom, tight crop at top of head, cut off top of head, full body, mid-thigh framing, waist up, head and shoulders only, loose clothing, dramatic lighting, busy background, distorted proportions, unrealistic anatomy, hands at sides, hands on hips, arms crossed";
  const isFemale = gender === "Wanita";
  const category = (f.body_category || "").toLowerCase();

  if (isFemale) {
    const bust = {
      "curvy":     "small bust, no cleavage, modest chest, flat chest",
      "athletic":  "oversized bust, extreme cleavage, massive chest, implant look",
      "slim":      "large bust, heavy chest, oversized bust",
      "petite":    "oversized bust, large chest, heavy frame",
      "plus-size": "flat chest, small bust",
      "average":   "extreme bust size, implant look, overly dramatic cleavage"
    };
    return `${base}, ${bust[category] || "altered bust size, unrealistic chest"}`;
  } else {
    return `${base}, feminine features, bust, cleavage, wide hips, soft body, no muscle definition`;
  }
};

// ─── [FIX L2-3] HEADSHOTS — subject_framing diperketat, hapus "medium close-up" ──
const getHeadshotsPrompt = () => {
  return JSON.stringify({
    "reference_image_utilization": {
      "identity_consistency": "Strictly maintain the exact face identity, facial structure, facial features, makeup, and hairstyling from the reference photo across all 12 panels. The subject must be unmistakably the same person in every single image.",
      "character_anchor": "The person in every panel of the grid must be the same person from the uploaded reference image."
    },
    "image_structure": {
      "format": "A single, seamless 4x3 grid collage (4 rows, 3 columns)",
      "total_panels": 12,
      "subject_framing": "All shots are tightly cropped headshots. Frame from the top of the head to just below the chin only. The neck may appear slightly at the very bottom of the frame, but no shoulders, collarbone, or clothing should be visible in any panel. The subject's head must occupy a consistent scale and proportion within each frame, ensuring visual harmony across the grid.",
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
        "accessories": "No jewelry, no distracting elements.",
        "clothing_visibility": "No clothing should be visible in any panel. Crop tightly so only the face, head, and hair appear. Exclude any neckline, collar, or bare shoulder from the frame."
      },
      "panel_descriptions": {
        "row_1": [
          "Tight headshot, full frontal portrait, neutral expression, looking directly at the camera, eye-level. Crop from crown to just below chin.",
          "Tight headshot, perfect 90-degree right profile, neutral expression, showing jawline and nose silhouette. Crop from crown to just below chin.",
          "Tight headshot, perfect 90-degree left profile, neutral expression, showing jawline and nose silhouette. Crop from crown to just below chin."
        ],
        "row_2": [
          "Tight headshot, three-quarter view, head turned 45 degrees to the right, looking off-camera. Crop from crown to just below chin.",
          "Tight headshot, three-quarter view, head turned 45 degrees to the left, looking off-camera. Crop from crown to just below chin.",
          "Tight headshot, slightly angled three-quarter view with a soft, gentle gaze directly at the camera. Crop from crown to just below chin."
        ],
        "row_3": [
          "Tight headshot, low angle shot (worm's eye view), chin tilted slightly upward, neutral expression. Crop from crown to just below chin.",
          "Tight headshot, high angle shot (bird's eye view), looking down at the top of the head and hair parting. Crop from crown to just below chin.",
          "Tight headshot, full frontal portrait, eyes peacefully closed, neutral and relaxed expression. Crop from crown to just below chin."
        ],
        "row_4": [
          "Tight headshot, full frontal portrait, slight subtle closed-mouth smile. Crop from crown to just below chin.",
          "Tight headshot, full frontal portrait, radiant and genuine closed-mouth smile. Crop from crown to just below chin.",
          "Tight headshot, full frontal portrait, genuine open-mouth laugh, looking happy and relaxed. Crop from crown to just below chin."
        ]
      }
    },
    "negative_prompt": "different person, inconsistent identity, distorted features, sketches, painting, illustration, artistic filters, busy background, colored background, hard shadows, jewelry, accessories, white lines, white borders, panel gaps, spacing between panels, divider lines, framed layout, text, watermarks, wrong format, blurry, out of focus, visible clothing, shirt collar, neckline, bare shoulders, décolletage, clothing texture, chest, torso, shoulders, medium close-up"
  }, null, 2);
};

// ─── [FIX L2-4] FULL BODY — outfit & panel_consistency gender-aware, neg prompt dinamis ──
const getFullBodyPrompt = (f, gender) => {
  const isFemale = gender === "Wanita";

  const outfit = isFemale
    ? `Simple fitted tank top and fitted athletic shorts in light grey. The tank top is low-cut and supportive, extremely tight and stretched taut, fitting closely around the ${f.bust_chest_volume}. The shorts are very tight and hugging, stretched taut by the ${f.hip_structure} and ${f.glute_definition}, clearly showing the body's natural shape.`
    : `Simple fitted crewneck t-shirt and fitted athletic shorts in light grey. The t-shirt is extremely tight and stretched taut across the ${f.bust_chest_volume} and ${f.shoulder_width || "broad shoulders"}. The shorts are tight, hugging the ${f.hip_structure} and ${f.leg_and_lower_body} closely.`;

  const fitDesc = isFemale
    ? `Form-fitting throughout, following the subject's natural proportions. Top fitted around bust. Shorts fitted around hips and glutes.`
    : `Form-fitting throughout, stretched across chest and shoulders. Shorts fitted around legs and glutes.`;

  const panelConsistency = isFemale
    ? `These proportions must remain clearly visible and consistent in every single panel. ${f.bust_chest_volume} visible from front, ${f.waist_definition} clearly defined, especially visible in side and back panels with tight shorts.`
    : `These proportions must remain clearly visible and consistent in every single panel. ${f.bust_chest_volume} and ${f.shoulder_width || "shoulder width"} dominant from front, ${f.waist_definition} clear, ${f.glute_definition} visible especially in side and back panels.`;

  return JSON.stringify({
    "generation_priority": {
      "priority_order": [
        "Preserve face identity from the reference image only",
        "Replicate body-shape proportions exactly as described — do not alter, enhance, or reduce any body part",
        "Maintain the 5-panel horizontal collage layout and specific angles",
        "Keep neutral studio styling and lighting"
      ]
    },
    "reference_image_utilization": {
      "identity_consistency": "Strictly maintain the exact face identity, facial structure, facial features, makeup, and hairstyling from the reference image across all 5 panels.",
      "character_anchor": "The subject in every panel must clearly be the same person as the reference image.",
      "reference_scope": "Use the reference image for face identity only.",
      "override_statement": `Render the body with these exact proportions: ${f.body_type}. The body must reflect: ${f.bust_chest_volume}, ${f.waist_definition}, ${f.hip_structure}, and ${f.glute_definition} in every panel.`
    },
    "physique_and_proportions": isFemale ? {
      "body_type": f.body_type,
      "bust_chest_volume": f.bust_chest_volume,
      "waist_definition": f.waist_definition,
      "hip_structure": f.hip_structure,
      "leg_and_lower_body": f.leg_and_lower_body,
      "glute_definition": f.glute_definition,
      "overall_silhouette": f.overall_silhouette,
      "panel_consistency": panelConsistency
    } : {
      "body_type": f.body_type,
      "chest_volume": f.bust_chest_volume,
      "shoulder_width": f.shoulder_width || "broad shoulders proportionate to body type",
      "waist_definition": f.waist_definition,
      "arm_definition": f.arm_definition || "arms proportionate to body type",
      "hip_structure": f.hip_structure,
      "leg_and_lower_body": f.leg_and_lower_body,
      "glute_definition": f.glute_definition,
      "overall_silhouette": f.overall_silhouette,
      "panel_consistency": panelConsistency
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
      "camera_specs": "Shot on a 50mm lens, sharp focus, hyper-realistic proportions",
      "color_profile": "Natural, true-to-life colors, realistic skin textures, slightly desaturated tones. Preserve all natural skin textures, pores, and micro-details. No airbrushing or skin smoothing."
    },
    "wardrobe_and_styling": {
      "outfit": outfit,
      "preferred_colors": ["light grey"],
      "fit": fitDesc,
      "no_accessories": "No jewelry, no distracting elements"
    },
    "panel_descriptions": {
      "panels": isFemale ? [
        `Full body Front View, arms relaxed at sides, neutral expression, ${f.bust_chest_volume} and ${f.waist_definition} clearly visible, wearing fitted light grey tank top and shorts`,
        `Full body 3/4 Front view (turned slightly to the right), ${f.bust_chest_volume} visible, ${f.waist_definition} transitioning into ${f.hip_structure}`,
        `Full body Profile view (90-degree side profile, facing right), chest profile visible, ${f.waist_definition}, ${f.glute_definition} in tight shorts`,
        `Full body 3/4 Back view (turned slightly from the back), ${f.hip_structure} and ${f.glute_definition} prominently visible in tight shorts`,
        `Full body Rear View, arms relaxed naturally, ${f.glute_definition}, ${f.hip_structure}, and ${f.leg_and_lower_body} visible from behind`
      ] : [
        `Full body Front View, arms relaxed at sides or slight lat flare, neutral expression, ${f.bust_chest_volume} and ${f.shoulder_width || "broad shoulders"} filling the frame, wearing fitted light grey t-shirt and shorts`,
        `Full body 3/4 Front view (turned slightly to the right), ${f.bust_chest_volume} and ${f.arm_definition || "arm definition"} visible, ${f.waist_definition} clear`,
        `Full body Profile view (90-degree side profile, facing right), chest projection, ${f.waist_definition}, ${f.glute_definition} visible from the side`,
        `Full body 3/4 Back view (turned slightly from the back), back width, ${f.glute_definition} and ${f.leg_and_lower_body} visible`,
        `Full body Rear View, arms slightly away from body to show back width, ${f.glute_definition} and ${f.leg_and_lower_body} fully visible from behind`
      ]
    },
    "negative_prompt": getNegativePromptFullBody(f, gender)
  }, null, 2);
};

// ─── [FIX L2-5] PORTRAIT — gender-aware, neg prompt dinamis ──────────────────
const getPortraitPrompt = (f, gender) => {
  const isFemale = gender === "Wanita";

  const outfit = isFemale
    ? `Fitted ribbed tank top in light grey. The tank top is a low-cut or supportive fitted style that accurately reflects the ${f.bust_chest_volume} — the fabric fits closely and naturally.`
    : `Fitted crewneck t-shirt in light grey. Form-fitting across the ${f.bust_chest_volume} and ${f.shoulder_width || "broad shoulders"}, with sleeves hugging ${f.arm_definition || "the arms"}.`;

  const fitDesc = isFemale
    ? `Form-fitting on the bust. The top follows the subject's natural silhouette without exaggeration.`
    : `Form-fitting across chest and shoulders. Sleeves fitted around arms.`;

  const poseDesc = isFemale
    ? `Tight close-up portrait, facing the camera directly with a soft neutral expression. Both hands are gently resting on the upper chest, fingers with natural nails spread naturally with palms lightly touching the skin just above the collarbone area. Shoulders relaxed, chest visible and centered, with generous headroom above the head.`
    : `Tight close-up portrait, facing the camera directly with a neutral or confident expression. One hand resting naturally at the collarbone or chest area, fingers relaxed. Shoulders back, chest prominent and centered, with generous headroom above the head.`;

  return JSON.stringify({
    "generation_priority": {
      "priority_order": [
        "Preserve face identity from the reference image only",
        "Replicate upper body proportions exactly as described",
        "Generate balanced upper chest to head framing with headroom",
        "Keep neutral studio styling and lighting"
      ]
    },
    "reference_image_utilization": {
      "identity_consistency": "Strictly maintain the exact face identity, facial structure, facial features, makeup, and hairstyling from the reference image.",
      "character_anchor": "The subject must clearly be the same person as the uploaded reference image.",
      "reference_scope": "Use the reference image for face identity only.",
      "ignore_from_reference": [
        "body shape", "body frame", "body proportions", "bust size", "waist width", "hip width", "shoulder-to-hip ratio", "wardrobe"
      ],
      "override_statement": `Render the upper body to match exactly: ${f.bust_chest_volume}. The clothing fits naturally to this shape.`
    },
    "physique_and_proportions": isFemale ? {
      "body_type": f.body_type,
      "bust_chest_volume": f.bust_chest_volume,
      "waist_definition": f.waist_definition,
      "overall_silhouette": `Upper body matching: ${f.body_type}`
    } : {
      "body_type": f.body_type,
      "chest_volume": f.bust_chest_volume,
      "shoulder_width": f.shoulder_width || "broad shoulders proportionate to body type",
      "arm_definition": f.arm_definition || "arms proportionate to body type",
      "overall_silhouette": `Upper body matching: ${f.body_type}`
    },
    "image_structure": {
      "format": "A single image with balanced upper chest to head framing",
      "subject_framing": "Tight close-up framing from just below the bust / upper chest to the top of the head, with generous headroom (20-30% empty space) above the crown of the head and hair. Do not crop the top of the head or hair. Show the full face, neck, shoulders, and chest area.",
      "background": "Uniform, clean, bright white studio background",
      "orientation": "Vertical",
      "grid_spacing": "Single clean image, no collage"
    },
    "lighting_and_aesthetic": {
      "style": "Neutral studio casting sheet. Unedited, raw photography look.",
      "lighting": "Soft, even, flattering natural daylight. High-key with minimal, soft shadows.",
      "camera_specs": "Shot on an 85mm lens, close-up portrait from upper chest to head, sharp focus on face and chest, hyper-realistic proportions, ensure generous headroom above the head with no cropping at the top of the hair or head",
      "color_profile": "Natural, true-to-life colors, realistic skin textures, slightly desaturated tones. Preserve all natural skin textures, pores, and micro-details. No airbrushing or skin smoothing."
    },
    "wardrobe_and_styling": {
      "outfit": outfit,
      "preferred_colors": ["light grey"],
      "fit": fitDesc
    },
    "pose_description": poseDesc,
    "negative_prompt": getNegativePromptPortrait(f, gender)
  }, null, 2);
};

// ─── [FIX L2-6] FEATURE CHART — jaw_ear gender-aware ─────────────────────────
const buildFeatureChart = (f, panelsConfig, gender) => {
  const isFemale = gender === "Wanita";

  const getPanelText = (type) => {
    switch (type) {
      case "eyes":       return `Extreme macro close-up of the subject's two eyes. Focus on the ${f.eyes_description}. Capture the eyelash details perfectly.`;
      case "lips":       return `Close-up of the lower face, focusing on the ${f.lips_description}. Highlight natural skin texture around the mouth.`;
      case "nose_cheeks":return `Macro photography of the subject's cheek and nose bridge. Focus on the ${f.skin_cheeks_nose}.`;
      case "hair":       return `Extreme macro close-up of the hair. Focus on the ${f.hair_description}.`;
      case "hands":      return `A clean shot of the subject's hand, showing ${f.hands_description}.`;
      case "jaw_ear":    return isFemale
        ? `A macro beauty shot focused on the side of the subject's face, showcasing the ${f.jaw_ear_description}. Her hair is tucked neatly behind her ear to reveal the detail.`
        : `A macro shot focused on the side of the subject's face, showcasing the ${f.jaw_ear_description}. Hair or beard neatly styled to reveal jawline and ear detail.`;
      case "neck":       return `Close-up of the collarbone and neck area, showing natural skin texture and anatomical details.`;
      case "outfit":     return `Macro detail shot of the light grey clothing fabric texture stretching tightly over the body.`;
      default:           return `Extreme macro close-up of the subject's features.`;
    }
  };

  const panelContents = panelsConfig.map(p => {
    let text = getPanelText(p.type);
    if (p.acc && p.acc.trim() !== "") {
      text += ` A specific accessory is clearly visible: ${p.acc.trim()}.`;
    }
    return text;
  });

  const allAccessories = panelsConfig.map(p => p.acc.trim()).filter(acc => acc !== "").join(", ");
  const stylingRestrictions = allAccessories.length > 0
    ? `Only the following accessories are allowed exactly where specified: ${allAccessories}. No other jewelry or accessories.`
    : "No jewelry or accessories allowed.";

  return JSON.stringify({
    "reference_image_utilization": {
      "identity_consistency": `Strictly maintain the exact face identity, skin tone, eye color, ${isFemale ? "makeup, " : ""}and hairstyling from the reference photo for all relevant panels. The hand in the hand panel must match the subject's skin tone.`,
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
      "style": "High-end feature breakdown, model card details.",
      "lighting": "Bright, even, clinical studio lighting with no harsh shadows.",
      "camera_specs": "Shot with a 100mm Macro lens, f/8, extremely high detail and sharpness.",
      "color_profile": "Natural, true-to-life colors, realistic skin textures, slightly desaturated tones. Preserve all natural skin textures, pores, and micro-details. No airbrushing or skin smoothing.",
      "styling_restrictions": {
        "accessories": stylingRestrictions
      },
      "panel_descriptions": {
        "row_1": [
          { "panel": "1A (Top Left)", "content": panelContents[0] },
          { "panel": "1B (Top Right)", "content": panelContents[1] }
        ],
        "row_2": [
          { "panel": "2A (Middle Left)", "content": panelContents[2] },
          { "panel": "2B (Middle Right)", "content": panelContents[3] }
        ],
        "row_3": [
          { "panel": "3A (Bottom Left)", "content": panelContents[4] },
          { "panel": "3B (Bottom Right)", "content": panelContents[5] }
        ]
      }
    },
    "negative_prompt": `text, labels, words, different people, inconsistent identity, blurry, out of focus, bad anatomy, distorted hands, artistic filters, busy background, full body shots, seamless collage, wrong grid format, different grid format, wrong panel description, different eye color${isFemale ? ", no makeup, different hair color" : ", different hair color"}`
  }, null, 2);
};

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export default function CharRefGenerator() {
  const { activeConfig } = useContext(ApiContext);
  const [images, setImages] = useState([]);
  const [gender, setGender] = useState("Wanita");
  const [analyzing, setAnalyzing] = useState(false);
  const [features, setFeatures] = useState(null);
  const [prompts, setPrompts] = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  const [copied, setCopied] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);
  const [panelsConfig, setPanelsConfig] = useState([
    { type: "eyes", acc: "" }, { type: "lips", acc: "" }, { type: "nose_cheeks", acc: "" },
    { type: "hair", acc: "" }, { type: "hands", acc: "" }, { type: "jaw_ear", acc: "" }
  ]);
  const inputRef = useRef(null);

  const handleFiles = (files) => {
    Array.from(files).forEach(file => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = (e) => setImages(prev => [...prev, { url: URL.createObjectURL(file), b64: e.target.result.split(",")[1], type: file.type }]);
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (i) => setImages(prev => prev.filter((_, idx) => idx !== i));
  const updatePanel = (i, field, v) => setPanelsConfig(prev => { const n = [...prev]; n[i][field] = v; return n; });

  const runAnalysis = async () => {
    if (images.length === 0) return setError("Upload minimal 1 gambar referensi.");
    if (!activeConfig || !activeConfig.apiKey) return setError("API Key belum diset. Klik tombol ⚙ di pojok kanan atas.");

    setAnalyzing(true); setError(null);
    try {
      // [FIX L2-1] Gunakan prompt analisis yang sesuai gender
      const analysisPrompt = getAnalysisPrompt(gender);

      const rawRes = await fetchFromLLM(activeConfig, "Analyze these images meticulously.", analysisPrompt, true, images);

      const jsonString = rawRes.replace(/```json\s*/, "").replace(/```\s*$/, "").trim();
      const f = JSON.parse(jsonString);

      setFeatures(f);
      setPrompts({
        headshots: getHeadshotsPrompt(),
        fullbody: getFullBodyPrompt(f, gender),
        portrait: getPortraitPrompt(f, gender),
        feature: buildFeatureChart(f, panelsConfig, gender)  // [FIX L2-6] pass gender
      });
      setActiveStep(0);
    } catch (err) {
      setError(`Analisis gagal: ${err.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCopy = (k, text) => { navigator.clipboard.writeText(text); setCopied(k); setTimeout(() => setCopied(null), 2000); };
  const reset = () => { setImages([]); setFeatures(null); setPrompts(null); setError(null); setActiveStep(0); };

  return (
    <div className="flex-1 pb-15">
      <div className="max-w-225 mx-auto py-10 px-5">
        {!prompts && !analyzing && (
          <div className="flex flex-col gap-6">

            {/* Step 1: Pilih Gender */}
            <div className="bg-(--surface) p-6 rounded-xl border border-(--border)">
              <div className="text-[11px] tracking-[1.5px] uppercase text-(--accent-dim) mb-3">1. Pilih Gender</div>
              <div className="flex gap-4">
                <label className="cursor-pointer flex items-center gap-2">
                  <input type="radio" checked={gender === "Wanita"} onChange={() => setGender("Wanita")} /> Wanita
                </label>
                <label className="cursor-pointer flex items-center gap-2">
                  <input type="radio" checked={gender === "Pria"} onChange={() => setGender("Pria")} /> Pria
                </label>
              </div>
            </div>

            {/* Step 2: Upload Referensi */}
            <div className="bg-(--surface) p-6 rounded-xl border border-(--border)">
              <div className="text-[11px] tracking-[1.5px] uppercase text-(--accent-dim) mb-3">2. Upload Referensi</div>

              {images.length > 0 && (
                <div className="flex gap-3 flex-wrap mb-4">
                  {images.map((img, i) => (
                    <div key={i} className="relative">
                      <img src={img.url} className="w-17.5 h-17.5 object-cover rounded-lg border border-(--border)" alt="ref" />
                      <button onClick={() => removeImage(i)} className="absolute -top-1.5 -right-1.5 bg-(--error) text-(--text-1) border-none rounded-full w-5 h-5 cursor-pointer flex items-center justify-center text-xs">✕</button>
                    </div>
                  ))}
                </div>
              )}

              <div
                className={`border-[1.5px] border-dashed rounded-lg p-10 text-center bg-(--surface) cursor-pointer transition-colors ${isDragging ? 'border-(--accent)' : 'border-(--border-hover)'}`}
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={e => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}
                onClick={() => inputRef.current?.click()}
              >
                <span className="text-2xl">{isDragging ? "📥" : "📸"}</span>
                <div className="text-(--text-1) text-sm mt-3">Tarik gambar ke sini atau klik</div>
                <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
              </div>
            </div>

            {/* Step 3: Feature Chart Settings */}
            <div className="bg-(--surface) p-6 rounded-xl border border-(--border)">
              <div className="text-[11px] tracking-[1.5px] uppercase text-(--accent-dim) mb-3">3. Feature Chart Settings</div>
              <div className="grid grid-cols-2 gap-4">
                {panelsConfig.map((p, i) => (
                  <div key={i} className="bg-(--surface-2) p-3 rounded-lg border border-(--border) flex flex-col gap-2">
                    <div className="text-[11px] text-(--text-3)">Panel {i + 1}</div>
                    <select className="bg-(--surface-2) border border-(--border) text-(--text-1) p-2.5 rounded-md outline-none focus:border-(--accent) text-sm" value={p.type} onChange={e => updatePanel(i, "type", e.target.value)}>
                      {PANEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <input className="bg-(--surface-2) border border-(--border) text-(--text-1) p-2.5 rounded-md outline-none focus:border-(--accent) text-sm" value={p.acc} onChange={e => updatePanel(i, "acc", e.target.value)} placeholder="Aksesoris..." />
                  </div>
                ))}
              </div>
            </div>

            {error && <div className="bg-(--danger-faint) p-4 rounded-lg text-(--error) border border-(--error) text-sm">{error}</div>}

            <button className="bg-(--accent) text-(--bg) p-3.5 rounded-lg font-semibold w-full cursor-pointer border-none hover:bg-(--accent-hover) transition-colors" onClick={runAnalysis}>
              Generate Prompt JSON →
            </button>
          </div>
        )}

        {analyzing && (
          <div className="text-center py-20 px-5">
            <div className="text-2xl text-(--accent-hover) mb-4 animate-pulse">Menganalisis Karakter...</div>
            <div className="text-(--text-2)">Mengekstrak proporsi via {activeConfig?.name}...</div>
          </div>
        )}

        {prompts && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <div className="text-[11px] tracking-[1.5px] uppercase text-(--accent-dim) mb-1">HASIL: {gender.toUpperCase()}</div>
                <div className="text-(--text-1) text-xl font-semibold">{features?.overall_silhouette || "Profile Generated"}</div>
              </div>
              <button onClick={reset} className="bg-transparent border border-(--border-hover) text-(--text-2) px-4 py-2 rounded-md cursor-pointer hover:text-(--text-1) hover:border-(--border) transition-colors">↺ Reset</button>
            </div>

            <div className="flex gap-1 overflow-x-auto border-b border-(--border)">
              {STEPS.map((step, i) => (
                <button
                  key={step.key}
                  onClick={() => setActiveStep(i)}
                  className={`px-6 py-3.5 text-sm font-medium cursor-pointer transition-colors border-b-2 ${activeStep === i ? 'bg-(--surface-2) text-(--accent-hover) border-(--accent-hover)' : 'bg-transparent text-(--text-2) border-transparent hover:text-(--text-1)'}`}
                >
                  {step.label}
                </button>
              ))}
            </div>

            <div className="bg-(--surface-2) rounded-b-xl border border-(--border-hover) border-t-0 overflow-hidden">
              <div className="py-4 px-6 bg-(--surface) border-b border-(--border) flex justify-between items-center">
                <span className="text-(--text-3) text-xs">Ratio: {STEPS[activeStep].ratio}</span>
                <button
                  onClick={() => handleCopy(STEPS[activeStep].key, prompts[STEPS[activeStep].key])}
                  className={`px-3.5 py-1.5 rounded-md cursor-pointer text-xs font-semibold transition-colors ${copied === STEPS[activeStep].key ? 'bg-(--success) text-white' : 'bg-(--accent) text-(--bg) hover:bg-(--accent-hover)'}`}
                >
                  {copied === STEPS[activeStep].key ? "✓ Tersalin" : "Copy JSON"}
                </button>
              </div>
              <div className="p-6 max-h-125 overflow-y-auto">
                <pre className="m-0 text-(--text-2) text-[13px] leading-[1.6] whitespace-pre-wrap font-mono">
                  {prompts[STEPS[activeStep].key]}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}