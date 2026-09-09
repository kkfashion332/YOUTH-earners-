        const { useState, useEffect, useRef } = React;

        function App() {
            // Core States
            const [activeTab, setActiveTab] = useState('home'); 
            const [userProfile, setUserProfile] = useState({ name: 'Player', number: '000', avatar: 'youth-earners-logo.png' });
            
            // Gaming Economy States
            const [wallet, setWallet] = useState(0);
            const [xp, setXp] = useState(0);
            const level = Math.floor(xp / 100) + 1;
            const xpProgress = (xp % 100);
            
            // Interaction States
            const [completedTasks, setCompletedTasks] = useState([]);
            const [claimedDays, setClaimedDays] = useState([]);
            const [transactions, setTransactions] = useState([]);
            const [toasts, setToasts] = useState([]);
            const [showLevelUp, setShowLevelUp] = useState(false);
            
            // --- REAL MATCHMAKING STATES ---
            const [confirmPopup, setConfirmPopup] = useState(null); 
            const [isPlaying, setIsPlaying] = useState(false);
            const [isMatchmaking, setIsMatchmaking] = useState(false);
            const [matchTime, setMatchTime] = useState(15); // 15 seconds search time
            const [matchFound, setMatchFound] = useState(false);
            const [roomId, setRoomId] = useState(null);
            const [playerRole, setPlayerRole] = useState(null);
            const [roomData, setRoomData] = useState(null);
            const [opponent, setOpponent] = useState({ name: 'Searching...', img: 'youth-earners-logo.png' });
            const [chatMsg, setChatMsg] = useState("");

            const playTiers = [
                { entry: 0, win: 0, name: "Practice" },
                { entry: 5, win: 9 }, { entry: 10, win: 18 }, { entry: 20, win: 36 }
            ];

            const availableTasks = [
                { id: 't1', title: 'Complete Profile', coin: 10, xp: 20, icon: 'fa-user' },
                { id: 't2', title: 'Watch Promo Video', coin: 5, xp: 10, icon: 'fa-video' },
                { id: 't3', title: 'Win 3 Matches', coin: 20, xp: 50, icon: 'fa-trophy' }
            ];

            const playClick = () => { const a = document.getElementById('clickSound'); if(a) { a.currentTime=0; a.play().catch(()=>{}); } };
            
            const addToast = (msg, type='success') => {
                const id = Date.now();
                setToasts(prev => [...prev, { id, msg, type }]);
                setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
            };

            const addTransaction = (amount, desc) => {
                const newTx = { id: Date.now(), amount, desc, date: new Date().toLocaleDateString() };
                setTransactions(prev => [newTx, ...prev].slice(0, 10));
            };

            // Initial Load
            useEffect(() => {
                const handleGameStart = (e) => {
                    const data = e.detail;
                    if(data) {
                        setUserProfile(prev => ({ ...prev, name: data.name, number: data.number }));
                        const savedData = JSON.parse(localStorage.getItem('ye_save_' + data.number));
                        if(savedData) {
                            setWallet(savedData.wallet);
                            setXp(savedData.xp);
                            setCompletedTasks(savedData.completedTasks || []);
                            setClaimedDays(savedData.claimedDays || []);
                            setTransactions(savedData.transactions || []);
                        } else {
                            setWallet(data.wallet || 0); 
                        }
                    }
                };
                window.addEventListener('gameStart', handleGameStart);
                return () => window.removeEventListener('gameStart', handleGameStart);
            }, []);

            // Save Engine
            useEffect(() => {
                if(userProfile.number !== '000') {
                    const saveData = { wallet, xp, completedTasks, claimedDays, transactions };
                    localStorage.setItem('ye_save_' + userProfile.number, JSON.stringify(saveData));
                }
            }, [wallet, xp, completedTasks, claimedDays, transactions]);

            // Level Up Monitor
            const prevLevelRef = useRef(level);
            useEffect(() => {
                if(level > prevLevelRef.current) {
                    const a = document.getElementById('levelUpSound'); if(a) a.play().catch(()=>{});
                    setShowLevelUp(level);
                    setTimeout(() => setShowLevelUp(false), 3000);
                }
                prevLevelRef.current = level;
            }, [level]);

            const claimTask = (task) => {
                playClick();
                if(!completedTasks.includes(task.id)) {
                    setCompletedTasks([...completedTasks, task.id]);
                    setWallet(w => w + task.coin);
                    setXp(x => x + task.xp);
                    addTransaction(task.coin, `Task: ${task.title}`);
                    addToast(`Earned ₹${task.coin} & ${task.xp} XP!`);
                }
            };

            const claimDaily = (day) => {
                playClick();
                if(!claimedDays.includes(day)) {
                    setClaimedDays([...claimedDays, day]);
                    const reward = day * 2;
                    setWallet(w => w + reward);
                    setXp(x => x + 10);
                    addTransaction(reward, `Daily Reward Day ${day}`);
                    addToast(`Day ${day} Claimed! +₹${reward}`);
                }
            };

            const getLeaderboard = () => {
                let list = [
                    { name: 'Rahul_Pro', xp: 4500, avatar: 'youth-earners-logo.png' },
                    { name: 'KingGamer', xp: 4100, avatar: 'youth-earners-logo.png' },
                    { name: 'Sniper007', xp: 3800, avatar: 'youth-earners-logo.png' },
                    { name: 'Khushi', xp: 3200, avatar: 'youth-earners-logo.png' },
                    { name: userProfile.name, xp: xp, avatar: userProfile.avatar, isMe: true },
                    { name: 'NoobMaster', xp: 1200, avatar: 'youth-earners-logo.png' }
                ];
                return list.sort((a,b) => b.xp - a.xp);
            };

            // --- REAL FIREBASE MATCHMAKING LOGIC ---
            const startMatch = async (tier) => {
                playClick();
                if(tier.entry > 0 && wallet < tier.entry) {
                    addToast("Insufficient Balance!", "error"); return;
                }
                setConfirmPopup(null);
                setMatchFound(false);
                setMatchTime(15); // Search for 15 seconds
                setIsMatchmaking(true); 

                try {
                    // Check for waiting players in Firebase
                    const q = window.fs.query(window.fs.collection(window.db, "rooms"), window.fs.where("tier", "==", tier.entry), window.fs.where("status", "==", "waiting"));
                    const querySnapshot = await window.fs.getDocs(q);

                    if (!querySnapshot.empty) {
                        // Found someone! Join as Player 2
                        const roomDoc = querySnapshot.docs[0];
                        await window.fs.updateDoc(window.fs.doc(window.db, "rooms", roomDoc.id), {
                            status: 'playing',
                            p2: { uid: window.auth.currentUser.uid, name: userProfile.name, img: userProfile.avatar }
                        });
                        setRoomId(roomDoc.id); setPlayerRole(2);
                    } else {
                        // Create new room as Player 1
                        const docRef = await window.fs.addDoc(window.fs.collection(window.db, "rooms"), {
                            tier: tier.entry, status: 'waiting',
                            p1: { uid: window.auth.currentUser.uid, name: userProfile.name, img: userProfile.avatar },
                            timestamp: new Date()
                        });
                        setRoomId(docRef.id); setPlayerRole(1);
                    }
                } catch(e) { 
                    addToast("Network Error!", "error"); 
                    setIsMatchmaking(false); 
                }
            };

            // Cancel if timeout hits
            useEffect(() => {
                let timer;
                if (isMatchmaking && !matchFound) {
                    timer = setInterval(async () => {
                        setMatchTime(prev => {
                            if(prev <= 1) {
                                clearInterval(timer);
                                setIsMatchmaking(false);
                                addToast("No player found. Try again!");
                                // Delete room if I created it
                                if(playerRole === 1 && roomId) { 
                                    window.fs.deleteDoc(window.fs.doc(window.db, "rooms", roomId)); 
                                }
                                setRoomId(null);
                                return 0;
                            }
                            return prev - 1;
                        });
                    }, 1000);
                }
                return () => clearInterval(timer);
            }, [isMatchmaking, matchFound, roomId, playerRole]);

            // Realtime Game Listener
            useEffect(() => {
                if (!roomId) return;
                const unsub = window.fs.onSnapshot(window.fs.doc(window.db, "rooms", roomId), (doc) => {
                    const data = doc.data();
                    if(!data) return;
                    setRoomData(data);

                    if(data.status === 'playing' && !matchFound) {
                        setMatchFound(true); // Stop timer
                        setOpponent(playerRole === 1 ? data.p2 : data.p1);
                        
                        setTimeout(() => {
                            if(data.tier > 0) {
                                setWallet(w => w - data.tier);
                                addTransaction(-data.tier, `Entry: ₹${data.tier} Match`);
                            }
                            setIsMatchmaking(false); 
                            setIsPlaying(true); 
                            setMatchTime(60); // In-game timer
                        }, 2000); // VS Screen delay
                    }
                });
                return () => unsub();
            }, [roomId, matchFound, playerRole]);

            const simulateWin = () => {
                setIsPlaying(false); 
                const a = document.getElementById('winSound'); if(a) a.play().catch(()=>{});
                setWallet(w => w + 18);
                setXp(x => x + 50);
                addTransaction(18, "Match Won!");
                addToast("Victory! +₹18", "success");
                setRoomId(null);
            };

            // VIEWS
            return (
                <div className="max-w-md mx-auto min-h-screen relative pb-24">
                    
                    {/* Header */}
                    <div className="curved-header flex justify-between items-center px-6 py-4">
                        <div className="flex items-center gap-3">
                            <img src="youth-earners-logo.png" style={{mixBlendMode:'screen'}} className="h-10 w-10 object-contain" alt="Logo" />
                            <div>
                                <h1 className="font-black text-white text-lg tracking-widest leading-none">YOUTH EARNERS</h1>
                                <div className="text-[10px] text-[#ffcc00] tracking-widest font-bold">PRO GAMING</div>
                            </div>
                        </div>
                        <div className="relative cursor-pointer" onClick={() => addToast("No new notifications")}>
                            <i className="fa-solid fa-bell text-xl text-gray-300"></i>
                            <span className="absolute -top-1 -right-1 bg-red-500 text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full border border-black">3</span>
                        </div>
                    </div>

                    {/* Global Toasts */}
                    <div className="toast-container">
                        {toasts.map(t => (
                            <div key={t.id} className="toast">
                                <i className={`fa-solid ${t.type === 'error' ? 'fa-circle-xmark text-red-500' : 'fa-circle-check text-emerald-400'}`}></i>
                                {t.msg}
                            </div>
                        ))}
                    </div>

                    {/* Level Up Modal */}
                    {showLevelUp && (
                        <div className="modal-overlay">
                            <div className="text-center level-up-anim">
                                <i className="fa-solid fa-angles-up text-7xl text-[#ffcc00] drop-shadow-[0_0_20px_#ffcc00] mb-4"></i>
                                <h2 className="text-5xl font-black text-white italic tracking-tighter">LEVEL UP!</h2>
                                <p className="text-[#ffcc00] font-bold text-xl mt-2">You are now Level {showLevelUp}</p>
                            </div>
                        </div>
                    )}

                    <div className="p-4 pt-4">
                        
                        {/* HOME TAB */}
                        {activeTab === 'home' && (
                            <div className="space-y-6 pop-in">
                                {/* Profile / Balance Dashboard Card */}
                                <div className="gold-card p-5">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-black rounded-full border-2 border-[#ffcc00] flex items-center justify-center">
                                                <img src={userProfile.avatar} className="w-10 h-10 rounded-full" />
                                            </div>
                                            <div>
                                                <div className="text-gray-400 text-xs font-bold uppercase">Welcome Back</div>
                                                <div className="font-black text-lg text-white">{userProfile.name}</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-gray-400 text-xs font-bold uppercase">Balance</div>
                                            <div className="text-2xl font-black text-[#ffcc00]">₹{wallet.toFixed(2)}</div>
                                        </div>
                                    </div>
                                    {/* XP Progress */}
                                    <div>
                                        <div className="flex justify-between text-xs font-bold text-gray-300 mb-1">
                                            <span>Level {level}</span>
                                            <span>{xpProgress} / 100 XP</span>
                                        </div>
                                        <div className="progress-bg"><div className="progress-fill" style={{width: `${xpProgress}%`}}></div></div>
                                    </div>
                                </div>

                                {/* Banner */}
                                <div className="w-full h-36 rounded-xl bg-black border border-[#333] overflow-hidden flex items-center justify-center relative shadow-[0_0_15px_rgba(255,204,0,0.1)]">
                                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542751371-adc38448a05e?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80')] bg-cover bg-center opacity-30"></div>
                                    <div className="relative z-10 text-center">
                                        <h3 className="text-2xl font-black text-[#ffcc00] italic">PRO LEAGUE IS LIVE</h3>
                                        <p className="text-sm font-bold text-white">Play & Win Massive Cash</p>
                                    </div>
                                </div>

                                {/* Game Modes */}
                                <div>
                                    <h3 className="font-bold mb-3 text-white uppercase tracking-wider text-sm"><i className="fa-solid fa-gamepad text-[#ffcc00]"></i> Select Mode</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        {playTiers.map((tier, idx) => (
                                            <div key={idx} className="gold-card p-4 text-center">
                                                <div className="text-gray-400 text-[10px] font-bold uppercase mb-1">{tier.entry === 0 ? 'Free Play' : 'Entry Fee'}</div>
                                                <div className="text-white font-bold text-lg mb-1">₹{tier.entry}</div>
                                                <div className="text-[#ffcc00] font-black text-xl mb-3 drop-shadow-[0_0_5px_rgba(255,204,0,0.5)]">WIN: ₹{tier.win}</div>
                                                <button onClick={() => { playClick(); setConfirmPopup(tier); }} className="w-full btn-play-gold py-2 rounded-lg font-bold text-sm">PLAY</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TASKS & REWARDS TAB */}
                        {activeTab === 'tasks' && (
                            <div className="space-y-6 pop-in">
                                <div>
                                    <h2 className="text-xl font-black text-white uppercase tracking-widest mb-4"><i className="fa-solid fa-calendar-check text-[#ffcc00]"></i> Daily Rewards</h2>
                                    <div className="flex overflow-x-auto gap-3 pb-2 hide-scrollbar">
                                        {[1,2,3,4,5,6,7].map(day => (
                                            <div key={day} onClick={() => claimDaily(day)} className={`min-w-[70px] flex flex-col items-center p-3 rounded-xl border-2 cursor-pointer transition-transform hover:scale-105 ${claimedDays.includes(day) ? 'bg-[#111] border-emerald-500 opacity-70' : 'bg-black border-[#ffcc00] shadow-[0_0_10px_rgba(255,204,0,0.2)]'}`}>
                                                <div className="text-xs font-bold text-gray-400 mb-1">Day {day}</div>
                                                <i className={`fa-solid ${claimedDays.includes(day) ? 'fa-check text-emerald-500' : 'fa-coins text-[#ffcc00]'} text-2xl mb-1`}></i>
                                                <div className="font-black text-white text-sm">+₹{day*2}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h2 className="text-xl font-black text-white uppercase tracking-widest mb-4"><i className="fa-solid fa-list-check text-[#ffcc00]"></i> Earning Tasks</h2>
                                    <div className="space-y-3">
                                        {availableTasks.map(task => {
                                            const isDone = completedTasks.includes(task.id);
                                            return (
                                                <div key={task.id} className={`task-card ${isDone ? 'task-completed' : ''}`}>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-black rounded-full border border-gray-600 flex items-center justify-center"><i className={`fa-solid ${task.icon} text-gray-300`}></i></div>
                                                        <div>
                                                            <div className="font-bold text-white text-sm">{task.title}</div>
                                                            <div className="text-xs text-[#ffcc00] font-bold">Reward: ₹{task.coin} | {task.xp} XP</div>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => claimTask(task)} disabled={isDone} className={`px-4 py-2 rounded-lg font-bold text-xs uppercase ${isDone ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500' : 'btn-play-gold'}`}>
                                                        {isDone ? 'Done' : 'Claim'}
                                                    </button>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* LEADERBOARD TAB */}
                        {activeTab === 'leaderboard' && (
                            <div className="pop-in">
                                <h2 className="text-2xl font-black text-center text-white uppercase tracking-widest mb-6"><i className="fa-solid fa-crown text-[#ffcc00]"></i> Hall of Fame</h2>
                                
                                <div className="podium-container">
                                    {/* 2nd Place */}
                                    <div className="podium-item">
                                        <img src="youth-earners-logo.png" className="podium-avatar" />
                                        <div className="text-xs font-bold text-white mb-1 truncate w-full text-center">{getLeaderboard()[1].name}</div>
                                        <div className="podium-step step-2">2<div className="text-[10px] text-gray-800 mt-1">{getLeaderboard()[1].xp} XP</div></div>
                                    </div>
                                    {/* 1st Place */}
                                    <div className="podium-item" style={{marginBottom: '20px'}}>
                                        <i className="fa-solid fa-crown text-[#ffcc00] text-2xl absolute -top-8 drop-shadow-[0_0_10px_#ffcc00]"></i>
                                        <img src="youth-earners-logo.png" className="podium-avatar border-[#ffcc00]" />
                                        <div className="text-xs font-bold text-[#ffcc00] mb-1 truncate w-full text-center">{getLeaderboard()[0].name}</div>
                                        <div className="podium-step step-1">1<div className="text-[10px] text-gray-800 mt-1">{getLeaderboard()[0].xp} XP</div></div>
                                    </div>
                                    {/* 3rd Place */}
                                    <div className="podium-item">
                                        <img src="youth-earners-logo.png" className="podium-avatar" />
                                        <div className="text-xs font-bold text-white mb-1 truncate w-full text-center">{getLeaderboard()[2].name}</div>
                                        <div className="podium-step step-3">3<div className="text-[10px] text-gray-900 mt-1">{getLeaderboard()[2].xp} XP</div></div>
                                    </div>
                                </div>

                                <div className="mt-6 space-y-2">
                                    {getLeaderboard().slice(3).map((user, idx) => (
                                        <div key={idx} className={`p-3 rounded-xl flex items-center justify-between border ${user.isMe ? 'bg-[#ffcc00]/10 border-[#ffcc00]' : 'bg-[#111] border-[#333]'}`}>
                                            <div className="flex items-center gap-3">
                                                <div className="text-gray-400 font-black w-4">{idx + 4}</div>
                                                <img src={user.avatar} className="w-8 h-8 rounded-full border border-gray-600 bg-black" />
                                                <div className={`font-bold text-sm ${user.isMe ? 'text-[#ffcc00]' : 'text-white'}`}>{user.name} {user.isMe && '(You)'}</div>
                                            </div>
                                            <div className="font-bold text-gray-300 text-sm">{user.xp} XP</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* WALLET TAB */}
                        {activeTab === 'wallet' && (
                            <div className="space-y-6 pop-in">
                                <div className="gold-card p-6 text-center">
                                    <div className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Available Balance</div>
                                    <div className="text-5xl font-black text-[#ffcc00] drop-shadow-[0_0_10px_rgba(255,204,0,0.3)] my-2">₹{wallet.toFixed(2)}</div>
                                    <div className="flex gap-4 mt-6">
                                        <button onClick={()=>addToast('Redirecting to Deposit')} className="flex-1 btn-play-gold py-3 rounded-xl font-bold text-sm"><i className="fa-solid fa-plus-circle"></i> ADD CASH</button>
                                        <button onClick={()=>addToast('Withdraw feature locked')} className="flex-1 bg-black border-2 border-[#ffcc00] text-[#ffcc00] py-3 rounded-xl font-bold text-sm uppercase"><i className="fa-solid fa-building-columns"></i> Withdraw</button>
                                    </div>
                                </div>
                                
                                <div>
                                    <h3 className="font-bold text-white text-sm uppercase tracking-widest mb-3"><i className="fa-solid fa-clock-rotate-left text-[#ffcc00]"></i> Transactions</h3>
                                    <div className="bg-[#111] rounded-xl border border-[#333] overflow-hidden">
                                        {transactions.length === 0 ? (
                                            <div className="p-4 text-center text-gray-500 text-sm font-bold">No recent transactions.</div>
                                        ) : (
                                            transactions.map(tx => (
                                                <div key={tx.id} className="p-3 border-b border-[#222] flex justify-between items-center last:border-0">
                                                    <div>
                                                        <div className="font-bold text-sm text-gray-200">{tx.desc}</div>
                                                        <div className="text-[10px] text-gray-500">{tx.date}</div>
                                                    </div>
                                                    <div className={`font-black ${tx.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                        {tx.amount > 0 ? '+' : ''}₹{Math.abs(tx.amount)}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* PROFILE TAB */}
                        {activeTab === 'profile' && (
                            <div className="pop-in space-y-6">
                                <div className="text-center pt-2">
                                    <div className="relative inline-block">
                                        <img src={userProfile.avatar} className="w-24 h-24 rounded-full border-4 border-[#ffcc00] mx-auto mb-3 bg-black object-cover" />
                                        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-black border border-[#ffcc00] text-[#ffcc00] text-[10px] font-black px-3 py-1 rounded-full uppercase">Lv. {level}</div>
                                    </div>
                                    <h2 className="text-2xl font-black text-white mt-2">{userProfile.name}</h2>
                                    <p className="text-gray-400 text-xs font-bold tracking-widest mt-1">{userProfile.number}</p>
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                    <div className="bg-[#111] p-3 rounded-xl border border-[#333] text-center">
                                        <div className="text-[#ffcc00] font-black text-lg">{xp}</div>
                                        <div className="text-[9px] text-gray-400 font-bold uppercase">Total XP</div>
                                    </div>
                                    <div className="bg-[#111] p-3 rounded-xl border border-[#333] text-center">
                                        <div className="text-[#10b981] font-black text-lg">{completedTasks.length}</div>
                                        <div className="text-[9px] text-gray-400 font-bold uppercase">Tasks Done</div>
                                    </div>
                                    <div className="bg-[#111] p-3 rounded-xl border border-[#333] text-center">
                                        <div className="text-white font-black text-lg">#{getLeaderboard().findIndex(u => u.isMe) + 1}</div>
                                        <div className="text-[9px] text-gray-400 font-bold uppercase">Rank</div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="font-bold text-white text-sm uppercase tracking-widest mb-3"><i className="fa-solid fa-medal text-[#ffcc00]"></i> Achievements</h3>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className={`badge-item ${level >= 2 ? '' : 'badge-locked'}`}>
                                            <i className="fa-solid fa-star text-2xl text-[#ffcc00] mb-2"></i>
                                            <div className="text-[10px] font-bold text-white">Rookie</div>
                                        </div>
                                        <div className={`badge-item ${completedTasks.length >= 3 ? '' : 'badge-locked'}`}>
                                            <i className="fa-solid fa-check-double text-2xl text-emerald-400 mb-2"></i>
                                            <div className="text-[10px] font-bold text-white">Task Master</div>
                                        </div>
                                        <div className={`badge-item ${claimedDays.length >= 7 ? '' : 'badge-locked'}`}>
                                            <i className="fa-solid fa-fire text-2xl text-red-500 mb-2"></i>
                                            <div className="text-[10px] font-bold text-white">7 Day Streak</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* MODALS */}
                    {confirmPopup && (
                        <div className="modal-overlay">
                            <div className="bg-[#0a0a0a] border border-[#ffcc00] w-full max-w-[280px] rounded-2xl p-6 pop-in text-center relative shadow-[0_0_30px_rgba(255,204,0,0.2)]">
                                <h3 className="text-white font-black tracking-widest mb-6 uppercase text-lg">Match Settings</h3>
                                <div className="bg-[#111] border border-[#333] rounded-xl p-4 mb-6">
                                    <div className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Entry Fee</div>
                                    <div className="text-white font-black text-3xl mb-3">₹{confirmPopup.entry}</div>
                                    <div className="h-[1px] w-full bg-[#333] my-3"></div>
                                    <div className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Prize Pool</div>
                                    <div className="text-[#ffcc00] font-black text-4xl drop-shadow-[0_0_10px_rgba(255,204,0,0.5)]">₹{confirmPopup.win}</div>
                                </div>
                                <div className="flex gap-3 w-full">
                                    <button onClick={() => { playClick(); setConfirmPopup(null); }} className="flex-1 bg-black border-2 border-[#333] text-gray-300 py-3 rounded-xl font-bold uppercase text-sm">Cancel</button>
                                    <button onClick={() => startMatch(confirmPopup)} className="flex-1 btn-play-gold py-3 rounded-xl font-black uppercase text-sm">START</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {isMatchmaking && (
                        <div className="modal-overlay flex-col z-[150]">
                            <h2 className="text-[#ffcc00] text-3xl font-black tracking-widest uppercase mb-10 animate-pulse">Matchmaking</h2>
                            <div className="w-32 h-32 rounded-full border-4 border-[#ffcc00] border-dashed spin-slow mb-6"></div>
                            {matchFound ? (
                                <p className="font-bold text-emerald-400 tracking-widest">PLAYER FOUND!</p>
                            ) : (
                                <p className="font-bold text-gray-400 tracking-widest">EST. TIME: {matchTime}s</p>
                            )}
                        </div>
                    )}

                    {isPlaying && (
                        <div className="fixed inset-0 bg-[#050505] text-white flex flex-col items-center justify-center p-4 z-[200]">
                            <div className="w-full flex justify-between items-center mb-12 px-6">
                                <div className="text-center"><img src={userProfile.avatar} className="w-16 h-16 rounded-full border-2 border-blue-500 bg-black mb-2"/><p className="font-bold text-sm">{userProfile.name}</p></div>
                                <div className="text-5xl font-black text-[#ffcc00] italic">VS</div>
                                <div className="text-center"><img src={opponent.img} className="w-16 h-16 rounded-full border-2 border-red-500 bg-black mb-2"/><p className="font-bold text-sm">{opponent.name}</p></div>
                            </div>
                            
                            <div className="text-7xl font-black text-white mb-10 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">{matchTime}s</div>
                            
                            {/* Live Chat */}
                            <div className="absolute bottom-32 w-full max-w-sm px-6 flex gap-2">
                                <input type="text" value={chatMsg} onChange={e=>setChatMsg(e.target.value)} placeholder="Send emoji or chat..." className="flex-1 bg-[#111] rounded-xl px-4 py-3 border border-[#333] outline-none text-sm font-bold" />
                                <button onClick={()=>{ playClick(); setChatMsg(''); addToast('Message sent'); }} className="bg-[#ffcc00] text-black w-12 h-12 rounded-xl font-bold flex items-center justify-center"><i className="fa-solid fa-paper-plane"></i></button>
                            </div>

                            <button onClick={simulateWin} className="btn-play-gold py-4 px-12 rounded-xl font-black text-xl absolute bottom-10 uppercase tracking-widest">Simulate Win</button>
                        </div>
                    )}

                    {/* Bottom Navigation */}
                    <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-[#0a0a0a] border-t border-[#333] flex justify-between items-center h-[70px] px-2 z-50 rounded-t-2xl shadow-[0_-5px_20px_rgba(0,0,0,0.8)]">
                        {[
                            { id: 'home', icon: 'fa-house', label: 'HOME' },
                            { id: 'tasks', icon: 'fa-list-check', label: 'TASKS' },
                            { id: 'wallet', icon: 'fa-wallet', label: 'WALLET', special: true },
                            { id: 'leaderboard', icon: 'fa-crown', label: 'RANKS' },
                            { id: 'profile', icon: 'fa-user', label: 'PROFILE' }
                        ].map(tab => (
                            tab.special ? (
                                <div key={tab.id} className="relative -top-6 w-[20%] flex justify-center">
                                    <button onClick={()=>{playClick(); setActiveTab(tab.id);}} className={`w-16 h-16 rounded-full flex items-center justify-center border-4 border-[#050505] transition-transform ${activeTab===tab.id?'bg-[#ffcc00] text-black shadow-[0_0_15px_rgba(255,204,0,0.5)] scale-110':'bg-[#111] text-[#ffcc00]'}`}>
                                        <i className={`fa-solid ${tab.icon} text-2xl`}></i>
                                    </button>
                                </div>
                            ) : (
                                <button key={tab.id} onClick={()=>{playClick(); setActiveTab(tab.id);}} className={`flex flex-col items-center gap-1 w-[20%] transition-colors ${activeTab===tab.id?'text-[#ffcc00] drop-shadow-[0_0_5px_rgba(255,204,0,0.5)]':'text-gray-500 hover:text-gray-300'}`}>
                                    <i className={`fa-solid ${tab.icon} text-xl`}></i>
                                    <span className="text-[9px] font-black tracking-widest">{tab.label}</span>
                                </button>
                            )
                        ))}
                    </div>
                </div>
            );
        }
