import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { themeService } from '../services/themeService';
import { examService } from '../services/examService';
import practicalSetService from '../services/practicalSetService';

const ExamGenerator = () => {
  const navigate = useNavigate();
  const [themes, setThemes] = useState([]);
  const [practicalSets, setPracticalSets] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    type: 'THEORY_TOPIC',
    theme_ids: [],
    question_count: 10,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [themesData, practicalData] = await Promise.all([
        themeService.getThemes(),
        practicalSetService.getAll()
      ]);
      setThemes(themesData);
      setPracticalSets(practicalData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const generateAutoName = (type) => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    
    switch(type) {
      case 'SIMULACRO':
        return `Simulacro ${dateStr} ${timeStr}`;
      case 'THEORY_TOPIC':
        return `Examen por Tema ${dateStr} ${timeStr}`;
      case 'THEORY_MIXED':
        return `Examen Mixto ${dateStr} ${timeStr}`;
      case 'PRACTICAL':
        return `Supuesto Práctico ${dateStr} ${timeStr}`;
      default:
        return `Examen ${dateStr} ${timeStr}`;
    }
  };

  const handleTypeChange = (newType) => {
    setFormData({
      ...formData,
      type: newType,
      name: generateAutoName(newType),
      theme_ids: [],
      question_count: newType === 'SIMULACRO' ? 40 : 10,
    });
    setError('');
  };

  const handleThemeToggle = (themeId) => {
    const newThemeIds = formData.theme_ids.includes(themeId)
      ? formData.theme_ids.filter((id) => id !== themeId)
      : [...formData.theme_ids, themeId];
    
    setFormData({ ...formData, theme_ids: newThemeIds });
  };

  const handleSelectAllGeneral = () => {
    const generalIds = themes.filter((t) => t.part === 'GENERAL').map((t) => t.id);
    setFormData({ ...formData, theme_ids: generalIds });
  };

  const handleSelectAllSpecific = () => {
    const specificIds = themes.filter((t) => t.part === 'SPECIFIC').map((t) => t.id);
    setFormData({ ...formData, theme_ids: specificIds });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.type === 'SIMULACRO') {
      // Simulacro doesn't need theme selection
      setLoading(true);
      setError('');
      try {
        const exam = await examService.generateExam({
          name: formData.name || generateAutoName('SIMULACRO'),
          type: 'SIMULACRO',
          theme_ids: [],
          question_count: 40
        });
        const attempt = await examService.startAttempt(exam.id);
        navigate(`/exams/take/${attempt.id}`);
      } catch (err) {
        setError(err.response?.data?.detail || 'Error al generar simulacro');
      } finally {
        setLoading(false);
      }
      return;
    }
    
    if (formData.theme_ids.length === 0) {
      setError('Selecciona al menos un tema');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const examName = formData.name || generateAutoName(formData.type);
      const exam = await examService.generateExam({
        ...formData,
        name: examName
      });
      const attempt = await examService.startAttempt(exam.id);
      navigate(`/exams/take/${attempt.id}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al generar examen');
    } finally {
      setLoading(false);
    }
  };

  const examTypes = [
    { value: 'THEORY_TOPIC', label: 'Teoría por Tema', description: 'Selecciona uno o más temas específicos' },
    { value: 'THEORY_MIXED', label: 'Teoría Mixta', description: 'Mezcla de preguntas de varios temas' },
    { value: 'PRACTICAL', label: 'Supuesto Práctico', description: '15 preguntas correlacionadas (próximamente)' },
    { value: 'SIMULACRO', label: 'Simulacro Completo', description: '40 preguntas: 30% general + 70% específico' }
  ];

  const showThemeSelection = formData.type !== 'SIMULACRO' && formData.type !== 'PRACTICAL';

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900" data-testid="exam-generator-heading">
              Generar Examen
            </h1>
            <p className="mt-2 text-gray-600">Configura tu examen personalizado</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/exams/history')}
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 font-medium text-sm transition"
            data-testid="exam-history-button"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Ver historial
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6" data-testid="exam-generator-form">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg" data-testid="error-message">
              {error}
            </div>
          )}

          {/* Exam Type Selection */}
          <div className="bg-white rounded-lg shadow p-6">
            <label className="block text-lg font-medium text-gray-900 mb-4">Tipo de Examen</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {examTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  disabled={type.value === 'PRACTICAL'}
                  onClick={() => handleTypeChange(type.value)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    formData.type === type.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  } ${type.value === 'PRACTICAL' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  data-testid={`exam-type-${type.value}`}
                >
                  <div className="font-medium text-gray-900">{type.label}</div>
                  <div className="text-sm text-gray-600 mt-1">{type.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Exam Name */}
          <div className="bg-white rounded-lg shadow p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del Examen (generado automáticamente)</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={generateAutoName(formData.type)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              data-testid="exam-name-input"
            />
            <p className="mt-1 text-xs text-gray-500">Puedes personalizar el nombre o dejarlo automático</p>
          </div>

          {/* Question Count (only for non-simulacro) */}
          {formData.type !== 'SIMULACRO' && (
            <div className="bg-white rounded-lg shadow p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número de Preguntas: <span className="text-blue-600 font-bold">{formData.question_count}</span>
              </label>
              <input
                type="range"
                min="5"
                max="70"
                value={formData.question_count}
                onChange={(e) => setFormData({ ...formData, question_count: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                data-testid="question-count-slider"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>5 preguntas</span>
                <span>70 preguntas</span>
              </div>
            </div>
          )}

          {/* Simulacro Info */}
          {formData.type === 'SIMULACRO' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-start">
                <svg className="h-6 w-6 text-blue-600 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="font-medium text-blue-900">Simulacro de Examen Oficial</h3>
                  <ul className="mt-2 text-sm text-blue-800 space-y-1">
                    <li>• 40 preguntas totales</li>
                    <li>• 12 preguntas de temas generales (30%)</li>
                    <li>• 28 preguntas de temas específicos (70%)</li>
                    <li>• Puntuación sobre 100</li>
                    <li>• Refleja la estructura del examen real</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Theme Selection */}
          {showThemeSelection && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  Seleccionar Temas 
                  <span className="ml-2 text-blue-600 font-bold">
                    ({formData.theme_ids.length} seleccionados)
                  </span>
                </label>
                <div className="space-x-3">
                  <button
                    type="button"
                    onClick={handleSelectAllGeneral}
                    className="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition"
                    data-testid="select-all-general"
                  >
                    Todos Generales (23)
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectAllSpecific}
                    className="text-sm px-3 py-1 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition"
                    data-testid="select-all-specific"
                  >
                    Todos Específicos (13)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-4">
                {themes.map((theme) => (
                  <label
                    key={theme.id}
                    className={`flex items-start p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      formData.theme_ids.includes(theme.id)
                        ? theme.part === 'GENERAL' 
                          ? 'bg-blue-50 border-blue-500'
                          : 'bg-purple-50 border-purple-500'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                    data-testid={`theme-checkbox-${theme.code}`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.theme_ids.includes(theme.id)}
                      onChange={() => handleThemeToggle(theme.id)}
                      className="mt-1 mr-3 h-4 w-4"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          theme.part === 'GENERAL' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {theme.code}
                        </span>
                        <span className="text-xs text-gray-500">
                          {theme.part === 'GENERAL' ? 'Parte General' : 'Parte Específica'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-700">{theme.name}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              data-testid="cancel-button"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || (showThemeSelection && formData.theme_ids.length === 0)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
              data-testid="generate-exam-button"
            >
              {loading ? 'Generando...' : 'Generar y Comenzar Examen'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default ExamGenerator;