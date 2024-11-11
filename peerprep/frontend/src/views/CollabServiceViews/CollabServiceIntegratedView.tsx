import React, { useState, useEffect, useRef } from 'react';
import { UnControlled as CodeMirror } from 'react-codemirror2';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import * as Y from 'yjs';
import Chat from './components/Chat.tsx';
import { GripVertical, GripHorizontal, Code2 } from 'lucide-react';

import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/material.css';
import 'codemirror/addon/hint/show-hint';
import 'codemirror/addon/hint/show-hint.css';
import 'codemirror/addon/hint/javascript-hint'; // For JavaScript hints

import 'codemirror/mode/javascript/javascript'; // For JavaScript
import 'codemirror/mode/clike/clike'; // For C, C++, C#, Kotlin, Java (these use the 'clike' mode)
import 'codemirror/mode/python/python'; // For Python
import 'codemirror/mode/ruby/ruby'; // For Ruby

import { assessCode } from '../../api/assesscodeApi.ts';

// @ts-check
import { CodemirrorBinding } from 'y-codemirror';
import { WebsocketProvider } from 'y-websocket';

import { deleteMatchedSession } from "../../api/matchingApi.ts";
import { getQuestionById } from '../../api/questionApi.ts';

const CollaborationServiceIntegratedView: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string; }>();
  const [output, setOutput] = useState<string | null>(null);
  const [language, setLanguage] = useState<number>(63); // Default to JavaScript (Node.js)
  const [syntaxLang, setSyntaxLang] = useState<string>('javascript');
  const [syntaxFullLang, setSyntaxFullLang] = useState<string>('javascript');
  const editorRef = useRef<any>(null);
  const navigate = useNavigate();
  const [yText, setYText] = useState<Y.Text | null>(null);
  const [input1, setInput1] = useState<string>('N/A');
  const [output1, setOutput1] = useState<string>('N/A');
  const [input2, setInput2] = useState<string>('N/A');
  const [output2, setOutput2] = useState<string>('N/A');
  const [topics, setTopics] = useState<string>('N/A');
  const [difficulty, setDifficulty] = useState<string>('N/A');
  const [questionTitle, setQuestionTitle] = useState<string>('N/A');
  const [questionDescription, setQuestionDescription] = useState<string>('N/A');
  console.log("session id is " + sessionId);
  const questionId = sessionId ? sessionId.split('-Q')[1] : "N/A";

  const [leftPaneWidth, setLeftPaneWidth] = useState(35);
  const [codeEditorHeight, setCodeEditorHeight] = useState(90);

  interface ResizeEvent extends MouseEvent {
    clientX: number;
  }
  interface VerticalResizeEvent extends MouseEvent {
    clientY: number;
  }
  interface ContainerRect {
    left: number;
    width: number;
    top: number;
    height: number;
  }

  const handleHorizontalResize = (e: React.MouseEvent<HTMLDivElement, MouseEvent>): void => {
    const container = e.currentTarget.parentElement as HTMLDivElement;
    const containerRect: ContainerRect = container.getBoundingClientRect();

    const handleResize = (moveEvent: ResizeEvent): void => {
      const newWidth = ((moveEvent.clientX - containerRect.left) / containerRect.width) * 100;
      setLeftPaneWidth(Math.min(Math.max(20, newWidth), 80)); // Limit between 20% and 80%
    };

    const removeListeners = (): void => {
      document.removeEventListener('mousemove', handleResize);
      document.removeEventListener('mouseup', removeListeners);
    };

    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', removeListeners);
  };

  const handleVerticalResize = (e: React.MouseEvent<HTMLDivElement, MouseEvent>): void => {
    const container = e.currentTarget.parentElement as HTMLDivElement;
    const containerRect: ContainerRect = container.getBoundingClientRect();

    const handleResize = (moveEvent: VerticalResizeEvent): void => {
      const newHeight = ((moveEvent.clientY - containerRect.top) / containerRect.height) * 100;
      setCodeEditorHeight(Math.min(Math.max(30, newHeight), 90)); // Limit between 30% and 90%
    };

    const removeListeners = (): void => {
      document.removeEventListener('mousemove', handleResize);
      document.removeEventListener('mouseup', removeListeners);
    };

    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', removeListeners);
  };

  //set topic, difficulty, questionId by calling the API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await getQuestionById(questionId);
        console.log(response);
        if (response) {
          console.log(`Session ID: ${sessionId}, Topics: ${response.categories}, Difficulty: ${response.difficulty}`);
          console.log(`Question: ${response._id}`);
          //set topics, difficulty
          setTopics(response.categories.join(', ')); // Set topic from API response
          setDifficulty(response.difficulty); // Set difficulty from API response
          setQuestionTitle(response.title);
          setQuestionDescription(response.description);
          setInput1(response.input1);
          setOutput1(response.output1);
          setInput2(response.input2);
          setOutput2(response.output2);
        }
      } catch (error) {
        console.error('Error fetching matched session:', error);
      }
    };
    fetchData();
  }, [sessionId]);

  // Mapping for CodeMirror modes

  useEffect(() => {
    console.log(`Session ID: ${sessionId}, Topics: ${topics}, Difficulty: ${difficulty}`);
  }, [sessionId, topics, difficulty, questionId]);

  useEffect(() => {
    const ydoc = new Y.Doc();
    const provider = new WebsocketProvider('ws://localhost:1234/' + sessionId, 'collaborative-doc', ydoc);
    const newYText = ydoc.getText('codemirror');
    setYText(newYText);

    if (editorRef.current) {
      const binding = new CodemirrorBinding(newYText, editorRef.current.editor, provider.awareness);

      return () => {
        binding.destroy();
        provider.destroy();
        ydoc.destroy();
      };
    }
  }, [sessionId]);

  const handleLeaveSession = () => {
    // Call the API to delete the session
    try {
      if (sessionId) {
        deleteMatchedSession(sessionId);
        navigate('/matching');
      }
    } catch {
      console.error('Error deleting matched session');
    }
  };

  const handleLangChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(parseInt(e.target.value));
    setSyntaxFullLang(e.target.textContent!);
    setSyntaxLang(
      e.target.value === '63' ? 'javascript'
        : e.target.value === '54' ? 'text/x-c++src'
          : e.target.value === '50' ? 'text/x-csrc'
            : e.target.value === '71' ? 'python'
              : e.target.value === '62' ? 'text/x-java'
                : e.target.value === '72' ? 'ruby'
                  : e.target.value === '51' ? 'text/x-csharp'    // New language
                    : e.target.value === '78' ? 'text/x-kotlin'    // New language
                      : 'javascript'
    );
  };

  const handleRunCode = async () => {
    try {
      if (!yText) {
        console.error('Error: Yjs text instance is not available');
        setOutput('Error: Yjs text instance is not available');
        return;
      }

      const currentCode = yText.toString();
      console.log('Submitting code for execution:', currentCode);

      // Base64 encode the source code if required by the API
      const base64EncodedCode = btoa(currentCode); // `btoa()` encodes a string to base64

      // Make a POST request to Judge0 API for code execution
      const response = await axios.post('https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=true&wait=false&fields=*', {
        language_id: language, // Ensure `language` is set correctly in your component
        source_code: base64EncodedCode,
        stdin: '', // Add input if necessary
      }, {
        headers: {
          'Content-Type': 'application/json',
          'x-rapidapi-host': 'judge0-ce.p.rapidapi.com',
          'x-rapidapi-key': 'f5d59ce024msha6cd5fccde3d182p14459fjsn8a83590f92b4'
        }
      });

      console.log('Submission response:', response.data);

      // Polling for the result of the code execution
      const token = response.data.token;
      let result = null;

      while (!result || result.status.id <= 2) {
        console.log(`Polling result for token: ${token}`);
        const statusResponse = await axios.get(`https://judge0-ce.p.rapidapi.com/submissions/${token}?base64_encoded=true&fields=*`, {
          headers: {
            'x-rapidapi-host': 'judge0-ce.p.rapidapi.com',
            'x-rapidapi-key': 'f5d59ce024msha6cd5fccde3d182p14459fjsn8a83590f92b4'
          }
        });

        result = statusResponse.data;

        // Decode the output if it's base64-encoded
        const decodedOutput = result.stdout ? atob(result.stdout) : (result.stderr ? atob(result.stderr) : 'No output');
        console.log('Polling response:', result);

        // Wait for a short duration before the next poll (e.g., 1 second)
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Set the output only when status is finished
        if (result.status.id > 2) {
          setOutput(decodedOutput);
        }
      }
    } catch (error) {
      console.error('Error executing code:', error);
      setOutput('Error executing code');
    }
    setCodeEditorHeight(50);
  };

  const handleAssessCode = async () => {
    try {
      if (!yText) {
        console.error('Error: Yjs text instance is not available');
        setOutput('Error: Yjs text instance is not available');
        return;
      }

      setOutput('Waiting for code assessment...');

      const currentCode = yText.toString();
      const questionInput = "1: Question - " + questionTitle + "\n" + "2: Description" + questionDescription + "\n";
      const codeAttempt = "3: Code attempt in - " + syntaxFullLang + "\n" + currentCode;
      const inputString = questionInput + codeAttempt;
      const responseContent = await assessCode(inputString);
      //setCommentOutput(responseContent);
      console.log(responseContent)
      setOutput(responseContent)
    } catch (error) {
      console.error('Error executing OpenAI API call:', error);
      setOutput('Error executing code');
    }
    setCodeEditorHeight(50);
  };

  return (
    <div className="h-screen w-screen bg-gray-50 p-4 flex overflow-hidden">
      <div className="left-panel bg-white rounded-md border border-gray-200"
        style={{ width: `${leftPaneWidth}%` }}
      >
        <div className="h-full p-6">
          <div className="question-info space-y-4">
            <h2 className="text-2xl font-medium text-gray-900">Q. {questionTitle}</h2>

            <div className="flex gap-2">
              {topics && (
                <span className="px-3 py-1 text-sm rounded-full bg-gray-100 text-gray-700">
                  {topics}
                </span>
              )}
              {difficulty && (
                <span className="px-3 py-1 text-sm rounded-full bg-gray-100 text-gray-700">
                  {difficulty}
                </span>
              )}
            </div>

            <p className="text-gray-700 leading-relaxed">{questionDescription}</p>
          </div>

          <div className="test-cases mt-8">
            <h3 className="font-medium text-lg text-gray-900 mb-4">Test Cases</h3>
            <div className="">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border border-gray-200">Input 1</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border border-gray-200">Output 1</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border border-gray-200">Input 2</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border border-gray-200">Output 2</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-4 py-2 text-sm text-gray-700 border border-gray-200">{input1}</td>
                    <td className="px-4 py-2 text-sm text-gray-700 border border-gray-200">{output1}</td>
                    <td className="px-4 py-2 text-sm text-gray-700 border border-gray-200">{input2}</td>
                    <td className="px-4 py-2 text-sm text-gray-700 border border-gray-200">{output2}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {sessionId && <Chat sessionId={sessionId.replace("matched on Session ID: ", "")} />}
        </div>
      </div>

      <div className="resizer w-2 cursor-col-resize flex items-center justify-center hover:bg-gray-200 active:bg-gray-300 transition-colors"
        onMouseDown={handleHorizontalResize}
      >
        <GripVertical className="text-gray-400" size={40} />
      </div>

      <div className="right-panel flex-1 bg-white">
        <div className="coding-area flex flex-col rounded-md border border-gray-200" style={{ height: `${codeEditorHeight}%` }}>
          <div className="top-portion flex-none px-2 py-1 border-b border-gray-200 flex items-center bg-slate-200 justify-between">
            <div className='flex-none gap-1 flex'>
              <Code2 size={18} className="text-gray-600" />
              <h3 className="text-sm font-medium text-gray-900">Code</h3>
            </div>
            <button
              onClick={handleLeaveSession}
              className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Leave Session
            </button>
          </div>
          <div className="buttons border-b space-x-2 border-gray-200 flex px-2 py-1 items-center h-14">
            <div className="relative md:w-48">
              <select
                name="topic"
                value={language}
                onChange={(e) => handleLangChange(e)}
                className="w-full h-10 px-3 pr-8 rounded bg-gray-50 border border-gray-300 text-gray-600 text-sm font-medium hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 cursor-pointer appearance-none font-inherit"
                required
              >
                <option value="" disabled>Select Language</option>
                <option value="63">JavaScript</option>
                <option value="50">C</option>
                <option value="54">C++</option>
                <option value="51">C#</option>
                <option value="71">Python</option>
                <option value="62">Java</option>
                <option value="72">Ruby</option>
                <option value="78">Kotlin</option>
              </select>
              <div className="pointer-events-none absolute top-1 right-3 flex items-center text-gray-500">
              ⌄
              </div>
            </div>


            <div className='space-x-2'>
              <button
                onClick={handleRunCode}
                className="px-4 py-2 bg-green-500 text-white rounded text-sm hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                Run
              </button>
              <button
                onClick={handleAssessCode}
                className="px-4 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Access
              </button>
            </div>


          </div>

          <div className="code-editor flex-1 flex flex-col space-y-0 min-h-0">
            <CodeMirror
              className="h-full overflow-auto"
              ref={editorRef}
              options={{
                mode: syntaxLang,
                lineNumbers: true,
                tabSize: 2,
                indentWithTabs: true,
                showHint: true,
                extraKeys: {
                  'Ctrl-Space': 'autocomplete',
                },
                hintOptions: { completeSingle: false },
              }}

              editorDidMount={(editor) => {
                editor.on('keyup', (cm: any, event: any) => {
                  // Only trigger autocomplete on specific characters
                  const triggerKeys = /^[a-zA-Z0-9_]$/; // Allow letters, numbers, and underscore
                  if (
                    triggerKeys.test(event.key) &&
                    !cm.state.completionActive // Ensure that completion is not already active
                  ) {
                    cm.showHint({ completeSingle: false });
                  }
                });
              }}
              onChange={() => {
                // Let Yjs handle all updates; do not use setCode here
              }}
            />
          </div>
        </div>

        <div className="resizer h-2 cursor-row-resize flex items-center justify-center hover:bg-gray-200 active:bg-gray-300 transition-colors"
          onMouseDown={handleVerticalResize}
        >
          <GripHorizontal className="text-gray-400" size={10} />
        </div>

        <div className=" output-section border-t border-gray-200 rounded-md overflow-auto"
          style={{ height: `${100 - codeEditorHeight}%` }}
        >
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Output</h3>
            <pre className="bg-gray-50 p-4 rounded text-sm text-gray-700 font-mono">{output}</pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollaborationServiceIntegratedView;