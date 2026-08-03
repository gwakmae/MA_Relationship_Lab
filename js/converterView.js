window.MALab = window.MALab || {};

MALab.ConverterView = (() => {
    const config = MALab.Config;
    const core = MALab.Core;
    const store = MALab.Store;

    function timeframeOptions(selectedId) {
        return config.timeframes.map(timeframe => {
            const selected =
                timeframe.id === selectedId
                    ? "selected"
                    : "";

            const star =
                config.popularTimeframes.includes(
                    timeframe.id
                )
                    ? "★ "
                    : "";

            const suffix =
                timeframe.approximate
                    ? " · 30일 가정"
                    : "";

            return `
                <option
                    value="${timeframe.id}"
                    ${selected}
                >
                    ${star}${timeframe.label}${suffix}
                </option>
            `;
        }).join("");
    }

    function maButtons(selectedMA) {
        return config.maPeriods.map(period => {
            const popular =
                config.popularMAs.includes(period);

            return `
                <button
                    type="button"
                    class="
                        ma-button
                        ${period === selectedMA ? "active" : ""}
                        ${popular ? "popular" : ""}
                    "
                    data-ma="${period}"
                >
                    ${period}${popular ? "★" : ""}
                </button>
            `;
        }).join("");
    }

    function render(container) {
        const state = store.getState().converter;

        const result = core.convert(
            state.sourceTimeframeId,
            state.sourceMA,
            state.targetTimeframeId
        );

        const approximateText = result.approximate
            ? `
                <div class="helper-card">
                    <span class="helper-icon">△</span>
                    <span>
                        월봉은 고정된 시간 길이가 아니므로
                        이 앱에서는 학습 편의를 위해 30일로 가정합니다.
                    </span>
                </div>
            `
            : "";

        container.innerHTML = `
            <div class="converter-grid">
                <article class="panel input-panel">
                    <div class="panel-label">SOURCE</div>

                    <div class="field">
                        <label for="source-timeframe">
                            기준 타임프레임
                        </label>

                        <select
                            id="source-timeframe"
                            class="select-control"
                        >
                            ${timeframeOptions(
                                state.sourceTimeframeId
                            )}
                        </select>
                    </div>

                    <div class="field">
                        <label>기준 이동평균선</label>

                        <div
                            id="source-ma-grid"
                            class="ma-grid"
                        >
                            ${maButtons(state.sourceMA)}
                        </div>
                    </div>
                </article>

                <div class="converter-arrow">
                    <div class="arrow-circle">→</div>
                </div>

                <article class="panel input-panel result-panel">
                    <div>
                        <div class="panel-label">TARGET</div>

                        <div class="field">
                            <label for="target-timeframe">
                                변환할 타임프레임
                            </label>

                            <select
                                id="target-timeframe"
                                class="select-control"
                            >
                                ${timeframeOptions(
                                    state.targetTimeframeId
                                )}
                            </select>
                        </div>

                        <div class="result-value">
                            ${core.formatMA(result.targetMA)}
                            <span>MA</span>
                        </div>

                        <div class="
                            result-status
                            ${
                                result.supported
                                    ? "supported"
                                    : "unsupported"
                            }
                        ">
                            ${
                                result.supported
                                    ? "● 지원 MA와 정확히 일치"
                                    : "● 지정된 MA 목록 외"
                            }
                        </div>
                    </div>

                    <div class="result-equation">
                        ${result.source.label}
                        ×
                        ${result.sourceMA}MA
                        =
                        <strong>
                            ${core.formatDuration(
                                result.totalMinutes
                            )}
                        </strong>
                        <br>

                        ${result.target.label}
                        ×
                        ${core.formatMA(result.targetMA)}MA
                        =
                        같은 기간
                    </div>
                </article>
            </div>

            <div class="helper-card">
                <span class="helper-icon">i</span>

                <span>
                    예:
                    <strong>5분봉 120MA</strong>는
                    총 600분을 봅니다.
                    600 ÷ 15분 =
                    <strong>15분봉 40MA</strong>입니다.
                </span>
            </div>

            ${approximateText}
        `;

        bindEvents(container);
    }

    function bindEvents(container) {
        container
            .querySelector("#source-timeframe")
            .addEventListener("change", event => {
                store.update("converter", {
                    sourceTimeframeId: event.target.value
                });

                render(container);
            });

        container
            .querySelector("#target-timeframe")
            .addEventListener("change", event => {
                store.update("converter", {
                    targetTimeframeId: event.target.value
                });

                render(container);
            });

        container
            .querySelector("#source-ma-grid")
            .addEventListener("click", event => {
                const button =
                    event.target.closest("[data-ma]");

                if (!button) {
                    return;
                }

                store.update("converter", {
                    sourceMA: Number(button.dataset.ma)
                });

                render(container);
            });
    }

    return Object.freeze({
        render
    });
})();
