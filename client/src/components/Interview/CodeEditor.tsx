import React, { useRef, useEffect } from 'react';
import { Editor } from '@monaco-editor/react';
import { Code, ChevronDown } from 'lucide-react';
import { getStarterTemplate } from '../../utils/codeTemplates';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  onLanguageChange: (language: string) => void;
  allowedLanguages: string[];
  problemTitle?: string;
  readOnly?: boolean;
  height?: string;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  language,
  onLanguageChange,
  allowedLanguages,
  problemTitle = '',
  readOnly = false,
  height = '400px'
}) => {
  const editorRef = useRef<any>(null);

  const getCodeSnippet = (lang: string) => {
    // Use the proper template system if problemTitle is provided
    if (problemTitle) {
      return getStarterTemplate(lang, problemTitle);
    }
    
    // Fallback to basic templates
    const snippets = {
      'JavaScript': `function solution(input) {
    // Write your code here
    return input;
}

// Test your solution
console.log(solution("test"));`,
      'Python': `def solution(input):
    # Write your code here
    return input

# Test your solution
print(solution("test"))`,
      'C++': `#include <iostream>
#include <string>
using namespace std;

string solution(string input) {
    // Write your code here
    return input;
}

int main() {
    // Test your solution
    cout << solution("test") << endl;
    return 0;
}`
    };
    return snippets[lang as keyof typeof snippets] || '';
  };

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    
    // Configure editor options
    editor.updateOptions({
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: 14,
      lineHeight: 20,
      fontFamily: "'Fira Code', 'Monaco', 'Consolas', monospace",
      wordWrap: 'on',
      automaticLayout: true,
      tabSize: 2,
      insertSpaces: true,
      renderWhitespace: 'selection',
      bracketPairColorization: { enabled: true },
      guides: {
        bracketPairs: true,
        indentation: true
      }
    });

    // Set initial code snippet if editor is empty
    if (!value || value.trim() === '') {
      const snippet = getCodeSnippet(language);
      if (snippet) {
        editor.setValue(snippet);
        onChange(snippet);
      }
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      onChange(value);
    }
  };

  // Update code snippet when language changes
  useEffect(() => {
    if (editorRef.current && (!value || value.trim() === '')) {
      const snippet = getCodeSnippet(language);
      if (snippet) {
        editorRef.current.setValue(snippet);
        onChange(snippet);
      }
    }
  }, [language, onChange, value]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Code className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Code Editor</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <label htmlFor="language-select" className="text-sm text-gray-600">
            Language:
          </label>
          <select
            id="language-select"
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {allowedLanguages.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Editor */}
      <div style={{ height }}>
        <Editor
          height="100%"
          language={language}
          value={value}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          theme="vs-light"
          options={{
            readOnly,
            selectOnLineNumbers: true,
            roundedSelection: false,
            cursorStyle: 'line',
            automaticLayout: true,
            scrollbar: {
              vertical: 'auto',
              horizontal: 'auto',
              useShadows: false,
              verticalHasArrows: false,
              horizontalHasArrows: false,
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8
            }
          }}
        />
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-4">
          <span>Lines: {value.split('\n').length}</span>
          <span>Characters: {value.length}</span>
        </div>
        <div className="flex items-center space-x-2">
          <span>Ctrl+S to save</span>
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;