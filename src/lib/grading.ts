/**
 * SUPER-ROBUST AUTO GRADING ENGINE (VIETNAMESE + MULTI-CHOICE + FUZZY MATCH)
 * Chuẩn hóa và so khớp đáp án thông minh 100%:
 * - Không phân biệt chữ HOA / chữ thường (Case-Insensitive)
 * - Tự động loại bỏ dấu chấm, dấu hai chấm, dấu gạch ngang, khoảng trắng thừa
 * - Chuẩn hóa Unicode NFC & đối sánh tiếng Việt có dấu và không dấu
 * - Xử lý trắc nghiệm hoàn hảo: "A", "A.", "A. Hà Nội", "Hà Nội", "ha noi"...
 * - Tự luận dung sai thông minh (chứa từ khóa chính)
 */

export function removeVietnameseTones(str: string): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

export function cleanText(str: string): string {
  if (!str) return "";
  return str
    .trim()
    .toLowerCase()
    .normalize("NFC")
    .replace(/[\.\,\;\:\!\?\-\_\(\)\[\]\"\'\`]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Trích xuất nhãn trắc nghiệm (A, B, C, D) và phần nội dung thân câu hỏi
 */
export function parseMultipleChoiceAnswer(str: string): { label: string | null; body: string } {
  if (!str) return { label: null, body: "" };
  const raw = str.trim();

  // Khớp định dạng: "A. Hà Nội", "A: Hà Nội", "A - Hà Nội", "A Hà Nội", "(A) Hà Nội", "A"
  const match = raw.match(/^\(?\s*([A-Da-d])\s*[\.\:\-\)\s]\s*(.*)$/) || raw.match(/^([A-Da-d])$/);
  if (match) {
    const label = match[1].toUpperCase();
    const body = (match[2] || "").trim();
    return { label, body };
  }

  return { label: null, body: raw };
}

/**
 * Kiểm tra xem câu trả lời của thí sinh có chính xác so với đáp án chuẩn hay không
 */
export function checkAnswerCorrectness(userAnswer: string, correctAnswer: string): boolean {
  if (!userAnswer || !correctAnswer) return false;

  const rawUser = userAnswer.trim();
  const rawCorrect = correctAnswer.trim();

  // 1. So khớp tuyệt đối trực tiếp
  if (rawUser.toLowerCase() === rawCorrect.toLowerCase()) return true;

  // 2. Parse cấu trúc Trắc nghiệm A, B, C, D
  const userParsed = parseMultipleChoiceAnswer(rawUser);
  const correctParsed = parseMultipleChoiceAnswer(rawCorrect);

  // Nếu cả 2 đều có nhãn (hoặc câu hỏi trắc nghiệm có nhãn A/B/C/D)
  if (correctParsed.label) {
    // a. Thí sinh chỉ chọn nhãn: "A", "A.", "a" trùng với nhãn đáp án
    if (userParsed.label && userParsed.label === correctParsed.label) {
      return true;
    }

    // b. Thí sinh chỉ gõ nội dung thân ("Hà Nội", "ha noi") trùng với thân đáp án đúng
    if (correctParsed.body) {
      const cleanUserBody = cleanText(userParsed.body || rawUser);
      const cleanCorrectBody = cleanText(correctParsed.body);

      if (cleanUserBody === cleanCorrectBody) return true;
      if (cleanText(removeVietnameseTones(cleanUserBody)) === cleanText(removeVietnameseTones(cleanCorrectBody))) {
        return true;
      }
    }
  }

  // 3. Chuẩn hóa làm sạch văn bản (Clean text)
  const cleanUser = cleanText(rawUser);
  const cleanCorrect = cleanText(rawCorrect);
  if (cleanUser === cleanCorrect) return true;

  // 4. So khớp không dấu tiếng Việt
  const noToneUser = cleanText(removeVietnameseTones(cleanUser));
  const noToneCorrect = cleanText(removeVietnameseTones(cleanCorrect));
  if (noToneUser === noToneCorrect) return true;

  // 5. So khớp từ khóa / dung sai từ ngữ (Sub-string match)
  if (cleanCorrect.length >= 3 && cleanUser.length >= 3) {
    if (cleanUser === cleanCorrect || cleanUser.includes(cleanCorrect) || cleanCorrect.includes(cleanUser)) {
      return true;
    }
    if (noToneUser.includes(noToneCorrect) || noToneCorrect.includes(noToneUser)) {
      return true;
    }
  }

  return false;
}
