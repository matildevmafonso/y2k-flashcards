import React, { useState, useEffect, useRef } from 'react';
import { Plus, Save, Trash2, Sparkles, X, Monitor, Disc, Star, Zap, Trophy, Gamepad2, Flame, Check, XCircle, Upload, Clock, RefreshCw } from 'lucide-react';

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
  const y2kStickers = ['👽', '💿', '💾', '👾', '🦋', '⚡', '🌈', '🎱', '🌸', '✨', '💅', '💖', '💊', '🧬'];

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
    if (len < 20) return 'text-4xl md:text-6xl';
    if (len < 60) return 'text-2xl md:text-4xl';
    if (len < 120) return 'text-xl md:text-2xl';
    if (len < 200) return 'text-lg md:text-xl';
    return 'text-sm md:text-base';
  };

  // --- ANKI ALGORITHM HELPERS ---
  const formatInterval = (days) => {
    if (days === 0) return '<10m';
    if (days < 1) return '1d';
    return `${Math.round(days)}d`;
  };

  const calculateNextReview = (card, rating) => {
    if (!card) return { interval: 0, ease: 2.5, dueDate: Date.now() };

    let interval = card.interval || 0;
    let ease = card.ease || 2.5;
    
    if (rating === 0) { // AGAIN
      interval = 0;
      ease = Math.max(1.3, ease - 0.2);
    } else if (rating === 1) { // HARD
      interval = interval === 0 ? 1 : interval * 1.2;
      ease = Math.max(1.3, ease - 0.15);
    } else if (rating === 2) { // GOOD
      interval = interval === 0 ? 1 : interval * ease;
    } else if (rating === 3) { // EASY
      interval = interval === 0 ? 4 : interval * ease * 1.3;
      ease += 0.15;
    }

    return {
      interval: interval,
      ease: ease,
      dueDate: Date.now() + (interval * 24 * 60 * 60 * 1000)
    };
  };

  // --- CSV IMPORT ---
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file || !selectedTopic) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n');
      
      const newCards = lines
        .filter(line => line.trim() !== '')
        .map(line => {
          const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
          if (parts.length >= 2) {
            let front = parts[0].trim().replace(/^"|"$/g, ''); 
            let back = parts[1].trim().replace(/^"|"$/g, '');
            return {
              id: Date.now() + Math.random(),
              front: organizeText(front),
              back: organizeText(back),
              stickers: getRandomStickers(),
              interval: 0,
              ease: 2.5,
              dueDate: 0
            };
          }
          return null;
        })
        .filter(card => card !== null);

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
    const newClass = { id: Date.now() + Math.random(), name: newClassName, topics: [] };
    setClasses(prev => [...prev, newClass]);
    setNewClassName('');
    setShowClassModal(false);
  };

  const addTopic = () => {
    if (!newTopicName.trim() || !selectedClass) return;
    setClasses(prev => prev.map(c => c.id === selectedClass.id ? { ...c, topics: [...c.topics, { id: Date.now() + Math.random(), name: newTopicName, flashcards: [] }] } : c));
    setNewTopicName('');
    setShowTopicModal(false);
  };

  const saveFlashcard = async () => {
    if (!flashcardFront.trim() || !flashcardBack.trim() || !selectedTopic) return;
    const keywords = (flashcardFront + ' ' + flashcardBack).split(' ').slice(0, 3).join(' ');
    const stickers = await fetchStickers(keywords);

    const newCard = {
      id: Date.now() + Math.random(),
      front: organizeText(flashcardFront),
      back: organizeText(flashcardBack),
      stickers: stickers,
      interval: 0,
      ease: 2.5,
      dueDate: 0
    };

    setClasses(prev => prev.map(c => c.id === selectedClass.id ? { ...c, topics: c.topics.map(t => t.id === selectedTopic.id ? { ...t, flashcards: [...t.flashcards, newCard] } : t) } : c));
    setSelectedTopic(prev => ({ ...prev, flashcards: [...prev.flashcards, newCard] }));
    setFlashcardFront('');
    setFlashcardBack('');
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
      const aDue = (a.dueDate || 0) < now;
      const bDue = (b.dueDate || 0) < now;
      if (aDue && !bDue) return -1;
      if (!aDue && bDue) return 1;
      return 0.5 - Math.random();
    });

    setGameState({
      isActive: true,
      cards: sortedCards,
      currentIndex: 0,
      isFlipped: false,
      score: 0,
      streak: 0,
      maxStreak: 0,
      correctCount: 0,
      showResult: false
    });
    setSelectedTopic(topic);
    setCurrentView('game');
  };

  const handleSRSAnswer = (rating) => {
    // FIX: Check if selectedClass exists before trying to update state
    if (!selectedClass) {
        console.error("Error: No class selected during SRS update");
        setGameState(prev => ({ ...prev, showResult: true }));
        return;
    }

    const currentCard = gameState.cards[gameState.currentIndex];
    if (!currentCard) return;

    const srsData = calculateNextReview(currentCard, rating);
    
    let points = 0;
    let streakChange = 0;
    let isCorrect = true;

    if (rating === 0) { 
      streakChange = -gameState.streak; 
      points = 0;
      isCorrect = false;
    } else if (rating === 1) { 
      streakChange = 0; 
      points = 50 + (gameState.streak * 10);
    } else if (rating === 2) { 
      streakChange = 1;
      points = 100 + (gameState.streak * 20);
    } else if (rating === 3) { 
      streakChange = 2; 
      points = 150 + (gameState.streak * 30);
    }

    const newStreak = Math.max(0, gameState.streak + streakChange);
    const newScore = gameState.score + points;
    const newCorrectCount = gameState.correctCount + (isCorrect ? 1 : 0);

    // Save progress
    setClasses(prev => prev.map(c => 
      c.id === selectedClass.id ? {
        ...c,
        topics: c.topics.map(t => 
          t.id === selectedTopic.id ? {
            ...t,
            flashcards: t.flashcards.map(f => 
              f.id === currentCard.id ? { ...f, ...srsData } : f
            )
          } : t
        )
      } : c
    ));

    // Next Card
    if (gameState.currentIndex + 1 < gameState.cards.length) {
      setGameState(prev => ({
        ...prev,
        score: newScore,
        streak: newStreak,
        correctCount: newCorrectCount,
        maxStreak: Math.max(prev.maxStreak, newStreak),
        currentIndex: prev.currentIndex + 1,
        isFlipped: false
      }));
    } else {
      setGameState(prev => ({
        ...prev,
        score: newScore,
        streak: newStreak,
        correctCount: newCorrectCount,
        maxStreak: Math.max(prev.maxStreak, newStreak),
        showResult: true
      }));
    }
  };

  const currentCard = gameState.isActive && gameState.cards && gameState.cards.length > 0 
    ? gameState.cards[gameState.currentIndex] 
    : null;

  // --- RENDER ---
  return (
    <div className="min-h-screen relative overflow-hidden bg-gray-200 selection:bg-pink-500 selection:text-white">
      {/* Styles */}
      <style>{`
        @import url('https://fonts.cdnfonts.com/css/monitorica');
        @import url('https://fonts.googleapis.com/css2?family=VT323&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Russo+One&display=swap');
        
        .font-tech { font-family: 'Monitorica', 'Impact', sans-serif; }
        .font-pixel { font-family: 'VT323', monospace; }
        .font-heavy { font-family: 'Russo One', sans-serif; }
        
        .crt-overlay {
          background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.1) 50%);
          background-size: 100% 4px;
          pointer-events: none;
        }
        .chrome-bg {
          background: linear-gradient(135deg, #e0e0e0 0%, #ffffff 50%, #d4d4d4 51%, #f0f0f0 100%);
        }
        .scroll-text { animation: scroll 15s linear infinite; }
        @keyframes scroll { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
        .float-fast { animation: float 4s ease-in-out infinite; }
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
        
        ::-webkit-scrollbar { width: 12px; }
        ::-webkit-scrollbar-track { background: #e0e0e0; border-left: 1px solid #999; }
        ::-webkit-scrollbar-thumb { background: #c0c0c0; border: 2px outset #fff; }
        ::-webkit-scrollbar-thumb:active { border: 2px inset #fff; }

        .scene { perspective: 1000px; }
        .card-inner { position: relative; width: 100%; height: 100%; text-align: center; transition: transform 0.6s; transform-style: preserve-3d; }
        .card-face { position: absolute; width: 100%; height: 100%; -webkit-backface-visibility: hidden; backface-visibility: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .card-front { transform: rotateY(0deg); }
        .card-back { transform: rotateY(180deg); }
        .is-flipped { transform: rotateY(180deg); }
        .animate-bounce-in { animation: bounceIn 0.8s cubic-bezier(0.215, 0.61, 0.355, 1); }
        @keyframes bounceIn {
          0% { opacity: 0; transform: scale3d(0.3, 0.3, 0.3); } 20% { transform: scale3d(1.1, 1.1, 1.1); }
          40% { transform: scale3d(0.9, 0.9, 0.9); } 60% { opacity: 1; transform: scale3d(1.03, 1.03, 1.03); }
          80% { transform: scale3d(0.97, 0.97, 0.97); } 100% { opacity: 1; transform: scale3d(1, 1, 1); }
        }
      `}</style>

      {/* Backgrounds */}
      <div className="fixed inset-0" style={{ backgroundImage: `linear-gradient(#ccc 1px, transparent 1px), linear-gradient(90deg, #ccc 1px, transparent 1px)`, backgroundSize: '20px 20px', opacity: 0.5, zIndex: 0 }}></div>
      <div className="fixed inset-0 crt-overlay z-50 mix-blend-multiply"></div>
      
      {/* Header */}
      <div className="bg-blue-800 text-white font-pixel text-lg md:text-xl py-1 border-b-2 border-white overflow-hidden whitespace-nowrap z-20 relative">
        <div className="scroll-text inline-block"> *** BATTLE MODE ACTIVATED *** HIGH SCORES ENABLED *** Y2K STUDY PROTOCOL *** </div>
      </div>

      <div className="relative z-20 max-w-6xl mx-auto p-2 md:p-8">
        {currentView !== 'game' && (
          <div className="text-center mb-6 md:mb-8 float-fast">
            <h1 className="text-4xl sm:text-6xl md:text-8xl font-heavy tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-blue-700 to-purple-800" style={{ filter: 'drop-shadow(4px 4px 0px rgba(0,0,0,0.3))' }}>
              FLASH<span className="text-pink-600">_</span>BATTLE<span className="text-sm md:text-lg align-top bg-pink-600 text-white px-1 rounded-sm ml-1">Y2K</span>
            </h1>
          </div>
        )}

        {/* Navigation */}
        {currentView !== 'game' && (
          <div className="flex justify-center gap-2 md:gap-4 mb-6 md:mb-8 flex-wrap">
            {['home', 'browse', 'create'].map((view) => (
              <button key={view} onClick={() => setCurrentView(view)}
                className={`px-4 py-1 md:px-8 md:py-2 font-pixel text-lg md:text-2xl uppercase tracking-widest transition-all border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] md:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,0.2)] active:translate-y-1 active:translate-x-1 ${currentView === view ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white border-white' : 'bg-white text-gray-700 border-gray-400 hover:bg-gray-50'}`}>
                {view}
              </button>
            ))}
          </div>
        )}

        {/* Main Content Box */}
        <div className="bg-[#c0c0c0] p-1 border-2 border-white shadow-[0_0_0_1px_#808080]">
          <div className="border-2 border-[#808080] border-r-white border-b-white p-4 md:p-8 min-h-[400px] relative flex flex-col">
            <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-r from-blue-800 to-blue-600 flex items-center justify-between px-2">
              <span className="font-pixel text-white tracking-widest text-sm md:text-base truncate mr-2">C:\SYSTEM\LEARNING\{currentView.toUpperCase()}.EXE</span>
              <div className="flex gap-1">
                <div className="w-4 h-4 bg-[#c0c0c0] border border-t-white border-l-white border-b-black border-r-black flex items-center justify-center text-[10px] cursor-pointer hover:bg-green-400">_</div>
                <div className="w-4 h-4 bg-[#c0c0c0] border border-t-white border-l-white border-b-black border-r-black flex items-center justify-center text-[10px] cursor-pointer hover:bg-yellow-400">□</div>
                <div onClick={() => setCurrentView('home')} className="w-4 h-4 bg-[#c0c0c0] border border-t-white border-l-white border-b-black border-r-black flex items-center justify-center text-[10px] cursor-pointer hover:bg-red-500 hover:text-white">x</div>
              </div>
            </div>

            <div className="mt-6 flex-1">
              {/* --- HOME VIEW --- */}
              {currentView === 'home' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 h-full">
                  <div className="bg-white border-2 border-inset border-gray-400 p-4 md:p-6 shadow-inner">
                    <h2 className="text-2xl md:text-3xl font-tech text-blue-700 mb-4 md:mb-6 flex items-center gap-2"><Trophy className="text-yellow-500" /> SYSTEM_STATS</h2>
                    <div className="space-y-4 font-pixel text-lg md:text-xl">
                      <div className="flex justify-between border-b border-dashed border-gray-300 pb-2"><span>CLASSES_LOADED:</span><span className="text-pink-600 font-bold">{classes.length}</span></div>
                      <div className="flex justify-between border-b border-dashed border-gray-300 pb-2"><span>TOPICS_FOUND:</span><span className="text-purple-600 font-bold">{classes.reduce((sum, c) => sum + c.topics.length, 0)}</span></div>
                      <div className="flex justify-between border-b border-dashed border-gray-300 pb-2"><span>DATA_CLUSTERS:</span><span className="text-blue-600 font-bold">{classes.reduce((sum, c) => sum + c.topics.reduce((s, t) => s + t.flashcards.length, 0), 0)}</span></div>
                    </div>
                    <button onClick={() => setShowClassModal(true)} className="w-full mt-6 md:mt-8 py-3 bg-gradient-to-r from-green-400 to-cyan-500 border-2 border-white shadow-[2px_2px_0px_#444] font-pixel text-lg md:text-xl text-black hover:brightness-110 active:shadow-none active:translate-y-0.5">+ INITIALIZE NEW CLASS</button>
                  </div>
                  <div className="bg-black border-4 border-gray-600 p-4 text-green-400 font-pixel text-lg shadow-[inset_0_0_20px_rgba(0,255,0,0.2)]">
                    <div className="mb-4 text-center border-b border-green-800 pb-2">:: QUICK_LAUNCH ::</div>
                    {classes.length === 0 ? <div className="text-center py-12 animate-pulse">NO_DATA_FOUND<br/>AWAITING_INPUT...</div> : 
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">{classes.slice(0, 5).map(cls => (
                        <div key={cls.id} onClick={() => { setSelectedClass(cls); setCurrentView('browse'); }} className="flex justify-between hover:bg-green-900 cursor-pointer p-1">
                          <span className="truncate mr-2">{`> ${cls.name}`}</span><span className="animate-pulse">_</span>
                        </div>
                      ))}</div>}
                  </div>
                </div>
              )}

              {/* --- BROWSE VIEW --- */}
              {currentView === 'browse' && (
                <div className="space-y-6">
                  {classes.length === 0 ? (
                    <div className="text-center py-20 bg-white/50 border-2 border-dashed border-gray-400">
                      <Disc size={48} className="mx-auto mb-4 text-gray-400 animate-spin-slow" />
                      <p className="font-pixel text-2xl text-gray-500">DATABASE EMPTY</p>
                      <button onClick={() => setShowClassModal(true)} className="mt-4 text-blue-600 hover:underline font-pixel text-xl">[ CLICK TO CREATE ]</button>
                    </div>
                  ) : classes.map(cls => (
                    <div key={cls.id} className="chrome-bg p-4 border-2 border-white shadow-[4px_4px_0px_rgba(0,0,0,0.1)]">
                      <div className="flex justify-between items-center mb-4 bg-gradient-to-r from-blue-100 to-transparent p-2 border-b border-gray-300">
                        <h3 className="text-xl md:text-2xl font-tech text-blue-800 tracking-wider">{cls.name}</h3>
                        <button onClick={() => deleteClass(cls.id)} className="text-red-500 hover:text-red-700 hover:bg-red-100 p-1 rounded"><Trash2 size={20} /></button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {cls.topics.map(topic => (
                          <div key={topic.id} className="relative group bg-white p-4 border border-gray-300">
                            <div className="flex justify-between items-start">
                              <h4 className="font-pixel text-xl md:text-2xl font-bold text-gray-800 truncate pr-4">{topic.name}</h4>
                              <Zap size={16} className="text-yellow-500 flex-shrink-0" />
                            </div>
                            <p className="font-pixel text-gray-500 mt-2 mb-4">{topic.flashcards.length} cards</p>
                            <div className="flex gap-2">
                              <button onClick={() => { setSelectedClass(cls); setSelectedTopic(topic); setCurrentView('create'); }} className="flex-1 font-pixel text-sm border border-gray-400 py-1 hover:bg-gray-100">EDIT</button>
                              <button onClick={() => { setSelectedClass(cls); startGame(topic); }} disabled={topic.flashcards.length === 0} className={`flex-1 font-pixel text-sm border py-1 flex items-center justify-center gap-1 ${topic.flashcards.length === 0 ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'bg-blue-600 text-white border-blue-800 hover:bg-blue-500 shadow-[2px_2px_0px_#000]'}`}><Gamepad2 size={12} /> PLAY</button>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); deleteTopic(cls.id, topic.id); }} className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 flex items-center justify-center rounded-none opacity-0 group-hover:opacity-100 transition-opacity border border-white shadow-sm"><X size={14} /></button>
                          </div>
                        ))}
                        <button onClick={() => { setSelectedClass(cls); setShowTopicModal(true); }} className="border-2 border-dashed border-gray-400 p-4 flex flex-col items-center justify-center text-gray-500 hover:bg-white hover:text-blue-500 hover:border-blue-500 transition-colors font-pixel text-xl"><Plus size={24} className="mb-2" /> ADD_TOPIC</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* --- CREATE VIEW --- */}
              {currentView === 'create' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8 h-full">
                  <div className="chrome-bg p-4 md:p-6 border-2 border-white shadow-[4px_4px_0px_rgba(0,0,0,0.1)] flex flex-col">
                    <div className="flex items-center gap-2 mb-4 md:mb-6 border-b border-gray-300 pb-2"><Sparkles className="text-pink-500" /><h2 className="text-2xl md:text-3xl font-tech text-gray-800">DATA_ENTRY</h2></div>
                    <div className="space-y-4 flex-1">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-100 p-2 border border-gray-300 shadow-inner">
                        <div>
                          <label className="block font-pixel text-gray-500 mb-1 text-xs uppercase tracking-wider">Main Boss (Class)</label>
                          <select value={selectedClass ? selectedClass.id : ''} onChange={(e) => { const cls = classes.find(c => c.id === parseFloat(e.target.value)); setSelectedClass(cls); setSelectedTopic(null); }} className="w-full bg-white border border-gray-400 p-2 font-pixel text-lg focus:outline-none focus:border-blue-500">
                            <option value="">SELECT CLASS...</option>
                            {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.name.toUpperCase()}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block font-pixel text-gray-500 mb-1 text-xs uppercase tracking-wider">Target Point (Topic)</label>
                          <select value={selectedTopic ? selectedTopic.id : ''} disabled={!selectedClass} onChange={(e) => { const topic = selectedClass.topics.find(t => t.id === parseFloat(e.target.value)); setSelectedTopic(topic); }} className={`w-full border border-gray-400 p-2 font-pixel text-lg focus:outline-none focus:border-blue-500 ${!selectedClass ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white'}`}>
                            <option value="">{selectedClass ? 'SELECT TOPIC...' : 'LOCKED'}</option>
                            {selectedClass?.topics.map(topic => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        <div className="bg-blue-50 p-3 border border-blue-200">
                          <label className="block font-pixel text-blue-800 mb-1">FRONT_DATA (QUESTION)</label>
                          <textarea value={flashcardFront} onChange={(e) => setFlashcardFront(e.target.value)} className="w-full h-20 md:h-24 p-2 font-pixel text-lg md:text-xl border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" placeholder="Input query here..." />
                        </div>
                        <div className="bg-pink-50 p-3 border border-pink-200">
                          <label className="block font-pixel text-pink-800 mb-1">BACK_DATA (ANSWER)</label>
                          <textarea value={flashcardBack} onChange={(e) => setFlashcardBack(e.target.value)} className="w-full h-20 md:h-24 p-2 font-pixel text-lg md:text-xl border border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-400 resize-none" placeholder="Input solution here..." />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                        <button onClick={() => fileInputRef.current.click()} disabled={!selectedTopic} className="flex-1 py-3 bg-green-600 text-white font-pixel text-lg md:text-xl uppercase tracking-wider border-2 border-white shadow-[4px_4px_0px_#000] hover:bg-green-700 active:translate-y-1 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"><Upload size={20} /> IMPORT CSV</button>
                        <button onClick={saveFlashcard} disabled={!flashcardFront || !flashcardBack || !selectedTopic || searchingStickers} className="flex-1 py-3 bg-blue-600 text-white font-pixel text-lg md:text-xl uppercase tracking-wider border-2 border-white shadow-[4px_4px_0px_#000] hover:bg-blue-700 active:translate-y-1 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"><Save size={20} />{searchingStickers ? 'SAVING...' : 'SAVE CARD'}</button>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white border-2 border-gray-400 p-4 h-full min-h-[300px] overflow-y-auto shadow-inner">
                    <h3 className="font-pixel text-xl text-gray-500 mb-4 sticky top-0 bg-white border-b border-gray-200">DATABASE: {selectedTopic ? selectedTopic.name : 'NONE'}</h3>
                    <div className="space-y-3">
                      {selectedTopic?.flashcards.map(card => (
                        <div key={card.id} className="bg-blue-50 border border-blue-200 p-3 relative group hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex gap-1 text-lg">{card.stickers.map((s,i) => <span key={i}>{s}</span>)}</div>
                            <button onClick={() => deleteFlashcard(card.id)} className="text-red-400 hover:text-red-600"><X size={16} /></button>
                          </div>
                          <div className="font-pixel text-lg text-gray-800 mb-1 truncate">Q: {card.front}</div>
                          <div className="font-pixel text-lg text-blue-600 truncate">A: {card.back}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* --- GAME / BATTLE MODE (FIXED RENDER LOGIC) --- */}
              {currentView === 'game' && gameState.isActive && (
                <div className="h-full flex flex-col relative">
                  {gameState.showResult ? (
                    <div className="bg-black border-4 border-white p-4 md:p-8 text-center text-white shadow-[10px_10px_0px_rgba(0,0,0,0.5)] animate-bounce-in max-w-2xl w-full mx-auto my-auto">
                      <h2 className="text-3xl md:text-5xl font-pixel text-yellow-400 mb-6 md:mb-8 tracking-widest">MISSION COMPLETE</h2>
                      <div className="grid grid-cols-2 gap-y-4 md:gap-y-6 gap-x-8 md:gap-x-12 font-pixel text-xl md:text-3xl mb-6 md:mb-8 text-left border-b-2 border-gray-700 pb-6 md:pb-8">
                        <div className="text-gray-400">FINAL SCORE:</div><div className="text-right text-blue-400">{gameState.score}</div>
                        <div className="text-gray-400">MAX COMBO:</div><div className="text-right text-orange-400">{gameState.maxStreak}</div>
                        <div className="text-gray-400">ACCURACY:</div><div className={`text-right ${Math.round((gameState.correctCount / gameState.cards.length) * 100) >= 80 ? 'text-green-400' : 'text-red-400'}`}>{Math.round((gameState.correctCount / gameState.cards.length) * 100)}%</div>
                      </div>
                      <div className="flex gap-4 justify-center flex-wrap">
                        <button onClick={() => setCurrentView('browse')} className="px-6 py-2 md:py-3 bg-gray-700 font-pixel text-lg md:text-2xl border-2 border-gray-500 hover:bg-gray-600">EXIT</button>
                        <button onClick={() => startGame(selectedTopic)} className="px-6 py-2 md:py-3 bg-blue-600 font-pixel text-lg md:text-2xl border-2 border-white animate-pulse hover:bg-blue-500">RETRY LEVEL</button>
                      </div>
                    </div>
                  ) : currentCard ? (
                    <>
                      <div className="flex justify-between items-end mb-4 md:mb-6 font-pixel text-sm md:text-lg text-blue-900 border-b-2 border-gray-400 pb-2">
                        <div className="flex flex-col"><span className="text-gray-500 text-xs md:text-sm">SCORE</span><span className="text-xl md:text-3xl text-blue-600 leading-none">{gameState.score.toString().padStart(6, '0')}</span></div>
                        <div className="flex flex-col items-center"><span className="text-xs md:text-sm text-gray-500">PROGRESS</span>
                           <div className="flex items-center gap-2">
                              <div className="w-24 md:w-48 h-3 md:h-4 bg-white border-2 border-gray-500 relative overflow-hidden"><div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${Math.min(100, ((gameState.currentIndex + 1) / gameState.cards.length) * 100)}%` }}></div></div>
                              <span className="text-xs md:text-base">{gameState.currentIndex + 1}/{gameState.cards.length}</span>
                           </div>
                        </div>
                        <div className="flex flex-col items-end"><span className="text-gray-500 text-xs md:text-sm">COMBO</span><div className={`text-xl md:text-3xl flex items-center gap-1 ${gameState.streak > 2 ? 'text-orange-500 animate-pulse' : 'text-gray-400'}`}>{gameState.streak > 2 && <Flame size={16} className="md:w-5 md:h-5" fill="currentColor" />}<span>x{gameState.streak}</span></div></div>
                      </div>

                      <div className="flex-1 flex items-center justify-center p-2 md:p-4">
                        <div className="scene w-full max-w-2xl aspect-video">
                          <div className={`card-inner ${gameState.isFlipped ? 'is-flipped' : ''}`}>
                            <div className="card-face card-front bg-white border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,0.2)]">
                              <div className="absolute top-2 left-2 text-2xl md:text-4xl opacity-20 font-pixel">?</div>
                              <div className={`font-pixel text-gray-800 leading-relaxed whitespace-pre-wrap p-4 md:p-8 w-full h-full flex items-center justify-center overflow-y-auto break-words ${getFontSize(currentCard.front)}`}>
                                {currentCard.front}
                              </div>
                              <div className="absolute bottom-4 text-xs md:text-base text-gray-400 font-pixel animate-pulse">[ WAITING FOR PLAYER ACTION ]</div>
                            </div>
                            <div className="card-face card-back bg-black border-4 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)] text-green-400">
                               <div className="absolute top-0 left-0 w-full h-1 bg-green-500"></div>
                               <div className={`font-tech leading-relaxed whitespace-pre-wrap drop-shadow-[0_0_5px_rgba(0,255,0,0.8)] p-4 md:p-8 w-full h-full flex items-center justify-center overflow-y-auto break-words ${getFontSize(currentCard.back)}`}>
                                {currentCard.back}
                              </div>
                               <div className="absolute bottom-4 flex gap-4 text-2xl md:text-4xl">{currentCard.stickers.map((s,i) => <span key={i} className="animate-bounce" style={{animationDelay: `${i*100}ms`}}>{s}</span>)}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="min-h-24 h-auto py-4 bg-gray-200 border-t-2 border-gray-400 flex flex-wrap items-center justify-center gap-4 md:gap-6 z-20 mt-4">
                        {!gameState.isFlipped ? (
                          <button onClick={() => setGameState(prev => ({ ...prev, isFlipped: true }))} className="w-full max-w-[300px] md:max-w-sm mx-4 py-3 md:py-4 bg-yellow-400 border-2 border-yellow-700 text-black font-pixel text-xl md:text-2xl shadow-[4px_4px_0px_#000] active:translate-y-1 active:shadow-none hover:bg-yellow-300">
                            REVEAL CARD
                          </button>
                        ) : (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full max-w-4xl px-2">
                            <button onClick={() => handleSRSAnswer(0)} className="py-3 bg-red-500 border-2 border-red-800 text-white font-pixel text-lg md:text-xl shadow-[4px_4px_0px_#000] active:translate-y-1 active:shadow-none hover:bg-red-400 flex flex-col items-center">
                              <span>AGAIN</span><span className="text-xs opacity-75">{formatInterval(calculateNextReview(currentCard, 0).interval)}</span>
                            </button>
                            <button onClick={() => handleSRSAnswer(1)} className="py-3 bg-orange-500 border-2 border-orange-800 text-white font-pixel text-lg md:text-xl shadow-[4px_4px_0px_#000] active:translate-y-1 active:shadow-none hover:bg-orange-400 flex flex-col items-center">
                              <span>HARD</span><span className="text-xs opacity-75">{formatInterval(calculateNextReview(currentCard, 1).interval)}</span>
                            </button>
                            <button onClick={() => handleSRSAnswer(2)} className="py-3 bg-blue-500 border-2 border-blue-800 text-white font-pixel text-lg md:text-xl shadow-[4px_4px_0px_#000] active:translate-y-1 active:shadow-none hover:bg-blue-400 flex flex-col items-center">
                              <span>GOOD</span><span className="text-xs opacity-75">{formatInterval(calculateNextReview(currentCard, 2).interval)}</span>
                            </button>
                            <button onClick={() => handleSRSAnswer(3)} className="py-3 bg-green-500 border-2 border-green-800 text-white font-pixel text-lg md:text-xl shadow-[4px_4px_0px_#000] active:translate-y-1 active:shadow-none hover:bg-green-400 flex flex-col items-center">
                              <span>EASY</span><span className="text-xs opacity-75">{formatInterval(calculateNextReview(currentCard, 3).interval)}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center"><Disc className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" /><p className="font-pixel text-xl">LOADING_GAME_DATA...</p></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modals */}
        {(showClassModal || showTopicModal) && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-[#c0c0c0] p-1 border-2 border-white shadow-[10px_10px_0px_rgba(0,0,0,0.5)] max-w-md w-full mx-4">
              <div className="bg-gradient-to-r from-blue-800 to-blue-700 text-white px-2 py-1 flex justify-between items-center font-pixel mb-4"><span>{showClassModal ? 'NEW_CLASS.EXE' : 'NEW_TOPIC.EXE'}</span><button onClick={() => { setShowClassModal(false); setShowTopicModal(false); }}><X size={16} /></button></div>
              <div className="p-4">
                <input type="text" value={showClassModal ? newClassName : newTopicName} onChange={(e) => showClassModal ? setNewClassName(e.target.value) : setNewTopicName(e.target.value)} placeholder="ENTER_NAME..." className="w-full p-2 font-pixel text-xl border-2 border-inset border-gray-400 mb-4 focus:bg-yellow-50 focus:outline-none" autoFocus onKeyPress={(e) => e.key === 'Enter' && (showClassModal ? addClass() : addTopic())} />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => { setShowClassModal(false); setShowTopicModal(false); }} className="px-4 py-2 font-pixel text-xl border-2 border-gray-400 shadow-[2px_2px_0px_rgba(0,0,0,0.2)] active:translate-y-0.5 active:shadow-none bg-white hover:bg-gray-100">CANCEL</button>
                  <button onClick={showClassModal ? addClass : addTopic} className="px-4 py-2 font-pixel text-xl border-2 border-white shadow-[2px_2px_0px_rgba(0,0,0,0.2)] active:translate-y-0.5 active:shadow-none bg-blue-600 text-white hover:bg-blue-700">EXECUTE</button>
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