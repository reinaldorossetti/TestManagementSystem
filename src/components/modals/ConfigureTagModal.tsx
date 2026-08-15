/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sliders, X, Edit, Trash2, Plus } from 'lucide-react';
import type { ExecutionTagOption } from '../../utils/robotTagLoader';

interface ConfigureTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  executionTags: ExecutionTagOption[];
  filterTag: string;
  onSaveEditTag: (index: number, value: string, label: string) => void;
  onDeleteTag: (value: string) => void;
  onAddTag: (value: string, label: string) => void;
  t: (pt: string, en: string) => string;
}

export const ConfigureTagModal: React.FC<ConfigureTagModalProps> = ({
  isOpen,
  onClose,
  executionTags,
  filterTag,
  onSaveEditTag,
  onDeleteTag,
  onAddTag,
  t,
}) => {
  const [editingTagIndex, setEditingTagIndex] = useState<number | null>(null);
  const [editTagValue, setEditTagValue] = useState<string>('');
  const [editTagLabel, setEditTagLabel] = useState<string>('');
  const [modalNewTagValue, setModalNewTagValue] = useState<string>('');
  const [modalNewTagLabel, setModalNewTagLabel] = useState<string>('');

  if (!isOpen) return null;

  const handleStartEditTag = (idx: number) => {
    const tag = executionTags[idx];
    if (tag) {
      setEditingTagIndex(idx);
      setEditTagValue(tag.value);
      setEditTagLabel(tag.label);
    }
  };

  const handleSaveEdit = () => {
    if (editingTagIndex !== null) {
      onSaveEditTag(editingTagIndex, editTagValue, editTagLabel);
      setEditingTagIndex(null);
    }
  };

  const handleAddTag = () => {
    if (modalNewTagValue.trim()) {
      onAddTag(modalNewTagValue.trim(), modalNewTagLabel.trim());
      setModalNewTagValue('');
      setModalNewTagLabel('');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden my-auto">
        {/* Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#FF6600]" />
            <div>
              <h3 className="font-extrabold text-sm uppercase text-slate-200 tracking-tight">
                Configuração de Tags de Execução
              </h3>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                {t('Tags de Test Tags e [Tags] nos arquivos .robot', 'Tags from Test Tags and [Tags] in .robot files')}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => {
              setEditingTagIndex(null);
              onClose();
            }}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content list & forms */}
        <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-5 scrollbar-thin">
          {/* List of current tags */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] uppercase font-mono font-bold text-[#FF6600] tracking-wider">
              Tags Cadastradas
            </span>
            
            <div className="border border-slate-800 rounded-xl bg-slate-950/50 divide-y divide-slate-800/80 overflow-hidden">
              {executionTags.map((tag, idx) => {
                const isEditingThis = editingTagIndex === idx;
                const isActive = filterTag === tag.value;
                
                return (
                  <div key={tag.value} className={`p-3.5 flex items-center justify-between gap-4 transition-all ${isActive ? 'bg-[#FF6600]/5' : ''}`}>
                    {isEditingThis ? (
                      <div className="flex-1 flex flex-col sm:flex-row gap-2">
                        <div className="flex-1 flex flex-col gap-1">
                          <span className="text-[9px] text-slate-500 font-mono">Chave (Sem espaços)</span>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-2 flex items-center text-slate-500 font-mono text-[11px] pointer-events-none">@</span>
                            <input
                              type="text"
                              value={editTagValue}
                              onChange={(e) => setEditTagValue(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700/60 rounded pl-5 pr-2 py-1 focus:outline-none focus:border-[#FF6600] font-mono text-xs text-slate-200"
                            />
                          </div>
                        </div>
                        <div className="flex-1 flex flex-col gap-1">
                          <span className="text-[9px] text-slate-500 font-mono">Nome de Exibição</span>
                          <input
                            type="text"
                            value={editTagLabel}
                            onChange={(e) => setEditTagLabel(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700/60 rounded px-2 py-1 focus:outline-none focus:border-[#FF6600] text-xs text-slate-200"
                          />
                        </div>
                        <div className="flex items-end gap-1.5 mt-2 sm:mt-0">
                          <button
                            type="button"
                            onClick={handleSaveEdit}
                            className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded text-xs font-bold transition-all"
                          >
                            Salvar
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingTagIndex(null)}
                            className="bg-slate-850 hover:bg-slate-800 text-slate-400 px-2.5 py-1 rounded text-xs transition-all"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-[#FF6600] animate-pulse' : 'bg-slate-700'}`} />
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-slate-200 truncate">{tag.label}</p>
                            <p className="text-[10px] text-slate-400 font-mono truncate">
                              ID / Chave: {tag.value} {isActive && <span className="text-[#FF6600] font-bold">(Ativa)</span>}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEditTag(idx)}
                            title="Editar Tag"
                            className="p-1.5 bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-[#FF6600] rounded-lg transition-all border border-slate-800/40"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteTag(tag.value)}
                            title="Remover Tag"
                            className="p-1.5 bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded-lg transition-all border border-slate-800/40"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add tag form inside modal */}
          <div className="border-t border-slate-800/60 pt-4 flex flex-col gap-2.5">
            <span className="text-[10px] uppercase font-mono font-bold text-[#FF6600] tracking-wider">
              Adicionar Nova Tag
            </span>
            <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 font-mono text-[9px]">Chave da Tag (ex: recarga_rapida):</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-500 font-mono text-[11px] pointer-events-none">@</span>
                    <input
                      type="text"
                      placeholder="tag_id"
                      value={modalNewTagValue}
                      onChange={(e) => setModalNewTagValue(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700/60 rounded pl-6 pr-2 py-1.5 focus:outline-none focus:border-[#FF6600] font-mono text-xs text-slate-200"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 font-mono text-[9px]">Nome de Exibição (ex: @recarga_rapida (Foco)):</label>
                  <input
                    type="text"
                    placeholder="Nome de Exibição"
                    value={modalNewTagLabel}
                    onChange={(e) => setModalNewTagLabel(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/60 rounded px-2.5 py-1.5 focus:outline-none focus:border-[#FF6600] text-xs text-slate-200"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddTag}
                className="w-full bg-[#FF6600] hover:bg-[#FF6600]/90 text-white font-bold py-2 px-4 rounded-xl text-xs transition-colors font-mono flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Adicionar Tag ao Sistema
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800/60 flex justify-end gap-2.5 font-mono text-[11px]">
          <span className="text-slate-500 mr-auto flex items-center">
            Total de tags carregadas: {executionTags.length}
          </span>
          <button
            type="button"
            onClick={() => {
              setEditingTagIndex(null);
              onClose();
            }}
            className="bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700/60 px-4 py-1.5 rounded-lg transition-all"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
