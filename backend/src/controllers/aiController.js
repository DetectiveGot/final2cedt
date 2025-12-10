import {GoogleGenAI } from "@google/genai"

const AI_API_KEY = process.env.AI_API_KEY;
const AI_MODEL = "gemini-2.5-flash";
const ai = new GoogleGenAI({apiKey: AI_API_KEY})

export async function generateLLM(req, res) {
    // console.log(req.body);
    if(!req.body) {
        return res.status(404);
    }
    if(!AI_API_KEY) {
        console.warn("API KEY NOT FOUND");
        return res.status(404);
    }
    const {type, maxScoreX, maxScoreY, categoryName} = req.body;
    if (!categoryName || !type) {
        return res.status(404);
    }
    let prompt = '';
    if (type === 'emotion_questions') {
        prompt = `สำหรับแบบทดสอบ "${categoryName}", สร้างคำถาม 2 ข้อเพื่อวิเคราะห์ "ด้านอารมณ์". แต่ละข้อมี 4 ตัวเลือกพร้อมคะแนน 1-4. ตอบเป็น JSON Array เท่านั้น: [{"question":"...","answers":[{"text":"...","points":1}, ...]}, ... ]`;
    } else if (type === 'appearance_questions') {
        prompt = `สำหรับแบบทดสอบ "${categoryName}", สร้างคำถาม 2 ข้อเพื่อวิเคราะห์ "ด้านรูปลักษณ์". แต่ละข้อมี 4 ตัวเลือกพร้อมคะแนน 1-4. ตอบเป็น JSON Array เท่านั้น: [{"question":"...","answers":[{"text":"...","points":1}, ...]}, ... ]`;
    } else if (type === 'results') {
        const midPointX = Math.ceil(maxScoreX / 2);
        const midPointY = Math.ceil(maxScoreY / 2);
        prompt = `สำหรับแบบทดสอบ "${categoryName}", สร้างผลลัพธ์ 4 แบบตามแกน X (อารมณ์, สูงสุด ${maxScoreX}) และ Y (รูปลักษณ์, สูงสุด ${maxScoreY}).
            1. X <= ${midPointX}, Y <= ${midPointY}
            2. X > ${midPointX}, Y <= ${midPointY}
            3. X <= ${midPointX}, Y > ${midPointY}
            4. X > ${midPointX}, Y > ${midPointY}
            ตอบเป็น JSON Array 4 object เท่านั้น: [{"title":"...", "description":"...", "condition_x": {"op":"<=", "val":${midPointX}}, "condition_y": {"op":"<=", "val":${midPointY}}}, ... ]`;
    }
    try {
        const resp = await ai.models.generateContent({
            model: AI_MODEL,
            contents: prompt,
            generationConfig: {
                responseMimeType: "application/json",
            },
        })
        // console.log(resp);
        if(!resp) {
            console.log("LLM response error");
            return res.status(404).json({message: "Bad response."});
        }
        return res.status(200).json(resp)
    } catch (err) {
        console.error("LLM error:", err);
    }
    return res.status(404);
}

// export async function generateImage() {

// }