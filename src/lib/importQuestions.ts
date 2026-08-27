import { Question, Round } from "@/types/game";

export interface ParsedFullExamResult {
  rounds: {
    roundIndex: number;
    roundTitle: string;
    questions: Question[];
  }[];
  totalQuestions: number;
  errors: string[];
}

export function parseRawTextQuestions(rawText: string, defaultTime = 15): { questions: Question[]; errors: string[] } {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const questions: Question[] = [];
  const errors: string[] = [];

  let currentQ: Partial<Question> | null = null;
  let currentOptions: string[] = [];

  const finalizeCurrentQuestion = () => {
    if (currentQ && currentQ.question_text) {
      const qText = currentQ.question_text.trim();
      const answer = currentQ.correct_answer?.trim() || "Chưa có đáp án";
      const time = currentQ.time_limit || defaultTime;
      const points = currentQ.points_correct || 10;
      const isMulti = currentOptions.length > 0;

      questions.push({
        id: "q_" + Date.now() + "_" + questions.length,
        order_index: questions.length,
        question_text: qText,
        question_type: isMulti ? "multiple_choice" : "text_input",
        options: isMulti ? currentOptions : undefined,
        correct_answer: answer,
        time_limit: time,
        points_correct: points,
        points_wrong: currentQ.points_wrong || 0,
      });
    }
    currentQ = null;
    currentOptions = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // DANG 1: Cu phap 1 dong co dau gach dung | (Cau hoi | Dap an | Thoi gian | Diem)
    if (line.includes("|")) {
      finalizeCurrentQuestion();
      const parts = line.split("|").map((p) => p.trim());
      if (parts.length >= 2) {
        const qText = parts[0];
        const ans = parts[1];
        const time = parts[2] ? Number(parts[2]) || defaultTime : defaultTime;
        const pts = parts[3] ? Number(parts[3]) || 10 : 10;

        questions.push({
          id: "q_" + Date.now() + "_" + questions.length,
          order_index: questions.length,
          question_text: qText,
          question_type: "text_input",
          correct_answer: ans,
          time_limit: time,
          points_correct: pts,
          points_wrong: 0,
        });
      }
      continue;
    }

    // DANG 2: Cau hoi bat dau bang "Câu X:" hoac "Question X:"
    const questionMatch = line.match(/^(?:Câu|Cau|Question|Q)\s*\d*[\s:.-]+(.+)$/i);
    if (questionMatch) {
      finalizeCurrentQuestion();
      currentQ = {
        question_text: questionMatch[1].trim(),
        points_correct: 10,
        points_wrong: 0,
        time_limit: defaultTime,
      };
      continue;
    }

    // Nhan dien cac lua chon A. B. C. D.
    const optionMatch = line.match(/^([A-D])[\.\:\)]\s*(.+)$/i);
    if (optionMatch) {
      currentOptions.push(line);
      continue;
    }

    // Nhan dien Dap an: hoac Answer:
    const answerMatch = line.match(/^(?:Đáp án|Dap an|ĐA|DA|Answer|Ans)[\s:.-]+(.+)$/i);
    if (answerMatch) {
      if (currentQ) {
        currentQ.correct_answer = answerMatch[1].trim();
      }
      continue;
    }

    // Nhan dien Thoi gian:
    const timeMatch = line.match(/^(?:Thời gian|Thoi gian|Time)[\s:.-]+(\d+)/i);
    if (timeMatch) {
      if (currentQ) {
        currentQ.time_limit = Number(timeMatch[1]);
      }
      continue;
    }

    // Nhan dien Diem:
    const pointMatch = line.match(/^(?:Điểm|Diem|Point|Points)[\s:.-]+(\d+)/i);
    if (pointMatch) {
      if (currentQ) {
        currentQ.points_correct = Number(pointMatch[1]);
      }
      continue;
    }

    // Neu khong khop mau nao va dang co cau hoi -> noi tiep noi dung
    if (currentQ) {
      currentQ.question_text += " " + line;
    } else {
      // Neu chua co cau hoi -> coi dong nay la cau hoi
      currentQ = {
        question_text: line,
        points_correct: 10,
        points_wrong: 0,
        time_limit: defaultTime,
      };
    }
  }

  finalizeCurrentQuestion();
  return { questions, errors };
}

// Ham Parse 1 File chua toan bo 4 Vong Thi
export function parseFullMatchExam(fullText: string): ParsedFullExamResult {
  const roundSections: { roundIndex: number; roundTitle: string; textLines: string[] }[] = [
    { roundIndex: 0, roundTitle: "Khởi Động", textLines: [] },
    { roundIndex: 1, roundTitle: "Vượt Chướng Ngại Vật", textLines: [] },
    { roundIndex: 2, roundTitle: "Tăng Tốc", textLines: [] },
    { roundIndex: 3, roundTitle: "Về Đích", textLines: [] },
  ];

  const lines = fullText.split(/\r?\n/);
  let currentRoundIdx = 0;
  let hasExplicitRoundHeader = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Kiem tra tieu de vong
    const r1 = trimmed.match(/(?:\[|\#|\b)(?:VÒNG 1|VONG 1|KHỞI ĐỘNG|KHOI DONG)(?:\]|\b)/i);
    const r2 = trimmed.match(/(?:\[|\#|\b)(?:VÒNG 2|VONG 2|VƯỢT CHƯỚNG NGẠI VẬT|VCNV|VUOT CHUONG NGAI VAT)(?:\]|\b)/i);
    const r3 = trimmed.match(/(?:\[|\#|\b)(?:VÒNG 3|VONG 3|TĂNG TỐC|TANG TOC)(?:\]|\b)/i);
    const r4 = trimmed.match(/(?:\[|\#|\b)(?:VÒNG 4|VONG 4|VỀ ĐÍCH|VE DICH)(?:\]|\b)/i);

    if (r1) {
      currentRoundIdx = 0;
      hasExplicitRoundHeader = true;
      continue;
    } else if (r2) {
      currentRoundIdx = 1;
      hasExplicitRoundHeader = true;
      continue;
    } else if (r3) {
      currentRoundIdx = 2;
      hasExplicitRoundHeader = true;
      continue;
    } else if (r4) {
      currentRoundIdx = 3;
      hasExplicitRoundHeader = true;
      continue;
    }

    roundSections[currentRoundIdx].textLines.push(trimmed);
  }

  // Neu khong co tieu de vong nao, mac dinh toan bo dua vao Vong 1
  const result: ParsedFullExamResult = {
    rounds: [],
    totalQuestions: 0,
    errors: [],
  };

  const defaultTimes = [15, 15, 30, 20];

  roundSections.forEach((sec, idx) => {
    const raw = sec.textLines.join("\n");
    const parsed = parseRawTextQuestions(raw, defaultTimes[idx]);
    if (parsed.questions.length > 0) {
      result.rounds.push({
        roundIndex: sec.roundIndex,
        roundTitle: sec.roundTitle,
        questions: parsed.questions,
      });
      result.totalQuestions += parsed.questions.length;
    }
  });

  return result;
}