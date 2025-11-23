import api from "./api";

export const questionService = {
  async getQuestions(themeId = null, limit = 100, skip = 0) {
    const params = { limit, skip };
    if (themeId) params.theme_id = themeId;
    const response = await api.get("/api/questions", { params });
    return response.data;
  },

  async createQuestion(questionData) {
    const response = await api.post("/api/questions", questionData);
    return response.data;
  },

  async updateQuestion(questionId, questionData) {
    const response = await api.put(
      `/api/questions/${questionId}`,
      questionData
    );
    return response.data;
  },

  async deleteQuestion(questionId) {
    const response = await api.delete(`/api/questions/${questionId}`);
    return response.data;
  },

  async deleteQuestionsBulk(questionIds) {
    const response = await api.post("/api/questions/bulk-delete", {
      question_ids: questionIds,
    });
    return response.data;
  },

  async uploadBulkQuestions(file) {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post("/api/questions/upload/bulk", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  async uploadPracticalSet(file) {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post(
      "/api/questions/upload/practical-set",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },

  downloadBulkTemplate() {
    const template = {
      uploads: [
        {
          theme_code: "GENERAL_01",
          questions: [
            {
              text: "¿Cuántos Títulos componen la Constitución Española de 1978?",
              choices: ["10", "11", "9", "8"],
              correct_answer: 1,
              difficulty: "MEDIUM",
              tags: ["constitución", "estructura"],
            },
            {
              text: "¿Qué mayoría se requiere para la reforma agravada del Título Preliminar?",
              choices: [
                "Mayoría simple",
                "3/5 de cada Cámara",
                "2/3 de cada Cámara",
                "Unanimidad",
              ],
              correct_answer: 2,
              difficulty: "HARD",
              tags: ["reforma_constitucional"],
            },
          ],
        },
        {
          theme_code: "GENERAL_02",
          questions: [
            {
              text: "¿Cuál de los siguientes derechos puede ser suspendido en estado de excepción?",
              choices: [
                "Libertad de expresión",
                "Habeas corpus",
                "Derecho a la educación",
                "Derecho de asociación",
              ],
              correct_answer: 1,
              difficulty: "MEDIUM",
              tags: ["derechos_fundamentales"],
            },
          ],
        },
      ],
    };

    const blob = new Blob([JSON.stringify(template, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla-preguntas-tema.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  downloadPracticalTemplate() {
    const questions = [];
    for (let i = 1; i <= 15; i++) {
      questions.push({
        position: i,
        text: `Pregunta ${i} del supuesto práctico...`,
        choices: ["Opción A", "Opción B", "Opción C", "Opción D"],
        correct_answer: 0,
      });
    }

    const template = {
      title: "Supuesto Práctico - Título del caso",
      description: "Descripción del caso práctico",
      questions: questions,
    };

    const blob = new Blob([JSON.stringify(template, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla-supuesto-practico.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
