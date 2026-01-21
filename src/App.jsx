import React, { useState, useEffect, useRef } from 'react';
import { Plus, Save, Trash2, Sparkles, X, Monitor, Disc, Star, Zap, Trophy, Gamepad2, Flame, Check, XCircle, Upload, Minus, Square } from 'lucide-react';

const Y2KFlashcardApp = () => {
  // --- STATE MANAGEMENT ---
  const [classes, setClasses] = useState(() => {
    try {
      const saved = localStorage.getItem('y2k-flashcards');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  
  const [currentView, setCurrentView] = useState('home'); 
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const fileInputRef = useRef(null);
  
  // Game State
  const [gameState, setGameState] = useState({
    isActive: false,
    cards: [],
    currentIndex: 0,
    isFlipped: false,
    score: 0,
    streak: 0,
    maxStreak: 0,
    correctCount: 0,
    showResult: false
  });

  // Form states
  const [showClassModal, setShowClassModal] = useState(false);
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newTopicName, setNewTopicName] = useState('');
  const [flashcardFront, setFlashcardFront] = useState('');
  const [flashcardBack, setFlashcardBack] = useState('');
  const [searchingStickers, setSearchingStickers] = useState(false);

  // Persistence
  useEffect(() => {
    localStorage.setItem('y2k-flashcards', JSON.stringify(classes));
  }, [classes]);

  // --- LOGIC & HELPERS ---
  const y2kStickers = ['👽', '💿', '💾', '👾', '🦋', '⚡', '🌈', '🎱', '🌸', '✨', '💅', '💖', '💊', '🧬', '🧸', '🍭'];

  const fetchStickers = async (text) => {
    setSearchingStickers(true);
    try {
      await new Promise(r => setTimeout(r, 400)); 
      return getRandomStickers();
    } catch (error) {
      return getRandomStickers();
    } finally {
      setSearchingStickers(false);
    }
  };

  const getRandomStickers = () => {
    const shuffled = [...y2kStickers].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3);
  };

  const organizeText = (text) => {
    if (!text) return '';
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length <= 1) return text;
    return lines.map((line) => {
      if (line.trim().startsWith('•') || line.trim().startsWith('-')) return line;
      if (line.length < 50) return `> ${line}`;
      return line;
    }).join('\n');
  };

  const getFontSize = (text) => {
    if (!text) return 'text-xl md:text-3xl';
    const len = text.length;
    if (len < 20) return 'text-3xl md:text-5xl';
    if (len < 60) return 'text-2xl md:text-3xl';
    if (len < 120) return 'text-xl md:text-2xl';
    if (len < 200) return 'text-lg md:text-xl';
    return 'text-sm md:text-base';
  };

  // --- ANKI ALGORITHM ---
  const formatInterval = (days) => {
    if (days === 0) return '<10m';
    if (days < 1) return '1d';
    return `${Math.round(days)}d`;
  };

  const calculateNextReview = (card, rating) => {
    if (!card) return { interval: 0, ease: 2.5, dueDate: Date.now() };
    let interval = card.interval || 0;
    let ease = card.ease || 2.5;
    
    if (rating === 0) { interval = 0; ease = Math.max(1.3, ease - 0.2); }
    else if (rating === 1) { interval = interval === 0 ? 1 : interval * 1.2; ease = Math.max(1.3, ease - 0.15); }
    else if (rating === 2) { interval = interval === 0 ? 1 : interval * ease; }
    else if (rating === 3) { interval = interval === 0 ? 4 : interval * ease * 1.3; ease += 0.15; }

    return { interval, ease, dueDate: Date.now() + (interval * 24 * 60 * 60 * 1000) };
  };

  // --- CSV IMPORT ---
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file || !selectedTopic) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n');
      const newCards = lines.filter(line => line.trim() !== '').map(line => {
          const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
          if (parts.length >= 2) {
            let front = parts[0].trim().replace(/^"|"$/g, ''); 
            let back = parts[1].trim().replace(/^"|"$/g, '');
            return { id: Date.now() + Math.random(), front: organizeText(front), back: organizeText(back), stickers: getRandomStickers(), interval: 0, ease: 2.5, dueDate: 0 };
          }
          return null;
        }).filter(card => card !== null);

      if (newCards.length > 0) {
        setClasses(prev => prev.map(c => c.id === selectedClass.id ? { ...c, topics: c.topics.map(t => t.id === selectedTopic.id ? { ...t, flashcards: [...t.flashcards, ...newCards] } : t) } : c));
        setSelectedTopic(prev => ({ ...prev, flashcards: [...prev.flashcards, ...newCards] }));
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  // --- CRUD OPERATIONS ---
  const addClass = () => {
    if (!newClassName.trim()) return;
    setClasses(prev => [...prev, { id: Date.now() + Math.random(), name: newClassName, topics: [] }]);
    setNewClassName(''); setShowClassModal(false);
  };

  const addTopic = () => {
    if (!newTopicName.trim() || !selectedClass) return;
    setClasses(prev => prev.map(c => c.id === selectedClass.id ? { ...c, topics: [...c.topics, { id: Date.now() + Math.random(), name: newTopicName, flashcards: [] }] } : c));
    setNewTopicName(''); setShowTopicModal(false);
  };

  const saveFlashcard = async () => {
    if (!flashcardFront.trim() || !flashcardBack.trim() || !selectedTopic) return;
    const keywords = (flashcardFront + ' ' + flashcardBack).split(' ').slice(0, 3).join(' ');
    const stickers = await fetchStickers(keywords);
    const newCard = { id: Date.now() + Math.random(), front: organizeText(flashcardFront), back: organizeText(flashcardBack), stickers, interval: 0, ease: 2.5, dueDate: 0 };
    setClasses(prev => prev.map(c => c.id === selectedClass.id ? { ...c, topics: c.topics.map(t => t.id === selectedTopic.id ? { ...t, flashcards: [...t.flashcards, newCard] } : t) } : c));
    setSelectedTopic(prev => ({ ...prev, flashcards: [...prev.flashcards, newCard] }));
    setFlashcardFront(''); setFlashcardBack('');
  };

  const deleteFlashcard = (cardId) => {
    setClasses(prev => prev.map(c => c.id === selectedClass.id ? { ...c, topics: c.topics.map(t => t.id === selectedTopic.id ? { ...t, flashcards: t.flashcards.filter(f => f.id !== cardId) } : t) } : c));
    setSelectedTopic(prev => ({ ...prev, flashcards: prev.flashcards.filter(f => f.id !== cardId) }));
  };

  const deleteClass = (classId) => {
    setClasses(prev => prev.filter(c => c.id !== classId));
    if (selectedClass?.id === classId) { setSelectedClass(null); setSelectedTopic(null); setCurrentView('browse'); }
  };

  const deleteTopic = (classId, topicId) => {
    setClasses(prev => prev.map(c => c.id === classId ? { ...c, topics: c.topics.filter(t => t.id !== topicId) } : c));
    if (selectedTopic?.id === topicId) setSelectedTopic(null);
  };

  // --- GAME LOGIC ---
  const startGame = (topic) => {
    if (!topic || topic.flashcards.length === 0) return;
    const now = Date.now();
    const sortedCards = [...topic.flashcards].sort((a, b) => {
      const aDue = (a.dueDate || 0) < now; const bDue = (b.dueDate || 0) < now;
      if (aDue && !bDue) return -1; if (!aDue && bDue) return 1; return 0.5 - Math.random();
    });
    setGameState({ isActive: true, cards: sortedCards, currentIndex: 0, isFlipped: false, score: 0, streak: 0, maxStreak: 0, correctCount: 0, showResult: false });
    setSelectedTopic(topic);
    setCurrentView('game');
  };

  const handleSRSAnswer = (rating) => {
    if (!selectedClass) { setGameState(prev => ({ ...prev, showResult: true })); return; }
    const currentCard = gameState.cards[gameState.currentIndex];
    if (!currentCard) return;

    const srsData = calculateNextReview(currentCard, rating);
    let points = 0; let streakChange = 0; let isCorrect = true;

    if (rating === 0) { streakChange = -gameState.streak; points = 0; isCorrect = false; }
    else if (rating === 1) { streakChange = 0; points = 50 + (gameState.streak * 10); }
    else if (rating === 2) { streakChange = 1; points = 100 + (gameState.streak * 20); }
    else if (rating === 3) { streakChange = 2; points = 150 + (gameState.streak * 30); }

    const newStreak = Math.max(0, gameState.streak + streakChange);
    const newScore = gameState.score + points;
    const newCorrectCount = gameState.correctCount + (isCorrect ? 1 : 0);

    setClasses(prev => prev.map(c => c.id === selectedClass.id ? { ...c, topics: c.topics.map(t => t.id === selectedTopic.id ? { ...t, flashcards: t.flashcards.map(f => f.id === currentCard.id ? { ...f, ...srsData } : f) } : t) } : c));

    if (gameState.currentIndex + 1 < gameState.cards.length) {
      setGameState(prev => ({ ...prev, score: newScore, streak: newStreak, correctCount: newCorrectCount, maxStreak: Math.max(prev.maxStreak, newStreak), currentIndex: prev.currentIndex + 1, isFlipped: false }));
    } else {
      setGameState(prev => ({ ...prev, score: newScore, streak: newStreak, correctCount: newCorrectCount, maxStreak: Math.max(prev.maxStreak, newStreak), showResult: true }));
    }
  };

  const currentCard = gameState.isActive && gameState.cards && gameState.cards.length > 0 ? gameState.cards[gameState.currentIndex] : null;

  // --- RENDER ---
  return (
    <div className="min-h-screen relative overflow-hidden bg-purple-100 font-sans selection:bg-pink-400 selection:text-white">
      {/* Styles */}
      <style>{`
        @import url('https://fonts.cdnfonts.com/css/monitorica');
        @import url('https://fonts.googleapis.com/css2?family=VT323&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Russo+One&display=swap');
        
        .font-tech { font-family: 'Monitorica', 'Impact', sans-serif; }
        .font-pixel { font-family: 'VT323', monospace; }
        .font-heavy { font-family: 'Russo One', sans-serif; }
        
        /* Retro Grid Background */
        .bg-grid {
          background-image: 
            linear-gradient(rgba(139, 92, 246, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139, 92, 246, 0.1) 1px, transparent 1px);
          background-size: 30px 30px;
        }

        /* 3D Retro Window Style */
        .win95-box {
          background-color: #FFFDF5; /* Cream/Beige */
          border: 2px solid black;
          box-shadow: 6px 6px 0px 0px rgba(0,0,0,1);
        }

        .win95-header {
          background: linear-gradient(90deg, #FF9A9E 0%, #FECFEF 99%, #FECFEF 100%);
          border-bottom: 2px solid black;
        }

        .win95-btn {
          background-color: #fff;
          border: 2px solid black;
          box-shadow: 3px 3px 0px 0px rgba(0,0,0,1);
          transition: all 0.1s;
        }
        .win95-btn:active {
          transform: translate(2px, 2px);
          box-shadow: 1px 1px 0px 0px rgba(0,0,0,1);
        }
        .win95-btn:disabled {
          background-color: #e5e5e5;
          color: #999;
          box-shadow: none;
          transform: none;
          cursor: not-allowed;
        }

        /* Input styling */
        .retro-input {
          background-color: white;
          border: 2px solid black;
          box-shadow: inset 2px 2px 0px 0px #e0e0e0;
        }

        /* Progress Bar Blocks */
        .progress-blocks {
          background-image: linear-gradient(90deg, 
            #3b82f6 20%, transparent 20%, 
            transparent 40%, #3b82f6 40%, 
            #3b82f6 60%, transparent 60%, 
            transparent 80%, #3b82f6 80%);
          background-size: 20px 100%;
        }

        /* Animations */
        .animate-bounce-in { animation: bounceIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        @keyframes bounceIn {
          0% { opacity: 0; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1); }
        }
        .animate-spin-slow { animation: spin 8s linear infinite; }
        
        .scene { perspective: 1000px; }
        .card-inner { position: relative; width: 100%; height: 100%; text-align: center; transition: transform 0.6s; transform-style: preserve-3d; }
        .card-face { position: absolute; width: 100%; height: 100%; -webkit-backface-visibility: hidden; backface-visibility: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .card-front { transform: rotateY(0deg); }
        .card-back { transform: rotateY(180deg); }
        .is-flipped { transform: rotateY(180deg); }
      `}</style>

      {/* Global Background */}
      <div className="fixed inset-0 bg-purple-50 bg-grid z-0"></div>
      
      {/* Sparkles Decoration (Static for performance) */}
      <div className="fixed top-10 left-10 text-pink-400 opacity-50 animate-pulse">✨</div>
      <div className="fixed bottom-20 right-20 text-blue-400 opacity-50 animate-pulse delay-75">✨</div>
      <div className="fixed top-1/2 left-20 text-yellow-400 opacity-50 animate-pulse delay-150">✦</div>

      <div className="relative z-10 max-w-6xl mx-auto p-4 md:p-8 flex flex-col h-screen">
        
        {/* === HEADER (UPDATED AESTHETIC) === */}
        {currentView !== 'game' && (
          <div className="text-center mb-10 mt-4 relative z-10 animate-bounce-in">
            <div className="relative inline-block group">
              {/* Decorative Elements */}
              <Star className="absolute -top-6 -left-8 text-yellow-400 w-8 h-8 animate-spin-slow fill-yellow-400 drop-shadow-[2px_2px_0px_black]" />
              <div className="absolute -bottom-4 -right-6 text-2xl animate-bounce">🍬</div>
              
              {/* Main Title with Stroke */}
              <h1 className="text-6xl md:text-8xl font-heavy tracking-tight text-white drop-shadow-[5px_5px_0px_rgba(0,0,0,1)]"
                  style={{ WebkitTextStroke: '2px black' }}>
                FLASH<span className="text-pink-400">_</span>POP
              </h1>
              
              {/* Rotated Badge */}
              <span className="absolute -top-4 -right-10 bg-gradient-to-r from-cyan-300 to-blue-300 text-black border-2 border-black px-2 py-0 text-xl md:text-2xl font-heavy shadow-[3px_3px_0px_black] rotate-12 group-hover:rotate-6 transition-transform">
                OS
              </span>
            </div>
            
            {/* System Bar */}
            <div className="mt-4 flex justify-center">
              <div className="bg-white border-2 border-black px-3 py-1 shadow-[3px_3px_0px_#ccc] flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <p className="font-pixel text-lg md:text-xl text-blue-800">
                  SYSTEM_READY... v2.0
                </p>
              </div>
            </div>
          </div>
        )}

        {/* === NAVIGATION === */}
        {currentView !== 'game' && (
          <div className="flex justify-center gap-4 mb-8 flex-wrap">
            {['home', 'browse', 'create'].map((view) => (
              <button
                key={view}
                onClick={() => setCurrentView(view)}
                className={`
                  win95-btn px-6 py-2 font-heavy text-lg md:text-xl uppercase tracking-wider
                  ${currentView === view 
                    ? 'bg-yellow-200 text-black translate-x-[2px] translate-y-[2px] shadow-[1px_1px_0px_black]' 
                    : 'text-gray-700 hover:bg-white'
                  }
                `}
              >
                {view}
              </button>
            ))}
          </div>
        )}

        {/* === MAIN WINDOW === */}
        <div className="win95-box flex-1 flex flex-col max-h-[85vh] relative animate-bounce-in">
          
          {/* Window Header */}
          <div className="win95-header h-10 flex items-center justify-between px-3 select-none">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-white border border-black flex items-center justify-center font-bold text-[10px]">💾</div>
              <span className="font-heavy text-white tracking-widest text-sm md:text-base drop-shadow-md">
                C:\USER\BRAIN\{currentView.toUpperCase()}.EXE
              </span>
            </div>
            <div className="flex gap-1">
              <button className="w-5 h-5 bg-gray-200 border border-black flex items-center justify-center hover:bg-white active:bg-gray-300"><Minus size={12}/></button>
              <button className="w-5 h-5 bg-gray-200 border border-black flex items-center justify-center hover:bg-white active:bg-gray-300"><Square size={10}/></button>
              <button onClick={() => setCurrentView('home')} className="w-5 h-5 bg-red-400 border border-black flex items-center justify-center hover:bg-red-300 active:bg-red-500 text-white"><X size={14}/></button>
            </div>
          </div>

          {/* Window Content */}
          <div className="p-4 md:p-6 max-h-[calc(100%-40px)] overflow-y-auto flex-1 bg-[#Fdfbf7]">
            
            {/* HOME VIEW */}
            {currentView === 'home' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border-2 border-black p-4 bg-white shadow-[4px_4px_0px_#E5E7EB]">
                  <h2 className="text-2xl font-heavy mb-4 flex items-center gap-2 text-purple-600">
                    <Star className="fill-yellow-400 text-black" /> STATS.TXT
                  </h2>
                  <div className="space-y-3 font-pixel text-xl text-gray-700">
                    <div className="flex justify-between border-b-2 border-dotted border-gray-300"><span>CLASSES:</span><span className="text-blue-600">{classes.length}</span></div>
                    <div className="flex justify-between border-b-2 border-dotted border-gray-300"><span>TOPICS:</span><span className="text-pink-600">{classes.reduce((sum, c) => sum + c.topics.length, 0)}</span></div>
                    <div className="flex justify-between border-b-2 border-dotted border-gray-300"><span>CARDS:</span><span className="text-green-600">{classes.reduce((sum, c) => sum + c.topics.reduce((s, t) => s + t.flashcards.length, 0), 0)}</span></div>
                  </div>
                  <button onClick={() => setShowClassModal(true)} className="win95-btn w-full mt-6 py-3 bg-green-200 font-heavy text-lg flex items-center justify-center gap-2">
                    <Plus size={20} /> NEW CLASS
                  </button>
                </div>

                <div className="border-2 border-black p-4 bg-blue-50 shadow-[4px_4px_0px_#BFDBFE]">
                  <div className="mb-4 border-b-2 border-black pb-1 font-heavy text-lg">RECENT_FILES</div>
                  {classes.length === 0 ? (
                    <div className="text-center py-10 font-pixel text-gray-400">FOLDER IS EMPTY...</div>
                  ) : (
                    <div className="space-y-2">
                      {classes.slice(0, 5).map(cls => (
                        <div key={cls.id} onClick={() => { setSelectedClass(cls); setCurrentView('browse'); }} 
                             className="cursor-pointer bg-white border-2 border-black p-2 hover:bg-yellow-100 flex justify-between items-center transition-colors">
                          <span className="font-pixel text-xl truncate">{cls.name}</span>
                          <span className="text-xs font-heavy bg-black text-white px-1">DIR</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* BROWSE VIEW */}
            {currentView === 'browse' && (
              <div className="space-y-6">
                {classes.length === 0 ? (
                  <div className="text-center py-20">
                    <Disc size={64} className="mx-auto mb-4 text-gray-300" />
                    <p className="font-pixel text-2xl text-gray-500">NO DATA FOUND</p>
                    <button onClick={() => setShowClassModal(true)} className="mt-4 text-blue-600 underline font-pixel text-xl">CREATE NEW</button>
                  </div>
                ) : (
                  classes.map(cls => (
                    <div key={cls.id} className="border-2 border-black bg-pink-50 p-4 shadow-[4px_4px_0px_#FBCFE8]">
                      <div className="flex justify-between items-center mb-4 border-b-2 border-black pb-2">
                        <h3 className="text-2xl font-heavy text-black">{cls.name}</h3>
                        <button onClick={() => deleteClass(cls.id)} className="win95-btn p-1 bg-red-200 hover:bg-red-300"><Trash2 size={18} /></button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {cls.topics.map(topic => (
                          <div key={topic.id} className="bg-white border-2 border-black p-3 relative hover:shadow-[4px_4px_0px_#FDE047] transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-heavy text-lg truncate pr-6">{topic.name}</h4>
                              <Zap size={16} className="text-yellow-500 fill-yellow-500" />
                            </div>
                            <p className="font-pixel text-gray-500 mb-4">{topic.flashcards.length} items</p>
                            <div className="flex gap-2">
                              <button onClick={() => { setSelectedClass(cls); setSelectedTopic(topic); setCurrentView('create'); }} className="win95-btn flex-1 py-1 text-sm font-bold bg-gray-100">EDIT</button>
                              <button onClick={() => { setSelectedClass(cls); startGame(topic); }} disabled={topic.flashcards.length === 0} className="win95-btn flex-1 py-1 text-sm font-bold bg-blue-200 flex items-center justify-center gap-1 disabled:opacity-50"><Gamepad2 size={14}/> PLAY</button>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); deleteTopic(cls.id, topic.id); }} className="absolute -top-2 -right-2 bg-white border-2 border-black w-6 h-6 flex items-center justify-center hover:bg-red-200"><X size={14}/></button>
                          </div>
                        ))}
                        <button onClick={() => { setSelectedClass(cls); setShowTopicModal(true); }} className="border-2 border-dashed border-gray-400 p-4 flex flex-col items-center justify-center text-gray-400 hover:bg-white hover:border-black hover:text-black transition-colors font-pixel text-xl"><Plus size={24} className="mb-2" /> NEW TOPIC</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* CREATE VIEW */}
            {currentView === 'create' && (
              <div className="max-h-[400px] flex flex-col md:flex-row gap-6">
                <div className="flex-1 flex flex-col gap-4">
                  <div className="max-h-[100vh-40px] border-2 border-black p-4 bg-white shadow-[4px_4px_0px_rgba(0,0,0,0.1)]">
                    <div className="flex gap-4 mb-4">
                      <div className="flex-1">
                        <label className="font-pixel text-lg block mb-1">Target_Class:</label>
                        <select value={selectedClass ? selectedClass.id : ''} onChange={(e) => { const cls = classes.find(c => c.id === parseFloat(e.target.value)); setSelectedClass(cls); setSelectedTopic(null); }} className="retro-input w-full p-2 font-pixel text-xl outline-none">
                          <option value="">SELECT...</option>
                          {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="font-pixel text-lg block mb-1">Target_Topic:</label>
                        <select value={selectedTopic ? selectedTopic.id : ''} disabled={!selectedClass} onChange={(e) => { const topic = selectedClass.topics.find(t => t.id === parseFloat(e.target.value)); setSelectedTopic(topic); }} className={`retro-input w-full p-2 font-pixel text-xl outline-none ${!selectedClass && 'bg-gray-100 text-gray-400'}`}>
                          <option value="">{selectedClass ? 'SELECT...' : 'LOCKED'}</option>
                          {selectedClass?.topics.map(topic => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="bg-blue-100 border-2 border-black border-b-0 px-2 py-1 font-heavy text-xs inline-block">FRONT SIDE</div>
                        <textarea value={flashcardFront} onChange={(e) => setFlashcardFront(e.target.value)} className="retro-input w-full h-24 p-3 font-pixel text-xl resize-none" placeholder="Type question..." />
                      </div>
                      <div>
                        <div className="bg-pink-100 border-2 border-black border-b-0 px-2 py-1 font-heavy text-xs inline-block">BACK SIDE</div>
                        <textarea value={flashcardBack} onChange={(e) => setFlashcardBack(e.target.value)} className="retro-input w-full h-24 p-3 font-pixel text-xl resize-none" placeholder="Type answer..." />
                      </div>
                    </div>

                    <div className="flex gap-3 mt-4">
                      <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                      <button onClick={() => fileInputRef.current.click()} disabled={!selectedTopic} className="win95-btn flex-1 py-3 bg-green-100 font-heavy text-lg flex items-center justify-center gap-2"><Upload size={18} /> IMPORT CSV</button>
                      <button onClick={saveFlashcard} disabled={!flashcardFront || !flashcardBack || !selectedTopic || searchingStickers} className="win95-btn flex-1 py-3 bg-blue-200 font-heavy text-lg flex items-center justify-center gap-2"><Save size={18} />{searchingStickers ? 'SAVING...' : 'SAVE CARD'}</button>
                    </div>
                  </div>
                </div>

                <div className="max-h-[100vh-40px] w-full md:w-80 border-2 border-black bg-white p-4 overflow-y-auto shadow-inner">
                  <div className="font-heavy text-lg border-b-2 border-black mb-4 pb-2">DATABASE_VIEW</div>
                  {selectedTopic?.flashcards.map(card => (
                    <div key={card.id} className="border-2 border-black p-2 mb-2 bg-yellow-50 relative group">
                      <div className="flex justify-between text-xs mb-1 opacity-50 font-bold"><span>ID: {Math.floor(card.id).toString().slice(-4)}</span><button onClick={() => deleteFlashcard(card.id)} className="text-red-500 hover:text-red-700 font-bold">DEL</button></div>
                      <div className="font-pixel text-lg truncate">Q: {card.front}</div>
                      <div className="font-pixel text-lg text-blue-600 truncate">A: {card.back}</div>
                    </div>
                  ))}
                  {!selectedTopic && <div className="text-center font-pixel text-gray-400 mt-10">SELECT A TOPIC TO VIEW CARDS</div>}
                </div>
              </div>
            )}

            {/* GAME VIEW */}
            {currentView === 'game' && gameState.isActive && currentCard ? (
              <div className="h-full flex flex-col">
                {/* HUD */}
                <div className="flex justify-between items-end border-b-4 border-double border-black pb-4 mb-4 font-pixel text-xl">
                  <div>
                    <div className="text-xs text-gray-500 font-bold">SCORE</div>
                    <div className="text-blue-600">{gameState.score.toString().padStart(6, '0')}</div>
                  </div>
                  <div className="flex flex-col items-center w-1/2">
                    <div className="w-full h-4 border-2 border-black bg-white relative">
                      <div className="h-full bg-blue-500 absolute top-0 left-0" style={{ width: `${Math.min(100, ((gameState.currentIndex + 1) / gameState.cards.length) * 100)}%` }}></div>
                      {/* Grid overlay for progress bar */}
                      <div className="absolute inset-0 w-full h-full" style={{backgroundImage: 'linear-gradient(90deg, transparent 90%, white 90%)', backgroundSize: '10% 100%'}}></div>
                    </div>
                    <span className="text-xs mt-1">{gameState.currentIndex + 1} / {gameState.cards.length}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500 font-bold">COMBO</div>
                    <div className={`flex items-center gap-1 ${gameState.streak > 2 ? 'text-orange-500' : 'text-gray-400'}`}>
                      <Flame size={16} fill="currentColor" /> x{gameState.streak}
                    </div>
                  </div>
                </div>

                {/* GAME AREA */}
                <div className="flex-1 flex flex-col items-center justify-center relative">
                  {!gameState.showResult ? (
                    <>
                      <div className="scene w-full max-w-2xl aspect-video mb-6 cursor-pointer" onClick={() => setGameState(prev => ({ ...prev, isFlipped: !prev.isFlipped }))}>
                        <div className={`card-inner ${gameState.isFlipped ? 'is-flipped' : ''}`}>
                          {/* Front */}
                          <div className="card-face card-front bg-white border-2 border-black shadow-[8px_8px_0px_black] flex flex-col">
                            <div className="w-full bg-blue-100 border-b-2 border-black px-2 py-1 flex justify-between items-center">
                              <span className="font-heavy text-xs">QUESTION.TXT</span>
                              <div className="flex gap-1"><div className="w-2 h-2 rounded-full bg-red-400 border border-black"></div><div className="w-2 h-2 rounded-full bg-yellow-400 border border-black"></div></div>
                            </div>
                            <div className={`flex-1 w-full flex items-center justify-center p-6 font-pixel text-gray-800 break-words overflow-y-auto ${getFontSize(currentCard.front)}`}>
                              {currentCard.front}
                            </div>
                            <div className="pb-2 text-xs font-pixel text-gray-400 animate-pulse">CLICK TO FLIP</div>
                          </div>
                          {/* Back */}
                          <div className="card-face card-back bg-[#fff5f5] border-2 border-black shadow-[8px_8px_0px_black] flex flex-col">
                            <div className="w-full bg-pink-100 border-b-2 border-black px-2 py-1 flex justify-between items-center">
                              <span className="font-heavy text-xs">ANSWER.TXT</span>
                              <div className="flex gap-1"><div className="w-2 h-2 rounded-full bg-red-400 border border-black"></div><div className="w-2 h-2 rounded-full bg-yellow-400 border border-black"></div></div>
                            </div>
                            <div className={`flex-1 w-full flex items-center justify-center p-6 font-tech text-black break-words overflow-y-auto ${getFontSize(currentCard.back)}`}>
                              {currentCard.back}
                            </div>
                            <div className="pb-2 flex gap-2 text-2xl">{currentCard.stickers.map((s,i) => <span key={i}>{s}</span>)}</div>
                          </div>
                        </div>
                      </div>

                      {/* CONTROLS */}
                      {gameState.isFlipped && (
                        <div className="grid grid-cols-4 gap-3 w-full max-w-2xl">
                          <button onClick={(e) => {e.stopPropagation(); handleSRSAnswer(0)}} className="win95-btn py-3 bg-red-200 hover:bg-red-300 flex flex-col items-center">
                            <span className="font-heavy text-sm">AGAIN</span>
                            <span className="font-pixel text-xs">{formatInterval(calculateNextReview(currentCard, 0).interval)}</span>
                          </button>
                          <button onClick={(e) => {e.stopPropagation(); handleSRSAnswer(1)}} className="win95-btn py-3 bg-orange-200 hover:bg-orange-300 flex flex-col items-center">
                            <span className="font-heavy text-sm">HARD</span>
                            <span className="font-pixel text-xs">{formatInterval(calculateNextReview(currentCard, 1).interval)}</span>
                          </button>
                          <button onClick={(e) => {e.stopPropagation(); handleSRSAnswer(2)}} className="win95-btn py-3 bg-blue-200 hover:bg-blue-300 flex flex-col items-center">
                            <span className="font-heavy text-sm">GOOD</span>
                            <span className="font-pixel text-xs">{formatInterval(calculateNextReview(currentCard, 2).interval)}</span>
                          </button>
                          <button onClick={(e) => {e.stopPropagation(); handleSRSAnswer(3)}} className="win95-btn py-3 bg-green-200 hover:bg-green-300 flex flex-col items-center">
                            <span className="font-heavy text-sm">EASY</span>
                            <span className="font-pixel text-xs">{formatInterval(calculateNextReview(currentCard, 3).interval)}</span>
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="border-2 border-black bg-white p-8 text-center shadow-[8px_8px_0px_black] animate-bounce-in">
                      <h2 className="text-4xl font-heavy mb-6 text-purple-600">SESSION COMPLETE</h2>
                      <div className="space-y-4 mb-8 font-pixel text-2xl">
                        <div className="flex justify-between w-64 border-b-2 border-dotted border-gray-300"><span>SCORE:</span><span>{gameState.score}</span></div>
                        <div className="flex justify-between w-64 border-b-2 border-dotted border-gray-300"><span>STREAK:</span><span>{gameState.maxStreak}</span></div>
                        <div className="flex justify-between w-64 border-b-2 border-dotted border-gray-300"><span>ACCURACY:</span><span>{Math.round((gameState.correctCount / gameState.cards.length) * 100)}%</span></div>
                      </div>
                      <div className="flex gap-4 justify-center">
                        <button onClick={() => setCurrentView('browse')} className="win95-btn px-6 py-2 bg-gray-200 font-bold">EXIT</button>
                        <button onClick={() => startGame(selectedTopic)} className="win95-btn px-6 py-2 bg-yellow-200 font-bold">RETRY</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : currentView === 'game' ? (
              <div className="flex items-center justify-center h-full"><Disc className="w-12 h-12 animate-spin text-purple-400" /></div>
            ) : null}

          </div>
        </div>

        {/* MODALS */}
        {(showClassModal || showTopicModal) && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="win95-box p-1 w-full max-w-sm">
              <div className="win95-header h-8 flex items-center justify-between px-2 mb-4">
                <span className="text-white font-heavy text-sm">{showClassModal ? 'NEW_DIR' : 'NEW_FILE'}</span>
                <button onClick={() => { setShowClassModal(false); setShowTopicModal(false); }} className="bg-red-400 border border-black text-white w-4 h-4 flex items-center justify-center"><X size={12}/></button>
              </div>
              <div className="p-4">
                <label className="font-pixel block mb-2">ENTER NAME:</label>
                <input type="text" value={showClassModal ? newClassName : newTopicName} onChange={(e) => showClassModal ? setNewClassName(e.target.value) : setNewTopicName(e.target.value)} className="retro-input w-full p-2 font-pixel text-xl mb-6" autoFocus onKeyPress={(e) => e.key === 'Enter' && (showClassModal ? addClass() : addTopic())} />
                <div className="flex justify-end gap-2">
                  <button onClick={() => { setShowClassModal(false); setShowTopicModal(false); }} className="win95-btn px-4 py-1 font-bold">CANCEL</button>
                  <button onClick={showClassModal ? addClass : addTopic} className="win95-btn px-4 py-1 font-bold bg-blue-200">OK</button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Y2KFlashcardApp;