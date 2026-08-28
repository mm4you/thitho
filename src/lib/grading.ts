/**
 * SMART CASE-INSENSITIVE & VIETNAMESE-AWARE AUTO GRADING ENGINE
 * Chuẩn hóa và so khớp đáp án thông minh:
 * - Không phân biệt chữ HOA / chữ thường (Case-Insensitive)
 * - Tự động loại bỏ khoảng trắng thừa, chuẩn hóa Unicode NFC
 * - Tự động đối sánh tiếng Việt có dấu và không dấu
 * - Xử lý trắc nghiệm (A, B, C, D) và tự luận linh hoạt
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
    .replace(/\s+/g, " ");
}

/**
 * Kiểm tra xem câu trả lời của thí sinh có chính xác so với đáp án chuẩn hay không
 */
export function checkAnswerCorrectness(userAnswer: string, correctAnswer: string): boolean {
  if (!userAnswer || !correctAnswer) return false;

  const cleanUser = cleanText(userAnswer);
  const cleanCorrect = cleanText(correctAnswer);

  // 1. So khớp trực tiếp không phân biệt chữ hoa / thường
  if (cleanUser === cleanCorrect) return true;

  // 2. So khớp không dấu tiếng Việt
  const noToneUser = cleanText(removeVietnameseTones(cleanUser));
  const noToneCorrect = cleanText(removeVietnameseTones(cleanCorrect));
  if (noToneUser === noToneCorrect) return true;

  // 3. Xử lý câu hỏi trắc nghiệm (Ví dụ: "A. Hà Nội", "B. Sắt (Fe)")
  const mcRegex = /^([a-d])[\.\:\-\s]+(.*)$/i;
  const correctMatch = cleanCorrect.match(mcRegex);
  const userMatch = cleanUser.match(mcRegex);

  if (correctMatch) {
    const correctLetter = correctMatch[1].toLowerCase();
    const correctBody = correctMatch[2].trim();
    const noToneBody = cleanText(removeVietnameseTones(correctBody));

    // Thí sinh chỉ chọn chữ cái: "a", "A", "a."
    if (cleanUser === correctLetter || cleanUser === `${correctLetter}.` || cleanUser === `${correctLetter}:`) {
      return true;
    }

    // Thí sinh gửi phần nội dung: "Hà Nội", "ha noi"
    if (cleanUser === correctBody || noToneUser === noToneBody) {
      return true;
    }

    // Thí sinh gửi cả chữ cái và nội dung
    if (userMatch) {
      if (userMatch[1].toLowerCase() === correctLetter) return true;
      if (cleanText(userMatch[2]) === correctBody || cleanText(removeVietnameseTones(userMatch[2])) === noToneBody) return true;
    }
  }

  // 4. So khớp từ khóa / tập con (Substring Match)
  if (cleanCorrect.length >= 3 && cleanUser.length >= 3) {
    if (cleanUser.includes(cleanCorrect) || cleanCorrect.includes(cleanUser)) {
      return true;
    }
    if (noToneUser.includes(noToneCorrect) || noToneCorrect.includes(noToneUser)) {
      return true;
    }
  }

  return false;
}
