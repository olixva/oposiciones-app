import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { examService } from "../services/examService";

const TakeExam = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [instantFeedbackEnabled, setInstantFeedbackEnabled] = useState(false);
  const [questionFeedback, setQuestionFeedback] = useState({});

  const buildFeedbackForQuestion = useCallback((question, selectedIndex) => {
    if (!question || selectedIndex === undefined || selectedIndex === null)
      return null;
    const correctIndex = question.correct_answer;
    if (correctIndex === undefined || correctIndex === null) return null;
    const isCorrect = selectedIndex === correctIndex;
    return {
      status: isCorrect ? "correct" : "incorrect",
      selectedIndex,
      correctIndex,
      correctText: question.choices?.[correctIndex] ?? "",
    };
  }, []);

  const loadAttempt = useCallback(async () => {
    try {
      const data = await examService.getAttemptResults(attemptId);
      const exam_data = await examService.getExam(data.exam_id);
      setExam(exam_data.exam || exam_data);

      // Initialize answers from saved state
      if (exam_data.answers) {
        setAnswers(exam_data.answers);
      }
    } catch (error) {
      console.error("Error loading attempt:", error);
      alert("Error al cargar el examen");
    } finally {
      setLoading(false);
    }
  }, [attemptId]);

  useEffect(() => {
    loadAttempt();
  }, [loadAttempt]);

  useEffect(() => {
    if (!instantFeedbackEnabled || !exam) {
      setQuestionFeedback({});
      return;
    }

    const feedbackData = {};
    exam.questions.forEach((question) => {
      const selectedIndex = answers[question.question_id];
      if (selectedIndex === undefined) return;
      const feedback = buildFeedbackForQuestion(question, selectedIndex);
      if (feedback) {
        feedbackData[question.question_id] = feedback;
      }
    });
    setQuestionFeedback(feedbackData);
  }, [instantFeedbackEnabled, answers, exam, buildFeedbackForQuestion]);

  const clearAnswer = async (question) => {
    const questionId = question.question_id;
    const newAnswers = { ...answers };
    delete newAnswers[questionId];
    setAnswers(newAnswers);
    setQuestionFeedback((prev) => {
      if (!prev[questionId]) return prev;
      const { [questionId]: _, ...rest } = prev;
      return rest;
    });

    try {
      await examService.submitAnswer(attemptId, questionId, null);
    } catch (error) {
      console.error("Error clearing answer:", error);
    }
  };

  const handleAnswerSelect = async (question, answerIndex) => {
    const questionId = question.question_id;
    const currentlySelected = answers[questionId];

    if (currentlySelected === answerIndex) {
      await clearAnswer(question);
      return;
    }

    const newAnswers = { ...answers, [questionId]: answerIndex };
    setAnswers(newAnswers);

    if (instantFeedbackEnabled) {
      const feedback = buildFeedbackForQuestion(question, answerIndex);
      if (feedback) {
        setQuestionFeedback((prev) => ({
          ...prev,
          [questionId]: feedback,
        }));
      }
    }

    // Save answer to backend
    try {
      await examService.submitAnswer(attemptId, questionId, answerIndex);
    } catch (error) {
      console.error("Error saving answer:", error);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < (exam?.questions?.length || 0) - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleJumpToQuestion = (index) => {
    setCurrentQuestionIndex(index);
  };

  const handleFinish = async () => {
    if (!window.confirm("¿Estás seguro de finalizar el examen?")) return;

    setSubmitting(true);
    try {
      const result = await examService.finishAttempt(attemptId);
      navigate(`/exams/results/${attemptId}`);
    } catch (error) {
      alert(
        "Error al finalizar el examen: " +
          (error.response?.data?.detail || error.message)
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12">Cargando examen...</div>
      </Layout>
    );
  }

  if (!exam || !exam.questions || exam.questions.length === 0) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-red-600">Error: No se pudo cargar el examen</p>
        </div>
      </Layout>
    );
  }

  const currentQuestion = exam.questions[currentQuestionIndex];
  const currentFeedback = questionFeedback[currentQuestion.question_id];
  const progress = ((currentQuestionIndex + 1) / exam.questions.length) * 100;
  const answeredCount = Object.keys(answers).length;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h1
                className="text-2xl font-bold text-gray-900"
                data-testid="exam-title"
              >
                {exam.name}
              </h1>
              <div className="inline-flex items-center gap-2 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-full px-3 py-1">
                <span className="w-2 h-2 rounded-full bg-primary-500" />
                Respondidas: {answeredCount} / {exam.questions.length}
              </div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm text-gray-700 font-medium">
                  Modo de corrección
                </p>
                <p className="text-sm text-gray-500">
                  {instantFeedbackEnabled
                    ? "Verás si aciertas cada pregunta justo después de responder."
                    : "Activa la corrección inmediata para obtener feedback al instante."}
                </p>
              </div>
              <label className="inline-flex items-center cursor-pointer select-none text-sm text-gray-700">
                <span className="mr-3 font-medium">Corrección inmediata</span>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={instantFeedbackEnabled}
                  onChange={(e) => setInstantFeedbackEnabled(e.target.checked)}
                />
                <span
                  className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors duration-200 ${
                    instantFeedbackEnabled ? "bg-green-500" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                      instantFeedbackEnabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </span>
              </label>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
              data-testid="progress-bar"
            />
          </div>
        </div>

        {/* Question */}
        <div
          className="bg-white rounded-lg shadow-md p-6 mb-6"
          data-testid="question-card"
        >
          <div className="mb-4">
            <span className="text-sm text-gray-600">
              Pregunta {currentQuestionIndex + 1} de {exam.questions.length}
            </span>
          </div>

          <h2
            className="text-xl font-medium text-gray-900 mb-6"
            data-testid="question-text"
          >
            {currentQuestion.text}
          </h2>

          <div className="space-y-3">
            {currentQuestion.choices.map((choice, index) => {
              const questionId = currentQuestion.question_id;
              const selectedIndex = answers[questionId];
              const feedback = instantFeedbackEnabled
                ? questionFeedback[questionId]
                : null;
              const isSelected = selectedIndex === index;
              const isCorrectChoice =
                feedback && index === feedback.correctIndex;
              const isIncorrectSelection =
                feedback && isSelected && feedback.status === "incorrect";
              const showBadge = feedback && (isCorrectChoice || isSelected);
              const badgeText = isCorrectChoice
                ? "Correcta"
                : isSelected
                ? "Tu respuesta"
                : "";
              const badgeColor = isCorrectChoice
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700";

              let optionClasses =
                "border-gray-300 hover:border-gray-400 bg-white";
              if (feedback) {
                if (isCorrectChoice && selectedIndex !== undefined) {
                  optionClasses = "border-green-500 bg-green-50";
                }
                if (isIncorrectSelection) {
                  optionClasses = "border-red-500 bg-red-50";
                }
              } else if (isSelected) {
                optionClasses = "border-primary-500 bg-primary-50";
              }

              const handleOptionClick = () =>
                handleAnswerSelect(currentQuestion, index);

              return (
                <button
                  key={index}
                  onClick={handleOptionClick}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-colors relative overflow-hidden ${optionClasses}`}
                  data-testid={`answer-option-${index}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        isSelected
                          ? feedback
                            ? isIncorrectSelection
                              ? "border-red-500 bg-red-500"
                              : "border-green-500 bg-green-500"
                            : "border-primary-500 bg-primary-500"
                          : "border-gray-400"
                      }`}
                    >
                      {isSelected && (
                        <svg
                          className="w-4 h-4 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-900 leading-snug">{choice}</p>
                    </div>
                    {showBadge && (
                      <span
                        className={`text-xs font-semibold uppercase tracking-wide px-3 py-1 rounded-full border ${
                          isCorrectChoice
                            ? "border-green-200"
                            : "border-red-200"
                        } ${badgeColor}`}
                      >
                        {badgeText}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {instantFeedbackEnabled && currentFeedback && (
            <div
              className={`mt-6 rounded-lg border px-4 py-4 text-sm flex items-start gap-3 ${
                currentFeedback.status === "correct"
                  ? "bg-green-50 border-green-200 text-green-800"
                  : "bg-red-50 border-red-200 text-red-800"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  currentFeedback.status === "correct"
                    ? "bg-green-100 text-green-600"
                    : "bg-red-100 text-red-600"
                }`}
              >
                {currentFeedback.status === "correct" ? (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                )}
              </div>
              <p className="font-semibold">
                {currentFeedback.status === "correct"
                  ? "¡Respuesta correcta!"
                  : "Respuesta incorrecta."}
              </p>
              {currentFeedback.status === "incorrect" && (
                <p className="text-sm font-normal">
                  La respuesta correcta es:
                  <span className="font-semibold">
                    {" "}
                    {currentFeedback.correctText}
                  </span>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="previous-button"
            >
              ← Anterior
            </button>
            <button
              onClick={handleNext}
              disabled={currentQuestionIndex === exam.questions.length - 1}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="next-button"
            >
              Siguiente →
            </button>
          </div>

          {/* Question Grid */}
          <div className="grid grid-cols-10 gap-2 mb-4">
            {exam.questions.map((q, index) => {
              const feedback = questionFeedback[q.question_id];
              let buttonClasses =
                "bg-gray-100 text-gray-600 border border-gray-300";

              if (index === currentQuestionIndex) {
                buttonClasses =
                  "bg-primary-600 text-white border border-primary-600";
              } else if (feedback) {
                buttonClasses =
                  feedback.status === "correct"
                    ? "bg-green-600 text-white border border-green-600"
                    : "bg-red-100 text-red-800 border border-red-300";
              } else if (answers[q.question_id] !== undefined) {
                buttonClasses =
                  "bg-green-100 text-green-800 border border-green-300";
              }

              return (
                <button
                  key={index}
                  onClick={() => handleJumpToQuestion(index)}
                  className={`w-10 h-10 rounded-md text-sm font-medium ${buttonClasses}`}
                  data-testid={`question-nav-${index}`}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>

          <button
            onClick={handleFinish}
            disabled={submitting}
            className="w-full py-3 px-4 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="finish-exam-button"
          >
            {submitting ? "Finalizando..." : "Finalizar Examen"}
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default TakeExam;
