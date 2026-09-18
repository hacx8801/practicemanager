"use strict";

let testExercises = [
    {
        title: "Test Exercise 1",
        time: 300,
        bpm: 120
    },
    {
        title: "Test Exercise 2",
        time: 600,
        bpm: 140
    },
    {
        title: "Test Exercise 3",
        time: 800,
        bpm: 60
    }
];

// get handle to the exercise title
const exerciseTitle = document.getElementById("exercise-title");

// handle to the label for the clock
const exerciseClockFace = document.querySelector(".timer-clock");
// handle to clock decrement button
const exerciseClockDecBtn = document.querySelector(".timer-btn#decrement");
// handle to clock increment button
const exerciseClockIncBtn = document.querySelector(".timer-btn#increment");

// handle to the container for metronome controls
const exerciseBpmContainer = document.querySelector(".metronome-container");
// handle to metronome bpm increase button
const exerciseBpmUpBtn = document.querySelector(".metronome-container #up-btn");
// handle to metronome bpm decrease button
const exerciseBpmDownBtn = document.querySelector(".metronome-container #down-btn");
// handle to the metronome bpm label
const exerciseBpmLabel = document.querySelector(".metronome-container .metronome-bpm");

// handle to previous track button
const exercisePreviousBtn = document.querySelector(".controls-container #previous");
const exercisePlaypauseBtn = document.querySelector(".controls-container #playpause");
const exerciseNextBtn = document.querySelector(".controls-container #next");

// handles for edit menu
const editList = document.querySelector(".edit-list");
const editContainer = document.querySelector(".edit-container");

const editTitle = document.querySelector("#edit-title");
const editBPM = document.querySelector("#edit-bpm");
const editTime = document.querySelector("#edit-time .edit-input");

// show the edit modal

// helper temp buffer to store modifications
let exercisesBuffer = [];
const editExercisesBtn = document.querySelector("#edit-btn");
editExercisesBtn.addEventListener("click", () => {
    // copy the exercises into the buffer
    exercisesBuffer = testExercises.slice();

    editContainer.style.display = "block";
    populateEditMenu(exercisesBuffer);

    setEditMenuListeners(exercisesBuffer);

});


// get save button and assign callback
const saveExercisesBtn = document.querySelector("#edit-save");
saveExercisesBtn.addEventListener("click", () => {
    testExercises = exercisesBuffer;
    setExercise(testExercises, exerciseCurrentIndex);
    editContainer.style.display = "none";
});



// close the edit modal
const closeExercisesBtn = document.querySelector("#edit-close");
closeExercisesBtn.addEventListener("click", () => {
    editContainer.style.display = "none";
});

const sndMetronome = new Audio("/click.mp3");

const MAX_BPM = 220;
const MIN_BPM = 0;
let lockTimeout = -1;
let lockTimerTimeout = -1;

let exerciseBpmValue = 0;
let numMetronomeDelay = 0;
let exerciseTimerValue = 0;
let exerciseCurrentIndex = 0;

let isPaused = true;

function setEditMenuListeners(exercises) {
    const menuItems = document.querySelectorAll(".exercise-option");
    console.log("Menu items logged: " + menuItems);

    for (const item of menuItems) {
        item.addEventListener("click", () => {
            const details = exercises.find((exercise) => exercise.title === item.textContent);
            setEditDetails(details);
        });
    }

    editTitle.addEventListener("change", () => {
        // get the element currently selected
        // in the list 
        let details = exercises.find((exercise) => exercise.title === editList.value);
        if (details) {
            console.log("text content is "+details.title);
            details.title = editTitle.value;
        }
    });

    editBPM.addEventListener("change", () => {
        // get the element currently selected
        // in the list 
        let details = exercises.find((exercise) => exercise.title === editList.value);
        if (details) {
            editBPM.value = clampBPM(editBPM.value);

            details.bpm = editBPM.value;
        }
    });

    editTime.addEventListener("change", () => {
        // get the element currently selected
        // in the list 
        let regexp = /[0-5][0-9]:[0-5][0-9]/;
        let details = exercises.find((exercise) => exercise.title === editList.value);

        let match = editTime.value.match(regexp);
        if (details && match) {
            console.log("we matched? "+match);
            details.time = getExerciseTimeFromClock(String(match));
            editTime.value = setExerciseTimer(details.time);
        }
        else if (details) {
            editTime.value = setExerciseTimer(details.time);
        }

    });
}

function clampBPM(bpm) {
    const num_bpm = Number(bpm);
    if (num_bpm < MIN_BPM) {
        return MIN_BPM;
    }
    else if (num_bpm > MAX_BPM) {
        return MAX_BPM;
    }
    return num_bpm;
}


function populateEditMenu(exercises) {
    let newHTML = "";

    for (const exercise of exercises) {
        newHTML += `<option class="exercise-option">${exercise.title}</option>`;
    }

    editList.innerHTML = newHTML;

    // get the object for the current exercise
    // we are showing on the main interface
    const details = exercises.find((exercise) => exercise.title === exerciseTitle.textContent);
    setEditDetails(details);

}

function setEditDetails(exercise) {
    editTitle.value = exercise.title;
    editList.value = exercise.title;
    editBPM.value = exercise.bpm;
    editTime.value = setExerciseTimer(exercise.time);
    console.log(exercise.title);
}


function calcBpmDelay(bpm) {
    if (bpm <= 0) {return 0};
    return (60 * 1000) / bpm;
}

function countDown(exerciseArray) {
    if (exerciseTimerValue > 0) {
        exerciseTimerValue--;
        exerciseClockFace.textContent = setExerciseTimer(exerciseTimerValue);
    }
    else {
        setExercise(exerciseArray, exerciseCurrentIndex+1);
    }
}

function increaseBpm() {
    console.log("Increasing tempo..")
    const curBpm = parseBpm();
    console.log(`Current BPM is ${curBpm}`);
    if (curBpm + 1 <= MAX_BPM) {
        exerciseBpmLabel.textContent = String(curBpm + 1);
    }
    numMetronomeDelay = calcBpmDelay(curBpm+1);
    if (!isPaused) {
        clearInterval(lockTimeout);
        if (numMetronomeDelay > 0) {
            lockTimeout = setInterval(playSound, numMetronomeDelay);
        }
    }
}

function decreaseBpm() {
    console.log("Decreasing tempo..")
    const curBpm = parseBpm();
    console.log(`Current BPM is ${curBpm}`);
    if (curBpm - 1 >= MIN_BPM) {
        exerciseBpmLabel.textContent = String(curBpm - 1);
    }
    numMetronomeDelay = calcBpmDelay(curBpm - 1);
    if (!isPaused) {
        clearInterval(lockTimeout);
        lockTimeout = setInterval(playSound, numMetronomeDelay);
    }
}

function parseBpm() {
    let str = exerciseBpmLabel.textContent;
    console.log (`Converting ${str} bpm to number`);
    return Number(str);
}

function playSound() {
    // Clone the audio node to play a separate instance simultaneously
    sndMetronome.cloneNode(true).play();
}

// returns an array of exercise objects
// objects are sourced from local JSON
function loadExercisesFromJSONLocal(filepath) {

}

// .. returns an array of exercise objects
// objects are sourced from remote API
function loadExercisesFromJSONRemote(arg) {
    return null;
}

function setExercise(exercisesArray, index) {
    if (index >= exercisesArray.length || index < 0) {
        return;
    }

    // set the title to that of the first exercise
    // in the array provided from the caller
    exerciseTitle.textContent = exercisesArray[index].title;

    exerciseTimerValue = exercisesArray[index].time;
    exerciseClockFace.textContent = setExerciseTimer(exerciseTimerValue);

    exerciseBpmLabel.textContent = exercisesArray[index].bpm;
    exerciseCurrentIndex = index;

    const curBpm = parseBpm();
    numMetronomeDelay = calcBpmDelay(curBpm);
    clearInterval(lockTimeout);
    clearInterval(lockTimerTimeout)
    if (!isPaused) {
        lockTimeout = setInterval(playSound, numMetronomeDelay);
        lockTimerTimeout = setInterval(() => countDown(testExercises), 1000);
    }
}

function setExerciseTimer(seconds) {
    // seconds is remaining time in seconds
    // convert to minutes and seconds string
    const mins = Math.floor(seconds / 60);
    const secs = seconds - (mins * 60);
    return `00${mins}`.slice(-2)
    +":"+`00${secs}`.slice(-2);
}

function getExerciseTimeFromClock(time) {
    // parse the mm:ss format to seconds
    const res = time.split(":");
    console.log(res);
    let num =Number(60*res[0]) + Number(res[1]);
    console.log("num is "+num);
    return Number(60*res[0]) + Number(res[1]);
}
     
// callback function for skip next button
function skipToNextExercise() {
    console.log("Skipping to next exercise..");
    setExercise(testExercises, exerciseCurrentIndex+1);

}

// callback function for skip previous button
function skipToPreviousExercise() {
    console.log("Skipping to previous exercise..");
    setExercise(testExercises, exerciseCurrentIndex-1);
}

// callback function for play/pause button
function handlePlayPauseClick() {
    handlePlayPauseClick.isPlaying = handlePlayPauseClick.isPlaying || false;
    console.log("Handling play/pause button click..");
    if (isPaused) {
        isPaused = false;
        playExercise();
    }
    else {
        isPaused = true;
        pauseExercise();
    }
}

// helper for play/pause handler
function pauseExercise() {
    exercisePlaypauseBtn.textContent = "⏵";
    clearInterval(lockTimeout);
    clearInterval(lockTimerTimeout)
}

// helper for play/pause handler
function playExercise() {
    exercisePlaypauseBtn.textContent = "⏸";
    clearInterval(lockTimeout);
    lockTimeout = setInterval(playSound, numMetronomeDelay);
    clearInterval(lockTimerTimeout)
    lockTimerTimeout = setInterval(() => countDown(testExercises), 1000);
}

// set listeners for BPM controls
exerciseBpmUpBtn.addEventListener("click", increaseBpm);
exerciseBpmDownBtn.addEventListener("click", decreaseBpm);

exerciseBpmContainer.addEventListener("wheel", (event) => {
    if (event.deltaY < 0) {
        increaseBpm();
    }
    else if (event.deltaY > 0) {
        decreaseBpm();
    }
});

// set listeners for track controls
exercisePreviousBtn.addEventListener("click", skipToPreviousExercise);
exercisePlaypauseBtn.addEventListener("click", handlePlayPauseClick);
exerciseNextBtn.addEventListener("click", skipToNextExercise);

// lockTimeout = setInterval(playSound, 1000);

setExercise(testExercises, 0);
