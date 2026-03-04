import React, { useState } from 'react';
import Groq from 'groq-sdk';
import { jsPDF } from 'jspdf';

// Prepmate Constants
const PREP_TYPES = ['Coding', 'Job Preparation', 'Exams', 'Practice', 'Others'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

export default function App() {
  const [step, setStep] = useState('form'); // form, loading, content
  const [prepType, setPrepType] = useState(PREP_TYPES[0]);
  const [difficulty, setDifficulty] = useState(DIFFICULTIES[0]);
  const [topic, setTopic] = useState('');
  const [userApiKey, setUserApiKey] = useState('');
  const [hasGeneratedOnce, setHasGeneratedOnce] = useState(false);
  const [error, setError] = useState('');

  const [chapters, setChapters] = useState([]);
  const [activeChapterIdx, setActiveChapterIdx] = useState(0);
  const [activeTab, setActiveTab] = useState('notes'); // notes, flashcards, quiz

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!topic.trim()) {
      setError('ERROR: Topic is required.');
      return;
    }

    if (hasGeneratedOnce && !userApiKey.trim()) {
      setError('ERROR: Personal API Key is required for subsequent generations.');
      return;
    }

    setError('');
    setStep('loading');

    try {
      // Use user API key if provided, otherwise fallback to system key for first time
      const apiKeyToUse = (hasGeneratedOnce && userApiKey.trim()) ? userApiKey.trim() : process.env.GROQ_API_KEY;
      const groq = new Groq({ apiKey: apiKeyToUse, dangerouslyAllowBrowser: true });

      const response = await groq.chat.completions.create({
        model: "openai/gpt-oss-120b",
        messages: [
          {
            role: "system",
            content: `You are an educational assistant. You must reply strictly in JSON format. The JSON must be an object with a single key "chapters" containing an array of 3 to 5 chapters. Each chapter must have:
- "title": (string)
- "notes": (string, detailed notes enough to fill at least 2 pages of a PDF)
- "flashcards": array of exactly 10 objects with "front" (string) and "back" (string)
- "quiz": array of exactly 10 objects with "question" (string), "options" (array of exactly 4 strings), "correctIndex" (integer 0-3), "explanation" (string).`
          },
          {
            role: "user",
            content: `Generate a study guide for Topic: "${topic}", Preparation Type: "${prepType}", Difficulty: "${difficulty}".`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      let data;
      try {
        data = JSON.parse(response.choices[0].message.content);
      } catch (e) {
        throw new Error("Failed to parse JSON response");
      }

      const chaptersArray = Array.isArray(data) ? data : (data.chapters || []);
      if (!Array.isArray(chaptersArray) || chaptersArray.length === 0) {
        throw new Error("Invalid output format from AI");
      }

      setChapters(chaptersArray);
      setActiveChapterIdx(0);
      setActiveTab('notes');
      setHasGeneratedOnce(true);
      setStep('content');
    } catch (err) {
      console.error(err);
      setError('ERROR: Failed to generate content. Please try again.');
      setStep('form');
    }
  };

  const resetApp = () => {
    setStep('form');
    setTopic('');
    setChapters([]);
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden font-mono">
      <div className="scanline"></div>

      <header className="p-4 border-b-2 border-[#00ff00] flex justify-between items-center z-10 bg-black">
        <h1 className="text-2xl font-bold tracking-widest cursor-pointer" onClick={resetApp}>
          &gt; PREPMATE_
        </h1>
        {step === 'content' && (
          <button onClick={resetApp} className="terminal-button px-4 py-1 text-sm">
            [ NEW_SEARCH ]
          </button>
        )}
      </header>

      <main className="flex-grow flex flex-col z-10 p-4 md:p-8 max-w-7xl mx-auto w-full">
        {step === 'form' && (
          <div className="flex-grow flex items-center justify-center">
            <form onSubmit={handleGenerate} className="terminal-border p-6 md:p-10 w-full max-w-2xl bg-black/80">
              <h2 className="text-xl mb-6 border-b border-[#00ff00] pb-2">INITIATE_PREP_SEQUENCE</h2>

              {error && <div className="text-[#ff0000] mb-4 animate-pulse">{error}</div>}

              <div className="mb-6">
                <label className="block mb-2 text-sm">&gt; SELECT_PREP_TYPE:</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {PREP_TYPES.map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setPrepType(type)}
                      className={`p-2 text-sm border ${prepType === type ? 'bg-[#00ff00] text-black border-[#00ff00]' : 'border-[#00ff00] text-[#00ff00] hover:bg-[#004400]'}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <label className="block mb-2 text-sm">&gt; SELECT_DIFFICULTY:</label>
                <div className="flex gap-2">
                  {DIFFICULTIES.map(diff => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => setDifficulty(diff)}
                      className={`flex-1 p-2 text-sm border ${difficulty === diff ? 'bg-[#00ff00] text-black border-[#00ff00]' : 'border-[#00ff00] text-[#00ff00] hover:bg-[#004400]'}`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-8">
                <label className="block mb-2 text-sm">&gt; ENTER_TOPIC:</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. React Hooks, System Design, World War II..."
                  className="terminal-input w-full p-3 text-lg"
                  autoFocus
                />
              </div>

              {hasGeneratedOnce && (
                <div className="mb-8 p-4 border border-[#ff0000] bg-[#220000]">
                  <label className="block mb-2 text-sm text-[#ff0000]">&gt; PERSONAL_API_KEY_REQUIRED:</label>
                  <input
                    type="password"
                    value={userApiKey}
                    onChange={(e) => setUserApiKey(e.target.value)}
                    placeholder="Enter your Groq API Key..."
                    className="terminal-input w-full p-3 text-lg border-[#ff0000] text-[#ff0000]"
                  />
                  <div className="mt-4 text-xs text-[#ff0000] opacity-80 leading-relaxed">
                    <p className="font-bold mb-1">HOW_TO_GET_YOUR_KEY:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Visit: <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="underline">console.groq.com/keys</a></li>
                      <li>Click "Create API key"</li>
                      <li>Select a project or create a new one</li>
                      <li>Copy the generated key and paste it above</li>
                    </ol>
                  </div>
                </div>
              )}

              <button type="submit" className="terminal-button w-full py-4 text-lg font-bold">
                EXECUTE_GENERATION
              </button>
            </form>
          </div>
        )}

        {step === 'loading' && (
          <div className="flex-grow flex flex-col items-center justify-center text-center">
            <div className="text-4xl mb-4 animate-pulse">&gt; _</div>
            <p className="text-xl mb-2">GENERATING_CONTENT...</p>
            <p className="text-sm opacity-70">Processing topic: {topic}</p>
            <p className="text-sm opacity-70">Type: {prepType} | Difficulty: {difficulty}</p>
            <div className="mt-8 w-64 h-2 border border-[#00ff00] p-[1px]">
              <div className="bg-[#00ff00] h-full w-full animate-[pulse_1s_ease-in-out_infinite]"></div>
            </div>
          </div>
        )}

        {step === 'content' && chapters.length > 0 && (
          <div className="flex flex-col md:flex-row gap-6 flex-grow h-full">
            {/* Sidebar */}
            <div className="w-full md:w-64 flex-shrink-0 flex flex-col gap-4">
              <div className="terminal-border p-4">
                <h3 className="text-lg mb-4 border-b border-[#00ff00] pb-2">CHAPTERS</h3>
                <div className="flex flex-col gap-2">
                  {chapters.map((chap, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setActiveChapterIdx(idx);
                        setActiveTab('notes');
                      }}
                      className={`text-left p-2 text-sm truncate ${activeChapterIdx === idx ? 'bg-[#00ff00] text-black' : 'hover:bg-[#004400]'}`}
                    >
                      {idx + 1}. {chap.title}
                    </button>
                  ))}
                </div>
              </div>

              <div className="terminal-border p-4">
                <p className="text-xs opacity-70 mb-1">TOPIC:</p>
                <p className="text-sm truncate mb-2">{topic}</p>
                <p className="text-xs opacity-70 mb-1">TYPE:</p>
                <p className="text-sm mb-2">{prepType}</p>
                <p className="text-xs opacity-70 mb-1">DIFFICULTY:</p>
                <p className="text-sm">{difficulty}</p>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-grow flex flex-col terminal-border overflow-hidden bg-black/50">
              {/* Tabs */}
              <div className="flex border-b border-[#00ff00]">
                {['notes', 'flashcards', 'quiz'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-3 text-center uppercase text-sm font-bold ${activeTab === tab ? 'bg-[#00ff00] text-black' : 'hover:bg-[#004400]'}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="flex-grow overflow-y-auto p-4 md:p-6 relative">
                {activeTab === 'notes' && <NotesTab chapter={chapters[activeChapterIdx]} />}
                {activeTab === 'flashcards' && <FlashcardsTab flashcards={chapters[activeChapterIdx].flashcards} />}
                {activeTab === 'quiz' && <QuizTab quiz={chapters[activeChapterIdx].quiz} />}
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="p-4 border-t-2 border-[#ff0000] text-center z-10 bg-black">
        <p className="text-[#ff0000] text-sm">
          made by Abhay Kaushik | <a href="https://github.com/AbhayKaushik-ml" target="_blank" rel="noreferrer" className="underline hover:text-[#ff0000]">https://github.com/AbhayKaushik-ml</a>
        </p>
      </footer>
    </div>
  );
}

function NotesTab({ chapter }) {
  const downloadPDF = () => {
    const doc = new jsPDF();
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const maxLineWidth = pageWidth - margin * 2;

    doc.setFont("courier", "bold");
    doc.setFontSize(16);
    doc.text(chapter.title, margin, 20);

    doc.setFont("courier", "normal");
    doc.setFontSize(12);

    const splitText = doc.splitTextToSize(chapter.notes, maxLineWidth);

    let y = 30;
    for (let i = 0; i < splitText.length; i++) {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(splitText[i], margin, y);
      y += 6;
    }

    doc.save(`${chapter.title.replace(/\s+/g, '_')}_Notes.pdf`);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-6 border-b border-[#00ff00] pb-4">
        <h2 className="text-xl font-bold">{chapter.title}</h2>
        <button onClick={downloadPDF} className="terminal-button px-4 py-2 text-sm flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          DOWNLOAD_PDF
        </button>
      </div>
      <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed opacity-90">
        {chapter.notes}
      </div>
    </div>
  );
}

function FlashcardsTab({ flashcards }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const nextCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % flashcards.length);
    }, 150);
  };

  const prevCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
    }, 150);
  };

  if (!flashcards || flashcards.length === 0) return <div>NO_FLASHCARDS_FOUND</div>;

  const card = flashcards[currentIndex];

  return (
    <div className="flex flex-col h-full items-center justify-center max-w-2xl mx-auto w-full">
      <div className="mb-4 text-sm opacity-70">
        CARD {currentIndex + 1} OF {flashcards.length}
      </div>

      <div
        className="relative w-full aspect-[3/2] perspective-1000 cursor-pointer group"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div className={`w-full h-full transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
          {/* Front */}
          <div className="absolute w-full h-full backface-hidden terminal-border bg-black flex flex-col items-center justify-center p-8 text-center">
            <div className="absolute top-4 left-4 text-xs opacity-50">FRONT</div>
            <h3 className="text-xl md:text-2xl">{card.front}</h3>
            <div className="absolute bottom-4 text-xs opacity-50 animate-pulse">CLICK_TO_FLIP</div>
          </div>

          {/* Back */}
          <div className="absolute w-full h-full backface-hidden terminal-border bg-[#002200] flex flex-col items-center justify-center p-8 text-center rotate-y-180">
            <div className="absolute top-4 left-4 text-xs opacity-50">BACK</div>
            <p className="text-lg md:text-xl text-[#00ff00]">{card.back}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-4 mt-8 w-full">
        <button onClick={prevCard} className="terminal-button flex-1 py-3">
          &lt; PREV
        </button>
        <button onClick={nextCard} className="terminal-button flex-1 py-3">
          NEXT &gt;
        </button>
      </div>
    </div>
  );
}

function QuizTab({ quiz }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  if (!quiz || quiz.length === 0) return <div>NO_QUIZ_FOUND</div>;

  const question = quiz[currentIndex];

  const handleOptionClick = (index) => {
    if (showExplanation) return;
    setSelectedOption(index);
    setShowExplanation(true);
    if (index === question.correctIndex) {
      setScore(s => s + 1);
    }
  };

  const nextQuestion = () => {
    if (currentIndex < quiz.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOption(null);
      setShowExplanation(false);
    } else {
      setIsFinished(true);
    }
  };

  const resetQuiz = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setShowExplanation(false);
    setScore(0);
    setIsFinished(false);
  };

  if (isFinished) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <h2 className="text-3xl mb-4">QUIZ_COMPLETED</h2>
        <p className="text-xl mb-8">
          SCORE: {score} / {quiz.length} ({(score / quiz.length * 100).toFixed(0)}%)
        </p>
        <button onClick={resetQuiz} className="terminal-button px-8 py-3">
          RETRY_QUIZ
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col max-w-3xl mx-auto w-full">
      <div className="flex justify-between items-center mb-6 text-sm opacity-70 border-b border-[#00ff00] pb-2">
        <span>QUESTION {currentIndex + 1}/{quiz.length}</span>
        <span>SCORE: {score}</span>
      </div>

      <h3 className="text-lg md:text-xl mb-8 break-words">{question.question}</h3>

      <div className="flex flex-col gap-3 mb-8">
        {question.options.map((opt, idx) => {
          let btnClass = "terminal-button text-left p-4 break-words whitespace-normal h-auto";
          if (showExplanation) {
            if (idx === question.correctIndex) {
              btnClass = "border-2 border-[#00ff00] bg-[#004400] text-[#00ff00] text-left p-4 break-words whitespace-normal h-auto";
            } else if (idx === selectedOption) {
              btnClass = "border-2 border-[#ff0000] bg-[#440000] text-[#ff0000] text-left p-4 break-words whitespace-normal h-auto";
            } else {
              btnClass = "border-2 border-[#00ff00] opacity-30 text-left p-4 break-words whitespace-normal h-auto";
            }
          }
          return (
            <button
              key={idx}
              onClick={() => handleOptionClick(idx)}
              disabled={showExplanation}
              className={btnClass}
            >
              <span className="mr-2 opacity-50">[{String.fromCharCode(65 + idx)}]</span> {opt}
            </button>
          );
        })}
      </div>

      {showExplanation && (
        <div className="terminal-border p-4 mb-6 bg-[#001100]">
          <p className="font-bold mb-2 text-sm">EXPLANATION:</p>
          <p className="text-sm">{question.explanation}</p>
        </div>
      )}

      {showExplanation && (
        <button onClick={nextQuestion} className="terminal-button py-3 mt-auto">
          {currentIndex < quiz.length - 1 ? 'NEXT_QUESTION >' : 'FINISH_QUIZ >'}
        </button>
      )}
    </div>
  );
}
