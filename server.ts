import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// High payload limits for audio/image files in base64
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ limit: '60mb', extended: true }));

// Server-side Gemini client
const getAi = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the environment.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// Health endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// 1. Text & Story Translation Endpoint
app.post('/api/translate', async (req: Request, res: Response) => {
  try {
    const { text, sourceLang = 'Auto', targetLang = 'Khmer', tone = 'Natural' } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid text parameter.' });
    }

    const ai = getAi();
    const systemPrompt = `You are a professional multilingual translator and cultural localizer specializing in ${targetLang}.
Translate the provided text accurately, capturing idioms, nuance, tone, and context.
Preserve paragraph structures and formatting.
Tone requested: ${tone}.
Target Language: ${targetLang} (If Khmer, use natural, modern, standard Khmer grammar and vocabulary).
Source Language: ${sourceLang}.
Output ONLY the translated text without conversational preamble or meta notes.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: text,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.3,
      },
    });

    return res.json({
      translatedText: response.text?.trim() || '',
      sourceLang,
      targetLang,
    });
  } catch (error: any) {
    console.error('Translation error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to translate.' });
  }
});

// 2. Movie Recap / Story Explainer (សម្រាយរឿង) Endpoint
app.post('/api/story-recap', async (req: Request, res: Response) => {
  try {
    const { plotText, genre = 'Suspense & Action', style = 'Viral TikTok/Facebook Movie Recap', language = 'Khmer' } = req.body;
    if (!plotText || typeof plotText !== 'string') {
      return res.status(400).json({ error: 'Missing plot text.' });
    }

    const ai = getAi();
    const systemPrompt = `You are an elite movie explainer and story recapper (អ្នកសម្រាយរឿងកុនអាជីព).
Transform the provided script, plot summary, or subtitle text into a captivating, engaging, hook-driven movie narration script in ${language}.

Style: ${style} (e.g., thrilling narrator voice, exciting hook in first 5 seconds, seamless transitions, cliffhangers, emotional beats).
Genre: ${genre}.
Structure:
1. Hook & Introduction (ទាក់ទាញអារម្មណ៍)
2. Plot Breakdown with Key Turning Points (សាច់រឿងលម្អិត & ឈុតសំខាន់ៗ)
3. Climax & Resolution (ឈុតកាត់សេចក្តី & បញ្ចប់)
4. Meaningful takeaway / moral lesson (សារអប់រំ)

Also generate 3 suitable YouTube/TikTok titles and 5 catchy hashtags.
Format response as clear JSON:
{
  "hook": "string",
  "fullScript": "string",
  "suggestedTitles": ["string", "string", "string"],
  "hashtags": ["string"],
  "estimatedDurationMinutes": number
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Movie Synopsis / Dialogue / Notes:\n\n${plotText}`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Story recap error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to create story recap.' });
  }
});

// 3. Audio Transcription with Gemini (gemini-3.5-transcribe)
app.post('/api/transcribe', async (req: Request, res: Response) => {
  try {
    const { audioBase64, mimeType = 'audio/mp3', languageHint = 'Khmer' } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: 'Missing audioBase64 data.' });
    }

    const cleanBase64 = audioBase64.replace(/^data:[^;]+;base64,/, '');

    const ai = getAi();
    const audioPart = {
      inlineData: {
        mimeType: mimeType.split(';')[0],
        data: cleanBase64,
      },
    };

    const promptText = `Transcribe the spoken audio accurately into text.
Language context: ${languageHint}.
If the audio contains multiple speakers, prefix with Speaker 1 (ប្រុស) / Speaker 2 (ស្រី) if identifiable.
Also provide an approximate SRT subtitle block array with timestamps if you can estimate intervals.
Format response as JSON:
{
  "fullText": "string",
  "detectedLanguage": "string",
  "srtEntries": [
    {
      "index": 1,
      "startTime": "00:00:01,000",
      "endTime": "00:00:04,500",
      "speaker": "ប្រុស" or "ស្រី" or "អ្នកអធិប្បាយ",
      "text": "spoken subtitle"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [
          audioPart,
          { text: promptText },
        ],
      },
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Transcription error:', error);
    return res.status(500).json({ error: error?.message || 'Transcription failed.' });
  }
});

// 4. Batch Translate SRT Subtitles (Whole or Selected Lines)
app.post('/api/translate-srt', async (req: Request, res: Response) => {
  try {
    const { srtItems, targetLang = 'Khmer', sourceLang = 'Auto', tone = 'Natural & Cinematic' } = req.body;
    if (!Array.isArray(srtItems) || srtItems.length === 0) {
      return res.status(400).json({ error: 'Missing or empty srtItems array.' });
    }

    const ai = getAi();
    // Map items down to minimal payload to save tokens and speed up response
    const minimalItems = srtItems.slice(0, 150).map((item) => ({
      id: item.id || String(item.index),
      index: item.index,
      speaker: item.speaker || 'narrator',
      text: item.text,
    }));

    const prompt = `You are a professional film/video subtitle translator specializing in ${targetLang}.
Translate the given subtitle lines from ${sourceLang} into ${targetLang}.
Tone requested: ${tone}.
CRITICAL RULES:
1. Match the exact 'id' and 'index' for every single line.
2. Produce natural, punchy, spoken cinematic subtitles that match movie pacing and lip sync.
3. If target is Khmer, use standard, natural, fluent Khmer phrasing (ភាសាខ្មែរធម្មជាតិ).
4. Do NOT drop or combine items. Output the exact same count of items.

Input lines to translate:
${JSON.stringify(minimalItems, null, 2)}

Respond ONLY with a JSON array:
[
  {
    "id": "matching-input-id",
    "index": number,
    "text": "translated text in ${targetLang}"
  }
]`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.25,
      },
    });

    let rawText = response.text?.trim() || '[]';
    // Remove markdown code fences if present
    if (rawText.startsWith('```json')) {
      rawText = rawText.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (rawText.startsWith('```')) {
      rawText = rawText.replace(/^```/, '').replace(/```$/, '').trim();
    }

    const translatedItems = JSON.parse(rawText);
    return res.json({ srtItems: translatedItems });
  } catch (error: any) {
    console.error('SRT translation error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to translate SRT subtitles.' });
  }
});

// 4b. Auto-Adjust Subtitle Timings (Scene Cuts & Audio Silence Gaps via Gemini AI)
app.post('/api/auto-align-timing', async (req: Request, res: Response) => {
  try {
    const { 
      srtItems, 
      detectedSilenceGaps = [], 
      detectedSceneCuts = [], 
      videoDuration, 
      alignmentMode = 'Natural Cinematic Pacing' 
    } = req.body;

    if (!Array.isArray(srtItems) || srtItems.length === 0) {
      return res.status(400).json({ error: 'Missing or empty srtItems array.' });
    }

    const ai = getAi();
    const minimalItems = srtItems.slice(0, 100).map((c) => ({
      id: c.id,
      index: c.index,
      startTime: c.startTime,
      endTime: c.endTime,
      speaker: c.speaker || 'narrator',
      text: c.text,
      charCount: (c.text || '').length,
    }));

    const systemPrompt = `You are a world-class post-production subtitle timing and conforming engineer (Netflix/Broadcast Subtitling Guidelines).
Your task is to analyze subtitle cue timings and adjust their startTime and endTime to perfectly match scene transitions, audio silence gaps, and natural speech delivery.

Rules to enforce:
1. Audio Silence Gaps: If an audio silence gap exists immediately before or after a subtitle, snap the cue boundaries so subtitles do not linger into silence or start prematurely.
2. Scene Cuts / Shot Transitions: Subtitles should never bleed over a hard scene cut by a few frames. If speech ends before a cut, snap the endTime to 2-3 frames (~80-100ms) before the cut.
3. Reading Cadence (CPS): Ensure comfortable reading speed (12-18 characters per second). Minimum display duration is 1.2s (even for short words); maximum cue duration is 7.0s.
4. Chaining & Gap Hygiene: If the gap between two consecutive cues is between 50ms and 200ms, snap them to have a clean 2-frame (66ms) interval, or preserve genuine dialogue pauses (>350ms).
5. Output strict SRT timestamps: "HH:MM:SS,mmm" (e.g. "00:01:23,450").
6. Alignment Mode requested: ${alignmentMode}.

Respond ONLY with valid JSON matching this schema:
{
  "summary": "Short 1-2 sentence overview of adjustments made",
  "totalAdjusted": number,
  "adjustedItems": [
    {
      "id": "matching-input-id",
      "index": number,
      "startTime": "HH:MM:SS,mmm",
      "endTime": "HH:MM:SS,mmm",
      "adjustmentReason": "string explanation of reason (e.g. Snapped to silence gap / Trimmed before scene cut / Extended for reading comfort)"
    }
  ]
}`;

    const contextPayload = {
      mode: alignmentMode,
      videoDurationSeconds: videoDuration || null,
      detectedSilenceGaps: detectedSilenceGaps.slice(0, 30),
      detectedSceneCuts: detectedSceneCuts.slice(0, 30),
      cues: minimalItems,
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: JSON.stringify(contextPayload),
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    let rawText = response.text?.trim() || '{}';
    if (rawText.startsWith('```json')) {
      rawText = rawText.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (rawText.startsWith('```')) {
      rawText = rawText.replace(/^```/, '').replace(/```$/, '').trim();
    }

    const parsedResult = JSON.parse(rawText);
    return res.json(parsedResult);
  } catch (error: any) {
    console.error('Auto-align timing error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to auto-align subtitle timings.' });
  }
});

// 5. OCR & Image Translation (Preserving Spatial Layout)
app.post('/api/ocr-translate', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', targetLang = 'Khmer' } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Missing imageBase64 data.' });
    }

    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');

    const ai = getAi();
    const imagePart = {
      inlineData: {
        mimeType: mimeType.split(';')[0],
        data: cleanBase64,
      },
    };

    const prompt = `You are a high-precision OCR and document/comic translation system.
Analyze this image (story book page, comic strip, subtitle screen, poster, or document).
Detect every distinct text block or dialogue bubble.
For each region:
1. Extract original verbatim text.
2. Translate accurately into ${targetLang}.
3. Provide bounding box [ymin, xmin, ymax, xmax] normalized from 0 to 1000.
4. Identify category: "dialogue", "narration", "heading", "sound_effect", "caption", "subtitle".

Return ONLY JSON:
{
  "summary": "Short 1-sentence summary of the image content in ${targetLang}",
  "totalBlocksFound": number,
  "blocks": [
    {
      "box_2d": [120, 45, 230, 410],
      "originalText": "string",
      "translatedText": "string",
      "category": "dialogue"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          imagePart,
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('OCR Translation error:', error);
    return res.status(500).json({ error: error?.message || 'OCR Image translation failed.' });
  }
});

// 6. Text-to-Speech (TTS) with Gemini (gemini-3.8-flash-lite-tts)
app.post('/api/tts', async (req: Request, res: Response) => {
  try {
    const { text, voice = 'Kore', style = 'Clear, engaging, professional storyteller' } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Missing text for TTS.' });
    }

    const ai = getAi();
    // Prebuilt voices: 'Puck' (male energetic), 'Charon' (male deep), 'Kore' (female warm), 'Fenrir' (male authoritative), 'Zephyr' (female gentle)
    const validVoices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];
    const chosenVoice = validVoices.includes(voice) ? voice : 'Kore';

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: text.slice(0, 1500), // safe chunk limit
              speechMetadata: {
                style,
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: chosenVoice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      return res.status(500).json({ error: 'No audio returned from Gemini TTS.' });
    }

    return res.json({
      audioBase64: base64Audio,
      mimeType: 'audio/wav',
      voice: chosenVoice,
    });
  } catch (error: any) {
    console.error('Gemini TTS error:', error);
    return res.status(500).json({ error: error?.message || 'TTS generation failed.' });
  }
});

// Mount Vite or static server
async function setupApp() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[KHS AI STORYLINE Studio] Server listening on port ${PORT}`);
  });
}

setupApp().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
