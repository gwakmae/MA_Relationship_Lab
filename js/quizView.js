window.MALab = window.MALab || {};

MALab.QuizView = (() => {
    const core = MALab.Core;
    const store = MALab.Store;

    let currentQuestion = null;
    let answered = false;
    let selectedAnswer = null;

    function ensureQuestion() {
        if (!currentQuestion) {
            currentQuestion = core.createQuiz();
        }
    }

    function getAccuracy(stats) {
        if (stats.total === 0) {
            return 0;
        }

        return Math.round(
            (stats.correct / stats.total) * 100
        );
    }

    function answerClass(option) {
        if (!answered) {
            return "";
        }

        if (option === currentQuestion.answer) {
            return "correct";
        }

        if (option === selectedAnswer) {
            return "wrong";
        }

        return "";
    }

    function renderFeedback() {
        if (!answered) {
            return `
                <div class="quiz-feedback">
                    머릿속으로 시간 배율을 먼저 계산해 보세요.
                </div>
            `;
        }

        const correct =
            selectedAnswer === currentQuestion.answer;

        return `
            <div class="quiz-feedback">
                ${
                    correct
                        ? "<strong>정답입니다.</strong>"
                        : `
                            <strong>정답은
                            ${currentQuestion.answer}MA입니다.</strong>
                        `
                }

                <br>

                ${currentQuestion.source.label}
                ×
                ${currentQuestion.sourceMA}
                =
                ${core.formatDuration(
                    currentQuestion.totalMinutes
                )}

                ·

                ${core.formatDuration(
                    currentQuestion.totalMinutes
                )}
                ÷
                ${currentQuestion.target.label}
                =
                ${currentQuestion.answer}MA
            </div>

            <button
                id="next-question"
                class="next-button"
                type="button"
            >
                다음 문제
            </button>
        `;
    }

    function render(container) {
        ensureQuestion();

        const stats = store.getState().quiz;

        container.innerHTML = `
            <div class="quiz-layout">
                <section class="panel quiz-card">
                    <p class="quiz-kicker">
                        QUICK TRAINING
                    </p>

                    <h2 class="quiz-question">
                        <strong>
                            ${currentQuestion.source.label}봉
                            ${currentQuestion.sourceMA}MA
                        </strong>
                        는
                        <strong>
                            ${currentQuestion.target.label}봉
                        </strong>
                        에서 몇 MA일까요?
                    </h2>

                    <div class="answer-grid">
                        ${currentQuestion.options.map(option => `
                            <button
                                type="button"
                                class="
                                    answer-button
                                    ${answerClass(option)}
                                "
                                data-answer="${option}"
                                ${answered ? "disabled" : ""}
                            >
                                ${option}MA
                            </button>
                        `).join("")}
                    </div>

                    ${renderFeedback()}
                </section>

                <aside class="panel stats-panel">
                    <h3>학습 기록</h3>

                    <div class="stat-row">
                        <span>정답률</span>
                        <strong>${getAccuracy(stats)}%</strong>
                    </div>

                    <div class="stat-row">
                        <span>연속 정답</span>
                        <strong>${stats.streak}</strong>
                    </div>

                    <div class="stat-row">
                        <span>최고 기록</span>
                        <strong>${stats.bestStreak}</strong>
                    </div>

                    <button
                        id="reset-quiz"
                        class="reset-button"
                        type="button"
                    >
                        기록 초기화
                    </button>
                </aside>
            </div>
        `;

        bindEvents(container);
    }

    function bindEvents(container) {
        container
            .querySelectorAll("[data-answer]")
            .forEach(button => {
                button.addEventListener("click", () => {
                    if (answered) {
                        return;
                    }

                    selectedAnswer =
                        Number(button.dataset.answer);

                    answered = true;

                    const correct =
                        selectedAnswer ===
                        currentQuestion.answer;

                    store.recordQuiz(correct);
                    render(container);

                    MALab.App.showToast(
                        correct
                            ? "정답입니다!"
                            : `정답: ${currentQuestion.answer}MA`
                    );
                });
            });

        const nextButton =
            container.querySelector("#next-question");

        if (nextButton) {
            nextButton.addEventListener("click", () => {
                currentQuestion = core.createQuiz();
                selectedAnswer = null;
                answered = false;

                render(container);
            });
        }

        container
            .querySelector("#reset-quiz")
            .addEventListener("click", () => {
                const confirmed = confirm(
                    "퀴즈 기록을 초기화할까요?"
                );

                if (!confirmed) {
                    return;
                }

                store.resetQuiz();
                render(container);

                MALab.App.showToast(
                    "퀴즈 기록을 초기화했습니다."
                );
            });
    }

    return Object.freeze({
        render
    });
})();
