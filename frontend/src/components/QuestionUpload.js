import React, { useState } from "react";
import { questionService } from "../services/questionService";

const QuestionUpload = ({ onUploadSuccess }) => {
  const [uploadType, setUploadType] = useState("bulk"); // 'bulk' or 'practical'
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (selectedFile) => {
    if (selectedFile && selectedFile.type === "application/json") {
      setFile(selectedFile);
      setError("");
      setResult(null);
    } else {
      setError("Por favor selecciona un archivo JSON válido");
      setFile(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Por favor selecciona un archivo");
      return;
    }

    setUploading(true);
    setError("");
    setResult(null);

    try {
      let uploadResult;
      if (uploadType === "bulk") {
        uploadResult = await questionService.uploadBulkQuestions(file);
      } else {
        uploadResult = await questionService.uploadPracticalSet(file);
      }

      setResult(uploadResult);
      setFile(null);
      if (onUploadSuccess) onUploadSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || "Error al subir el archivo");
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    if (uploadType === "bulk") {
      questionService.downloadBulkTemplate();
    } else {
      questionService.downloadPracticalTemplate();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Subir Preguntas desde Archivo
      </h3>

      {/* Upload Type Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tipo de archivo
        </label>
        <div className="flex space-x-4">
          <label className="flex items-center">
            <input
              type="radio"
              value="bulk"
              checked={uploadType === "bulk"}
              onChange={(e) => setUploadType(e.target.value)}
              className="mr-2"
              data-testid="upload-type-bulk"
            />
            <span className="text-sm">Preguntas por tema</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="practical"
              checked={uploadType === "practical"}
              onChange={(e) => setUploadType(e.target.value)}
              className="mr-2"
              data-testid="upload-type-practical"
            />
            <span className="text-sm">Supuesto práctico (15 preguntas)</span>
          </label>
        </div>
      </div>

      {/* Download Template Button */}
      <div className="mb-4">
        <button
          onClick={handleDownloadTemplate}
          className="text-sm text-primary-600 hover:text-primary-700 underline"
          data-testid="download-template-button"
        >
          ⬇ Descargar plantilla{" "}
          {uploadType === "bulk" ? "de preguntas" : "de supuesto práctico"}
        </button>
      </div>

      {/* Drag and Drop Zone */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? "border-primary-500 bg-primary-50"
            : "border-gray-300 bg-gray-50 hover:border-gray-400"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        data-testid="drop-zone"
      >
        <input
          type="file"
          accept=".json"
          onChange={(e) =>
            e.target.files[0] && handleFileChange(e.target.files[0])
          }
          className="hidden"
          id="file-upload"
        />

        {!file ? (
          <label htmlFor="file-upload" className="cursor-pointer">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="mt-2 text-sm text-gray-600">
              Arrastra tu archivo JSON aquí o haz clic para seleccionar
            </p>
            <p className="mt-1 text-xs text-gray-500">Solo archivos JSON</p>
          </label>
        ) : (
          <div className="space-y-2">
            <svg
              className="mx-auto h-12 w-12 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm font-medium text-gray-900">{file.name}</p>
            <p className="text-xs text-gray-500">
              {(file.size / 1024).toFixed(2)} KB
            </p>
            <button
              onClick={() => setFile(null)}
              className="text-sm text-red-600 hover:text-red-700"
            >
              Quitar archivo
            </button>
          </div>
        )}
      </div>

      {/* Upload Button */}
      {file && (
        <div className="mt-4">
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="upload-button"
          >
            {uploading ? "Subiendo..." : "Subir archivo"}
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div
          className="mt-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded"
          data-testid="upload-error"
        >
          {error}
        </div>
      )}

      {/* Success Result */}
      {result && (
        <div
          className="mt-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded"
          data-testid="upload-success"
        >
          <p className="font-medium">¡Éxito!</p>
          {result.success !== undefined && (
            <p className="text-sm mt-1">
              Preguntas creadas: {result.success} | Errores: {result.errors}
            </p>
          )}
          {result.message && <p className="text-sm mt-1">{result.message}</p>}
          {Array.isArray(result.error_details) &&
            result.error_details.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-semibold text-red-700">
                  Errores detectados en el archivo:
                </p>
                <ul className="mt-2 space-y-1 text-sm text-red-700">
                  {result.error_details.map((detail, idx) => (
                    <li
                      key={`${detail.theme_code || "general"}-${
                        detail.line || idx
                      }`}
                      className="bg-red-100 border border-red-200 rounded px-2 py-1"
                    >
                      <span className="font-medium">
                        {detail.theme_code ? `[${detail.theme_code}] ` : ""}
                        {detail.question_snippet
                          ? `“${detail.question_snippet}”`
                          : detail.line
                          ? `Entrada ${detail.line}`
                          : `Ítem ${idx + 1}`}
                      </span>
                      {detail.error
                        ? `: ${detail.error}`
                        : ": Error desconocido"}
                      {detail.line && !detail.question_snippet && (
                        <span className="ml-1 text-xs text-red-600">
                          (línea {detail.line})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
        </div>
      )}
    </div>
  );
};

export default QuestionUpload;
