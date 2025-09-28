const { aiService } = require('./aiService');

class CodeAnalysisService {
  constructor() {
    this.activeSessions = new Map();
  }

  async analyzeCodeInRealTime(sessionId, code, language, problemContext) {
    try {
      // Skip analysis for empty code
      if (!code || code.trim().length === 0) {
        return this.getEmptyCodeAnalysis();
      }

      console.log('🔍 Starting code analysis:', {
        sessionId,
        language,
        codeLength: code.length,
        hasProblemContext: !!problemContext
      });

      // Basic syntax validation
      const syntaxErrors = this.validateSyntax(code, language);
      console.log('✅ Syntax validation complete:', { errorCount: syntaxErrors.length });
      
      // AI-powered analysis
      let aiAnalysis = {};
      try {
        aiAnalysis = await aiService.analyzeCode(code, language, problemContext);
        console.log('✅ AI analysis complete:', {
          hasSyntaxErrors: !!(aiAnalysis.syntaxErrors?.length),
          hasLogicIssues: !!(aiAnalysis.logicIssues?.length),
          hasSuggestions: !!(aiAnalysis.suggestions?.length),
          hasHints: !!(aiAnalysis.hints?.length),
          score: aiAnalysis.score
        });
      } catch (aiError) {
        console.error('❌ AI analysis failed:', aiError.message);
        // Continue with basic analysis even if AI fails
        aiAnalysis = {
          syntaxErrors: [],
          logicIssues: ['AI analysis temporarily unavailable'],
          suggestions: ['Please check your code manually'],
          hints: ['Try running your code to identify issues'],
          score: 0,
          feedback: 'AI analysis is temporarily unavailable. Please review your code manually.'
        };
      }
      
      // Calculate code metrics with error handling
      let codeMetrics = {};
      try {
        codeMetrics = this.calculateCodeMetrics(code, language);
        console.log('✅ Code metrics calculated:', {
          bigO: codeMetrics.bigO?.complexity,
          maintainability: codeMetrics.maintainabilityIndex?.value
        });
      } catch (metricsError) {
        console.error('❌ Code metrics calculation failed:', metricsError.message);
        // Provide basic metrics even if calculation fails
        codeMetrics = {
          totalLines: code.split('\n').length,
          nonEmptyLines: code.split('\n').filter(line => line.trim()).length,
          characters: code.length,
          complexity: 1,
          readability: 50,
          bigO: { complexity: 'O(1)', score: 0 },
          executionTime: { estimated: 1, complexity: 'O(1)', confidence: 0 },
          memoryUsage: { estimated: 0, unit: 'bytes', breakdown: {} },
          cyclomaticComplexity: { value: 1, level: 'Low', maintainable: true },
          maintainabilityIndex: { value: 50, level: 'Fair', factors: {} }
        };
      }
      
      // Combine results
      const analysis = {
        timestamp: new Date(),
        syntaxErrors: [...syntaxErrors, ...(aiAnalysis.syntaxErrors || [])],
        logicIssues: aiAnalysis.logicIssues || [],
        suggestions: aiAnalysis.suggestions || [],
        hints: aiAnalysis.hints || [],
        score: aiAnalysis.score || 0,
        feedback: aiAnalysis.feedback || '',
        codeMetrics: codeMetrics
      };

      console.log('📊 Final analysis result:', {
        syntaxErrors: analysis.syntaxErrors.length,
        logicIssues: analysis.logicIssues.length,
        suggestions: analysis.suggestions.length,
        hints: analysis.hints.length,
        score: analysis.score
      });

      // Store analysis for session
      this.activeSessions.set(sessionId, {
        ...this.activeSessions.get(sessionId),
        lastAnalysis: analysis
      });

      return analysis;
    } catch (error) {
      console.error('❌ Critical error in real-time code analysis:', error);
      return this.getErrorAnalysis();
    }
  }

  validateSyntax(code, language) {
    const errors = [];
    
    // Basic syntax checks for common languages
    switch (language.toLowerCase()) {
      case 'javascript':
      case 'js':
        errors.push(...this.validateJavaScript(code));
        break;
      case 'python':
        errors.push(...this.validatePython(code));
        break;
      case 'java':
        errors.push(...this.validateJava(code));
        break;
      case 'cpp':
      case 'c++':
        errors.push(...this.validateCpp(code));
        break;
    }
    
    return errors;
  }

  validateJavaScript(code) {
    const errors = [];
    
    // Check for common JS syntax issues
    const openBraces = (code.match(/\{/g) || []).length;
    const closeBraces = (code.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) {
      errors.push('Mismatched curly braces');
    }
    
    const openParens = (code.match(/\(/g) || []).length;
    const closeParens = (code.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      errors.push('Mismatched parentheses');
    }
    
    // Check for common mistakes
    if (code.includes('===') && code.includes('==')) {
      errors.push('Consider using consistent equality operators (=== vs ==)');
    }
    
    if (code.includes('var ')) {
      errors.push('Consider using let or const instead of var');
    }
    
    return errors;
  }

  validatePython(code) {
    const errors = [];
    const lines = code.split('\n');
    
    // Check indentation consistency
    let expectedIndent = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim() === '') continue;
      
      const indent = line.length - line.trimStart().length;
      if (line.trim().endsWith(':')) {
        expectedIndent = indent + 4;
      } else if (indent !== expectedIndent && expectedIndent > 0) {
        errors.push(`Inconsistent indentation on line ${i + 1}`);
        break;
      }
    }
    
    return errors;
  }

  validateJava(code) {
    const errors = [];
    
    // Check for main method
    if (!code.includes('public static void main')) {
      errors.push('Missing main method');
    }
    
    // Check for class declaration
    if (!code.includes('class ')) {
      errors.push('Missing class declaration');
    }
    
    return errors;
  }

  validateCpp(code) {
    const errors = [];
    
    // Check for main function
    if (!code.includes('int main')) {
      errors.push('Missing main function');
    }
    
    // Check for includes
    if (!code.includes('#include')) {
      errors.push('Missing necessary includes');
    }
    
    return errors;
  }

  calculateCodeMetrics(code, language) {
    const lines = code.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim() !== '');
    
    return {
      totalLines: lines.length,
      nonEmptyLines: nonEmptyLines.length,
      characters: code.length,
      complexity: this.calculateComplexity(code, language),
      readability: this.calculateReadability(code, language),
      bigO: this.estimateBigO(code, language),
      executionTime: this.estimateExecutionTime(code, language),
      memoryUsage: this.estimateMemoryUsage(code, language),
      cyclomaticComplexity: this.calculateCyclomaticComplexity(code, language),
      maintainabilityIndex: this.calculateMaintainabilityIndex(code, language)
    };
  }

  calculateComplexity(code, language) {
    // Simple complexity calculation based on control structures
    const complexityIndicators = [
      'if', 'else', 'for', 'while', 'switch', 'case', 'catch', 'try', 'return'
    ];
    
    const operatorIndicators = ['&&', '||', '?', ':'];
    
    let complexity = 1; // Base complexity
    
    // Count word-based indicators
    complexityIndicators.forEach(indicator => {
      const matches = (code.match(new RegExp(`\\b${indicator}\\b`, 'g')) || []).length;
      complexity += matches;
    });
    
    // Count operator indicators
    operatorIndicators.forEach(indicator => {
      const escaped = indicator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const matches = (code.match(new RegExp(escaped, 'g')) || []).length;
      complexity += matches;
    });
    
    return Math.min(complexity, 10); // Cap at 10
  }

  calculateReadability(code, language) {
    // Simple readability score based on various factors
    let score = 100;
    
    // Penalize very long lines
    const lines = code.split('\n');
    const longLines = lines.filter(line => line.length > 100).length;
    score -= longLines * 5;
    
    // Penalize lack of comments
    const commentLines = lines.filter(line => 
      line.trim().startsWith('//') || 
      line.trim().startsWith('/*') || 
      line.trim().startsWith('*') ||
      line.trim().startsWith('#')
    ).length;
    const commentRatio = commentLines / lines.length;
    if (commentRatio < 0.1) score -= 20;
    
    // Penalize very long functions (rough estimate)
    const functionIndicators = ['function', 'def ', 'public ', 'private '];
    const functions = functionIndicators.filter(indicator => 
      code.includes(indicator)
    ).length;
    
    if (functions > 0) {
      const avgFunctionLength = lines.length / functions;
      if (avgFunctionLength > 20) score -= 15;
    }
    
    return Math.max(score, 0);
  }

  async generateHint(sessionId, code, language, problemContext) {
    try {
      const session = this.activeSessions.get(sessionId);
      const previousHints = session?.hints || [];
      
      const hint = await aiService.generateHint(code, language, problemContext, previousHints);
      
      // Store hint in session
      this.activeSessions.set(sessionId, {
        ...session,
        hints: [...previousHints, { content: hint, timestamp: new Date() }]
      });
      
      return {
        content: hint,
        timestamp: new Date(),
        type: 'ai_generated'
      };
    } catch (error) {
      console.error('Error generating hint:', error);
      return {
        content: "Think about the problem step by step and consider edge cases.",
        timestamp: new Date(),
        type: 'fallback'
      };
    }
  }

  getErrorAnalysis() {
    return {
      timestamp: new Date(),
      syntaxErrors: [],
      logicIssues: ['Code analysis is temporarily unavailable'],
      suggestions: ['Please try again in a moment', 'Check your internet connection', 'Refresh the page if the issue persists'],
      hints: ['Code analysis will be available shortly', 'You can continue coding while we fix this issue'],
      score: 0,
      feedback: 'Code analysis is temporarily unavailable. Please try again in a moment. You can continue coding while we resolve this issue.',
      codeMetrics: {
        totalLines: 0,
        nonEmptyLines: 0,
        characters: 0,
        complexity: 0,
        readability: 0,
        bigO: { complexity: 'O(1)', score: 0 },
        executionTime: { estimated: 1, complexity: 'O(1)', confidence: 0 },
        memoryUsage: { estimated: 0, unit: 'bytes', breakdown: {} },
        cyclomaticComplexity: { value: 1, level: 'Low', maintainable: true },
        maintainabilityIndex: { value: 50, level: 'Fair', factors: {} }
      }
    };
  }

  // Estimate Big O complexity
  estimateBigO(code, language) {
    const patterns = {
      // O(1) patterns
      constant: [/return\s+[^;]+;/, /console\.log/, /Math\./, /\.length/],
      // O(log n) patterns
      logarithmic: [/binarySearch/, /\.find\(/, /\.search\(/],
      // O(n) patterns
      linear: [/for\s*\([^)]*\)/, /while\s*\(/, /\.forEach/, /\.map\(/, /\.filter\(/],
      // O(n log n) patterns
      linearithmic: [/\.sort\(/, /mergeSort/, /quickSort/],
      // O(n²) patterns
      quadratic: [/for\s*\([^)]*for\s*\([^)]*\)/, /nested.*loop/],
      // O(2^n) patterns
      exponential: [/fibonacci/, /recursive.*call/, /backtrack/]
    };

    let complexity = 'O(1)';
    let score = 0;

    // Check for nested loops (O(n²))
    const nestedLoops = (code.match(/for\s*\([^)]*for\s*\([^)]*\)/g) || []).length;
    if (nestedLoops > 0) {
      complexity = 'O(n²)';
      score = 1;
    }

    // Check for single loops (O(n))
    const singleLoops = (code.match(/for\s*\([^)]*\)/g) || []).length;
    if (singleLoops > 0 && nestedLoops === 0) {
      complexity = 'O(n)';
      score = 2;
    }

    // Check for sorting (O(n log n))
    if (code.includes('.sort(') || code.includes('sort(')) {
      complexity = 'O(n log n)';
      score = 3;
    }

    // Check for binary search (O(log n))
    if (code.includes('binarySearch') || code.includes('binary_search')) {
      complexity = 'O(log n)';
      score = 4;
    }

    return { complexity, score };
  }

  // Estimate execution time based on complexity
  estimateExecutionTime(code, language) {
    const bigO = this.estimateBigO(code, language);
    const baseTime = 1; // 1ms base time
    
    const timeMultipliers = {
      'O(1)': 1,
      'O(log n)': 5,
      'O(n)': 10,
      'O(n log n)': 20,
      'O(n²)': 100,
      'O(2^n)': 1000
    };

    const multiplier = timeMultipliers[bigO.complexity] || 10;
    return {
      estimated: baseTime * multiplier,
      complexity: bigO.complexity,
      confidence: bigO.score / 4
    };
  }

  // Estimate memory usage
  estimateMemoryUsage(code, language) {
    const lines = code.split('\n');
    let memoryUsage = 0;
    
    // Base memory for variables
    const variableCount = (code.match(/\b(let|const|var|int|string|float|double)\s+\w+/g) || []).length;
    memoryUsage += variableCount * 8; // 8 bytes per variable
    
    // Array/List memory
    const arrayCount = (code.match(/\[\]/g) || []).length;
    memoryUsage += arrayCount * 32; // 32 bytes per array
    
    // Object/Map memory
    const objectCount = (code.match(/\{\}/g) || []).length;
    memoryUsage += objectCount * 64; // 64 bytes per object
    
    return {
      estimated: memoryUsage,
      unit: 'bytes',
      breakdown: {
        variables: variableCount * 8,
        arrays: arrayCount * 32,
        objects: objectCount * 64
      }
    };
  }

  // Calculate cyclomatic complexity
  calculateCyclomaticComplexity(code, language) {
    let complexity = 1; // Base complexity
    
    // Count decision points
    const decisionPoints = [
      'if', 'else', 'while', 'for', 'switch', 'case', 'catch', '&&', '\\|\\|', '\\?'
    ];
    
    decisionPoints.forEach(point => {
      try {
        // Escape special regex characters properly
        const escapedPoint = point.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escapedPoint}\\b`, 'g');
        const matches = (code.match(regex) || []).length;
        complexity += matches;
      } catch (error) {
        console.warn(`Invalid regex pattern for decision point: ${point}`, error.message);
        // Fallback: simple string count
        const simpleMatches = (code.match(new RegExp(point.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
        complexity += simpleMatches;
      }
    });
    
    return {
      value: complexity,
      level: complexity <= 10 ? 'Low' : complexity <= 20 ? 'Medium' : 'High',
      maintainable: complexity <= 10
    };
  }

  // Calculate maintainability index
  calculateMaintainabilityIndex(code, language) {
    const lines = code.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim() !== '');
    const cyclomaticComplexity = this.calculateCyclomaticComplexity(code, language);
    
    // Simplified maintainability index (0-100)
    const halsteadVolume = code.length * Math.log2(code.length || 1);
    const maintainabilityIndex = Math.max(0, 100 - (cyclomaticComplexity.value * 2) - (halsteadVolume / 100));
    
    return {
      value: Math.round(maintainabilityIndex),
      level: maintainabilityIndex >= 70 ? 'Good' : maintainabilityIndex >= 50 ? 'Fair' : 'Poor',
      factors: {
        cyclomaticComplexity: cyclomaticComplexity.value,
        codeLength: lines.length,
        halsteadVolume: Math.round(halsteadVolume)
      }
    };
  }

  getEmptyCodeAnalysis() {
    return {
      timestamp: new Date(),
      syntaxErrors: [],
      logicIssues: [],
      suggestions: ['Start by writing your solution'],
      hints: ['Begin with the basic structure of your function'],
      score: 0,
      feedback: 'Start coding to see analysis',
      codeMetrics: {
        totalLines: 0,
        nonEmptyLines: 0,
        characters: 0,
        complexity: 0,
        readability: 0,
        bigO: { complexity: 'O(1)', score: 0 },
        executionTime: { estimated: 1, complexity: 'O(1)', confidence: 0 },
        memoryUsage: { estimated: 0, unit: 'bytes', breakdown: {} },
        cyclomaticComplexity: { value: 1, level: 'Low', maintainable: true },
        maintainabilityIndex: { value: 100, level: 'Good', factors: {} }
      }
    };
  }

  getSessionAnalysis(sessionId) {
    return this.activeSessions.get(sessionId)?.lastAnalysis || null;
  }

  clearSession(sessionId) {
    this.activeSessions.delete(sessionId);
  }
}

module.exports = new CodeAnalysisService();
