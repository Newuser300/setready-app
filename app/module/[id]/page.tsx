'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { LESSONS } from '@/lib/lessons';

type Module = {
  id: string;
  title: string;
  section: number;
  module_number: number;
  order_index: number;
};

type Progress = {
  completed: boolean;
  score: number;
};

export default function ModulePage() {
  const { id } = useParams();
  const router = useRouter();
  const [module, setModule] = useState<Module | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function loadModule() {
      if (!id) return;
      
      setLoading(true);
      
      // Get current user first
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        console.log('Module page - User ID:', user.id);
      }
      
      // Get module data
      const { data: moduleData, error: moduleError } = await supabase
        .from('modules')
        .select('*')
        .eq('id', id)
        .single();
      
      if (moduleError) {
        console.error('Module error:', moduleError);
        setLoading(false);
        return;
      }
      
      setModule(moduleData);
      
      // Get user progress
      if (user) {
        const { data: progressData } = await supabase
          .from('user_progress')
          .select('completed, score')
          .eq('user_id', user.id)
          .eq('module_id', id)
          .maybeSingle();
        setProgress(progressData);
      }
      
      setLoading(false);
    }
    
    loadModule();
  }, [id]);

  const handleTakeQuiz = () => {
    if (id) {
      if (!userId) {
        alert('Please sign in to take the quiz.');
        router.push('/auth/sign-in');
        return;
      }
      console.log('Navigating to quiz for module:', id, 'with userId:', userId);
      // Pass the user ID as a query parameter to the quiz index page
      router.push(`/module/${id}/quiz?userId=${userId}`);
    }
  };
  
  const handleBackToDashboard = () => {
    router.push('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading module...</p>
        </div>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Module not found.</p>
          <button
            onClick={handleBackToDashboard}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const isCompleted = progress?.completed || false;
  const content = LESSONS[module.module_number] || `## ${module.title}\n\nComplete this module and pass the test with 12/15 to unlock the next module.`;

  const formatLessonContent = (content: string) => {
    const lines = content.split('\n');
    const elements: JSX.Element[] = [];
    let i = 0;
    let inList = false;
    let listItems: JSX.Element[] = [];
    let inTable = false;
    let tableHeaders: string[] = [];
    let tableRows: string[][] = [];
    
    const renderTable = (headers: string[], rows: string[][]) => {
      const uniqueKey = `table-${Date.now()}-${Math.random()}-${headers.join('-')}`;
      return (
        <div key={uniqueKey} className="overflow-x-auto my-4">
          <table className="min-w-full border-collapse border border-gray-200">
            <thead className="bg-gray-100">
              <tr>
                {headers.map((h, idx) => (
                  <th key={idx} className="border border-gray-200 px-4 py-2 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ridx) => (
                <tr key={ridx} className="hover:bg-gray-50">
                  {row.map((cell, cidx) => (
                    <td key={cidx} className="border border-gray-200 px-4 py-2">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    };
    
    while (i < lines.length) {
      const line = lines[i];
      
      if (line === '') {
        if (inList) {
          elements.push(<ul key={`list-${i}`} className="list-disc pl-6 mb-4 space-y-1">{listItems}</ul>);
          listItems = [];
          inList = false;
        }
        if (inTable) {
          elements.push(renderTable(tableHeaders, tableRows));
          tableHeaders = [];
          tableRows = [];
          inTable = false;
        }
        i++;
        continue;
      }
      
      // Main headers (##)
      if (line.startsWith('##')) {
        if (inList) {
          elements.push(<ul key={`list-${i}`} className="list-disc pl-6 mb-4 space-y-1">{listItems}</ul>);
          listItems = [];
          inList = false;
        }
        elements.push(
          <h2 key={`h2-${i}`} className="text-2xl font-bold text-gray-800 mt-6 mb-4 border-b pb-2">
            {line.replace(/##/, '').trim()}
          </h2>
        );
        i++;
        continue;
      }
      
      // Bold headers with dash
      if (line.startsWith('**') && line.includes('** —')) {
        if (inList) {
          elements.push(<ul key={`list-${i}`} className="list-disc pl-6 mb-4 space-y-1">{listItems}</ul>);
          listItems = [];
          inList = false;
        }
        const [bold, rest] = line.split(' — ');
        elements.push(
          <h3 key={`h3-${i}`} className="text-lg font-semibold text-blue-700 mt-4 mb-2 border-l-4 border-blue-500 pl-3">
            {bold.replace(/\*\*/g, '')} — {rest}
          </h3>
        );
        i++;
        continue;
      }
      
      // Regular bold headers
      if (line.startsWith('**') && line.endsWith('**') && !line.includes('—')) {
        if (inList) {
          elements.push(<ul key={`list-${i}`} className="list-disc pl-6 mb-4 space-y-1">{listItems}</ul>);
          listItems = [];
          inList = false;
        }
        elements.push(
          <h3 key={`h3-${i}`} className="text-lg font-semibold text-gray-800 mt-4 mb-2">
            {line.replace(/\*\*/g, '')}
          </h3>
        );
        i++;
        continue;
      }
      
      // Tables
      if (line.startsWith('|') && lines[i+1]?.startsWith('|--')) {
        if (inList) {
          elements.push(<ul key={`list-${i}`} className="list-disc pl-6 mb-4 space-y-1">{listItems}</ul>);
          listItems = [];
          inList = false;
        }
        inTable = true;
        tableHeaders = line.split('|').filter(h => h.trim()).map(h => h.trim());
        i += 2;
        while (i < lines.length && lines[i].startsWith('|')) {
          tableRows.push(lines[i].split('|').filter(c => c.trim()).map(c => c.trim()));
          i++;
        }
        continue;
      }
      
      // Bullet points (•)
      if (line.startsWith('•')) {
        inList = true;
        listItems.push(<li key={`li-${i}`} className="text-gray-700">{line.replace('•', '').trim()}</li>);
        i++;
        continue;
      }
      
      // Numbered lists (1., 2., etc.)
      if (line.match(/^\d+\./)) {
        inList = true;
        listItems.push(<li key={`li-${i}`} className="text-gray-700">{line}</li>);
        i++;
        continue;
      }
      
      // Blockquotes (>)
      if (line.startsWith('>')) {
        if (inList) {
          elements.push(<ul key={`list-${i}`} className="list-disc pl-6 mb-4 space-y-1">{listItems}</ul>);
          listItems = [];
          inList = false;
        }
        elements.push(
          <blockquote key={`quote-${i}`} className="border-l-4 border-blue-300 bg-blue-50 pl-4 py-2 my-3 italic text-gray-700">
            {line.replace('>', '').trim()}
          </blockquote>
        );
        i++;
        continue;
      }
      
      // Regular text
      if (inList) {
        elements.push(<ul key={`list-${i}`} className="list-disc pl-6 mb-4 space-y-1">{listItems}</ul>);
        listItems = [];
        inList = false;
      }
      
      // Process inline formatting
      let processedLine = line;
      processedLine = processedLine.replace(/\*\*(.*?)\*\*/g, '<strong class="text-blue-800 font-bold">$1</strong>');
      processedLine = processedLine.replace(/\*(.*?)\*/g, '<em class="text-gray-600 italic">$1</em>');
      
      elements.push(
        <p key={`p-${i}`} className="text-gray-700 mb-3 leading-relaxed" dangerouslySetInnerHTML={{ __html: processedLine }} />
      );
      i++;
    }
    
    if (inList) {
      elements.push(<ul key={`list-final`} className="list-disc pl-6 mb-4 space-y-1">{listItems}</ul>);
    }
    if (inTable) {
      elements.push(renderTable(tableHeaders, tableRows));
    }
    
    return elements;
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-2xl mb-6">
        <h1 className="text-3xl font-bold">{module.title}</h1>
        <p className="text-blue-100 mt-2">Module {module.module_number} of {module.section === 1 ? '5' : '4'}</p>
      </div>
      
      {isCompleted && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded mb-6">
          <p className="text-green-700 font-medium">✓ Module Completed!</p>
          <p className="text-green-600 text-sm">Score: {progress?.score}/15</p>
        </div>
      )}
      
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6 prose prose-blue max-w-none">
        {formatLessonContent(content)}
      </div>
      
      <button
        onClick={handleTakeQuiz}
        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-medium hover:opacity-90 transition"
      >
        {isCompleted ? '📝 Retake Test' : '📝 Take Module Test'} (12/15 to pass)
      </button>
      
      <button
        onClick={handleBackToDashboard}
        className="w-full mt-3 bg-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-300 transition"
      >
        ← Back to Dashboard
      </button>
    </div>
  );
}