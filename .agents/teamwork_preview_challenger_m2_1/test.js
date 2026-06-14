import assert from 'assert';

// We will mock React's state machine to test the exact logic in PomodoroEngine.tsx

let mode = 'focus';
let timeLeft = 25 * 60;
let isRunning = false;
let focusCount = 0;

// To simulate React state setters
const setMode = (newMode) => { mode = newMode; };
const setTimeLeft = (newTimeLeft) => { 
  if (typeof newTimeLeft === 'function') {
    timeLeft = newTimeLeft(timeLeft);
  } else {
    timeLeft = newTimeLeft; 
  }
};
const setIsRunning = (newIsRunning) => { isRunning = newIsRunning; };
const setFocusCount = (newFocusCount) => { focusCount = newFocusCount; };

function simulateTick() {
  // simulate the setInterval tick
  if (isRunning && timeLeft > 0) {
    setTimeLeft(prev => prev - 1);
  }
  
  // simulate the useEffect body that runs after state change
  if (timeLeft === 0 && isRunning) {
    setIsRunning(false);
    if (mode === 'focus') {
      const newCount = focusCount + 1;
      setFocusCount(newCount);
      if (newCount % 4 === 0) {
        setMode('longBreak');
        setTimeLeft(15 * 60);
      } else {
        setMode('shortBreak');
        setTimeLeft(5 * 60);
      }
    } else {
      setMode('focus');
      setTimeLeft(25 * 60);
    }
  }
}

function fastForward(seconds) {
  for (let i = 0; i < seconds; i++) {
    simulateTick();
  }
}

// Test 1: First focus
console.log('Testing Focus 1');
setIsRunning(true);
fastForward(25 * 60);
assert.strictEqual(isRunning, false);
assert.strictEqual(mode, 'shortBreak');
assert.strictEqual(timeLeft, 5 * 60);
assert.strictEqual(focusCount, 1);

// Test 2: First short break
console.log('Testing Break 1');
setIsRunning(true);
fastForward(5 * 60);
assert.strictEqual(isRunning, false);
assert.strictEqual(mode, 'focus');
assert.strictEqual(timeLeft, 25 * 60);
assert.strictEqual(focusCount, 1);

// Fast forward to Focus 4
console.log('Testing Focus 2');
setIsRunning(true); fastForward(25 * 60); // Break 2
setIsRunning(true); fastForward(5 * 60);  // Focus 3
console.log('Testing Focus 3');
setIsRunning(true); fastForward(25 * 60); // Break 3
setIsRunning(true); fastForward(5 * 60);  // Focus 4
console.log('Testing Focus 4');
setIsRunning(true); fastForward(25 * 60);

// After 4th focus, should be long break
assert.strictEqual(isRunning, false);
assert.strictEqual(mode, 'longBreak');
assert.strictEqual(timeLeft, 15 * 60);
assert.strictEqual(focusCount, 4);

console.log('Testing Long Break');
setIsRunning(true); fastForward(15 * 60); // Back to focus 5
assert.strictEqual(mode, 'focus');
assert.strictEqual(timeLeft, 25 * 60);
assert.strictEqual(focusCount, 4);

console.log('All state machine assertions passed!');
