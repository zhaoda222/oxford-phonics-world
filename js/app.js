// Oxford Phonics World Application Logic
class PhonicsApp {
  constructor(data) {
    this.data = data;
    const savedLvl = parseInt(localStorage.getItem("opw_current_level") || "1", 10);
    this.currentLevelId = (savedLvl >= 1 && savedLvl <= 5) ? savedLvl : 1;
    this.currentTab = 'learn'; // 'learn', 'flashcards', 'quiz', 'spell'
    this.currentUnit = null;
    this.stars = parseInt(localStorage.getItem('opw_stars') || '0', 10);
    this.completedUnits = JSON.parse(localStorage.getItem('opw_completed') || '[]');

    // Quiz / Game state
    this.gameState = {
      active: false,
      mode: 'quiz', // 'quiz' or 'spell' or 'flashcards'
      unit: null,
      words: [],
      currentIndex: 0,
      score: 0,
      currentSpelled: []
    };

    this.initElements();
    this.attachEvents();
    this.renderHeaderStats();
    this.renderLevelsNav();
    this.renderLevelContent(this.currentLevelId);
  }

  initElements() {
    this.elLevelTabs = document.getElementById('level-tabs');
    this.elViewport = document.getElementById('screen-viewport');
    this.elNavItems = document.querySelectorAll('.nav-item');
    this.elStarCount = document.getElementById('star-count');
    this.elModalOverlay = document.getElementById('modal-overlay');
    this.elModalTitle = document.getElementById('modal-title');
    this.elModalBody = document.getElementById('modal-body');
  }

  attachEvents() {
    // Bottom navigation items
    this.elNavItems.forEach(item => {
      item.addEventListener('click', (e) => {
        const tab = item.getAttribute('data-tab');
        this.switchTab(tab);
      });
    });

    // Modal close button
    const btnClose = document.getElementById('btn-modal-close');
    if (btnClose) {
      btnClose.addEventListener('click', () => {
        this.closeModal();
      });
    }

    // Close on overlay click
    this.elModalOverlay.addEventListener('click', (e) => {
      if (e.target === this.elModalOverlay) {
        this.closeModal();
      }
    });
  }

  addStars(count = 1) {
    this.stars += count;
    localStorage.setItem('opw_stars', this.stars.toString());
    this.renderHeaderStats();
    audioMgr.star();
  }

  renderHeaderStats() {
    if (this.elStarCount) {
      this.elStarCount.innerText = this.stars;
    }
    const elProgress = document.getElementById("progress-count");
    if (elProgress) {
      let totalUnits = 0;
      this.data.levels.forEach(lvl => totalUnits += lvl.units.length);
      const completedCount = this.completedUnits.length;
      const pct = totalUnits > 0 ? Math.round((completedCount / totalUnits) * 100) : 0;
      elProgress.innerText = completedCount + "/" + totalUnits + " (" + pct + "%)";
    }
  }

  switchTab(tab) {
    audioMgr.click();
    this.currentTab = tab;
    this.elNavItems.forEach(i => {
      i.classList.toggle('active', i.getAttribute('data-tab') === tab);
    });

    if (tab === 'learn') {
      this.renderLevelContent(this.currentLevelId);
    } else if (tab === 'flashcards') {
      this.startGlobalFlashcards();
    } else if (tab === 'quiz') {
      this.startGlobalQuiz();
    } else if (tab === 'spell') {
      this.startGlobalSpelling();
    }
  }

  renderLevelsNav() {
    this.elLevelTabs.innerHTML = '';
    this.data.levels.forEach(lvl => {
      const tab = document.createElement('div');
      tab.className = `level-tab ${lvl.id === this.currentLevelId ? 'active' : ''}`;
      tab.innerHTML = `
        <span class="lvl-badge">${lvl.badge}</span>
        <div class="lvl-name">${lvl.name}</div>
      `;
      tab.addEventListener('click', () => {
        audioMgr.pop();
        this.currentLevelId = lvl.id;
        this.renderLevelsNav();
        this.renderLevelContent(lvl.id);
      });
      this.elLevelTabs.appendChild(tab);
    });
  }

  renderLevelContent(levelId) {
    const level = this.data.levels.find(l => l.id === levelId);
    if (!level) return;

    let html = `
      <div class="level-overview-banner" style="background: linear-gradient(135deg, ${level.themeColor} 0%, ${level.accentColor} 100%);">
        <h2>${level.name} - ${level.title}</h2>
        <p>${level.desc}</p>
      </div>

      <div class="units-container">
        <div class="section-title">
          <span>📚 学习单元 (${level.units.length} Units)</span>
          <span style="font-size:0.78rem; color:#64748B;">点击单元开始</span>
        </div>
    `;

    level.units.forEach(unit => {
      const isCompleted = this.completedUnits.includes(unit.id);
      const wordSample = unit.words.slice(0, 4).map(w => w.word).join(', ') + '...';

      html += `
        <div class="unit-card" data-unit-id="${unit.id}" style="--level-color: ${level.themeColor}">
          <div class="unit-info">
            <div class="unit-num-badge">Unit ${unit.unitNum} • ${unit.words.length} Words ${isCompleted ? '⭐' : ''}</div>
            <div class="unit-target">${unit.target}</div>
            <div class="unit-phonics">${unit.targetPhonics} • <span style="color:#94A3B8;">${wordSample}</span></div>
          </div>
          <button class="unit-action-btn" title="开始学习">▶</button>
        </div>
      `;
    });

    html += `</div>`;
    this.elViewport.innerHTML = html;

    // Attach click events on unit cards
    const unitCards = this.elViewport.querySelectorAll('.unit-card');
    unitCards.forEach(card => {
      card.addEventListener('click', () => {
        audioMgr.click();
        const unitId = card.getAttribute('data-unit-id');
        this.openUnitDetail(unitId);
      });
    });
  }

  openUnitDetail(unitId) {
    let targetUnit = null;
    let targetLevel = null;
    for (const lvl of this.data.levels) {
      const found = lvl.units.find(u => u.id === unitId);
      if (found) {
        targetUnit = found;
        targetLevel = lvl;
        break;
      }
    }
    if (!targetUnit) return;

    this.currentUnit = targetUnit;
    this.elModalTitle.innerText = `Unit ${targetUnit.unitNum}: ${targetUnit.target}`;

    let html = `
      <div style="text-align:center; margin-bottom:16px;">
        <span class="sound-badge" id="btn-speak-target">
          🔊 发音训练: <strong style="color:#4F46E5;">${targetUnit.targetPhonics}</strong>
        </span>
        <div style="font-size:0.8rem; color:#64748B; margin-top:4px;">点击卡片可收听拼读拆分发音</div>
      </div>

      <div class="word-cards-grid">
    `;

    targetUnit.words.forEach((w, idx) => {
      html += `
        <div class="word-card" data-index="${idx}">
          <div class="word-card-emoji">${w.emoji}</div>
          <div class="word-card-text">${w.word}</div>
          <div class="word-card-sub">${w.ph} · ${w.meaning}</div>
        </div>
      `;
    });

    html += `
      </div>
      <div style="display:flex; gap:10px;">
        <button class="btn-primary" id="btn-modal-start-practice">
          🎯 进入本单元练习
        </button>
      </div>
    `;

    this.elModalBody.innerHTML = html;
    this.elModalOverlay.classList.add('active');

    // Unit target sound speak
    const btnSpeakTarget = document.getElementById('btn-speak-target');
    if (btnSpeakTarget) {
      btnSpeakTarget.addEventListener('click', () => {
        audioMgr.pop();
        audioMgr.speak(targetUnit.target);
      });
    }

    // Word card click -> spell Phonics
    const cards = this.elModalBody.querySelectorAll('.word-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        const idx = parseInt(card.getAttribute('data-index'), 10);
        const wordObj = targetUnit.words[idx];
        audioMgr.pop();
        audioMgr.spellPhonics(wordObj.phonicsBreakdown, wordObj.word);
      });
    });

    // Start practice button
    const btnStartPractice = document.getElementById('btn-modal-start-practice');
    if (btnStartPractice) {
      btnStartPractice.addEventListener('click', () => {
        this.closeModal();
        this.startUnitPractice(targetUnit);
      });
    }
  }

  closeModal() {
    audioMgr.click();
    this.elModalOverlay.classList.remove('active');
  }

  // --- Flashcard Mode ---
  startGlobalFlashcards() {
    const level = this.data.levels.find(l => l.id === this.currentLevelId);
    let allWords = [];
    level.units.forEach(u => allWords.push(...u.words));
    // Shuffle
    allWords = allWords.sort(() => Math.random() - 0.5);

    let currentIndex = 0;

    const renderCard = () => {
      const item = allWords[currentIndex];
      const progressPercent = Math.round(((currentIndex + 1) / allWords.length) * 100);

      this.elViewport.innerHTML = `
        <div class="game-container">
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.85rem; font-weight:700; color:#64748B;">
            <span>🃏 闪卡模式 (${currentIndex + 1}/${allWords.length})</span>
            <span>Level ${this.currentLevelId}</span>
          </div>

          <div class="game-progress-bar">
            <div class="game-progress-fill" style="width: ${progressPercent}%;"></div>
          </div>

          <div class="flashcard" id="flashcard-element">
            <div class="flashcard-inner">
              <div class="flashcard-front">
                <div class="big-emoji-hero">${item.emoji}</div>
                <div style="font-size: 1.1rem; font-weight:700; color:#64748B; margin-top:10px;">点击卡片翻面看单词</div>
                <button class="sound-badge" id="btn-flash-speak" style="margin-top:16px;">🔊 听一听</button>
              </div>
              <div class="flashcard-back">
                <div class="word-display-box">${item.word}</div>
                <div style="font-size: 1.2rem; color:#4F46E5; font-weight:800; margin-bottom:6px;">${item.ph}</div>
                <div style="font-size: 1.1rem; font-weight:700; color:#334155;">${item.meaning}</div>
                <div style="font-size: 0.9rem; color:#64748B; font-style:italic; margin-top:12px;">"${item.example}"</div>
                <button class="sound-badge" id="btn-flash-spell" style="margin-top:16px;">🗣️ 自然拼读拆音</button>
              </div>
            </div>
          </div>

          <div style="display:flex; gap:10px; margin-top:10px;">
            <button class="btn-secondary" id="btn-prev-card" style="flex:1;">上一张</button>
            <button class="btn-primary" id="btn-next-card" style="flex:2;">下一张 ➜</button>
          </div>
        </div>
      `;

      const card = document.getElementById('flashcard-element');
      card.addEventListener('click', (e) => {
        if (e.target.closest('#btn-flash-speak') || e.target.closest('#btn-flash-spell')) return;
        audioMgr.pop();
        card.classList.toggle('flipped');
      });

      document.getElementById('btn-flash-speak').addEventListener('click', (e) => {
        e.stopPropagation();
        audioMgr.speak(item.word);
      });

      document.getElementById('btn-flash-spell').addEventListener('click', (e) => {
        e.stopPropagation();
        audioMgr.spellPhonics(item.phonicsBreakdown, item.word);
      });

      document.getElementById('btn-next-card').addEventListener('click', () => {
        audioMgr.click();
        this.addStars(1);
        if (currentIndex < allWords.length - 1) {
          currentIndex++;
          renderCard();
        } else {
          this.renderVictoryScreen('闪卡学习完成！太棒了！', allWords.length);
        }
      });

      document.getElementById('btn-prev-card').addEventListener('click', () => {
        audioMgr.click();
        if (currentIndex > 0) {
          currentIndex--;
          renderCard();
        }
      });
    };

    renderCard();
  }

  // --- Quiz / Practice Mode ---
  startUnitPractice(unit) {
    this.startQuizGame(unit.words, `Unit ${unit.unitNum} 闯关练习`, unit.id);
  }

  startGlobalQuiz() {
    const level = this.data.levels.find(l => l.id === this.currentLevelId);
    let allWords = [];
    level.units.forEach(u => allWords.push(...u.words));
    allWords = allWords.sort(() => Math.random() - 0.5).slice(0, 10);
    this.startQuizGame(allWords, `Level ${this.currentLevelId} 听音辩词大挑战`);
  }

  startQuizGame(wordsList, title, unitIdToComplete = null) {
    let index = 0;
    let score = 0;
    const questions = wordsList.slice().sort(() => Math.random() - 0.5);

    const renderQuestion = () => {
      const q = questions[index];
      const progressPercent = Math.round(((index + 1) / questions.length) * 100);

      // Generate 3 distractors
      const otherWords = wordsList.filter(w => w.word !== q.word);
      const distractors = otherWords.sort(() => Math.random() - 0.5).slice(0, 3);
      const options = [q, ...distractors].sort(() => Math.random() - 0.5);

      this.elViewport.innerHTML = `
        <div class="game-container">
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.85rem; font-weight:700; color:#64748B;">
            <span>${title} (${index + 1}/${questions.length})</span>
            <span>⭐ 得分: ${score}</span>
          </div>

          <div class="game-progress-bar">
            <div class="game-progress-fill" style="width: ${progressPercent}%;"></div>
          </div>

          <div class="game-card">
            <div style="font-size:0.85rem; color:#64748B; font-weight:700; margin-bottom:4px;">听发音，选出正确的图文</div>
            <div class="big-emoji-hero" style="font-size: 3.5rem;">❓</div>
            <button class="sound-badge" id="btn-quiz-listen" style="margin-top:6px; font-size:1rem; padding:8px 20px;">
              🔊 播放发音 (Click to Listen)
            </button>
          </div>

          <div class="options-grid">
            ${options.map((opt, oIdx) => `
              <button class="option-btn" data-word="${opt.word}">
                <span style="font-size: 2.2rem;">${opt.emoji}</span>
                <span style="font-size: 1.15rem; font-weight:800;">${opt.word}</span>
                <span style="font-size: 0.75rem; color:#64748B;">${opt.meaning}</span>
              </button>
            `).join('')}
          </div>
        </div>
      `;

      // Auto play sound initially
      setTimeout(() => {
        audioMgr.speak(q.word);
      }, 350);

      document.getElementById('btn-quiz-listen').addEventListener('click', () => {
        audioMgr.speak(q.word);
      });

      const buttons = this.elViewport.querySelectorAll('.option-btn');
      buttons.forEach(btn => {
        btn.addEventListener('click', () => {
          const selected = btn.getAttribute('data-word');
          buttons.forEach(b => b.style.pointerEvents = 'none'); // prevent double click

          if (selected === q.word) {
            btn.classList.add('correct-choice');
            audioMgr.correct();
            score += 10;
            this.addStars(1);
          } else {
            btn.classList.add('wrong-choice');
            audioMgr.wrong();
            // Highlight correct one
            buttons.forEach(b => {
              if (b.getAttribute('data-word') === q.word) {
                b.classList.add('correct-choice');
              }
            });
          }

          setTimeout(() => {
            if (index < questions.length - 1) {
              index++;
              renderQuestion();
            } else {
              if (unitIdToComplete && !this.completedUnits.includes(unitIdToComplete)) {
                this.completedUnits.push(unitIdToComplete);
                localStorage.setItem('opw_completed', JSON.stringify(this.completedUnits));
              }
              this.renderVictoryScreen('挑战成功！恭喜通关！', score);
            }
          }, 1200);
        });
      });
    };

    renderQuestion();
  }

  // --- Spelling Challenge Mode ---
  startGlobalSpelling() {
    const level = this.data.levels.find(l => l.id === this.currentLevelId);
    let allWords = [];
    level.units.forEach(u => allWords.push(...u.words));
    // Filter words suitable for spelling (3-5 letters)
    const spellWords = allWords.filter(w => w.word.length >= 3 && w.word.length <= 6).sort(() => Math.random() - 0.5).slice(0, 8);

    let index = 0;
    let score = 0;

    const renderSpellingStep = () => {
      const q = spellWords[index];
      const targetWord = q.word.toLowerCase();
      const progressPercent = Math.round(((index + 1) / spellWords.length) * 100);

      // Scrambled letters + 2 decoys
      const alphabet = 'abcdefghijklmnopqrstuvwxyz';
      const letters = targetWord.split('');
      while (letters.length < targetWord.length + 2) {
        const randomChar = alphabet[Math.floor(Math.random() * alphabet.length)];
        letters.push(randomChar);
      }
      const shuffledLetters = letters.sort(() => Math.random() - 0.5);

      let currentAnswer = [];

      this.elViewport.innerHTML = `
        <div class="game-container">
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.85rem; font-weight:700; color:#64748B;">
            <span>🔤 字母拼词大闯关 (${index + 1}/${spellWords.length})</span>
            <span>⭐ ${score}分</span>
          </div>

          <div class="game-progress-bar">
            <div class="game-progress-fill" style="width: ${progressPercent}%;"></div>
          </div>

          <div class="game-card">
            <div class="big-emoji-hero">${q.emoji}</div>
            <div style="font-size: 1.1rem; font-weight:700; color:#334155; margin-bottom:4px;">${q.meaning}</div>
            <button class="sound-badge" id="btn-spell-listen">🔊 听音拼写</button>

            <!-- Letter target slots -->
            <div class="spell-slots" id="spell-slots-container">
              ${targetWord.split('').map(() => `<div class="spell-slot"></div>`).join('')}
            </div>
          </div>

          <!-- Letters Pool -->
          <div class="letter-pool" id="letter-pool-container">
            ${shuffledLetters.map((l, lIdx) => `
              <button class="letter-btn" data-letter="${l}" data-idx="${lIdx}">${l}</button>
            `).join('')}
          </div>

          <div style="display:flex; gap:10px;">
            <button class="btn-secondary" id="btn-clear-spelling">重置输入</button>
          </div>
        </div>
      `;

      setTimeout(() => {
        audioMgr.speak(targetWord);
      }, 300);

      document.getElementById('btn-spell-listen').addEventListener('click', () => {
        audioMgr.speak(targetWord);
      });

      const slotEls = this.elViewport.querySelectorAll('.spell-slot');
      const letterBtns = this.elViewport.querySelectorAll('.letter-btn');

      const updateSlots = () => {
        slotEls.forEach((slot, sIdx) => {
          slot.innerText = currentAnswer[sIdx] ? currentAnswer[sIdx].letter : '';
        });

        // Check if filled
        if (currentAnswer.length === targetWord.length) {
          const formedWord = currentAnswer.map(a => a.letter).join('');
          if (formedWord === targetWord) {
            audioMgr.correct();
            score += 15;
            this.addStars(2);
            slotEls.forEach(s => s.style.borderColor = '#22C55E');
            setTimeout(() => {
              if (index < spellWords.length - 1) {
                index++;
                renderSpellingStep();
              } else {
                this.renderVictoryScreen('拼词大师！所有单词全部通关！', score);
              }
            }, 1000);
          } else {
            audioMgr.wrong();
            slotEls.forEach(s => s.style.borderColor = '#EF4444');
            setTimeout(() => {
              // reset
              currentAnswer = [];
              letterBtns.forEach(b => b.classList.remove('used'));
              slotEls.forEach(s => {
                s.innerText = '';
                s.style.borderColor = '#4F46E5';
              });
            }, 800);
          }
        }
      };

      letterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          if (btn.classList.contains('used') || currentAnswer.length >= targetWord.length) return;
          audioMgr.pop();
          const letter = btn.getAttribute('data-letter');
          const idx = btn.getAttribute('data-idx');
          btn.classList.add('used');
          currentAnswer.push({ letter, btn });
          updateSlots();
        });
      });

      document.getElementById('btn-clear-spelling').addEventListener('click', () => {
        audioMgr.click();
        currentAnswer = [];
        letterBtns.forEach(b => b.classList.remove('used'));
        slotEls.forEach(s => {
          s.innerText = '';
          s.style.borderColor = '#4F46E5';
        });
      });
    };

    renderSpellingStep();
  }

  // --- Victory Screen ---
  renderVictoryScreen(message, points) {
    audioMgr.levelComplete();
    this.elViewport.innerHTML = `
      <div class="game-container victory-modal">
        <div style="font-size: 5rem; margin-top:20px; animation: bounce 1.5s infinite;">🏆</div>
        <div class="victory-stars">⭐⭐⭐</div>
        <h2 style="font-size:1.6rem; color:#1E293B; margin-bottom:8px;">${message}</h2>
        <p style="font-size:1rem; color:#64748B; margin-bottom:24px;">本次闯关收获 <strong>${points}</strong> 分与丰厚星星勋章！</p>

        <button class="btn-primary" id="btn-victory-back" style="margin-bottom:12px;">
          返回单元列表
        </button>
        <button class="btn-secondary" id="btn-victory-again">
          再练一次
        </button>
      </div>
    `;

    document.getElementById('btn-victory-back').addEventListener('click', () => {
      this.switchTab('learn');
    });

    document.getElementById('btn-victory-again').addEventListener('click', () => {
      this.startGlobalQuiz();
    });
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  if (typeof PHONICS_DATA !== 'undefined') {
    window.phonicsApp = new PhonicsApp(PHONICS_DATA);
  }
});
