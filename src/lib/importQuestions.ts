import { Question } from "@/types/game";

export interface ParsedQuestionResult {
  questions: Question[];
  errors: string[];
}

export function parseRawTextQuestions(rawText: string, defaultTime = 15): ParsedQuestionResult {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  const questions: Question[] = [];
  const errors: string[] = [];

  let currentQuestion: Partial<Question> | null = null;
  let currentOptions: string[] = [];

  const flushCurrent = () => {
    if (currentQuestion && currentQuestion.question_text) {
      const q: Question = {
        id: "q_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
        order_index: questions.length,
        question_text: currentQuestion.question_text || "",
        correct_answer: currentQuestion.correct_answer || "",
        points_correct: currentQuestion.points_correct || 10,
        points_wrong: currentQuestion.points_wrong || 0,
        time_limit: currentQuestion.time_limit || defaultTime,
        question_type: currentOptions.length > 0 ? "multiple_choice" : (currentQuestion.question_type || "text_input"),
        options: currentOptions.length > 0 ? currentOptions : undefined,
      };
      questions.push(q);
    }
    currentQuestion = null;
    currentOptions = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Dang 1: Dinh dang ngan phan cach bang dau gach dung: Cau hoi | Dap an | Thoi gian | Diem
    if (line.includes("|")) {
      flushCurrent();
      const parts = line.split("|").map((p) => p.trim());
      if (parts.length >= 2) {
        const qText = parts[0];
        const ans = parts[1];
        const timeSec = parts[2] ? Number(parts[2]) : defaultTime;
        const pts = parts[3] ? Number(parts[3]) : 10;

        questions.push({
          id: "q_" + Date.now() + "_" + i,
          order_index: questions.length,
          question_text: qText,
          correct_answer: ans,
          points_correct: isNaN(pts) ? 10 : pts,
          points_wrong: 0,
          time_limit: isNaN(timeSec) ? defaultTime : timeSec,
          question_type: "text_input",
        });
      }
      continue;
    }

    // Dang 2: Text tu nhien (Cau 1: ... A. ... B. ... Dap an: ...)
    const qMatch = line.match(/^(?:Câu\s*\d+[:.]|Q\d+[:.]|\d+[\).])\s*(.*)/i);
    const ansMatch = line.match(/^(?:Đáp án|ĐA|Answer|Ans)[:.]\s*(.*)/i);
    const optMatch = line.match(/^([A-D])[\).]\s*(.*)/i);
    const timeMatch = line.match(/^(?:Thời gian|Time)[:.]\s*(\d+)/i);
    const ptsMatch = line.match(/^(?:Điểm|Point|Pts)[:.]\s*(\d+)/i);

    if (qMatch) {
      flushCurrent();
      currentQuestion = {
        question_text: qMatch[1] || line,
        correct_answer: "",
        time_limit: defaultTime,
        points_correct: 10,
        points_wrong: 0,
      };
    } else if (ansMatch && currentQuestion) {
      currentQuestion.correct_answer = ansMatch[1].trim();
    } else if (optMatch && currentQuestion) {
      currentOptions.push(`${optMatch[1].toUpperCase()}. ${optMatch[2].trim()}`);
    } else if (timeMatch && currentQuestion) {
      currentQuestion.time_limit = Number(timeMatch[1]);
    } else if (ptsMatch && currentQuestion) {
      currentQuestion.points_correct = Number(ptsMatch[1]);
    } else if (!currentQuestion) {
      // Neu chua co header cau hoi, coi dong nay la cau hoi moi
      currentQuestion = {
        question_text: line,
        correct_answer: "",
        time_limit: defaultTime,
        points_correct: 10,
        points_wrong: 0,
      };
    }
  }

  flushCurrent();

  if (questions.length === 0) {
    errors.push("Không tìm thấy câu hỏi hợp lệ trong văn bản nạp!");
  }

  return { questions, errors };
}