import React, { useState, useEffect } from 'react';
import { Plus, Save, Trash2, Sparkles, X, Monitor, Disc, Zap, Gamepad2, Trophy, Flame, RotateCcw, Check, XCircle } from 'lucide-react';

const Y2KFlashcardApp = () => {
  // --- STATE MANAGEMENT ---
  const [classes, setClasses] = useState(() => {
    const saved = localStorage.getItem('y2k-flashcards');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [currentView, setCurrentView] = useState('home'); // home, browse, create, game
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  
  // Game State
  const [gameState, setGameState] = useState({
    isActive: false,
    cards: [],
    currentIndex: 0,
    isFlipped: false,
    score: 0,
    streak: 0,
    maxStreak: 0,
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
      // Fallback random delay to simulate "loading"
      await new Promise(r => setTimeout(r, 600)); 
      setSearchingStickers(false);
      return getRandomStickers();
    } catch (error) {
      setSearchingStickers(false);
      return getRandomStickers();
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

  // --- CRUD OPERATIONS ---
  const addClass = () => {
    if (!newClassName.trim()) return;
    setClasses([...classes, { id: Date.now(), name: newClassName, topics: [] }]);
    setNewClassName('');
    setShowClassModal(false);
  };

  const addTopic = () => {
    if (!newTopicName.trim() || !selectedClass) return;
    const updatedClasses = classes.map(c => 
      c.id === selectedClass.id 
        ? { ...c, topics: [...c.topics, { id: Date.now(), name: newTopicName, flashcards: [] }] }
        : c
    );
    setClasses(updatedClasses);
    setSelectedClass(updatedClasses.find(c => c.id === selectedClass.id));
    setNewTopicName('');
    setShowTopicModal(false);
  };

  const saveFlashcard = async () => {
    if (!flashcardFront.trim() || !flashcardBack.trim() || !selectedTopic) return;
    
    const keywords = (flashcardFront + ' ' + flashcardBack).split(' ').slice(0, 3).join(' ');
    const stickers = await fetchStickers(keywords);

    const newCard = {
      id: Date.now(),
      front: organizeText(flashcardFront),
      back: organizeText(flashcardBack),
      stickers: stickers
    };

    const updatedClasses = classes.map(c => 
      c.id === selectedClass.id
        ? {
            ...c,
            topics: c.topics.map(t =>
              t.id === selectedTopic.id
                ? { ...t, flashcards: [...t.flashcards, newCard] }
                : t
            )
          }
        : c
    );
    setClasses(updatedClasses);
    const updatedClass = updatedClasses.find(c => c.id === selectedClass.id);
    setSelectedClass(updatedClass);
    setSelectedTopic(updatedClass.topics.find(t => t.id === selectedTopic.id));
    setFlashcardFront('');
    setFlashcardBack('');
  };

  const deleteFlashcard = (cardId) => {
    const updatedClasses = classes.map(c => 
      c.id === selectedClass.id
        ? {
            ...c,
            topics: c.topics.map(t =>
              t.id === selectedTopic.id
                ? { ...t, flashcards: t.flashcards.filter(f => f.id !== cardId) }
                : t
            )
          }
        : c
    );
    setClasses(updatedClasses);
    const updatedClass = updatedClasses.find(c => c.id === selectedClass.id);
    setSelectedClass(updatedClass);
    setSelectedTopic(updatedClass.topics.find(t => t.id === selectedTopic.id));
  };

  const deleteClass = (classId) => {
    setClasses(classes.filter(c => c.id !== classId));
    if (selectedClass?.id === classId) {
      setSelectedClass(null);
      setSelectedTopic(null);
      setCurrentView('browse');
    }
  };

  const deleteTopic = (topicId) => {
    const updatedClasses = classes.map(c => 
      c.id === selectedClass.id
        ? { ...c, topics: c.topics.filter(t => t.id !== topicId) }
        : c
    );
    setClasses(updatedClasses);
    const updatedClass = updatedClasses.find(c => c.id === selectedClass.id);
    setSelectedClass(updatedClass);
    if (selectedTopic?.id === topicId) setSelectedTopic(null);
  };

  // --- GAME LOGIC ---
  const startGame = (topic) => {
    if (topic.flashcards.length === 0) return;
    // Shuffle cards
    const shuffled = [...topic.flashcards].sort(() => 0.5 - Math.random());
    setGameState({
      isActive: true,
      cards: shuffled,
      currentIndex: 0,
      isFlipped: false,
      score: 0,
      streak: 0,
      maxStreak: 0,
      showResult: false
    });
    setSelectedTopic(topic);
    setCurrentView('game');
  };

  const handleGameAnswer = (correct) => {
    let newScore = gameState.score;
    let newStreak = gameState.streak;
    
    if (correct) {
      newStreak += 1;
      // Base points (100) + Streak Bonus
      newScore += 100 + (newStreak * 20); 
    } else {
      newStreak = 0;
    }

    if (gameState.currentIndex + 1 < gameState.cards.length) {
      setGameState(prev => ({
        ...prev,
        score: newScore,
        streak: newStreak,
        maxStreak: Math.max(prev.maxStreak, newStreak),
        currentIndex: prev.currentIndex + 1,
        isFlipped: false
      }));
    } else {
      // End Game
      setGameState(prev => ({
        ...prev,
        score: newScore,
        streak: newStreak,
        maxStreak: Math.max(prev.maxStreak, newStreak),
        showResult: true
      }));
    }
  };

  // --- RENDER ---
  return (
    <div className="min-h-screen relative overflow-hidden bg-gray-300 selection:bg-pink-500 selection:text-white font-sans">
      {/* GLOBAL STYLES & FONTS */}
      <style>{`
        @import url('https://fonts.cdnfonts.com/css/monitorica');
        @import url('https://fonts.googleapis.com/css2?family=VT323&family=Press+Start+2P&display=swap');
        
        .font-tech { font-family: 'Monitorica', 'Impact', sans-serif; }
        .font-pixel { font-family: 'VT323', monospace; }
        .font-arcade { font-family: 'Press Start 2P', cursive; }
        
        .crt-overlay {
          background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.1) 50%);
          background-size: 100% 4px;
          pointer-events: none;
        }
        
        .chrome-bg {
          background: linear-gradient(135deg, #e0e0e0 0%, #ffffff 50%, #d4d4d4 51%, #f0f0f0 100%);
        }

        .scanline {
          width: 100%;
          height: 100%;
          background: linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0) 50%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.1));
          background-size: 100% 4px;
          position: absolute;
          top: 0;
          left: 0;
          pointer-events: none;
          z-index: 10;
        }

        .glitch-text {
          text-shadow: 2px 0 #ff00ff, -2px 0 #00ffff;
        }
      `}</style>

      {/* BACKGROUND ELEMENTS */}
      <div className="fixed inset-0 crt-overlay z-50 mix-blend-multiply pointer-events-none"></div>
      <div className="fixed inset-0 opacity-10 pointer-events-none" style={{
         backgroundImage: `linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)`,
         backgroundSize: '40px 40px'
      }}></div>

      {/* MARQUEE */}
      <div className="bg-blue-900 text-cyan-300 font-pixel text-xl py-1 border-b-4 border-white overflow-hidden whitespace-nowrap relative z-20">
        <div className="animate-marquee inline-block">
          *** SYSTEM READY *** INSERT COIN TO LEARN *** KEEP THE STREAK ALIVE *** Y2K STUDY PROTOCOL INITIATED ***
        </div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto p-4 md:p-6">
        
        {/* HEADER */}
        {currentView !== 'game' && (
          <div className="text-center mb-8">
            <h1 className="text-5xl md:text-7xl font-tech text-transparent bg-clip-text bg-gradient-to-b from-blue-700 to-purple-800 glitch-text mb-2">
              FLASH<span className="text-pink-600">_</span>ATTACK<span className="text-sm align-top bg-pink-600 text-white px-1 ml-1">v99</span>
            </h1>
            
            {/* NAV BAR */}
            <div className="flex justify-center gap-4 flex-wrap">
              {['home', 'browse', 'create'].map((view) => (
                <button
                  key={view}
                  onClick={() => setCurrentView(view)}
                  className={`
                    px-6 py-2 font-pixel text-2xl uppercase tracking-widest transition-all clip-path-polygon
                    border-2 shadow-[4px_4px_0px_rgba(0,0,0,0.3)]
                    ${currentView === view 
                      ? 'bg-blue-600 text-white border-white scale-105' 
                      : 'bg-gray-200 text-gray-600 border-gray-500 hover:bg-white'
                    }
                  `}
                >
                  {view}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* MAIN WINDOW FRAME */}
        <div className="bg-[#c0c0c0] p-1 border-t-2 border-l-2 border-white border-b-2 border-r-2 border-gray-600 shadow-2xl">
          <div className="bg-[#c0c0c0] border-2 border-gray-500 min-h-[600px] relative flex flex-col">
            
            {/* WINDOW TITLE BAR */}
            <div className="bg-gradient-to-r from-blue-900 to-blue-700 p-2 flex justify-between items-center text-white border-b-2 border-gray-600">
              <div className="font-pixel text-lg flex items-center gap-2">
                <Monitor size={16} />
                <span>C:\USERS\ADMIN\BRAIN\{currentView.toUpperCase()}.EXE</span>
              </div>
              <div className="flex gap-1">
                <div className="w-4 h-4 bg-gray-300 border border-black flex items-center justify-center text-[10px] text-black hover:bg-gray-100 cursor-pointer">_</div>
                <div className="w-4 h-4 bg-gray-300 border border-black flex items-center justify-center text-[10px] text-black hover:bg-gray-100 cursor-pointer">□</div>
                <div className="w-4 h-4 bg-gray-300 border border-black flex items-center justify-center text-[10px] text-black hover:bg-red-500 hover:text-white cursor-pointer">x</div>
              </div>
            </div>

            {/* CONTENT AREA */}
            <div className="flex-1 p-6 bg-gray-100 relative overflow-hidden">
              
              {/* === HOME VIEW === */}
              {currentView === 'home' && (
                <div className="h-full flex flex-col items-center justify-center space-y-8">
                  <div className="grid md:grid-cols-2 gap-6 w-full max-w-4xl">
                    <div className="chrome-bg p-6 border-2 border-white shadow-[4px_4px_0px_rgba(0,0,0,0.2)]">
                      <h2 className="text-3xl font-tech text-blue-800 mb-4 flex items-center gap-2">
                        <Trophy className="text-yellow-500" /> STATS
                      </h2>
                      <div className="font-pixel text-2xl space-y-2">
                        <div className="flex justify-between">
                          <span>CLASSES:</span> <span className="text-blue-600">{classes.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>TOPICS:</span> <span className="text-pink-600">{classes.reduce((acc, c) => acc + c.topics.length, 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>CARDS:</span> <span className="text-purple-600">{classes.reduce((acc, c) => acc + c.topics.reduce((s,t) => s + t.flashcards.length, 0), 0)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-black p-6 border-4 border-gray-600 text-green-400 font-pixel shadow-[inset_0_0_20px_rgba(0,255,0,0.2)]">
                      <h2 className="text-2xl mb-4 border-b border-green-800 pb-2">:: QUICK_LAUNCH ::</h2>
                      {classes.length === 0 ? (
                        <div className="text-center py-8 opacity-50">NO_DATA_AVAILABLE</div>
                      ) : (
                        <div className="space-y-2">
                          {classes.slice(0, 3).map(cls => (
                            <div key={cls.id} onClick={() => { setSelectedClass(cls); setCurrentView('browse'); }} 
                              className="cursor-pointer hover:bg-green-900 p-1 flex justify-between">
                              <span>{`> ${cls.name}`}</span>
                              <span className="animate-pulse">_</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <button onClick={() => setShowClassModal(true)} 
                    className="group relative px-8 py-4 bg-pink-600 text-white font-arcade text-sm md:text-lg hover:bg-pink-500 transition-all border-b-4 border-r-4 border-pink-900 active:border-0 active:translate-y-1">
                    <span className="mr-2">+</span> CREATE NEW CLASS
                    <div className="absolute inset-0 border-2 border-white opacity-20 group-hover:opacity-40"></div>
                  </button>
                </div>
              )}

              {/* === BROWSE VIEW === */}
              {currentView === 'browse' && (
                <div className="space-y-6">
                  {classes.map(cls => (
                    <div key={cls.id} className="bg-white p-4 border-2 border-gray-400 shadow-[4px_4px_0px_rgba(0,0,0,0.1)]">
                      <div className="flex justify-between items-center mb-4 border-b-2 border-gray-200 pb-2">
                        <h3 className="text-3xl font-tech text-blue-900">{cls.name}</h3>
                        <button onClick={() => deleteClass(cls.id)} className="text-red-400 hover:text-red-600"><Trash2/></button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {cls.topics.map(topic => (
                          <div key={topic.id} className="relative bg-gray-50 border-2 border-gray-300 p-4 hover:border-blue-400 transition-colors group">
                            <div className="flex justify-between items-start mb-4">
                              <h4 className="font-pixel text-2xl font-bold">{topic.name}</h4>
                              <span className="font-pixel bg-gray-200 px-2 text-gray-600">{topic.flashcards.length}</span>
                            </div>
                            
                            <div className="flex gap-2 mt-4">
                              <button 
                                onClick={() => { setSelectedClass(cls); setSelectedTopic(topic); setCurrentView('create'); }}
                                className="flex-1 py-1 font-pixel text-lg border border-gray-400 text-gray-600 hover:bg-white hover:text-blue-600"
                              >
                                EDIT
                              </button>
                              <button 
                                onClick={() => startGame(topic)}
                                disabled={topic.flashcards.length === 0}
                                className={`flex-1 py-1 font-pixel text-lg border flex items-center justify-center gap-1
                                  ${topic.flashcards.length === 0 
                                    ? 'border-gray-200 text-gray-300 cursor-not-allowed' 
                                    : 'border-blue-600 bg-blue-600 text-white hover:bg-blue-500 hover:scale-105 transition-transform shadow-[2px_2px_0px_#000]'
                                  }`}
                              >
                                <Gamepad2 size={16} /> PLAY
                              </button>
                            </div>

                            <button onClick={() => deleteTopic(topic.id)} 
                              className="absolute top-2 right-2 text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                              <X size={16}/>
                            </button>
                          </div>
                        ))}
                        <button onClick={() => { setSelectedClass(cls); setShowTopicModal(true); }}
                          className="border-2 border-dashed border-gray-400 p-4 flex flex-col items-center justify-center text-gray-400 hover:text-blue-500 hover:border-blue-500 hover:bg-white transition-all font-pixel text-xl">
                          <Plus className="mb-2"/> ADD TOPIC
                        </button>
                      </div>
                    </div>
                  ))}
                  {classes.length === 0 && (
                    <div className="text-center font-pixel text-2xl text-gray-400 mt-20">NO ARCHIVES FOUND...</div>
                  )}
                </div>
              )}

              {/* === CREATE VIEW === */}
              {currentView === 'create' && (
                <div className="h-full flex flex-col md:flex-row gap-6">
                  {/* Editor */}
                  <div className="flex-1 chrome-bg p-6 border-2 border-white shadow-lg flex flex-col gap-4">
                    <div className="flex items-center gap-2 text-purple-700 border-b border-purple-200 pb-2">
                      <Sparkles size={20}/>
                      <h2 className="font-tech text-2xl">CARD_EDITOR.EXE</h2>
                    </div>

                    <select 
                      value={selectedClass && selectedTopic ? `${selectedClass.id}-${selectedTopic.id}` : ''}
                      onChange={(e) => {
                        if(!e.target.value) return;
                        const [cid, tid] = e.target.value.split('-');
                        const c = classes.find(x => x.id == cid);
                        setSelectedClass(c);
                        setSelectedTopic(c.topics.find(t => t.id == tid));
                      }}
                      className="w-full font-pixel text-xl p-2 border-2 border-gray-300 focus:outline-none focus:border-blue-500"
                    >
                      <option value="">SELECT TOPIC...</option>
                      {classes.map(c => c.topics.map(t => (
                        <option key={`${c.id}-${t.id}`} value={`${c.id}-${t.id}`}>{c.name} / {t.name}</option>
                      )))}
                    </select>

                    <textarea 
                      value={flashcardFront}
                      onChange={(e) => setFlashcardFront(e.target.value)}
                      placeholder="FRONT SIDE (QUESTION)"
                      className="w-full h-24 p-2 font-pixel text-xl border-2 border-gray-300 resize-none focus:bg-blue-50 focus:outline-none"
                    />
                    <textarea 
                      value={flashcardBack}
                      onChange={(e) => setFlashcardBack(e.target.value)}
                      placeholder="BACK SIDE (ANSWER)"
                      className="w-full h-24 p-2 font-pixel text-xl border-2 border-gray-300 resize-none focus:bg-pink-50 focus:outline-none"
                    />

                    <button 
                      onClick={saveFlashcard}
                      disabled={searchingStickers || !selectedTopic}
                      className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-pixel text-2xl border-2 border-white shadow-[3px_3px_0px_#000] active:translate-y-1 active:shadow-none hover:brightness-110 disabled:opacity-50"
                    >
                      {searchingStickers ? 'GENERATING...' : 'SAVE CARD'}
                    </button>
                  </div>

                  {/* List */}
                  <div className="w-full md:w-80 bg-gray-200 border-2 border-gray-400 p-4 h-full overflow-y-auto">
                    <h3 className="font-pixel text-xl text-gray-600 mb-4 sticky top-0 bg-gray-200 pb-2 border-b border-gray-300">
                      DATABASE: {selectedTopic ? selectedTopic.name : 'NONE'}
                    </h3>
                    {selectedTopic?.flashcards.map(card => (
                      <div key={card.id} className="bg-white p-3 mb-2 border border-gray-300 text-sm shadow-sm relative group">
                        <div className="font-bold text-blue-600 mb-1">{card.stickers.join(' ')}</div>
                        <div className="truncate text-gray-700">{card.front}</div>
                        <button onClick={() => deleteFlashcard(card.id)} className="absolute top-2 right-2 text-red-400 opacity-0 group-hover:opacity-100"><X size={14}/></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* === GAME / BATTLE MODE === */}
              {currentView === 'game' && gameState.isActive && (
                <div className="h-full flex flex-col relative">
                  {/* BATTLE HUD */}
                  <div className="flex justify-between items-end mb-4 font-arcade text-xs md:text-sm text-blue-900 border-b-4 border-black pb-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-gray-500">SCORE</span>
                      <span className="text-2xl md:text-4xl text-blue-600 drop-shadow-md">{gameState.score.toString().padStart(6, '0')}</span>
                    </div>
                    
                    <div className="flex flex-col items-center">
                      <div className="w-48 h-6 bg-gray-300 border-2 border-black relative">
                        <div 
                          className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-300"
                          style={{ width: `${((gameState.currentIndex) / gameState.cards.length) * 100}%` }}
                        ></div>
                        <div className="absolute inset-0 flex items-center justify-center text-[10px] text-black font-bold tracking-widest">
                          PROGRESS
                        </div>
                      </div>
                      <span className="mt-1">{gameState.currentIndex + 1} / {gameState.cards.length}</span>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className="text-gray-500">COMBO</span>
                      <div className={`text-2xl md:text-4xl flex items-center gap-1 ${gameState.streak > 2 ? 'text-orange-500 animate-pulse' : 'text-gray-400'}`}>
                        {gameState.streak > 2 && <Flame size={24} fill="currentColor" />}
                        <span>x{gameState.streak}</span>
                      </div>
                    </div>
                  </div>

                  {/* BATTLE ARENA (CARD) */}
                  <div className="flex-1 flex items-center justify-center p-4">
                    {!gameState.showResult ? (
                      <div className="w-full max-w-2xl aspect-video relative perspective-1000">
                        <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${gameState.isFlipped ? 'rotate-y-180' : ''}`}>
                          
                          {/* FRONT */}
                          <div className="absolute inset-0 backface-hidden bg-white border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,0.2)] flex flex-col items-center justify-center p-8 text-center">
                            <div className="absolute top-2 left-2 text-4xl opacity-20">?</div>
                            <div className="font-pixel text-3xl md:text-5xl text-gray-800 leading-relaxed whitespace-pre-wrap">
                              {gameState.cards[gameState.currentIndex]?.front}
                            </div>
                            <div className="absolute bottom-4 text-gray-400 font-pixel animate-pulse">
                              [ WAITING FOR PLAYER ACTION ]
                            </div>
                          </div>

                          {/* BACK */}
                          <div className="absolute inset-0 backface-hidden rotate-y-180 bg-black border-4 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)] flex flex-col items-center justify-center p-8 text-center text-green-400">
                             <div className="absolute top-0 left-0 w-full h-1 bg-green-500 animate-scan"></div>
                             <div className="font-tech text-3xl md:text-5xl leading-relaxed whitespace-pre-wrap drop-shadow-[0_0_5px_rgba(0,255,0,0.8)]">
                              {gameState.cards[gameState.currentIndex]?.back}
                            </div>
                             <div className="absolute bottom-4 flex gap-4 text-4xl">
                               {gameState.cards[gameState.currentIndex]?.stickers.map((s,i) => <span key={i} className="animate-bounce" style={{animationDelay: `${i*100}ms`}}>{s}</span>)}
                             </div>
                          </div>

                        </div>
                      </div>
                    ) : (
                      /* GAME OVER SCREEN */
                      <div className="bg-black border-4 border-white p-8 text-center text-white shadow-[10px_10px_0px_rgba(0,0,0,0.5)] animate-bounce-in">
                        <h2 className="text-5xl font-arcade text-yellow-400 mb-8 glitch-text">MISSION COMPLETE</h2>
                        <div className="grid grid-cols-2 gap-8 font-pixel text-3xl mb-8 text-left">
                          <div className="text-gray-400">FINAL SCORE:</div>
                          <div className="text-right text-blue-400">{gameState.score}</div>
                          <div className="text-gray-400">MAX COMBO:</div>
                          <div className="text-right text-orange-400">{gameState.maxStreak}</div>
                          <div className="text-gray-400">ACCURACY:</div>
                          <div className="text-right text-green-400">
                             {Math.round((gameState.score / (gameState.cards.length * 150)) * 100)}%
                          </div>
                        </div>
                        <div className="flex gap-4 justify-center">
                          <button 
                            onClick={() => setCurrentView('browse')}
                            className="px-6 py-3 bg-gray-700 font-pixel text-2xl border-2 border-gray-500 hover:bg-gray-600"
                          >
                            EXIT
                          </button>
                          <button 
                            onClick={() => startGame(selectedTopic)}
                            className="px-6 py-3 bg-blue-600 font-pixel text-2xl border-2 border-white animate-pulse hover:bg-blue-500"
                          >
                            RETRY LEVEL
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* CONTROLS */}
                  {!gameState.showResult && (
                    <div className="h-24 bg-gray-200 border-t-4 border-gray-400 flex items-center justify-center gap-6">
                      {!gameState.isFlipped ? (
                        <button 
                          onClick={() => setGameState(prev => ({ ...prev, isFlipped: true }))}
                          className="w-full max-w-sm mx-4 py-4 bg-yellow-400 border-b-4 border-r-4 border-yellow-700 text-black font-arcade text-xl active:border-0 active:translate-y-1 shadow-lg hover:bg-yellow-300"
                        >
                          REVEAL CARD
                        </button>
                      ) : (
                        <>
                          <button 
                            onClick={() => handleGameAnswer(false)}
                            className="flex-1 max-w-[200px] py-4 bg-red-500 border-b-4 border-r-4 border-red-800 text-white font-arcade text-sm md:text-lg active:border-0 active:translate-y-1 flex items-center justify-center gap-2 hover:bg-red-400"
                          >
                            <XCircle size={24} /> MISS
                          </button>
                          <button 
                            onClick={() => handleGameAnswer(true)}
                            className="flex-1 max-w-[200px] py-4 bg-green-500 border-b-4 border-r-4 border-green-800 text-white font-arcade text-sm md:text-lg active:border-0 active:translate-y-1 flex items-center justify-center gap-2 hover:bg-green-400"
                          >
                            <Check size={24} /> HIT
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>

        {/* MODALS */}
        {(showClassModal || showTopicModal) && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 px-4">
            <div className="bg-gray-200 p-1 border-2 border-white shadow-[0_0_30px_rgba(255,255,255,0.2)] w-full max-w-md">
              <div className="bg-blue-800 text-white px-2 py-1 font-pixel flex justify-between">
                <span>INPUT_REQUIRED</span>
                <X size={16} className="cursor-pointer" onClick={() => { setShowClassModal(false); setShowTopicModal(false); }}/>
              </div>
              <div className="p-6">
                <p className="font-pixel text-xl mb-4 text-blue-800">
                  ENTER NEW {showClassModal ? 'CLASS' : 'TOPIC'} IDENTIFIER:
                </p>
                <input 
                  autoFocus
                  value={showClassModal ? newClassName : newTopicName}
                  onChange={(e) => showClassModal ? setNewClassName(e.target.value) : setNewTopicName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (showClassModal ? addClass() : addTopic())}
                  className="w-full p-3 font-pixel text-2xl border-2 border-gray-400 focus:bg-yellow-50 outline-none mb-6 shadow-inner"
                />
                <div className="flex justify-end gap-3">
                  <button onClick={() => { setShowClassModal(false); setShowTopicModal(false); }} className="px-4 py-2 font-pixel text-xl border-2 border-gray-400 hover:bg-gray-300">ABORT</button>
                  <button onClick={showClassModal ? addClass : addTopic} className="px-6 py-2 font-pixel text-xl bg-blue-600 text-white border-2 border-blue-800 hover:bg-blue-500 shadow-lg">CONFIRM</button>
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