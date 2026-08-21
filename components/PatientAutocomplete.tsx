'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, User, Phone, Loader2, X, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Patient } from '@/lib/types';

interface PatientAutocompleteProps {
  onSelect: (patient: Patient | null) => void;
  selectedPatientId?: string | null;
  disabled?: boolean;
  placeholder?: string;
  noScroll?: boolean;
}

export default function PatientAutocomplete({ 
  onSelect, 
  selectedPatientId, 
  disabled = false,
  placeholder = "Buscar paciente por nome ou telefone...",
  noScroll = false
}: PatientAutocompleteProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Fetch selected patient details if ID is provided but object is not set
  useEffect(() => {
    const fetchSelectedPatient = async () => {
      if (selectedPatientId) {
        // Only fetch if we don't have the patient or it's a different one
        if (!selectedPatient || selectedPatient.id !== selectedPatientId) {
          const { data, error } = await supabase
            .from('patients')
            .select('*')
            .eq('id', selectedPatientId)
            .single();
          
          if (data && !error) {
            setSelectedPatient(data as Patient);
            setSearchTerm(data.full_name);
          }
        }
      } else if (selectedPatientId === null || selectedPatientId === '') {
        setSelectedPatient(null);
        setSearchTerm('');
        setResults([]);
        setIsOpen(false);
      }
    };

    fetchSelectedPatient();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPatientId]);

  const searchPatients = async (term: string) => {
    if (!term || term.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    try {
      // Search by name or phone
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('status', 'ATIVO')
        .or(`full_name.ilike.%${term}%,whatsapp.ilike.%${term}%`)
        .limit(10);

      if (error) {
        console.warn('Busca de pacientes finalizada:', error.message);
        setResults([]);
      } else {
        setResults(data as Patient[] || []);
      }
    } catch (error: any) {
      console.warn('Busca de pacientes finalizada:', error?.message || error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setIsOpen(true);

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    searchTimeout.current = setTimeout(() => {
      searchPatients(value);
    }, 300);
  };

  const handleSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    setSearchTerm(patient.full_name);
    setIsOpen(false);
    onSelect(patient);
  };

  const handleClear = () => {
    setSelectedPatient(null);
    setSearchTerm('');
    setResults([]);
    onSelect(null);
    setIsOpen(false);
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
          {loading ? (
            <Loader2 size={18} className="animate-spin text-[#FFD600]" />
          ) : (
            <Search size={18} />
          )}
        </div>
        <input
          type="text"
          disabled={disabled}
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-12 pr-12 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:ring-2 focus:ring-[#FFD600]/50 focus:border-[#FFD600]/50 outline-none transition-all font-bold disabled:opacity-50"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {isOpen && (searchTerm.length >= 2 || results.length > 0) && (
        <div 
          onWheel={noScroll ? undefined : (e) => e.stopPropagation()}
          className={`absolute z-[110] w-full mt-2 glass glass-reflection rounded-2xl border border-white/10 shadow-2xl ${
            noScroll 
              ? '' 
              : 'max-h-[240px] overflow-y-auto overscroll-contain custom-scrollbar'
          }`}
        >
          {loading && results.length === 0 ? (
            <div className="p-4 text-center text-white/40 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              <span>Buscando...</span>
            </div>
          ) : results.length > 0 ? (
            <div className="py-2">
              {results.map((patient) => (
                <button
                  key={patient.id}
                  type="button"
                  onClick={() => handleSelect(patient)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/10 transition-colors text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 group-hover:text-[#FFD600] transition-colors">
                      <User size={16} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white group-hover:text-[#FFD600] transition-colors">
                        {patient.full_name}
                      </div>
                      <div className="text-[10px] text-white/40 flex items-center gap-1 mt-0.5">
                        <Phone size={10} />
                        {patient.whatsapp}
                      </div>
                    </div>
                  </div>
                  {selectedPatient?.id === patient.id && (
                    <Check size={16} className="text-[#FFD600]" />
                  )}
                </button>
              ))}
            </div>
          ) : searchTerm.length >= 2 ? (
            <div className="p-4 text-center text-white/40 text-sm font-bold uppercase tracking-widest">
              Nenhum paciente encontrado
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
