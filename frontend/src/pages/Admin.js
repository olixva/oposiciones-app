import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import QuestionUpload from "../components/QuestionUpload";
import { themeService } from "../services/themeService";
import { questionService } from "../services/questionService";

const Admin = () => {
  const [activeTab, setActiveTab] = useState("upload"); // 'upload', 'questions', 'themes'
  const [themes, setThemes] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [selectedTheme, setSelectedTheme] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCreateQuestion, setShowCreateQuestion] = useState(false);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);

  // Form state for creating question
  const [newQuestion, setNewQuestion] = useState({
    theme_id: "",
    text: "",
    choices: ["", "", "", ""],
    correct_answer: 0,
    difficulty: "MEDIUM",
    tags: [],
  });

  useEffect(() => {
    loadThemes();
  }, []);

  useEffect(() => {
    if (selectedTheme) {
      loadQuestions();
    }
  }, [selectedTheme]);

  useEffect(() => {
    setSelectedQuestionIds([]);
  }, [selectedTheme]);

  useEffect(() => {
    setSelectedQuestionIds((prev) =>
      prev.filter((id) => questions.some((question) => question.id === id))
    );
  }, [questions]);

  const loadThemes = async () => {
    try {
      const data = await themeService.getThemes();
      setThemes(data);
    } catch (error) {
      console.error("Error loading themes:", error);
    }
  };

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const data = await questionService.getQuestions(selectedTheme || null);
      setQuestions(data);
    } catch (error) {
      console.error("Error loading questions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuestion = async (e) => {
    e.preventDefault();
    try {
      await questionService.createQuestion(newQuestion);
      alert("Pregunta creada exitosamente");
      setShowCreateQuestion(false);
      setNewQuestion({
        theme_id: "",
        text: "",
        choices: ["", "", "", ""],
        correct_answer: 0,
        difficulty: "MEDIUM",
        tags: [],
      });
      loadQuestions();
    } catch (error) {
      alert(
        "Error al crear pregunta: " +
          (error.response?.data?.detail || error.message)
      );
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm("¿Estás seguro de eliminar esta pregunta?")) return;

    try {
      await questionService.deleteQuestion(questionId);
      alert("Pregunta eliminada");
      setSelectedQuestionIds((prev) => prev.filter((id) => id !== questionId));
      loadQuestions();
    } catch (error) {
      alert(
        "Error al eliminar pregunta: " +
          (error.response?.data?.detail || error.message)
      );
    }
  };

  const handleBulkDelete = async () => {
    if (selectedQuestionIds.length === 0) return;
    if (
      !window.confirm(
        `¿Eliminar ${selectedQuestionIds.length} preguntas seleccionadas?`
      )
    )
      return;

    try {
      const result = await questionService.deleteQuestionsBulk(
        selectedQuestionIds
      );
      alert(
        `Eliminadas: ${result.deleted}. No encontradas: ${result.not_found}`
      );
      setSelectedQuestionIds([]);
      loadQuestions();
    } catch (error) {
      alert(
        "Error al eliminar preguntas: " +
          (error.response?.data?.detail || error.message)
      );
    }
  };

  const toggleQuestionSelection = (questionId) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(questionId)
        ? prev.filter((id) => id !== questionId)
        : [...prev, questionId]
    );
  };

  const isAllSelected =
    questions.length > 0 && selectedQuestionIds.length === questions.length;
  const hasSelection = selectedQuestionIds.length > 0;

  const toggleSelectAll = () => {
    if (questions.length === 0) return;
    const allIds = questions.map((question) => question.id);
    setSelectedQuestionIds(isAllSelected ? [] : allIds);
  };

  const updateChoice = (index, value) => {
    const newChoices = [...newQuestion.choices];
    newChoices[index] = value;
    setNewQuestion({ ...newQuestion, choices: newChoices });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1
            className="text-3xl font-bold text-gray-900"
            data-testid="admin-heading"
          >
            Panel de Administración
          </h1>
          <p className="mt-2 text-gray-600">
            Gestiona preguntas, temas y contenido
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("upload")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "upload"
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              data-testid="tab-upload"
            >
              Subir Preguntas
            </button>
            <button
              onClick={() => setActiveTab("questions")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "questions"
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              data-testid="tab-questions"
            >
              Gestionar Preguntas
            </button>
            <button
              onClick={() => setActiveTab("themes")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "themes"
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              data-testid="tab-themes"
            >
              Ver Temas
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "upload" && (
          <div data-testid="upload-section">
            <QuestionUpload onUploadSuccess={loadQuestions} />
          </div>
        )}

        {activeTab === "questions" && (
          <div className="space-y-6" data-testid="questions-section">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Preguntas
                </h2>
                <button
                  onClick={() => setShowCreateQuestion(!showCreateQuestion)}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                  data-testid="toggle-create-question"
                >
                  {showCreateQuestion ? "Cancelar" : "Nueva Pregunta"}
                </button>
              </div>

              {/* Filter by theme */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filtrar por tema
                </label>
                <select
                  value={selectedTheme}
                  onChange={(e) => setSelectedTheme(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  data-testid="theme-filter"
                >
                  <option value="">Todos los temas</option>
                  {themes.map((theme) => (
                    <option key={theme.id} value={theme.id}>
                      [{theme.part}] {theme.code} - {theme.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Create Question Form */}
              {showCreateQuestion && (
                <form
                  onSubmit={handleCreateQuestion}
                  className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200"
                  data-testid="create-question-form"
                >
                  <h3 className="text-lg font-medium mb-4">Nueva Pregunta</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Tema *
                      </label>
                      <select
                        required
                        value={newQuestion.theme_id}
                        onChange={(e) =>
                          setNewQuestion({
                            ...newQuestion,
                            theme_id: e.target.value,
                          })
                        }
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                        data-testid="new-question-theme"
                      >
                        <option value="">Selecciona un tema</option>
                        {themes.map((theme) => (
                          <option key={theme.id} value={theme.id}>
                            [{theme.part}] {theme.code} - {theme.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Pregunta *
                      </label>
                      <textarea
                        required
                        value={newQuestion.text}
                        onChange={(e) =>
                          setNewQuestion({
                            ...newQuestion,
                            text: e.target.value,
                          })
                        }
                        rows="3"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                        data-testid="new-question-text"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Opciones *
                      </label>
                      {newQuestion.choices.map((choice, index) => (
                        <div
                          key={index}
                          className="flex items-center space-x-2 mb-2"
                        >
                          <input
                            type="radio"
                            name="correct"
                            checked={newQuestion.correct_answer === index}
                            onChange={() =>
                              setNewQuestion({
                                ...newQuestion,
                                correct_answer: index,
                              })
                            }
                            className="mr-2"
                            data-testid={`correct-answer-${index}`}
                          />
                          <input
                            type="text"
                            required
                            value={choice}
                            onChange={(e) =>
                              updateChoice(index, e.target.value)
                            }
                            placeholder={`Opción ${index + 1}`}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                            data-testid={`choice-${index}`}
                          />
                        </div>
                      ))}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Dificultad
                      </label>
                      <select
                        value={newQuestion.difficulty}
                        onChange={(e) =>
                          setNewQuestion({
                            ...newQuestion,
                            difficulty: e.target.value,
                          })
                        }
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="EASY">Fácil</option>
                        <option value="MEDIUM">Media</option>
                        <option value="HARD">Difícil</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 px-4 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                      data-testid="submit-question"
                    >
                      Crear Pregunta
                    </button>
                  </div>
                </form>
              )}

              {/* Questions List */}
              <div className="space-y-4">
                {questions.length > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-4 bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <label className="flex items-center space-x-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={toggleSelectAll}
                        disabled={questions.length === 0}
                        data-testid="select-all-questions"
                      />
                      <span>Seleccionar todas</span>
                    </label>
                    <button
                      onClick={handleBulkDelete}
                      disabled={!hasSelection}
                      className={`px-4 py-2 rounded-md text-sm font-medium ${
                        hasSelection
                          ? "bg-red-600 text-white hover:bg-red-700"
                          : "bg-gray-200 text-gray-500 cursor-not-allowed"
                      }`}
                      data-testid="delete-selected-questions"
                    >
                      Eliminar seleccionadas ({selectedQuestionIds.length})
                    </button>
                  </div>
                )}

                {loading ? (
                  <p className="text-center text-gray-500">Cargando...</p>
                ) : questions.length === 0 ? (
                  <p className="text-center text-gray-500">
                    No hay preguntas disponibles
                  </p>
                ) : (
                  questions.map((question, index) => (
                    <div
                      key={question.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      data-testid={`question-item-${index}`}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="pt-1">
                          <input
                            type="checkbox"
                            checked={selectedQuestionIds.includes(question.id)}
                            onChange={() =>
                              toggleQuestionSelection(question.id)
                            }
                            data-testid={`select-question-${index}`}
                          />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 mb-2">
                            {question.text}
                          </p>
                          <div className="space-y-1">
                            {question.choices.map((choice, idx) => (
                              <div
                                key={idx}
                                className={`text-sm ${
                                  idx === question.correct_answer
                                    ? "text-green-600 font-medium"
                                    : "text-gray-600"
                                }`}
                              >
                                {idx === question.correct_answer && "✓ "}
                                {choice}
                              </div>
                            ))}
                          </div>
                          <div className="mt-2 text-xs text-gray-500">
                            Dificultad: {question.difficulty} | Tags:{" "}
                            {question.tags.join(", ") || "ninguno"}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteQuestion(question.id)}
                          className="text-red-600 hover:text-red-800"
                          data-testid={`delete-question-${index}`}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "themes" && (
          <div
            className="bg-white rounded-lg shadow p-6"
            data-testid="themes-section"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Temas del Temario
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Total de temas: {themes.length}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* General Themes */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center justify-between">
                  <span>Temas Generales</span>
                  <span className="text-sm font-normal text-blue-600 bg-blue-100 px-2 py-1 rounded">
                    {themes.filter((t) => t.part === "GENERAL").length} temas
                  </span>
                </h3>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {themes
                    .filter((t) => t.part === "GENERAL")
                    .sort((a, b) => a.order - b.order)
                    .map((theme) => (
                      <div
                        key={theme.id}
                        className="p-3 bg-blue-50 rounded-lg border border-blue-200"
                        data-testid={`theme-${theme.code}`}
                      >
                        <div className="font-medium text-sm text-blue-900">
                          {theme.code}
                        </div>
                        <div className="text-sm text-gray-700">
                          {theme.name}
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Specific Themes */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center justify-between">
                  <span>Temas Específicos</span>
                  <span className="text-sm font-normal text-purple-600 bg-purple-100 px-2 py-1 rounded">
                    {themes.filter((t) => t.part === "SPECIFIC").length} temas
                  </span>
                </h3>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {themes
                    .filter((t) => t.part === "SPECIFIC")
                    .sort((a, b) => a.order - b.order)
                    .map((theme) => (
                      <div
                        key={theme.id}
                        className="p-3 bg-purple-50 rounded-lg border border-purple-200"
                        data-testid={`theme-${theme.code}`}
                      >
                        <div className="font-medium text-sm text-purple-900">
                          {theme.code}
                        </div>
                        <div className="text-sm text-gray-700">
                          {theme.name}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Admin;
