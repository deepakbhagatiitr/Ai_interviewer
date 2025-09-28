const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

class CodeExecutionService {
  constructor() {
    this.tempDir = path.join(os.tmpdir(), 'ai-interviewer');
    this.ensureTempDir();
  }

  ensureTempDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async executeTests(code, language, testCases) {
    try {
      console.log(`Executing ${language} code with ${testCases.length} test cases`);
      
      const results = [];
      
      for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        const result = await this.executeSingleTest(code, language, testCase, i + 1);
        results.push(result);
      }

      return results;
    } catch (error) {
      console.error('Error executing tests:', error);
      return testCases.map((_, index) => ({
        testCase: `Test Case ${index + 1}`,
        input: testCases[index].input,
        expectedOutput: testCases[index].expectedOutput,
        actualOutput: 'Execution Error',
        passed: false,
        executionTime: 0,
        memoryUsage: 0,
        error: error.message
      }));
    }
  }

  async executeSingleTest(code, language, testCase, testNumber) {
    const startTime = Date.now();
    
    try {
      let result;
      
      switch (language.toLowerCase()) {
        case 'javascript':
          result = await this.executeJavaScript(code, testCase);
          break;
        case 'python':
          result = await this.executePython(code, testCase);
          break;
        case 'c++':
          result = await this.executeCpp(code, testCase);
          break;
        default:
          throw new Error(`Unsupported language: ${language}`);
      }

      const executionTime = Date.now() - startTime;
      const passed = this.compareOutputs(result.output, testCase.expectedOutput);
      
      console.log(`🧪 Test ${testNumber} execution:`, {
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: result.output,
        passed,
        executionTime
      });
      
      return {
        testCase: `Test Case ${testNumber}`,
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: result.output,
        passed,
        executionTime,
        memoryUsage: result.memoryUsage || 0,
        error: result.error
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      return {
        testCase: `Test Case ${testNumber}`,
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: 'Execution Error',
        passed: false,
        executionTime,
        memoryUsage: 0,
        error: error.message
      };
    }
  }

  async executeJavaScript(code, testCase) {
    return new Promise((resolve, reject) => {
      const tempFile = path.join(this.tempDir, `test_${Date.now()}.js`);
      
      // Detect function name from code
      const functionMatch = code.match(/function\s+(\w+)\s*\(/);
      const functionName = functionMatch ? functionMatch[1] : 'solution';
      
      // Create a wrapper that calls the detected function
      const wrappedCode = `
${code}

// Test execution
try {
  const result = ${functionName}(${JSON.stringify(testCase.input)});
  console.log('ACTUAL_OUTPUT:', JSON.stringify(result));
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
`;

      fs.writeFileSync(tempFile, wrappedCode);

      const child = spawn('node', [tempFile], {
        timeout: 5000, // 5 second timeout
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      let error = '';

      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.stderr.on('data', (data) => {
        error += data.toString();
      });

      child.on('close', (code) => {
        fs.unlinkSync(tempFile); // Clean up
        
        if (code !== 0) {
          reject(new Error(error || 'Execution failed'));
        } else {
          try {
            // Look for ACTUAL_OUTPUT: prefix
            const actualOutputMatch = output.match(/ACTUAL_OUTPUT:\s*(.+)/);
            if (actualOutputMatch) {
              const parsedOutput = JSON.parse(actualOutputMatch[1].trim());
              resolve({ output: parsedOutput });
            } else {
              // Fallback to parsing the entire output
              const parsedOutput = JSON.parse(output.trim());
              resolve({ output: parsedOutput });
            }
          } catch (parseError) {
            resolve({ output: output.trim() });
          }
        }
      });

      child.on('error', (err) => {
        fs.unlinkSync(tempFile); // Clean up
        reject(err);
      });
    });
  }

  async executePython(code, testCase) {
    return new Promise((resolve, reject) => {
      const tempFile = path.join(this.tempDir, `test_${Date.now()}.py`);
      
      // Detect function name from code
      const functionMatch = code.match(/def\s+(\w+)\s*\(/);
      const functionName = functionMatch ? functionMatch[1] : 'solution';
      
      // Create a wrapper that calls the detected function
      const wrappedCode = `
${code}

# Test execution
import json
import sys
try:
    result = ${functionName}(${JSON.stringify(testCase.input)})
    print(json.dumps(result))
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    exit(1)
`;

      fs.writeFileSync(tempFile, wrappedCode);

      const child = spawn('python3', [tempFile], {
        timeout: 5000, // 5 second timeout
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      let error = '';

      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.stderr.on('data', (data) => {
        error += data.toString();
      });

      child.on('close', (code) => {
        fs.unlinkSync(tempFile); // Clean up
        
        if (code !== 0) {
          reject(new Error(error || 'Execution failed'));
        } else {
          try {
            const parsedOutput = JSON.parse(output.trim());
            resolve({ output: parsedOutput });
          } catch (parseError) {
            resolve({ output: output.trim() });
          }
        }
      });

      child.on('error', (err) => {
        fs.unlinkSync(tempFile); // Clean up
        reject(err);
      });
    });
  }

  async executeCpp(code, testCase) {
    return new Promise((resolve, reject) => {
      const tempFile = path.join(this.tempDir, `test_${Date.now()}.cpp`);
      const executableFile = path.join(this.tempDir, `test_${Date.now()}`);
      
      // Detect function name from code
      const functionMatch = code.match(/(\w+)\s*\([^)]*\)\s*{/);
      const functionName = functionMatch ? functionMatch[1] : 'solution';
      
      // Create a wrapper that calls the detected function
      const inputArray = testCase.input;
      const inputString = inputArray.map(num => num.toString()).join(',');
      
      const wrappedCode = `
#include <vector>
#include <algorithm>
#include <iostream>
#include <string>
#include <sstream>
using namespace std;

${code}

// Test execution
int main() {
    try {
        // Create input vector from test case
        vector<int> input = {${inputString}};
        
        auto result = ${functionName}(input);
        
        // Print result as JSON array
        cout << "[";
        for (size_t i = 0; i < result.size(); i++) {
            cout << "[";
            for (size_t j = 0; j < result[i].size(); j++) {
                cout << result[i][j];
                if (j < result[i].size() - 1) cout << ",";
            }
            cout << "]";
            if (i < result.size() - 1) cout << ",";
        }
        cout << "]" << endl;
    } catch (const exception& e) {
        cerr << "Error: " << e.what() << endl;
        return 1;
    }
    return 0;
}
`;

      fs.writeFileSync(tempFile, wrappedCode);
      
      console.log('🔧 C++ Code Debug:', {
        functionName,
        inputArray,
        inputString,
        wrappedCode: wrappedCode.substring(0, 500) + '...'
      });

      // Compile C++ code
      const compileChild = spawn('g++', ['-o', executableFile, tempFile], {
        timeout: 10000, // 10 second compile timeout
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let compileError = '';

      compileChild.stderr.on('data', (data) => {
        compileError += data.toString();
      });

      compileChild.on('close', (compileCode) => {
        console.log('🔨 C++ Compilation:', {
          exitCode: compileCode,
          compileError: compileError,
          success: compileCode === 0
        });
        
        if (compileCode !== 0) {
          fs.unlinkSync(tempFile); // Clean up
          reject(new Error(`Compilation failed: ${compileError}`));
          return;
        }

        // Execute the compiled program
        const child = spawn(executableFile, {
          timeout: 5000, // 5 second execution timeout
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let output = '';
        let error = '';

        child.stdout.on('data', (data) => {
          output += data.toString();
        });

        child.stderr.on('data', (data) => {
          error += data.toString();
        });

        child.on('close', (code) => {
          console.log('🚀 C++ Execution:', {
            exitCode: code,
            output: output,
            error: error,
            success: code === 0
          });
          
          // Clean up
          fs.unlinkSync(tempFile);
          fs.unlinkSync(executableFile);
          
          if (code !== 0) {
            reject(new Error(error || 'Execution failed'));
          } else {
            resolve({ output: output.trim() });
          }
        });

        child.on('error', (err) => {
          // Clean up
          fs.unlinkSync(tempFile);
          fs.unlinkSync(executableFile);
          reject(err);
        });
      });

      compileChild.on('error', (err) => {
        fs.unlinkSync(tempFile); // Clean up
        reject(err);
      });
    });
  }

  compareOutputs(actual, expected) {
    // Normalize outputs for comparison
    const normalize = (str) => {
      return String(str).trim().toLowerCase().replace(/\s+/g, ' ');
    };

    const normalizedActual = normalize(actual);
    const normalizedExpected = normalize(expected);
    const passed = normalizedActual === normalizedExpected;
    
    console.log('🔍 Output comparison:', {
      actual: actual,
      expected: expected,
      normalizedActual: normalizedActual,
      normalizedExpected: normalizedExpected,
      passed: passed
    });

    return passed;
  }
}

module.exports = new CodeExecutionService();
