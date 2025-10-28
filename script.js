// Pop! Carnival Balloon Game
// Author: generated

const CONFIG = {
  startAmmo: 10,
  totalScoreGoal: 500,
  totalScoreGoal: 500,
  // specific coin drop values and their relative rarity (5 is most common, 50 is rare)
  coinValues: [5, 10, 15, 20, 25, 50],
  coinRarityWeights: [60, 20, 10, 6, 3, 1],
  // slightly more water chance than poison; coins are rare
  dropTypeWeights: {
    water: 48,
    poison: 37,
    coin: 15
  },
  weapons: {
    darts: {buyCost: 0, refillCost:5, ammoOnBuy:0, ammoOnRefill:5, icon:'🎯', name:'Darts', owned:true},
    arrows: {buyCost:150, refillCost:50, ammoOnBuy:7, ammoOnRefill:7, icon:'🏹', name:'Arrows'},
    shuriken: {buyCost:250, refillCost:75, ammoOnBuy:10, ammoOnRefill:10, icon:'🌀', name:'Shuriken'},
    kunai: {buyCost:500, refillCost:150, ammoOnBuy:12, ammoOnRefill:12, icon:'🔪', name:'Kunai'}
  }
}

// State
let state = {
  coins: 0,
  ammo: CONFIG.startAmmo,
  weapon: 'darts',
  ammoCounts: {darts: CONFIG.startAmmo, arrows:0, shuriken:0, kunai:0},
  score: 0,
  water: 0, // percent of progress bar
  poison: 0,
  chainWater: 0,
  chainPoison: 0,
  balloons: [],
  running: true,
}

// DOM
const board = document.getElementById('board')
const coinCountEl = document.getElementById('coinCount')
const ammoCountEl = document.getElementById('ammoCount')
const weaponIconEl = document.getElementById('weaponIcon')
const weaponNameEl = document.getElementById('weaponName')
const messageOverlay = document.getElementById('overlay')
const messageTitle = document.getElementById('messageTitle')
const messageText = document.getElementById('messageText')
const replayBtn = document.getElementById('replayBtn')
const exitBtn = document.getElementById('exitBtn')
const waterBar = document.getElementById('waterBar')
const poisonBar = document.getElementById('poisonBar')

// WebAudio context and asset loading
const AudioCtx = window.AudioContext || window.webkitAudioContext
const audioCtx = AudioCtx ? new AudioCtx() : null
// small embedded WAV data URIs (very short tones) to ensure audio loads locally
const ASSETS = {
  coin: 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=',
  water: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=',
  poison: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA='
}
const audioBuffers = {}
async function loadAudio(){ if(!audioCtx) return; try{ for(const k of Object.keys(ASSETS)){ const resp = await fetch(ASSETS[k]); const buf = await resp.arrayBuffer(); audioBuffers[k] = await audioCtx.decodeAudioData(buf) } }catch(e){ console.warn('Failed to load audio', e) } }
function playBuffer(name, vol=0.08){ if(!audioCtx) return; const buf = audioBuffers[name]; if(!buf) return; const s = audioCtx.createBufferSource(); s.buffer = buf; const g = audioCtx.createGain(); g.gain.value = vol; s.connect(g); g.connect(audioCtx.destination); s.start(); }
// synthesized fallback if buffers missing
function playBeep(freq=440, type='sine', time=0.08, gain=0.08){ if(!audioCtx) return; try{ const o = audioCtx.createOscillator(); const g = audioCtx.createGain(); o.type=type; o.frequency.value=freq; g.gain.value = gain; o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + time); }catch(e){} }
function playCoinSound(){ if(audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(()=>{}); if(audioBuffers['coin']) playBuffer('coin',0.12); else { playBeep(980,'sine',0.08,0.12); setTimeout(()=>playBeep(1320,'sine',0.04,0.08),40) } }
function playWaterSound(){ if(audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(()=>{}); if(audioBuffers['water']) playBuffer('water',0.08); else playBeep(560,'triangle',0.12,0.06) }
function playPoisonSound(){ if(audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(()=>{}); if(audioBuffers['poison']) playBuffer('poison',0.09); else playBeep(240,'sawtooth',0.12,0.08) }
// load assets
loadAudio()

// Helpers
function randInt(min,max){return Math.floor(Math.random()*(max-min+1))+min}
function chooseWeighted(values,weights){const total=weights.reduce((a,b)=>a+b,0);let r=Math.random()*total;for(let i=0;i<values.length;i++){r-=weights[i];if(r<=0) return values[i]}return values[values.length-1]}

function pickCoinAmount(){
  // Choose from the explicit coin values with configured rarity weights
  return chooseWeighted(CONFIG.coinValues, CONFIG.coinRarityWeights)
}

function pickDropType(){return chooseWeighted(['water','poison','coin'], [CONFIG.dropTypeWeights.water, CONFIG.dropTypeWeights.poison, CONFIG.dropTypeWeights.coin])}

function updateUI(){coinCountEl.textContent = state.coins; ammoCountEl.textContent = state.ammoCounts[state.weapon] || 0; weaponIconEl.textContent = CONFIG.weapons[state.weapon].icon || '🎯'; weaponNameEl.textContent = CONFIG.weapons[state.weapon].name || state.weapon; waterBar.style.width = `${state.water}%`; poisonBar.style.width = `${state.poison}%` }

// Spawn balloons randomly on board
function spawnBalloons(count=9){clearBalloons();const colors = ['#f43f5e','#fb923c','#f59e0b','#facc15','#34d399','#60a5fa','#a78bfa','#f472b6']
  const placed = []
  const w=64,h=84
  for(let i=0;i<count;i++){
    let attempts = 0; let x,y; let ok=false
    while(attempts < 40 && !ok){ x=randInt(10, Math.max(10, board.clientWidth - w - 10)); y=randInt(20, Math.max(20, board.clientHeight - h - 20)); ok=true; for(const p of placed){ const dx = p.x - x; const dy = p.y - y; if(Math.hypot(dx,dy) < 90){ ok=false; break } } attempts++ }
    if(!ok) { x = randInt(10, Math.max(10, board.clientWidth - w - 10)); y = randInt(20, Math.max(20, board.clientHeight - h - 20)) }
    const el = document.createElement('div'); el.className='balloon'
    el.style.left = x+'px'; el.style.top = y+'px'; const color = colors[Math.floor(Math.random()*colors.length)]; el.style.background = `radial-gradient(circle at 30% 20%, rgba(255,255,255,0.9), rgba(255,255,255,0.2)), ${color}`
    // assign drop
    const dropType = pickDropType(); let coinAmount = 0; if(dropType==='coin') coinAmount = pickCoinAmount()
    el.dataset.type = dropType; el.dataset.coins = coinAmount; el.dataset.popped = 'false'
    el.addEventListener('click', onPop)
    board.appendChild(el); state.balloons.push(el); placed.push({x,y})
  }
}

// addBalloons: append balloons without clearing existing ones (used by respawn)
function addBalloons(count=1){const colors = ['#f43f5e','#fb923c','#f59e0b','#facc15','#34d399','#60a5fa','#a78bfa','#f472b6']; const placed = state.balloons.map(b=>{ return { x: parseInt(b.style.left||'0'), y: parseInt(b.style.top||'0') } }); const w=64,h=84; for(let i=0;i<count;i++){ let attempts=0; let x,y; let ok=false; while(attempts<40 && !ok){ x=randInt(10, Math.max(10, board.clientWidth - w - 10)); y=randInt(20, Math.max(20, board.clientHeight - h - 20)); ok=true; for(const p of placed){ const dx=p.x-x; const dy=p.y-y; if(Math.hypot(dx,dy) < 90){ ok=false; break } } attempts++ } if(!ok){ x=randInt(10, Math.max(10, board.clientWidth - w - 10)); y=randInt(20, Math.max(20, board.clientHeight - h - 20)) } const el=document.createElement('div'); el.className='balloon'; el.style.left = x+'px'; el.style.top = y+'px'; const color = colors[Math.floor(Math.random()*colors.length)]; el.style.background = `radial-gradient(circle at 30% 20%, rgba(255,255,255,0.9), rgba(255,255,255,0.2)), ${color}`; const dropType = pickDropType(); let coinAmount=0; if(dropType==='coin') coinAmount = pickCoinAmount(); el.dataset.type = dropType; el.dataset.coins = coinAmount; el.dataset.popped='false'; el.addEventListener('click', onPop); board.appendChild(el); state.balloons.push(el); placed.push({x,y}) } }

function clearBalloons(){state.balloons.forEach(b=>b.remove()); state.balloons=[]}

function onPop(e){if(!state.running) return; const el = e.currentTarget; if(el.dataset.popped==='true') return; // use ammo
  if(state.ammoCounts[state.weapon] <= 0){ // try auto-buy? no - just prevent
    flashMessage('No ammo! Open the Store to buy or refill weapons.'); return
  }
  state.ammoCounts[state.weapon] -= 1; updateUI()
  el.dataset.popped='true'
  // animate pop
  const rect = el.getBoundingClientRect(); const boardRect = board.getBoundingClientRect()
  const centerX = rect.left - boardRect.left + rect.width/2; const centerY = rect.top - boardRect.top + rect.height/2

  // nice pop animation
  el.animate([{transform:'scale(1)'},{transform:'scale(1.25)'},{transform:'scale(0.1)'}],{duration:350,easing:'cubic-bezier(.2,.8,.2,1)'});

  const type = el.dataset.type
  if(type==='coin') handleCoinPop(centerX, centerY, parseInt(el.dataset.coins||'0'), el)
  if(type==='water') handleWaterPop(centerX, centerY, el)
  if(type==='poison') handlePoisonPop(centerX, centerY, el)
  // remove balloon element
  setTimeout(()=>el.remove(),420)
  checkWinLose()
}

function handleCoinPop(x,y,amount, el){
  // sparkle
  playCoinSound()
  const s = document.createElement('div'); s.className='coinSparkle'; s.style.left=`${x-16}px`; s.style.top=`${y-16}px`; s.innerHTML = '✨'; s.style.fontSize='22px'; board.appendChild(s)
  setTimeout(()=>s.remove(),700)
  // spawn coin sprite that flies to coin counter
  spawnCoinSprite(x,y, amount)
  state.coins += amount; state.score += 10; // coins give +10 to score
  state.chainWater=0; state.chainPoison=0
  flashFloatingText(`+${amount} coins`, x, y, '#f59e0b')
}

function handleWaterPop(x,y, el){
  // particle splash
  makeParticles(x,y,'#60a5fa',8)
  // score
  playWaterSound()
  state.chainWater +=1; state.chainPoison=0
  // chain doubling with cap: doubles for consecutive but cap multiplier at 8x
  let gain = 25
  if(state.chainWater>1) gain *= Math.min(Math.pow(2, state.chainWater-1), 8)
  state.score += gain
  // progress: water increases and lowers poison proportionally
  const pctGain = (gain / CONFIG.totalScoreGoal) * 100
  state.water = Math.min(100, state.water + pctGain)
  state.poison = Math.max(0, state.poison - pctGain)
  flashFloatingText(`+${gain} pts`, x, y, '#3b82f6')
}

function handlePoisonPop(x,y, el){
  makeParticles(x,y,'#10b981',10)
  playPoisonSound()
  state.chainPoison +=1; state.chainWater=0
  // chain doubling with cap: doubles for consecutive but cap multiplier at 8x
  let loss = 15
  if(state.chainPoison>1) loss *= Math.min(Math.pow(2, state.chainPoison-1), 8)
  state.score -= loss
  const pctGain = (loss / CONFIG.totalScoreGoal) * 100
  state.poison = Math.min(100, state.poison + pctGain)
  state.water = Math.max(0, state.water - pctGain)
  flashFloatingText(`-${loss} pts`, x, y, '#10b981')
}

function flashFloatingText(text,x,y,color='#000'){const t = document.createElement('div'); t.className='floating'; t.style.position='absolute'; t.style.left=`${x}px`; t.style.top=`${y}px`; t.style.transform='translate(-50%,-50%)'; t.style.fontWeight='700'; t.style.color=color; t.textContent=text; board.appendChild(t); let up=0; const id = setInterval(()=>{up+=2; t.style.top = (y-up)+'px'; t.style.opacity = 1 - up/60; if(up>60){clearInterval(id); t.remove()}},16)}

// particles
function makeParticles(x,y,color,count=8){ for(let i=0;i<count;i++){ const p = document.createElement('div'); p.className='particle'; p.style.left=`${x}px`; p.style.top=`${y}px`; p.style.background=color; board.appendChild(p); const dx=(Math.random()-0.5)*140; const dy=-Math.random()*160; const rot=Math.random()*360; p.animate([{transform:'translate(0,0) rotate(0deg)',opacity:1},{transform:`translate(${dx}px,${dy}px) rotate(${rot}deg)`,opacity:0}],{duration:600+Math.random()*700,easing:'cubic-bezier(.2,.8,.2,1)'}); setTimeout(()=>p.remove(),1500) } }

function flashMessage(text){messageText.textContent = text; messageTitle.textContent='Heads Up'; messageOverlay.classList.remove('hidden'); setTimeout(()=>{ messageOverlay.classList.add('hidden') },1000)}

// shop interactions
board.addEventListener('click', ()=>{})

document.querySelectorAll('.shop-item .buy').forEach(btn=>btn.addEventListener('click', (e)=>{
  const type = e.currentTarget.dataset.type
  buyWeapon(type)
}))

document.querySelectorAll('.shop-item .buy-refill').forEach(btn=>btn.addEventListener('click', (e)=>{
  const type = e.currentTarget.dataset.type
  refillWeapon(type)
}))

document.querySelector('.shop-item[data-weapon="darts"] .buy').addEventListener('click', ()=>{refillWeapon('darts')})

function buyWeapon(type){const w = CONFIG.weapons[type]; if(!w) return; if(state.coins < w.buyCost){flashMessage('Not enough coins to buy.'); return}
  state.coins -= w.buyCost; state.ammoCounts[type] += w.ammoOnBuy; state.weapon = type; updateUI()
}

function refillWeapon(type){const w = CONFIG.weapons[type]; if(!w) return; if(state.coins < w.refillCost){flashMessage('Not enough coins to refill.'); // losing condition per spec
    // do NOT end the game here — allow player to continue if they have ammo or can earn coins
    return}
  state.coins -= w.refillCost; state.ammoCounts[type] += w.ammoOnRefill; // except darts which always give 5 (already set)
  // if buying a weapon for the first time, mark owned so player can switch
  CONFIG.weapons[type].owned = true
  state.weapon = type
  updateUI()
}

// spawn a coin element that moves to the coin counter
function spawnCoinSprite(x,y, amount){ const coin = document.createElement('div'); coin.className='coin'; coin.textContent = amount; coin.style.left = (x-16)+'px'; coin.style.top = (y-16)+'px'; board.appendChild(coin);
  const target = coinCountEl.getBoundingClientRect(); const boardRect = board.getBoundingClientRect(); const tx = target.left - boardRect.left + 10; const ty = target.top - boardRect.top + 6;
  coin.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${tx - x}px, ${ty - y}px) scale(0.4)`, opacity:0.1}],{duration:800,easing:'ease-in-out'});
  setTimeout(()=>coin.remove(),820)
}

function animateCoinCounter(){ coinCountEl.classList.add('coin-bounce'); setTimeout(()=>coinCountEl.classList.remove('coin-bounce'),400) }

// Home and Tutorial handling
const homeModal = document.getElementById('homeModal')
const tutorialEl = document.getElementById('tutorial')
const startBtn = document.getElementById('startBtn')
const readBtn = document.getElementById('readBtn')
const backFromTutorial = document.getElementById('backFromTutorial')
const startFromTutorial = document.getElementById('startFromTutorial')
const tutorialBtn = document.getElementById('tutorialBtn')
// track whether tutorial was opened from the home/start modal or from in-game
let wasRunningBeforeTutorial = null
let tutorialOpenedFromHome = false

// Show the home modal on load (unless we decide to auto-skip later)
homeModal.classList.remove('hidden')

startBtn.addEventListener('click', ()=>{ homeModal.classList.add('hidden'); resetGame() })

// When reading the tutorial from the start/home modal, behave as before
readBtn.addEventListener('click', ()=>{ tutorialOpenedFromHome = true; homeModal.classList.add('hidden'); tutorialEl.classList.remove('hidden') })

// Tutorial button in the header: open tutorial and pause the current game until closed
tutorialBtn?.addEventListener('click', ()=>{
  tutorialOpenedFromHome = false
  wasRunningBeforeTutorial = state.running
  state.running = false // pause the game
  tutorialEl.classList.remove('hidden')
})

// Closing the tutorial: behave based on where it was opened from
backFromTutorial?.addEventListener('click', ()=>{
  tutorialEl.classList.add('hidden')
  if(tutorialOpenedFromHome){
    // go back to the home modal as before
    homeModal.classList.remove('hidden')
  } else {
    // resume previous running state
    state.running = (wasRunningBeforeTutorial !== null) ? wasRunningBeforeTutorial : true
    wasRunningBeforeTutorial = null
  }
})

startFromTutorial?.addEventListener('click', ()=>{
  tutorialEl.classList.add('hidden')
  if(tutorialOpenedFromHome){
    // user chose to start the game from the tutorial on the start page
    resetGame()
  } else {
    // resume the game that was paused
    state.running = (wasRunningBeforeTutorial !== null) ? wasRunningBeforeTutorial : true
    wasRunningBeforeTutorial = null
  }
})

// high-score persistence
const highscoreVal = document.getElementById('highscoreVal')
function loadHighscore(){ const v = parseInt(localStorage.getItem('pop_highscore')||'0'); highscoreVal.textContent = v }
function saveHighscore(){ const v = parseInt(localStorage.getItem('pop_highscore')||'0'); if(state.score > v){ localStorage.setItem('pop_highscore', String(state.score)); highscoreVal.textContent = state.score } }
loadHighscore()

// shop toggle
const storeToggle = document.getElementById('storeToggle')
const shopEl = document.getElementById('shop')
const closeShop = document.getElementById('closeShop')
storeToggle.addEventListener('click', ()=>{ const open = shopEl.classList.toggle('open'); storeToggle.setAttribute('aria-expanded', String(open)); shopEl.setAttribute('aria-hidden', String(!open)) })
closeShop.addEventListener('click', ()=>{ shopEl.classList.remove('open'); storeToggle.setAttribute('aria-expanded','false'); shopEl.setAttribute('aria-hidden','true') })

// background carnival music (loop) - embedded data URI small clip
const bgMusicData = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA='
let bgSource = null
async function startBackgroundMusic(){ if(!audioCtx) return; if(audioBuffers['bg']){ const src = audioCtx.createBufferSource(); src.buffer = audioBuffers['bg']; src.loop = true; const g = audioCtx.createGain(); g.gain.value = 0.12; src.connect(g); g.connect(audioCtx.destination); src.start(); bgSource = src; return }
  try{ const resp = await fetch(bgMusicData); const arr = await resp.arrayBuffer(); const buf = await audioCtx.decodeAudioData(arr); audioBuffers['bg']=buf; const src = audioCtx.createBufferSource(); src.buffer = buf; src.loop = true; const g = audioCtx.createGain(); g.gain.value = 0.12; src.connect(g); g.connect(audioCtx.destination); src.start(); bgSource = src }catch(e){ console.warn('bg music failed', e) } }

// auto-start bg music when player interacts
document.addEventListener('click', ()=>{ if(audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(()=>{}); if(!bgSource) startBackgroundMusic() }, {once:true})

// weapon selection via clicking shop images (makes it simple)
document.querySelectorAll('.shop-item').forEach(si=>si.addEventListener('click', (e)=>{const type=si.dataset.weapon; if(!CONFIG.weapons[type].owned && (CONFIG.weapons[type].buyCost>0)) return; state.weapon=type; updateUI()}))

// game checks
function checkWinLose(){updateUI(); // lose if poison >= 100 or if coins can't buy any refill and ammo=0? per spec: If the player does not have enough coins to continue, they lose just as if the poison bar overflows.
  if(state.poison >= 100){loseGame('Poison overwhelmed you!') ; return}
  if(state.water >= 100){winGame() ; return}
  // end-game only happens when player has no coins AND no ammo
  const totalAmmo = Object.values(state.ammoCounts).reduce((a,b)=>a+b,0)
  if(totalAmmo <= 0 && state.coins <= 0){
    // truly out of both resources -> game over
    loseGame('Out of ammo and coins!')
    return
  }
  if(totalAmmo <= 0 && state.coins > 0){
    // player still has coins — let them buy/refill. Prompt but don't end the game.
    flashMessage('Out of ammo — open the Store to buy or refill weapons.')
  }
}

function loseGame(reason){state.running=false; messageTitle.textContent='Game Over'; messageText.textContent = reason; messageOverlay.classList.remove('hidden')}
function winGame(){state.running=false; messageTitle.textContent='You Win!'; messageText.textContent = `Score: ${state.score}`; messageOverlay.classList.remove('hidden'); launchConfetti();}

replayBtn.addEventListener('click', ()=>{resetGame()})
exitBtn.addEventListener('click', ()=>{ messageOverlay.classList.add('hidden'); messageText.textContent=''; if(!state.running) resetGame() })

function resetGame(){// reset state
  state = {coins:0, ammo:CONFIG.startAmmo, weapon:'darts', ammoCounts: {darts:CONFIG.startAmmo, arrows:0, shuriken:0, kunai:0}, score:0, water:0, poison:0, chainWater:0, chainPoison:0, balloons:[], running:true}
  messageOverlay.classList.add('hidden')
  spawnBalloons(22)
  updateUI()
}

// confetti
function launchConfetti(){const c = document.createElement('div'); c.className='confetti'; board.appendChild(c); for(let i=0;i<120;i++){const p=document.createElement('div'); p.className='piece'; p.style.left=Math.random()*100+'%'; p.style.top='-10%'; p.style.background=['#f43f5e','#fb923c','#f59e0b','#facc15','#34d399','#60a5fa','#a78bfa','#f472b6'][Math.floor(Math.random()*8)]; p.style.transform=`rotate(${Math.random()*360}deg)`; c.appendChild(p); const dur = 2000 + Math.random()*2000; p.animate([{transform:`translateY(0) rotate(${Math.random()*360}deg)`},{transform:`translateY(${board.clientHeight+200}px) rotate(${Math.random()*720}deg)`}],{duration:dur,iterations:1,easing:'cubic-bezier(.2,.7,.2,1)'});}
}

// initial: do not auto-start; wait for tutorial unless skipped
if(localStorage.getItem('pop_skip_tutorial') === '1'){ tutorialEl.classList.add('hidden'); resetGame() }

// small auto-respawn to keep board filled if running
setInterval(()=>{ if(!state.running) return; const existing = state.balloons.filter(b=>b.dataset.popped!=='true').length; if(existing < 12){ addBalloons(12 - existing) } },2000)

// keyboard controls: 1-4 switch weapons, R to refill
document.addEventListener('keydown', (e)=>{
  if(!state.running) return;
  if(e.key === '1') { state.weapon='darts'; updateUI(); }
  if(e.key === '2') { if(CONFIG.weapons.arrows.owned) state.weapon='arrows'; updateUI(); }
  if(e.key === '3') { if(CONFIG.weapons.shuriken.owned) state.weapon='shuriken'; updateUI(); }
  if(e.key === '4') { if(CONFIG.weapons.kunai.owned) state.weapon='kunai'; updateUI(); }
  if(e.key === 'r' || e.key === 'R'){ refillWeapon(state.weapon) }
})
// touch / mobile controls and aim mode
document.querySelectorAll('.wbtn').forEach(b=>b.addEventListener('click',(e)=>{ const w=e.currentTarget.dataset.weapon; if(CONFIG.weapons[w].owned || w==='darts'){ state.weapon=w; updateUI() } }))
document.getElementById('refillBtn').addEventListener('click', ()=>{ refillWeapon(state.weapon) })

// Ensure simple tap-to-pop works on mobile: clicks on balloon elements already wired with onPop
// Nothing special needed — we removed aim-mode and let balloon click listeners handle popping.

// Reset button handler: reset game and clear scores
const resetBtn = document.getElementById('resetBtn')
if(resetBtn){ resetBtn.addEventListener('click', ()=>{ // reset score and coins and highscore
  localStorage.setItem('pop_highscore','0'); highscoreVal.textContent = '0'; resetGame()
}) }

// update coin animation and save highscore when coins or score change via updateUI
const originalUpdateUI = updateUI
function patchedUpdateUI(){ originalUpdateUI(); animateCoinCounter(); saveHighscore(); coinCountEl.setAttribute('aria-label', `Coins ${state.coins}`); ammoCountEl.setAttribute('aria-label', `Ammo ${state.ammoCounts[state.weapon]||0}`); weaponNameEl.setAttribute('aria-label', `Weapon ${CONFIG.weapons[state.weapon].name}`) }
window.updateUI = patchedUpdateUI

// expose for debugging
window._POP_STATE = state
