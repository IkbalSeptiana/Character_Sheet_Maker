import { useState, useRef, useContext } from "react";
import { ApiContext } from "../context/ApiContext";
import { fetchFromLLM } from "../utils/api";

const createEmptyFamily = () => ({
  id: 'fam_' + Date.now(),
  familyInfo: {
    nama_keluarga: "",
    alamat_rumah: "",
    denah_rumah: "",
    status_sosial_ekonomi: "",
    hubungan: { "": "" },
    latar_belakang_keluarga: ""
  },
  members: []
});

const createEmptyMember = (gender) => ({
  id: 'mem_' + Date.now(),
  gender,
  photo: null,
  Informasi_Pribadi: {
    nama_depan: "",
    nama_belakang: "",
    ras: "",
    kebangsaan: "",
    agama: "",
    jenis_kelamin: gender,
    tanggal_lahir: "",
    kegiatan_utama: "",
    aktifitas_harian: ""
  },
  Penampilan_Fisik: {
    rambut: "",
    wajah: "",
    mata: "",
    tinggi_cm: "",
    berat_kg: "",
    postur_tubuh: "",
    penis: gender === "Pria" ? "" : undefined,
    payudara: gender === "Wanita" ? "" : undefined,
    vagina: gender === "Wanita" ? "" : undefined,
    rambut_kemaluan: "",
    riasan: gender === "Wanita" ? "" : undefined,
    aroma_khas: ""
  },
  Psikologi_dan_Sikap: {
    kepribadian_inti: [],
    kebiasaan_tubuh: [],
    gaya_bicara: []
  },
  Latar_Belakang: {
    kesukaan: [],
    ketidaksukaan: [],
    tujuan: [],
    keahlian: [],
    latar_belakang: ""
  },
  hubungan: { "": "" }
});

const SYSTEM_PROMPT = `You are an expert Indonesian character writer specializing in deeply realistic, culturally-grounded family profiles for AI chatbot roleplay. You write with the granularity of a novelist and the precision of an ethnographer.

CRITICAL RULES:
1. Write in Indonesian ONLY.
2. Every field must be EXTREMELY DETAILED — minimum 100-300 words for paragraph fields, 3-5 rich sentences per array item.
3. Use REAL Indonesian locations, addresses, and socioeconomic details. If Bogor is mentioned, use actual streets, neighborhoods, markets (Pasar Anyar, Kedung Badak, Tanah Sareal, Kebon Pedes, Cilendek).
4. Names must be authentic Indonesian (Javanese, Sundanese, Betawi, etc.).
5. Economic details must be SPECIFIC: exact salary ranges in Rupiah, rent prices, specific job titles, real brands (Indomaret, TransPakuan, Gojek, etc.).
6. Religious practices must be nuanced — not just "Islam taat" but HOW they practice (sholat berjamaah di mushola gang, qadha karena shift kerja, etc.).
7. Physical descriptions must be vivid, anatomically detailed, and culturally contextual (skin tone using MAC/NC scale, body measurements, specific textures).
8. Food, smells, daily routines must be hyper-specific to Indonesian working-class or middle-class life.
9. Relationships must be emotionally complex — not just "ayah-anak" but describing the specific emotional texture.
10. The "hubungan" object in each member must reference OTHER family members by their full names.
11. If the user mentions multiple families, generate ALL families in a SINGLE response with "families" array.
12. For "user" role, always use {{user}} as the key reference in hubungan.
13. NEVER use null. Use empty string "" if needed. Return ONLY raw JSON.

OUTPUT STRUCTURE:
{
  "families": [
    {
      "familyInfo": {
        "nama_keluarga": "Authentic Indonesian surname",
        "alamat_rumah": "Realistic address with RT/RW, kelurahan, kecamatan",
        "denah_rumah": "Detailed 200-400 word description of every room, furniture, condition, smells, layout",
        "status_sosial_ekonomi": "Detailed 100+ word financial breakdown with exact Rupiah amounts",
        "hubungan": { "Member1 & Member2": "Relationship description", ... },
        "latar_belakang_keluarga": "Rich 300+ word family history paragraph"
      },
      "members": [
        {
          "nama_depan": "Authentic name",
          "nama_belakang": "Family surname",
          "ras": "Jawa/Sunda/Betawi/etc",
          "kebangsaan": "Indonesia",
          "agama": "Islam — detailed description of practice level",
          "jenis_kelamin": "Pria/Wanita",
          "tanggal_lahir": "DD Month YYYY",
          "kegiatan_utama": "Specific job title with company/institution name",
          "aktifitas_harian": "Detailed 200+ word daily schedule from wake to sleep",
          "Penampilan_Fisik": {
            "rambut": "100+ word detailed description",
            "wajah": "150+ word detailed description with skin tone, bone structure, impressions",
            "mata": "80+ word detailed description",
            "tinggi_cm": integer,
            "berat_kg": integer,
            "postur_tubuh": "200+ word detailed body description with measurements",
            "penis": "(male only) 100+ word detailed description",
            "payudara": "(female only) 100+ word detailed description",
            "vagina": "(female only) 100+ word detailed description",
            "rambut_kemaluan": "Detailed description",
            "riasan": "(female only) Detailed daily makeup routine",
            "aroma_khas": "Signature scent description"
          },
          "Psikologi_dan_Sikap": {
            "kepribadian_inti": ["3-5 detailed personality traits, each a full sentence"],
            "kebiasaan_tubuh": ["3-5 specific physical habits with context"],
            "gaya_bicara": ["3-5 speech patterns with examples"]
          },
          "Latar_Belakang": {
            "kesukaan": ["3-5 specific likes with detail"],
            "ketidaksukaan": ["3-5 specific dislikes with emotional context"],
            "tujuan": ["3-5 realistic goals with specific financial/social targets"],
            "keahlian": ["3-5 specific skills with real-world application"],
            "latar_belakang": "300+ word life story paragraph"
          },
          "hubungan": { "Full Name": "Detailed emotional relationship description", ... }
        }
      ]
    }
  ]
}`;

const PHOTO_ANALYSIS_PROMPT = (gender) => "You are an expert physical character analyst for Indonesian chatbot roleplay. Analyze the uploaded photo and extract detailed physical characteristics.\n\n" +
  "The subject is " + (gender === 'Pria' ? 'a male' : 'a female') + ".\n\n" +
  "Return ONLY a JSON object with these fields. No markdown, no code blocks, no explanation. ONLY raw JSON.\n\n" +
  "{\n" +
  "  \"rambut\": \"Detailed hair description with color, texture, length, style, volume\",\n" +
  "  \"wajah\": \"Detailed face description: shape, skin tone, bone structure, features, impression\",\n" +
  "  \"mata\": \"Detailed eye description: color, shape, size, eyelashes, expression\",\n" +
  "  \"tinggi_cm\": 170,\n" +
  "  \"berat_kg\": 65,\n" +
  "  \"postur_tubuh\": \"Detailed body posture and physique description\",\n" +
  "  \"penis\": \"(male only)\",\n" +
  "  \"payudara\": \"(female only)\",\n" +
  "  \"vagina\": \"(female only)\",\n" +
  "  \"rambut_kemaluan\": \"Description\",\n" +
  "  \"riasan\": \"(female only) Makeup style if visible\",\n" +
  "  \"aroma_khas\": \"Signature scent based on appearance and styling\"\n" +
  "}\n\n" +
  "RULES:\n" +
  "1. Describe EXACTLY what you see. Do not invent.\n" +
  "2. tinggi_cm and berat_kg should be realistic estimates.\n" +
  "3. Use vivid Indonesian language.\n" +
  "4. Return ONLY the JSON.\n" +
  "5. Do NOT use null.\n" +
  "6. Each field must be at least 50 words minimum.";

const handleFileUpload = (file) => new Promise((resolve) => {
  const reader = new FileReader();
  reader.onload = (e) => resolve({
    url: URL.createObjectURL(file),
    b64: e.target.result.split(",")[1],
    type: file.type
  });
  reader.readAsDataURL(file);
});

const downloadJSON = (filename, data) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const toArray = (val) => Array.isArray(val) ? val : (typeof val === 'string' ? val.split(',').map(s => s.trim()).filter(Boolean) : []);

const extractJson = (response) => {
  if (!response) throw new Error("Empty response from AI");

  let text = response.trim();
  // Strip markdown code blocks
  text = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();

  // Find the outermost balanced JSON object by tracking brace depth
  let firstBrace = -1;
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{' && depth === 0) {
      firstBrace = i;
    }
    if (text[i] === '{') depth++;
    if (text[i] === '}') depth--;
    if (firstBrace !== -1 && depth === 0) {
      // Found complete balanced JSON object
      const json = text.substring(firstBrace, i + 1);
      return JSON.parse(json);
    }
  }

  throw new Error("No valid JSON object found in response");
};

export default function CharacterFileGenerator() {
  const { activeConfig } = useContext(ApiContext);
  const [families, setFamilies] = useState([createEmptyFamily()]);
  const [activeFamilyId, setActiveFamilyId] = useState(families[0]?.id);
  const [directives, setDirectives] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzingMember, setAnalyzingMember] = useState(null);
  const [error, setError] = useState(null);
  const [showJsonPreview, setShowJsonPreview] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRefs = useRef({});

  const activeFamily = families.find(f => f.id === activeFamilyId) || families[0];

  const addFamily = () => {
    const newFam = createEmptyFamily();
    setFamilies(prev => [...prev, newFam]);
    setActiveFamilyId(newFam.id);
  };

  const removeFamily = (id) => {
    if (!confirm("Hapus keluarga ini? Semua data akan hilang.")) return;
    setFamilies(prev => {
      const filtered = prev.filter(f => f.id !== id);
      if (filtered.length === 0) {
        const empty = createEmptyFamily();
        setActiveFamilyId(empty.id);
        return [empty];
      }
      if (activeFamilyId === id) setActiveFamilyId(filtered[0].id);
      return filtered;
    });
  };

  const updateFamilyInfo = (field, value) => {
    setFamilies(prev => prev.map(f =>
      f.id === activeFamilyId ? { ...f, familyInfo: { ...f.familyInfo, [field]: value } } : f
    ));
  };

  const addMember = (gender) => {
    const newMember = createEmptyMember(gender);
    setFamilies(prev => prev.map(f =>
      f.id === activeFamilyId ? { ...f, members: [...f.members, newMember] } : f
    ));
  };

  const removeMember = (memberId) => {
    if (!confirm("Hapus anggota keluarga ini?")) return;
    setFamilies(prev => prev.map(f =>
      f.id === activeFamilyId ? { ...f, members: f.members.filter(m => m.id !== memberId) } : f
    ));
  };

  const updateMember = (memberId, section, field, value) => {
    setFamilies(prev => prev.map(f => {
      if (f.id !== activeFamilyId) return f;
      return {
        ...f,
        members: f.members.map(m =>
          m.id === memberId ? { ...m, [section]: { ...m[section], [field]: value } } : m
        )
      };
    }));
  };

  const updateMemberArray = (memberId, section, field, value) => {
    setFamilies(prev => prev.map(f => {
      if (f.id !== activeFamilyId) return f;
      return {
        ...f,
        members: f.members.map(m =>
          m.id === memberId ? { ...m, [section]: { ...m[section], [field]: toArray(value) } } : m
        )
      };
    }));
  };

  const updateMemberPhoto = (memberId, img) => {
    setFamilies(prev => prev.map(f => {
      if (f.id !== activeFamilyId) return f;
      return {
        ...f,
        members: f.members.map(m => m.id === memberId ? { ...m, photo: img } : m)
      };
    }));
  };

  const updateMemberHubungan = (memberId, oldKey, newKey, value) => {
    setFamilies(prev => prev.map(f => {
      if (f.id !== activeFamilyId) return f;
      return {
        ...f,
        members: f.members.map(m => {
          if (m.id !== memberId) return m;
          const newHub = { ...m.hubungan };
          delete newHub[oldKey];
          newHub[newKey] = value;
          return { ...m, hubungan: newHub };
        })
      };
    }));
  };

  const addHubunganEntry = (memberId) => {
    setFamilies(prev => prev.map(f => {
      if (f.id !== activeFamilyId) return f;
      return {
        ...f,
        members: f.members.map(m =>
          m.id === memberId ? { ...m, hubungan: { ...m.hubungan, "": "" } } : m
        )
      };
    }));
  };

  const updateFamilyHubungan = (oldKey, newKey, value) => {
    setFamilies(prev => prev.map(f => {
      if (f.id !== activeFamilyId) return f;
      const newHub = { ...f.familyInfo.hubungan };
      delete newHub[oldKey];
      newHub[newKey] = value;
      return { ...f, familyInfo: { ...f.familyInfo, hubungan: newHub } };
    }));
  };

  const addFamilyHubunganEntry = () => {
    setFamilies(prev => prev.map(f =>
      f.id === activeFamilyId ? { ...f, familyInfo: { ...f.familyInfo, hubungan: { ...f.familyInfo.hubungan, "": "" } } } : f
    ));
  };

  const brainstormFamily = async () => {
    if (!activeConfig || !activeConfig.apiKey) {
      setError("API Key belum diset. Klik tombol Setup API di pojok kanan atas.");
      return;
    }
    setAnalyzing(true);
    setError(null);
    try {
      const userMsg = directives || "Create a realistic Indonesian family with diverse, interesting personalities.";
      const response = await fetchFromLLM(
        activeConfig,
        userMsg,
        SYSTEM_PROMPT,
        true,
        [],
        16384
      );
      const data = extractJson(response);
      
      const incomingFamilies = data.families || [data];
      
      const newFamilies = incomingFamilies.map((famData, idx) => {
        const newFam = createEmptyFamily();
        newFam.familyInfo = famData.familyInfo || {
          nama_keluarga: "Keluarga " + (idx + 1),
          alamat_rumah: "",
          denah_rumah: "",
          status_sosial_ekonomi: "",
          hubungan: { "": "" },
          latar_belakang_keluarga: ""
        };
        newFam.members = (famData.members || []).map(m => {
          const gender = m.jenis_kelamin || "Pria";
          const base = createEmptyMember(gender);
          return {
            ...base,
            id: 'mem_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            Informasi_Pribadi: {
              ...base.Informasi_Pribadi,
              nama_depan: m.nama_depan || "",
              nama_belakang: m.nama_belakang || "",
              ras: m.ras || "",
              kebangsaan: m.kebangsaan || "",
              agama: m.agama || "",
              jenis_kelamin: gender,
              tanggal_lahir: m.tanggal_lahir || "",
              kegiatan_utama: m.kegiatan_utama || "",
              aktifitas_harian: m.aktifitas_harian || ""
            },
            Penampilan_Fisik: {
              ...base.Penampilan_Fisik,
              ...(m.Penampilan_Fisik || {})
            },
            Psikologi_dan_Sikap: {
              kepribadian_inti: toArray(m.Psikologi_dan_Sikap?.kepribadian_inti),
              kebiasaan_tubuh: toArray(m.Psikologi_dan_Sikap?.kebiasaan_tubuh),
              gaya_bicara: toArray(m.Psikologi_dan_Sikap?.gaya_bicara)
            },
            Latar_Belakang: {
              kesukaan: toArray(m.Latar_Belakang?.kesukaan),
              ketidaksukaan: toArray(m.Latar_Belakang?.ketidaksukaan),
              tujuan: toArray(m.Latar_Belakang?.tujuan),
              keahlian: toArray(m.Latar_Belakang?.keahlian),
              latar_belakang: m.Latar_Belakang?.latar_belakang || ""
            },
            hubungan: m.hubungan || { "": "" }
          };
        });
        return newFam;
      });

      setFamilies(prev => {
        const filtered = prev.filter(f => f.id !== activeFamilyId);
        return [...filtered, ...newFamilies];
      });
      setActiveFamilyId(newFamilies[0]?.id);
    } catch (err) {
      setError("Brainstorm gagal: " + err.message);
      console.error("Brainstorm error:", err);
    } finally {
      setAnalyzing(false);
    }
  };

  const analyzePhoto = async (member) => {
    if (!member.photo?.b64) {
      setError("Upload foto dulu sebelum analisis.");
      return;
    }
    if (!activeConfig || !activeConfig.apiKey) {
      setError("API Key belum diset.");
      return;
    }
    setAnalyzingMember(member.id);
    setError(null);
    try {
      const response = await fetchFromLLM(
        activeConfig,
        "Analyze this photo for physical character traits.",
        PHOTO_ANALYSIS_PROMPT(member.gender),
        true,
        [member.photo]
      );
      const data = extractJson(response);
      setFamilies(prev => prev.map(f => {
        if (f.id !== activeFamilyId) return f;
        return {
          ...f,
          members: f.members.map(m => {
            if (m.id !== member.id) return m;
            return {
              ...m,
              Penampilan_Fisik: {
                ...m.Penampilan_Fisik,
                rambut: data.rambut || m.Penampilan_Fisik.rambut,
                wajah: data.wajah || m.Penampilan_Fisik.wajah,
                mata: data.mata || m.Penampilan_Fisik.mata,
                tinggi_cm: data.tinggi_cm || m.Penampilan_Fisik.tinggi_cm,
                berat_kg: data.berat_kg || m.Penampilan_Fisik.berat_kg,
                postur_tubuh: data.postur_tubuh || m.Penampilan_Fisik.postur_tubuh,
                penis: m.gender === "Pria" ? (data.penis || m.Penampilan_Fisik.penis) : undefined,
                payudara: m.gender === "Wanita" ? (data.payudara || m.Penampilan_Fisik.payudara) : undefined,
                vagina: m.gender === "Wanita" ? (data.vagina || m.Penampilan_Fisik.vagina) : undefined,
                rambut_kemaluan: data.rambut_kemaluan || m.Penampilan_Fisik.rambut_kemaluan,
                riasan: m.gender === "Wanita" ? (data.riasan || m.Penampilan_Fisik.riasan) : undefined,
                aroma_khas: data.aroma_khas || m.Penampilan_Fisik.aroma_khas
              }
            };
          })
        };
      }));
    } catch (err) {
      setError("Analisis foto gagal: " + err.message);
      console.error("Photo analysis error:", err);
    } finally {
      setAnalyzingMember(null);
    }
  };

  const generateJSON = () => {
    const result = {
      Informasi_Keluarga: {
        nama_keluarga: activeFamily.familyInfo.nama_keluarga,
        alamat_rumah: activeFamily.familyInfo.alamat_rumah,
        denah_rumah: activeFamily.familyInfo.denah_rumah,
        status_sosial_ekonomi: activeFamily.familyInfo.status_sosial_ekonomi,
        hubungan: activeFamily.familyInfo.hubungan,
        latar_belakang_keluarga: activeFamily.familyInfo.latar_belakang_keluarga
      }
    };
    activeFamily.members.forEach(m => {
      const fullName = (m.Informasi_Pribadi.nama_depan + " " + m.Informasi_Pribadi.nama_belakang).trim() || "Unnamed";
      const key = fullName;
      const physical = {};
      Object.entries(m.Penampilan_Fisik).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") physical[k] = v;
      });
      result[key] = {
        Informasi_Pribadi: m.Informasi_Pribadi,
        Penampilan_Fisik: physical,
        Psikologi_dan_Sikap: m.Psikologi_dan_Sikap,
        Latar_Belakang: m.Latar_Belakang,
        hubungan: m.hubungan
      };
    });
    return result;
  };

  const downloadFamily = () => {
    const filename = (activeFamily.familyInfo.nama_keluarga || "Keluarga").replace(/\s+/g, "_") + ".json";
    downloadJSON(filename, generateJSON());
  };

  const downloadAllFamilies = () => {
    const allData = families.map(f => {
      const result = {
        Informasi_Keluarga: {
          nama_keluarga: f.familyInfo.nama_keluarga,
          alamat_rumah: f.familyInfo.alamat_rumah,
          denah_rumah: f.familyInfo.denah_rumah,
          status_sosial_ekonomi: f.familyInfo.status_sosial_ekonomi,
          hubungan: f.familyInfo.hubungan,
          latar_belakang_keluarga: f.familyInfo.latar_belakang_keluarga
        }
      };
      f.members.forEach(m => {
        const fullName = (m.Informasi_Pribadi.nama_depan + " " + m.Informasi_Pribadi.nama_belakang).trim() || "Unnamed";
        const physical = {};
        Object.entries(m.Penampilan_Fisik).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== "") physical[k] = v;
        });
        result[fullName] = {
          Informasi_Pribadi: m.Informasi_Pribadi,
          Penampilan_Fisik: physical,
          Psikologi_dan_Sikap: m.Psikologi_dan_Sikap,
          Latar_Belakang: m.Latar_Belakang,
          hubungan: m.hubungan
        };
      });
      return result;
    });
    downloadJSON("All_Families.json", allData.length === 1 ? allData[0] : allData);
  };

  const renderInput = (label, value, onChange, type = "text", placeholder = "") => (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] text-(--text-3) uppercase tracking-wider font-semibold">{label}</label>
      {type === "textarea" ? (
        <textarea
          className="bg-(--surface-2) border border-(--border) text-(--text-1) p-3 rounded-lg text-sm outline-none focus:border-(--accent) transition-colors resize-none h-20"
          value={value || ""}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <input
          type={type}
          className="bg-(--surface-2) border border-(--border) text-(--text-1) p-3 rounded-lg text-sm outline-none focus:border-(--accent) transition-colors"
          value={value || ""}
          onChange={e => onChange(type === "number" ? parseInt(e.target.value) || "" : e.target.value)}
          placeholder={placeholder}
        />
      )}
    </div>
  );

  const renderArrayInput = (label, value, onChange) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] text-(--text-3) uppercase tracking-wider font-semibold">{label}</label>
      <textarea
        className="bg-(--surface-2) border border-(--border) text-(--text-1) p-3 rounded-lg text-sm outline-none focus:border-(--accent) transition-colors resize-none h-16"
        value={Array.isArray(value) ? value.join(", ") : value}
        onChange={e => onChange(e.target.value)}
        placeholder="Pisahkan dengan koma"
      />
    </div>
  );

  return (
    <div className="flex-1 pb-15">
      <div className="max-w-300 mx-auto py-10 px-5">

        <div className="mb-6">
          <div className="flex justify-between items-end mb-4">
            <div>
              <div className="text-[11px] tracking-[1.5px] uppercase text-(--accent-dim) mb-1">Character File Generator</div>
              <div className="text-(--text-1) text-xl font-semibold">Chatbot Roleplay Character Sheets</div>
            </div>
            <button onClick={addFamily} className="bg-(--accent) text-(--bg) px-5 py-2.5 rounded-lg font-semibold text-sm cursor-pointer border-none hover:bg-(--accent-hover) transition-colors">
              + Tambah Keluarga
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {families.map((f, i) => (
              <div key={f.id} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg cursor-pointer border transition-colors min-w-fit ${
                f.id === activeFamilyId ? 'bg-(--surface-2) border-(--accent) text-(--text-1)' : 'bg-(--surface) border-(--border) text-(--text-2) hover:border-(--border-hover)'
              }`}>
                <span onClick={() => setActiveFamilyId(f.id)} className="font-medium text-sm">
                  {f.familyInfo.nama_keluarga || "Keluarga " + (i + 1)}
                </span>
                {families.length > 1 && (
                  <button onClick={() => removeFamily(f.id)} className="text-(--text-3) hover:text-(--error) text-xs leading-none bg-transparent border-none cursor-pointer">x</button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-(--surface) p-6 rounded-xl border border-(--border) mb-6">
          <div className="text-[11px] tracking-[1.5px] uppercase text-(--accent-dim) mb-3 font-semibold">Brainstorm Keluarga</div>
          <textarea
            className="w-full h-32 resize-none p-4 bg-(--surface-2) border border-(--border) rounded-lg text-(--text-1) text-sm outline-none focus:border-(--accent) transition-colors mb-3"
            value={directives}
            onChange={e => setDirectives(e.target.value)}
            placeholder={"Contoh format:\n\nkeluarga 1 kelas menengah di bogor tanah sareal\nayah 42 tahun, ibu 39 tahun (mantan model muslimah), anak pertama 20 tahun\nuser (nama depan ikbal, 17 tahun, punya crypto 2jt usdt)\n\nkeluarga 2 menengah dekat keluarga 1\nadik ibu 36 tahun, suami 39 tahun, anak 16 & 13 tahun\n\nkeluarga 3 kelas atas dekat keluarga 1\nadik ayah 39 tahun, suami 42 tahun, anak 18 & 16 tahun"}
          />
          <div className="flex gap-3 flex-wrap">
            <button onClick={brainstormFamily} disabled={analyzing} className="bg-(--text-1) text-(--bg) px-6 py-3 rounded-lg font-semibold cursor-pointer border-none hover:opacity-90 transition-opacity text-sm disabled:opacity-50">
              {analyzing ? "Memproses..." : "Brainstorm dengan AI"}
            </button>
            <button onClick={() => setShowJsonPreview(!showJsonPreview)} className="bg-transparent border border-(--border-hover) text-(--text-2) px-5 py-3 rounded-lg cursor-pointer text-sm hover:text-(--text-1) hover:border-(--border) transition-colors">
              {showJsonPreview ? "Sembunyikan Preview" : "Preview JSON"}
            </button>
            <button onClick={downloadFamily} className="bg-(--accent) text-(--bg) px-5 py-3 rounded-lg font-semibold cursor-pointer border-none hover:bg-(--accent-hover) transition-colors text-sm">
              Download JSON
            </button>
            {families.length > 1 && (
              <button onClick={downloadAllFamilies} className="bg-(--surface-2) border border-(--border) text-(--text-1) px-5 py-3 rounded-lg cursor-pointer text-sm hover:border-(--accent) transition-colors">
                Download Semua
              </button>
            )}
          </div>
        </div>

        {error && <div className="bg-(--danger-faint) p-4 rounded-lg text-(--error) border border-(--error) text-sm mb-6">{error}</div>}

        <div className="bg-(--surface) p-6 rounded-xl border border-(--border) mb-6">
          <div className="text-[11px] tracking-[1.5px] uppercase text-(--accent-dim) mb-4 font-semibold">Informasi Keluarga</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderInput("Nama Keluarga", activeFamily.familyInfo.nama_keluarga, v => updateFamilyInfo("nama_keluarga", v), "text", "Keluarga Hartono")}
            {renderInput("Alamat Rumah", activeFamily.familyInfo.alamat_rumah, v => updateFamilyInfo("alamat_rumah", v), "text", "Jl. Kedung Badak IV No. 23, Kel. Kedung Badak, Kec. Tanah Sareal, Kota Bogor 16164")}
            {renderInput("Denah Rumah", activeFamily.familyInfo.denah_rumah, v => updateFamilyInfo("denah_rumah", v), "textarea", "Rumah tipe 36/72 satu lantai...")}
            {renderInput("Status Sosial Ekonomi", activeFamily.familyInfo.status_sosial_ekonomi, v => updateFamilyInfo("status_sosial_ekonomi", v), "textarea", "Menengah ke bawah. Penghasilan gabungan Rp 4-6 juta/bulan...")}
            {renderInput("Latar Belakang Keluarga", activeFamily.familyInfo.latar_belakang_keluarga, v => updateFamilyInfo("latar_belakang_keluarga", v), "textarea", "Keluarga berakar dari...")}
          </div>
          <div className="mt-4">
            <div className="text-[11px] text-(--text-3) uppercase tracking-wider font-semibold mb-2">Hubungan Keluarga</div>
            <div className="flex flex-col gap-2">
              {Object.entries(activeFamily.familyInfo.hubungan).map(([key, val], i) => (
                <div key={i} className="flex gap-2">
                  <input className="bg-(--surface-2) border border-(--border) text-(--text-1) p-2.5 rounded-lg text-sm outline-none focus:border-(--accent) flex-1" value={key} onChange={e => updateFamilyHubungan(key, e.target.value, val)} placeholder="Peran" />
                  <input className="bg-(--surface-2) border border-(--border) text-(--text-1) p-2.5 rounded-lg text-sm outline-none focus:border-(--accent) flex-1" value={val} onChange={e => updateFamilyHubungan(key, key, e.target.value)} placeholder="Hubungan" />
                  <button onClick={() => {
                    const newHub = { ...activeFamily.familyInfo.hubungan };
                    delete newHub[key];
                    setFamilies(prev => prev.map(f => f.id === activeFamilyId ? { ...f, familyInfo: { ...f.familyInfo, hubungan: newHub } } : f));
                  }} className="text-(--error) bg-transparent border-none cursor-pointer text-sm hover:underline">Hapus</button>
                </div>
              ))}
              <button onClick={addFamilyHubunganEntry} className="bg-transparent border border-dashed border-(--border-hover) text-(--text-2) px-4 py-2 rounded-lg cursor-pointer text-sm hover:text-(--text-1) hover:border-(--border) transition-colors w-fit">+ Tambah Hubungan</button>
            </div>
          </div>
        </div>

        <div className="mb-4 flex justify-between items-center">
          <div className="text-[11px] tracking-[1.5px] uppercase text-(--accent-dim) font-semibold">Anggota Keluarga</div>
          <div className="flex gap-2">
            <button onClick={() => addMember("Pria")} className="bg-(--surface-2) border border-(--border) text-(--text-1) px-4 py-2 rounded-lg cursor-pointer text-sm hover:border-(--accent) transition-colors">+ Tambah Pria</button>
            <button onClick={() => addMember("Wanita")} className="bg-(--surface-2) border border-(--border) text-(--text-1) px-4 py-2 rounded-lg cursor-pointer text-sm hover:border-(--accent) transition-colors">+ Tambah Wanita</button>
          </div>
        </div>

        {activeFamily.members.length === 0 && (
          <div className="bg-(--surface) p-8 rounded-xl border border-(--border) text-center text-(--text-3) text-sm">
            Belum ada anggota keluarga. Klik "Tambah Pria" atau "Tambah Wanita" atau gunakan "Brainstorm dengan AI".
          </div>
        )}

        <div className="flex flex-col gap-6">
          {activeFamily.members.map((member, idx) => (
            <div key={member.id} className="bg-(--surface) p-6 rounded-xl border border-(--border)">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${member.gender === "Pria" ? "bg-blue-900/40 text-blue-300" : "bg-pink-900/40 text-pink-300"}`}>
                    {member.gender === "Pria" ? "M" : "F"}
                  </div>
                  <div>
                    <div className="font-semibold text-(--text-1) text-sm">
                      {member.Informasi_Pribadi.nama_depan || "Anggota " + (idx + 1)}
                      {member.Informasi_Pribadi.nama_belakang ? " " + member.Informasi_Pribadi.nama_belakang : ""}
                    </div>
                    <div className="text-(--text-3) text-xs">{member.gender}</div>
                  </div>
                </div>
                <button onClick={() => removeMember(member.id)} className="text-(--error) bg-transparent border border-(--danger-faint) px-3 py-1.5 rounded-md cursor-pointer text-xs hover:bg-(--danger-faint) transition-colors">Hapus Anggota</button>
              </div>

              <div className="mb-4 p-4 bg-(--surface-2) rounded-lg border border-(--border)">
                <div className="flex items-center gap-4 flex-wrap">
                  {member.photo ? (
                    <div className="relative">
                      <img src={member.photo.url} className="w-16 h-16 object-cover rounded-lg border border-(--border)" alt="member" />
                      <button onClick={() => updateMemberPhoto(member.id, null)} className="absolute -top-1.5 -right-1.5 bg-(--error) text-white border-none rounded-full w-5 h-5 cursor-pointer flex items-center justify-center text-xs">x</button>
                    </div>
                  ) : (
                    <div
                      className={`w-16 h-16 border-[1.5px] border-dashed rounded-lg flex items-center justify-center cursor-pointer transition-colors ${isDragging ? 'border-(--accent) bg-(--accent-faint)' : 'border-(--border-hover)'}`}
                      onClick={() => fileInputRefs.current[member.id]?.click()}
                      onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={e => {
                        e.preventDefault();
                        setIsDragging(false);
                        const file = e.dataTransfer.files[0];
                        if (file && file.type.startsWith("image/")) handleFileUpload(file).then(img => updateMemberPhoto(member.id, img));
                      }}
                    >
                      <span className="text-(--text-3) text-xl">+</span>
                    </div>
                  )}
                  <input ref={el => fileInputRefs.current[member.id] = el} type="file" accept="image/*" className="hidden" onChange={e => { const file = e.target.files[0]; if (file) handleFileUpload(file).then(img => updateMemberPhoto(member.id, img)); }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-(--text-1) mb-1">Upload Foto Referensi</div>
                    <div className="text-xs text-(--text-3)">Drag foto atau klik untuk upload. AI akan analisis detail fisik.</div>
                  </div>
                  <button onClick={() => analyzePhoto(member)} disabled={analyzingMember === member.id || !member.photo} className="bg-(--accent) text-(--bg) px-4 py-2 rounded-lg font-semibold cursor-pointer border-none text-xs hover:bg-(--accent-hover) transition-colors disabled:opacity-40">
                    {analyzingMember === member.id ? "Menganalisis..." : "Analisis Foto"}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <div className="text-[11px] text-(--accent) uppercase tracking-wider font-semibold mb-2">Informasi Pribadi</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {renderInput("Nama Depan", member.Informasi_Pribadi.nama_depan, v => updateMember(member.id, "Informasi_Pribadi", "nama_depan", v))}
                    {renderInput("Nama Belakang", member.Informasi_Pribadi.nama_belakang, v => updateMember(member.id, "Informasi_Pribadi", "nama_belakang", v))}
                    {renderInput("Ras", member.Informasi_Pribadi.ras, v => updateMember(member.id, "Informasi_Pribadi", "ras", v))}
                    {renderInput("Kebangsaan", member.Informasi_Pribadi.kebangsaan, v => updateMember(member.id, "Informasi_Pribadi", "kebangsaan", v))}
                    {renderInput("Agama", member.Informasi_Pribadi.agama, v => updateMember(member.id, "Informasi_Pribadi", "agama", v))}
                    {renderInput("Tanggal Lahir", member.Informasi_Pribadi.tanggal_lahir, v => updateMember(member.id, "Informasi_Pribadi", "tanggal_lahir", v), "text", "10 Januari 1990")}
                    {renderInput("Kegiatan Utama", member.Informasi_Pribadi.kegiatan_utama, v => updateMember(member.id, "Informasi_Pribadi", "kegiatan_utama", v))}
                    {renderInput("Aktivitas Harian", member.Informasi_Pribadi.aktifitas_harian, v => updateMember(member.id, "Informasi_Pribadi", "aktifitas_harian", v), "textarea")}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-(--accent) uppercase tracking-wider font-semibold mb-2">Penampilan Fisik</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {renderInput("Rambut", member.Penampilan_Fisik.rambut, v => updateMember(member.id, "Penampilan_Fisik", "rambut", v), "textarea")}
                    {renderInput("Wajah", member.Penampilan_Fisik.wajah, v => updateMember(member.id, "Penampilan_Fisik", "wajah", v), "textarea")}
                    {renderInput("Mata", member.Penampilan_Fisik.mata, v => updateMember(member.id, "Penampilan_Fisik", "mata", v), "textarea")}
                    {renderInput("Tinggi (cm)", member.Penampilan_Fisik.tinggi_cm, v => updateMember(member.id, "Penampilan_Fisik", "tinggi_cm", v), "number")}
                    {renderInput("Berat (kg)", member.Penampilan_Fisik.berat_kg, v => updateMember(member.id, "Penampilan_Fisik", "berat_kg", v), "number")}
                    {renderInput("Postur Tubuh", member.Penampilan_Fisik.postur_tubuh, v => updateMember(member.id, "Penampilan_Fisik", "postur_tubuh", v), "textarea")}
                    {member.gender === "Pria" && renderInput("Penis", member.Penampilan_Fisik.penis, v => updateMember(member.id, "Penampilan_Fisik", "penis", v), "textarea")}
                    {member.gender === "Wanita" && renderInput("Payudara", member.Penampilan_Fisik.payudara, v => updateMember(member.id, "Penampilan_Fisik", "payudara", v), "textarea")}
                    {member.gender === "Wanita" && renderInput("Vagina", member.Penampilan_Fisik.vagina, v => updateMember(member.id, "Penampilan_Fisik", "vagina", v), "textarea")}
                    {renderInput("Rambut Kemaluan", member.Penampilan_Fisik.rambut_kemaluan, v => updateMember(member.id, "Penampilan_Fisik", "rambut_kemaluan", v), "textarea")}
                    {member.gender === "Wanita" && renderInput("Riasan", member.Penampilan_Fisik.riasan, v => updateMember(member.id, "Penampilan_Fisik", "riasan", v), "textarea")}
                    {renderInput("Aroma Khas", member.Penampilan_Fisik.aroma_khas, v => updateMember(member.id, "Penampilan_Fisik", "aroma_khas", v), "textarea")}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-(--accent) uppercase tracking-wider font-semibold mb-2">Psikologi & Sikap</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {renderArrayInput("Kepribadian Inti", member.Psikologi_dan_Sikap.kepribadian_inti, v => updateMemberArray(member.id, "Psikologi_dan_Sikap", "kepribadian_inti", v))}
                    {renderArrayInput("Kebiasaan Tubuh", member.Psikologi_dan_Sikap.kebiasaan_tubuh, v => updateMemberArray(member.id, "Psikologi_dan_Sikap", "kebiasaan_tubuh", v))}
                    {renderArrayInput("Gaya Bicara", member.Psikologi_dan_Sikap.gaya_bicara, v => updateMemberArray(member.id, "Psikologi_dan_Sikap", "gaya_bicara", v))}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-(--accent) uppercase tracking-wider font-semibold mb-2">Latar Belakang</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {renderArrayInput("Kesukaan", member.Latar_Belakang.kesukaan, v => updateMemberArray(member.id, "Latar_Belakang", "kesukaan", v))}
                    {renderArrayInput("Ketidaksukaan", member.Latar_Belakang.ketidaksukaan, v => updateMemberArray(member.id, "Latar_Belakang", "ketidaksukaan", v))}
                    {renderArrayInput("Tujuan", member.Latar_Belakang.tujuan, v => updateMemberArray(member.id, "Latar_Belakang", "tujuan", v))}
                    {renderArrayInput("Keahlian", member.Latar_Belakang.keahlian, v => updateMemberArray(member.id, "Latar_Belakang", "keahlian", v))}
                    {renderInput("Latar Belakang", member.Latar_Belakang.latar_belakang, v => updateMember(member.id, "Latar_Belakang", "latar_belakang", v), "textarea")}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-(--text-3) uppercase tracking-wider font-semibold mb-2">Hubungan</div>
                  <div className="flex flex-col gap-2">
                    {Object.entries(member.hubungan).map(([key, val], i) => (
                      <div key={i} className="flex gap-2">
                        <input className="bg-(--surface-2) border border-(--border) text-(--text-1) p-2.5 rounded-lg text-sm outline-none focus:border-(--accent) flex-1" value={key} onChange={e => updateMemberHubungan(member.id, key, e.target.value, val)} placeholder="Peran" />
                        <input className="bg-(--surface-2) border border-(--border) text-(--text-1) p-2.5 rounded-lg text-sm outline-none focus:border-(--accent) flex-1" value={val} onChange={e => updateMemberHubungan(member.id, key, key, e.target.value)} placeholder="Hubungan" />
                        <button onClick={() => {
                          const newHub = { ...member.hubungan };
                          delete newHub[key];
                          setFamilies(prev => prev.map(f => {
                            if (f.id !== activeFamilyId) return f;
                            return { ...f, members: f.members.map(m => m.id === member.id ? { ...m, hubungan: newHub } : m) };
                          }));
                        }} className="text-(--error) bg-transparent border-none cursor-pointer text-sm hover:underline">Hapus</button>
                      </div>
                    ))}
                    <button onClick={() => addHubunganEntry(member.id)} className="bg-transparent border border-dashed border-(--border-hover) text-(--text-2) px-4 py-2 rounded-lg cursor-pointer text-sm hover:text-(--text-1) hover:border-(--border) transition-colors w-fit">+ Tambah Hubungan</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {showJsonPreview && (
          <div className="fixed inset-0 bg-black/85 flex justify-center items-center z-9999 backdrop-blur-sm" onClick={() => setShowJsonPreview(false)}>
            <div className="bg-(--surface) border border-(--border) rounded-xl w-200 max-w-[95vw] max-h-[85vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="p-5 border-b border-(--border) flex justify-between items-center">
                <h3 className="m-0 text-lg font-semibold">JSON Preview - {activeFamily.familyInfo.nama_keluarga || "Keluarga"}</h3>
                <button className="bg-transparent border-none text-(--text-2) cursor-pointer text-lg" onClick={() => setShowJsonPreview(false)}>x</button>
              </div>
              <div className="p-5 overflow-y-auto flex-1">
                <pre className="m-0 text-(--text-2) text-[12px] leading-relaxed whitespace-pre-wrap font-mono">
                  {JSON.stringify(generateJSON(), null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
