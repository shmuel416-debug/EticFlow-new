/**
 * System Templates Management Page (Admin)
 * Upload, version history, and rollback for system templates
 */

import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import * as systemTemplatesApi from '../../services/systemTemplates.api.js';
import { formatBytes, formatDatetime } from '../../utils/format.js';

const TEMPLATE_KEYS = ['questionnaire_preface'];

export default function SystemTemplatesPage() {
  const { t } = useTranslation();
  const [templates, setTemplates] = useState({});
  const [loading, setLoading] = useState(true);
  const [uploadingKey, setUploadingKey] = useState(null);
  const [uploadingLang, setUploadingLang] = useState('he');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [expandedKey, setExpandedKey] = useState(null);
  const [toast, setToast] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const data = await systemTemplatesApi.listAllTemplates();
      setTemplates(data);
    } catch {
      setToast({
        type: 'error',
        message: t('systemTemplates.loadError'),
      });
    } finally {
      setLoading(false);
    }
  }, [t]);

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  async function handleUpload() {
    if (!uploadingKey || !uploadingLang || !selectedFile) {
      setToast({
        type: 'error',
        message: t('systemTemplates.validateUpload'),
      });
      return;
    }

    try {
      await systemTemplatesApi.uploadTemplate(uploadingKey, uploadingLang, selectedFile);
      setToast({
        type: 'success',
        message: t('systemTemplates.uploadSuccess'),
      });
      setShowUploadModal(false);
      setSelectedFile(null);
      await loadTemplates();
    } catch (error) {
      setToast({
        type: 'error',
        message: error.response?.data?.error || t('systemTemplates.uploadError'),
      });
    }
  }

  async function handleRollback(key, lang, version) {
    if (!confirm(t('systemTemplates.confirmRollback'))) return;

    try {
      await systemTemplatesApi.rollbackTemplate(key, lang, version);
      setToast({
        type: 'success',
        message: t('systemTemplates.rollbackSuccess'),
      });
      await loadTemplates();
    } catch (error) {
      setToast({
        type: 'error',
        message: error.response?.data?.error || t('systemTemplates.rollbackError'),
      });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('systemTemplates.title')}</h1>
          <p className="mt-2 text-gray-600">{t('systemTemplates.subtitle')}</p>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {TEMPLATE_KEYS.map((key) => {
            const versions = templates[key] || [];
            const byLang = {
              he: versions.filter((v) => v.lang === 'he'),
              en: versions.filter((v) => v.lang === 'en'),
            };

            return (
              <div key={key} className="bg-white rounded-lg shadow-md overflow-hidden">
                {/* Template Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 text-white">
                  <h2 className="text-lg font-semibold">{t(`systemTemplates.${key}`)}</h2>
                  <p className="text-blue-100 text-sm mt-1">{t('systemTemplates.keyLabel')}: {key}</p>
                </div>

                {/* Languages */}
                <div className="divide-y">
                  {['he', 'en'].map((lang) => {
                    const langVersions = byLang[lang];
                    const activeVersion = langVersions.find((v) => v.isActive);

                    return (
                      <div key={lang} className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="font-medium text-gray-900">{lang === 'he' ? 'עברית' : 'English'}</h3>
                            {activeVersion ? (
                              <p className="text-sm text-gray-500">
                                v{activeVersion.version} • {formatDatetime(activeVersion.createdAt)}
                              </p>
                            ) : (
                              <p className="text-sm text-amber-600">{t('systemTemplates.noVersion')}</p>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              setUploadingKey(key);
                              setUploadingLang(lang);
                              setShowUploadModal(true);
                            }}
                            className="px-3 py-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 text-sm font-medium"
                          >
                            {t('systemTemplates.upload')}
                          </button>
                        </div>

                        {/* Version Accordion */}
                        {langVersions.length > 0 && (
                          <details
                            open={expandedKey === `${key}-${lang}`}
                            onToggle={() =>
                              setExpandedKey(expandedKey === `${key}-${lang}` ? null : `${key}-${lang}`)
                            }
                            className="mt-4"
                          >
                            <summary className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-700">
                              {t('systemTemplates.versionHistory')} ({langVersions.length})
                            </summary>
                            <div className="mt-3 space-y-2">
                              {langVersions.map((v) => (
                                <div key={v.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-sm">v{v.version}</span>
                                      {v.isActive && (
                                        <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                                          {t('systemTemplates.active')}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                      {formatBytes(v.size)} • {v.uploadedBy} • {formatDatetime(v.createdAt)}
                                    </p>
                                  </div>
                                  {!v.isActive && (
                                    <button
                                      onClick={() => handleRollback(key, lang, v.version)}
                                      className="ml-3 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
                                    >
                                      {t('systemTemplates.restore')}
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">{t('systemTemplates.uploadTitle')}</h2>

            <div className="space-y-4">
              {/* Language Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('systemTemplates.language')}
                </label>
                <select
                  value={uploadingLang}
                  onChange={(e) => setUploadingLang(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="he">עברית</option>
                  <option value="en">English</option>
                </select>
              </div>

              {/* File Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('systemTemplates.selectFile')}
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    onChange={(e) => setSelectedFile(e.target.files?.[0])}
                    accept=".pdf,.docx"
                    className="hidden"
                    id="file-input"
                  />
                  <label htmlFor="file-input" className="cursor-pointer">
                    <p className="text-gray-600">{t('systemTemplates.dragDrop')}</p>
                    {selectedFile && <p className="text-sm text-blue-600 font-medium mt-2">{selectedFile.name}</p>}
                  </label>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setSelectedFile(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!selectedFile}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {t('systemTemplates.upload')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg text-white text-sm ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        } flex items-center gap-2 shadow-lg animate-fade-in z-50`}>
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 font-bold hover:opacity-80">×</button>
        </div>
      )}
    </div>
  );
}
