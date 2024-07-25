const body = document.querySelector('body');
body.innerHTML = `
<h1>💣 MINESWEEPER 💣</h1>
<div class="settings">
  <div class="field-setting">
    <div class="field-size">
      <input type="radio" name="size" id="10" checked>
      <label for="10">10x10</label>
      <input type="radio" name="size" id="15">
      <label for="15">15x15</label>
      <input type="radio" name="size" id="25">
      <label for="25">25x25</label>
    </div>
    <div class="field-mines">
      <label for="ran-mine">Mine 💥 count:</label>
      <input type="range" name="mines" id="ran-mine" min="10" max="99" value="10" step="1">
      <input type="number" name="mines" id="num-mine" min="10" max="99" value="10" step="1">
    </div>
  </div>
  <div class="btn-setting">
    <button class="new-game">New game</button>
    <div class="theme">
      <input type="checkbox" id="switch"><label class="switch_label" for="switch"></label>
    </div>
    <button class="mute"></button>
  </div>
  <div class="info">
    <div class="info__item"><img src="./assets/icon/click.svg" alt="moves"><span class="info_moves">0</span></div>
    <div class="info__item"><img src="./assets/icon/flag.svg" alt="flag"><span class="info_flags">0</span></div>
    <div class="info__item"><img src="./assets/icon/bomb.svg" alt="mines"><span class="info_mines">0</span></div>
    <div class="info__item"><img src="./assets/icon/clock.svg" alt="clock"><span class="info_stopwatch">000</span></div> 
  </div>
  </div>
  <h2 class="end-game"></h2>
  <div class="field"></div>
  <div class="highscore">
    <h3>LAST GAMES</h3>
    <ul class="results">
      <li class="results_item">
        <span>RESULT</span>
        <span>SIZE</span>
        <span>TIME</span>
        <span>MOVE</span>
        <span>MINE</span>
      </li>
    </ul>
  </div>  
</div>`;

const value = document.querySelector('#num-mine');
const input = document.querySelector('#ran-mine');
const syncValues = (event) => {
  value.value = input.value = event.target.value;
};
input.addEventListener('input', syncValues);
value.addEventListener('input', syncValues);

const grid = document.querySelector('.field');
const countMoves = document.querySelector('.info_moves');
const countFlags = document.querySelector('.info_flags');
const countMines = document.querySelector('.info_mines');
const stopwatch = document.querySelector('.info_stopwatch');
const newGameBtn = document.querySelector('.new-game');
const endGame = document.querySelector('.end-game');
const btnTheme = document.querySelector('#switch');
const tabHighScore = document.querySelector('.highscore');
const fieldSize = document.querySelector('.field-size');
const muteBtn = document.querySelector('.mute');

function createAudio(src) {
  const audio = new Audio(src);
  audio.switchMute = () => audio.muted = !audio.muted;
  return audio;
}
const audioResources = {
  click: createAudio('./assets/sound/click.mp3'),
  lose: createAudio('./assets/sound/lose.mp3'),
  win: createAudio('./assets/sound/win.mp3'),
  flag: createAudio('./assets/sound/flag.mp3'),
  clean: createAudio('./assets/sound/clean.mp3')
};

function muteSound() {
  muteBtn.classList.toggle('on');
  Object.values(audioResources).forEach(audio => audio.switchMute())
}
muteBtn.addEventListener('click', muteSound);

let rowSize = 10;
let columnSize = 10;
let numMines = 10;
let numMoves = 0;
let numFlags = 0;
let openedCells = 0;
let gameStoped = false;
let gameStatus;
let firstMove = true;
let sec = 0;
let field = [];
let mines = [];
let interval;
let highScore;

function showTime() {
  if (!gameStoped && !firstMove) sec += 1;
  stopwatch.textContent = `${String(sec).padStart(3, 0)}`;
}
function startTime() {
  interval = setInterval(showTime, 1000);
}

function changeTheme() {
  body.classList.toggle('alt');
  newGameBtn.classList.toggle('alt');
  muteBtn.classList.toggle('alt');
  fieldSize.classList.toggle('alt');
  field.forEach((el) => el.classList.toggle('alt'));
  tabHighScore.classList.toggle('alt');
}
btnTheme.addEventListener('change', changeTheme);

function pushResult(result) {
  const resScore = document.querySelectorAll('.results_item:not(:first-child)');
  if (resScore.length > 9) {
    const resLast = document.querySelector('.results_item:last-child');
    resLast.remove();
  }
  const resFIst = document.querySelector('.results_item:first-child');
  const element = document.createElement('li');
  element.classList.add('results_item');
  element.innerHTML = `
    <span>${result[0]}</span>
    <span>${result[1]}</span>
    <span>${result[2]}</span>
    <span>${result[3]}</span>
    <span>${result[4]}</span>`;
  resFIst.after(element);
}

try {
  const loadGame = JSON.parse(localStorage.getItem('game'));
  if (loadGame) {
    ({
      rowSize,
      columnSize,
      numMines,
      numMoves,
      numFlags,
      openedCells,
      gameStoped,
      gameStatus,
      firstMove,
      sec,
      mines,
    } = loadGame);
    document.querySelector(`#\\3${[...String(rowSize)].join(' ')}`).checked = true;
    countMoves.textContent = numMoves;
    countMines.textContent = numMines;
    countFlags.textContent = numFlags;
    input.value = numMines;
    value.value = numMines;
    showTime();
    startTime();
  }
  const loadScore = JSON.parse(localStorage.getItem('highScore'));
  highScore = Array.isArray(loadScore) ? loadScore : [];
  highScore.forEach((el) => pushResult(el));
} catch {
  highScore = [];
}

class Cell {
  constructor() {
    this.mine = false;
    this.open = false;
    this.adjacentMines = 0;
    this.flag = false;
  }
}

function setMines(i, j) {
  let setmines = numMines;
  while (setmines > 0) {
    const x = Math.floor(Math.random() * rowSize);
    const y = Math.floor(Math.random() * columnSize);
    if (!mines[x][y].mine && mines[i][j] !== mines[x][y]) {
      mines[x][y].mine = true;
      setmines -= 1;
    }
  }
}

function setAdjacentMines() {
  for (let i = 0; i < mines.length; i += 1) {
    for (let j = 0; j < mines[0].length; j += 1) {
      if (!mines[i][j].mine) {
        let n = 0;
        if ((i - 1 >= 0) && (j - 1 >= 0) && mines[i - 1][j - 1].mine) n += 1;
        if ((i - 1 >= 0) && mines[i - 1][j].mine) n += 1;
        if ((i - 1 >= 0) && (j + 1 < mines[i].length) && mines[i - 1][j + 1].mine) n += 1;
        if ((j - 1 >= 0) && mines[i][j - 1].mine) n += 1;
        if ((j + 1 < mines[i].length) && mines[i][j + 1].mine) n += 1;
        if ((i + 1 < mines.length) && (j - 1 >= 0) && mines[i + 1][j - 1].mine) n += 1;
        if ((i + 1) < mines.length && mines[i + 1][j].mine) n += 1;
        if ((i + 1 < mines.length) && (j + 1 < mines[i].length) && mines[i + 1][j + 1].mine) n += 1;
        mines[i][j].adjacentMines = n;
      }
    }
  }
}

function setHighScore(result) {
  if (highScore.length >= 10) highScore.shift();
  highScore.push(result);
  localStorage.setItem('highScore', JSON.stringify(highScore));
}

function boom() {
  for (let i = 0; i < mines.length; i += 1) {
    for (let j = 0; j < mines[0].length; j += 1) {
      if (mines[i][j].mine) {
        field[i * rowSize + j].className = 'cell bomb';
        if (btnTheme.checked) field[i * rowSize + j].classList.add('alt');
      }
    }
  }
  gameStoped = true;
  endGame.classList.add('active', 'lose');
  endGame.textContent = '☠️ YOU LOSE ☠️';
  gameStatus = 'lose';
  if (audioResources.click.play() !== undefined) {
    audioResources.click.play().then(() => {
      audioResources.click.pause();
    });
  }
  audioResources.lose.currentTime = 0;
  audioResources.lose.play();
}

function openCells(i, j) {
  if (mines[i][j].open || mines[i][j].flag) {
    return;
  }
  audioResources.click.currentTime = 0;
  audioResources.click.play();
  mines[i][j].open = true;
  field[i * rowSize + j].className = 'cell open';
  openedCells += 1;
  if (openedCells === rowSize * columnSize - numMines) {
    gameStoped = true;
    endGame.classList.add('active', 'won');
    endGame.textContent = '🎉 YOU WIN 🎉';
    const result = ['🎉', `${rowSize}x${rowSize}`, sec, numMoves, numMines];
    setHighScore(result);
    gameStatus = 'win';
    pushResult(result);
    if (audioResources.click.play() !== undefined) {
      audioResources.click.play().then(() => {
        audioResources.click.pause();
      });
    }
    audioResources.win.currentTime = 0;
    audioResources.win.play();
  }
  if (mines[i][j].adjacentMines !== 0) {
    field[i * rowSize + j].textContent = mines[i][j].adjacentMines;
    field[i * rowSize + j].classList.add(`${mines[i][j].adjacentMines}`);
    return;
  }
  for (let xOffset = -1; xOffset < 2; xOffset += 1) {
    for (let yOffset = -1; yOffset < 2; yOffset += 1) {
      if (mines?.[i + xOffset]?.[j + yOffset]) {
        openCells(i + xOffset, j + yOffset);
      }
    }
  }
}

function checkMove(i, j) {
  if (gameStoped || mines[i][j].flag) {
    return;
  }
  if (firstMove) {
    setMines(i, j);
    setAdjacentMines();
    clearInterval(interval);
    startTime();
    firstMove = false;
  }
  if (mines[i][j].mine) {
    boom();
    field[i * rowSize + j].classList.add('boom');
  } else {
    if (!mines[i][j].open) numMoves += 1;
    countMoves.textContent = numMoves;
    openCells(i, j);
  }
}

function markFlag(i, j) {
  if (gameStoped) {
    return;
  }
  if (!mines[i][j].flag) {
    field[i * rowSize + j].classList.add('flag');
    mines[i][j].flag = true;
    numFlags += 1;
    audioResources.flag.currentTime = 0;
    audioResources.flag.play();
  } else {
    field[i * rowSize + j].classList.remove('flag');
    mines[i][j].flag = false;
    numFlags -= 1;
    audioResources.clean.currentTime = 0;
    audioResources.clean.play();
  }
  countFlags.textContent = numFlags;
}

function createCell(isLoad, i, j) {
  const square = mines[i][j];
  const cell = document.createElement('div');
  cell.className = 'cell';
  if (btnTheme.checked) cell.classList.add('alt');
  if (isLoad) {
    if (square.open) cell.classList.add('open');
    if (square.adjacentMines && square.open) {
      cell.classList.add(`${square.adjacentMines}`);
      cell.textContent = square.adjacentMines;
    }
    if (square.mine && gameStatus === 'lose') {
      cell.classList.add('bomb');
    }
    if (square.flag) cell.classList.add('flag');
  }
  cell.addEventListener('click', () => checkMove(i, j));
  cell.addEventListener('contextmenu', (ev) => {
    ev.preventDefault();
    if (!mines[i][j].open) markFlag(i, j);
  });
  field.push(cell);
  grid.append(cell);
}

function createField() {
  if (mines.length === 0) {
    for (let i = 0; i < rowSize; i += 1) {
      mines[i] = [];
      for (let j = 0; j < columnSize; j += 1) {
        mines[i].push(new Cell());
        createCell(false, i, j);
      }
    }
  } else {
    mines.forEach((row, i) => row.forEach((cell, j) => createCell(true, i, j)));
  }
  grid.style['grid-template-columns'] = `repeat(${rowSize}, auto)`;
}

createField();

function newGame() {
  const selectedSize = +document.querySelector('.field-size input:checked').id;
  rowSize = selectedSize;
  columnSize = selectedSize;
  numMines = input.value;
  numMoves = 0;
  numFlags = 0;
  countMoves.textContent = numMoves;
  countMines.textContent = numMines;
  countFlags.textContent = numFlags;
  openedCells = 0;
  gameStoped = false;
  gameStatus = '';
  firstMove = true;
  sec = 0;
  grid.innerHTML = '';
  field = [];
  mines = [];
  createField();
  clearInterval(interval);
  stopwatch.textContent = '000';
  endGame.classList.remove('active', 'won', 'lose');
}

newGameBtn.addEventListener('click', newGame);

function saveGame() {
  const settings = {
    rowSize,
    columnSize,
    numMines,
    numMoves,
    numFlags,
    openedCells,
    gameStoped,
    gameStatus,
    firstMove,
    sec,
    mines,
  };
  localStorage.setItem('game', JSON.stringify(settings));
}

window.addEventListener('beforeunload', saveGame);
