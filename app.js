// ===========================
// Global State & Config
// ===========================
const quizState = {
    questions: [],
    currentQuestionIndex: 0,
    userAnswers: [],
    timePerQuestion: 30,
    timerInterval: null,
    timeRemaining: 30,
    score: 0,
    config: {
        numQuestions: 10,
        timePerQuestion: 30,
        difficulty: 'all'
    }
};

// ===========================
// Utility Functions
// ===========================
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// ===========================
// Data Loading
// ===========================
async function loadQuestions() {
    try {
        const [questions1, questions2, questions3] = await Promise.all([
            fetch('questions.json').then(res => res.json()),
            fetch('question2.json').then(res => res.json()),
            fetch('question3.json').then(res => res.json())
        ]);

        // Filter to include only text MCQ questions
        const allQuestions = [...questions1, ...questions2, ...questions3];
        return allQuestions.filter(q => q.type === 'text_mcq');
    } catch (error) {
        console.error('Error loading questions:', error);
        alert('Failed to load questions. Please ensure the JSON files are in the same directory.');
        return [];
    }
}

// ===========================
// Setup Screen Handlers
// ===========================
function handleNumQuestionsChange(e) {
    const value = e.target.value;
    document.getElementById('num-questions-display').textContent = value;
    quizState.config.numQuestions = parseInt(value);
}

function handleTimeChange(e) {
    const value = e.target.value;
    document.getElementById('time-display').textContent = `${value}s`;
    quizState.config.timePerQuestion = parseInt(value);
}

function handleDifficultyClick(e) {
    if (!e.target.classList.contains('btn-option')) return;

    document.querySelectorAll('.btn-option').forEach(btn => {
        btn.classList.remove('active');
    });
    e.target.classList.add('active');
    quizState.config.difficulty = e.target.dataset.difficulty;
}

function filterQuestions(allQuestions) {
    let filtered = [...allQuestions];

    // Filter by difficulty
    if (quizState.config.difficulty !== 'all') {
        filtered = filtered.filter(q => q.difficulty === quizState.config.difficulty);
    }

    return filtered;
}

async function startQuiz() {
    const allQuestions = await loadQuestions();

    if (allQuestions.length === 0) return;

    // Filter and shuffle questions
    const filteredQuestions = filterQuestions(allQuestions);

    if (filteredQuestions.length === 0) {
        alert('No questions match your selected criteria. Please adjust your filters.');
        return;
    }

    const shuffledQuestions = shuffleArray(filteredQuestions);
    quizState.questions = shuffledQuestions.slice(0, quizState.config.numQuestions);

    // Shuffle options for each question
    quizState.questions = quizState.questions.map(q => ({
        ...q,
        shuffledOptions: shuffleArray(q.options)
    }));

    // Reset state
    quizState.currentQuestionIndex = 0;
    quizState.userAnswers = [];
    quizState.score = 0;
    quizState.timePerQuestion = quizState.config.timePerQuestion;

    // Show quiz screen and load first question
    showScreen('quiz-screen');
    loadQuestion();
}

// ===========================
// Quiz Screen Functions
// ===========================
function loadQuestion() {
    const question = quizState.questions[quizState.currentQuestionIndex];
    const questionNumber = quizState.currentQuestionIndex + 1;
    const totalQuestions = quizState.questions.length;

    // Update progress
    const progress = (questionNumber / totalQuestions) * 100;
    document.getElementById('progress-fill').style.width = `${progress}%`;
    document.getElementById('question-counter').textContent = `Question ${questionNumber} of ${totalQuestions}`;

    // Update category badge
    document.getElementById('category-badge').textContent = question.category;

    // Update question text
    document.getElementById('question-text').textContent = question.question;

    // Render options
    renderOptions(question);

    // Start timer
    startTimer();
}

function renderOptions(question) {
    const container = document.getElementById('options-container');
    container.innerHTML = '';

    const letters = ['A', 'B', 'C', 'D'];

    question.shuffledOptions.forEach((option, index) => {
        const button = document.createElement('button');
        button.className = 'option-btn';
        button.dataset.option = option;

        button.innerHTML = `
            <span class="option-letter">${letters[index]}</span>
            <span>${option}</span>
        `;

        button.addEventListener('click', () => selectAnswer(option, button));
        container.appendChild(button);
    });
}

function selectAnswer(answer, buttonElement) {
    // Clear previous selection
    document.querySelectorAll('.option-btn').forEach(btn => {
        btn.classList.remove('selected');
    });

    // Mark as selected
    buttonElement.classList.add('selected');

    // Store answer and move to next question after short delay
    setTimeout(() => {
        storeAnswer(answer);
        nextQuestion();
    }, 500);
}

function storeAnswer(answer) {
    const question = quizState.questions[quizState.currentQuestionIndex];
    const isCorrect = answer === question.correct_answer;

    quizState.userAnswers.push({
        question: question.question,
        category: question.category,
        type: question.type,
        userAnswer: answer,
        correctAnswer: question.correct_answer,
        options: question.shuffledOptions,
        isCorrect: isCorrect
    });

    if (isCorrect) {
        quizState.score++;
    }

    // Stop timer
    clearInterval(quizState.timerInterval);
}

function nextQuestion() {
    quizState.currentQuestionIndex++;

    if (quizState.currentQuestionIndex < quizState.questions.length) {
        loadQuestion();
    } else {
        showResults();
    }
}

function startTimer() {
    quizState.timeRemaining = quizState.timePerQuestion;
    updateTimerDisplay();

    clearInterval(quizState.timerInterval);

    quizState.timerInterval = setInterval(() => {
        quizState.timeRemaining--;
        updateTimerDisplay();

        if (quizState.timeRemaining <= 0) {
            clearInterval(quizState.timerInterval);
            // Time's up - store no answer and move to next
            storeAnswer(null);
            setTimeout(() => {
                nextQuestion();
            }, 500);
        }
    }, 1000);
}

function updateTimerDisplay() {
    const timerElement = document.getElementById('timer');
    timerElement.textContent = `${quizState.timeRemaining}s`;

    // Add warning/danger classes
    timerElement.classList.remove('warning', 'danger');
    if (quizState.timeRemaining <= 5) {
        timerElement.classList.add('danger');
    } else if (quizState.timeRemaining <= 10) {
        timerElement.classList.add('warning');
    }
}

// ===========================
// Results Screen Functions
// ===========================
function showResults() {
    showScreen('results-screen');

    const totalQuestions = quizState.questions.length;
    const correctAnswers = quizState.score;
    const incorrectAnswers = totalQuestions - correctAnswers;
    const percentage = Math.round((correctAnswers / totalQuestions) * 100);

    // Update score display
    document.getElementById('score-percentage').textContent = `${percentage}%`;
    document.getElementById('score-fraction').textContent = `${correctAnswers}/${totalQuestions}`;
    document.getElementById('correct-count').textContent = correctAnswers;
    document.getElementById('incorrect-count').textContent = incorrectAnswers;

    // Animate score ring
    animateScoreRing(percentage);
}

function animateScoreRing(percentage) {
    // Create SVG gradient if not exists
    let svg = document.querySelector('.score-ring');
    let defs = svg.querySelector('defs');

    if (!defs) {
        defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
        gradient.id = 'scoreGradient';
        gradient.innerHTML = `
            <stop offset="0%" stop-color="#6366f1" />
            <stop offset="100%" stop-color="#8b5cf6" />
        `;
        defs.appendChild(gradient);
        svg.insertBefore(defs, svg.firstChild);
    }

    // Animate the ring
    const circumference = 2 * Math.PI * 54; // r=54
    const offset = circumference - (percentage / 100) * circumference;

    setTimeout(() => {
        document.getElementById('score-ring-fill').style.strokeDashoffset = offset;
    }, 100);
}

// ===========================
// Review Screen Functions
// ===========================
function showReview() {
    showScreen('review-screen');
    renderReviewItems();
}

function renderReviewItems() {
    const container = document.getElementById('review-container');
    container.innerHTML = '';

    quizState.userAnswers.forEach((answer, index) => {
        const item = document.createElement('div');
        item.className = 'review-item';
        item.style.animationDelay = `${index * 0.1}s`;

        const statusClass = answer.isCorrect ? 'correct' : 'incorrect';
        const statusText = answer.isCorrect ? 'Correct' : 'Incorrect';

        const optionsHTML = answer.options.map(option => {
            let optionClass = 'review-option';
            let iconHTML = '';

            if (option === answer.correctAnswer) {
                optionClass += ' correct-answer';
                iconHTML = `
                    <svg class="review-option-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                `;
            } else if (option === answer.userAnswer && !answer.isCorrect) {
                optionClass += ' wrong-answer';
                iconHTML = `
                    <svg class="review-option-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                `;
            }

            if (option === answer.userAnswer) {
                optionClass += ' user-answer';
            }

            return `
                <div class="${optionClass}">
                    ${iconHTML}
                    <span>${option}</span>
                </div>
            `;
        }).join('');

        item.innerHTML = `
            <div class="review-item-header">
                <span class="review-question-number">Question ${index + 1}</span>
                <span class="review-status ${statusClass}">${statusText}</span>
            </div>
            <div class="category-badge">${answer.category}</div>
            <h3 class="review-question">${answer.question}</h3>
            <div class="review-options">
                ${optionsHTML}
            </div>
        `;

        container.appendChild(item);
    });
}

// ===========================
// Event Listeners
// ===========================
function initializeEventListeners() {
    // Splash screen
    document.getElementById('splash-continue-btn').addEventListener('click', () => {
        showScreen('setup-screen');
    });

    // Agreement checkbox
    document.getElementById('agree-checkbox').addEventListener('change', (e) => {
        const continueBtn = document.getElementById('splash-continue-btn');
        continueBtn.disabled = !e.target.checked;
    });

    // Setup screen
    document.getElementById('num-questions').addEventListener('input', handleNumQuestionsChange);
    document.getElementById('time-per-question').addEventListener('input', handleTimeChange);
    document.querySelector('.button-group').addEventListener('click', handleDifficultyClick);
    document.getElementById('start-quiz-btn').addEventListener('click', startQuiz);

    // Results screen
    document.getElementById('review-answers-btn').addEventListener('click', showReview);
    document.getElementById('new-quiz-btn').addEventListener('click', () => {
        showScreen('setup-screen');
    });

    // Review screen
    document.getElementById('back-to-results-btn').addEventListener('click', () => {
        showScreen('results-screen');
    });
}

// ===========================
// Initialization
// ===========================
async function init() {
    initializeEventListeners();
    // Preload questions for faster startup
    await loadQuestions();
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
