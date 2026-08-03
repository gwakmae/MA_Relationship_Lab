window.MALab = window.MALab || {};

MALab.MapView = (() => {
    const config = MALab.Config;
    const core = MALab.Core;
    const store = MALab.Store;

    const SVG_WIDTH = 1320;
    const LEFT_MARGIN = 112;
    const RIGHT_MARGIN = 36;
    const TOP_MARGIN = 72;
    const ROW_HEIGHT = 50;
    const BOTTOM_MARGIN = 58;

    const AXIS_TICKS = [
        5,
        30,
        60,
        360,
        1440,
        10080,
        43200,
        525600,
        5256000,
        41472000
    ];

    let groups = new Map();
    let nodes = [];
    let pinnedDurationKey = null;
    let defaultDurationKey = null;

    function createDurationKey(duration) {
        return String(duration);
    }

    function getAllDurations() {
        return config.timeframes.flatMap(timeframe => {
            return config.maPeriods.map(period => {
                return timeframe.minutes * period;
            });
        });
    }

    function getMinimumDuration() {
        return Math.min(...getAllDurations());
    }

    function getMaximumDuration() {
        return Math.max(...getAllDurations());
    }

    function getGraphHeight() {
        return (
            TOP_MARGIN +
            config.timeframes.length * ROW_HEIGHT +
            BOTTOM_MARGIN
        );
    }

    function getXPosition(duration) {
        const minimum = getMinimumDuration();
        const maximum = getMaximumDuration();

        const minimumLog = Math.log10(minimum);
        const maximumLog = Math.log10(maximum);
        const durationLog = Math.log10(duration);

        const ratio =
            (durationLog - minimumLog) /
            (maximumLog - minimumLog);

        return (
            LEFT_MARGIN +
            ratio *
                (
                    SVG_WIDTH -
                    LEFT_MARGIN -
                    RIGHT_MARGIN
                )
        );
    }

    function getYPosition(timeframeIndex) {
        return (
            TOP_MARGIN +
            timeframeIndex * ROW_HEIGHT +
            ROW_HEIGHT / 2
        );
    }

    function getDurationColor(duration) {
        const minimum = getMinimumDuration();
        const maximum = getMaximumDuration();

        const ratio =
            (
                Math.log10(duration) -
                Math.log10(minimum)
            ) /
            (
                Math.log10(maximum) -
                Math.log10(minimum)
            );

        const hue = 190 + ratio * 150;

        return `hsl(${hue}, 82%, 66%)`;
    }

    function isPopularNode(node) {
        return (
            config.popularMAs.includes(node.period) &&
            config.popularTimeframes.includes(node.timeframe.id)
        );
    }

    function formatAxisDuration(minutes) {
        if (minutes < 60) {
            return `${minutes}분`;
        }

        if (minutes < 1440) {
            const hours = minutes / 60;
            return `${Number(hours.toFixed(1))}시간`;
        }

        if (minutes < 10080) {
            const days = minutes / 1440;
            return `${Number(days.toFixed(1))}일`;
        }

        if (minutes < 43200) {
            const weeks = minutes / 10080;
            return `${Number(weeks.toFixed(1))}주`;
        }

        if (minutes < 525600) {
            const months = minutes / 43200;
            return `${Number(months.toFixed(1))}개월`;
        }

        const years = minutes / 525600;

        return `${Number(years.toFixed(1))}년`;
    }

    function createGraphData() {
        nodes = [];
        groups = new Map();

        config.timeframes.forEach(
            (timeframe, timeframeIndex) => {
                config.maPeriods.forEach(period => {
                    const duration =
                        timeframe.minutes * period;

                    const durationKey =
                        createDurationKey(duration);

                    const node = {
                        timeframe,
                        timeframeIndex,
                        period,
                        duration,
                        durationKey,

                        x: getXPosition(duration),
                        y: getYPosition(timeframeIndex),

                        color:
                            getDurationColor(duration),

                        approximate:
                            Boolean(timeframe.approximate)
                    };

                    nodes.push(node);

                    if (!groups.has(durationKey)) {
                        groups.set(durationKey, []);
                    }

                    groups.get(durationKey).push(node);
                });
            }
        );
    }

    function renderAxisTicks(graphHeight) {
        return AXIS_TICKS
            .filter(duration => {
                return (
                    duration >= getMinimumDuration() &&
                    duration <= getMaximumDuration()
                );
            })
            .map(duration => {
                const x = getXPosition(duration);

                return `
                    <g class="atlas-axis-tick">
                        <line
                            x1="${x}"
                            y1="${TOP_MARGIN - 30}"
                            x2="${x}"
                            y2="${graphHeight - 28}"
                        ></line>

                        <text
                            x="${x}"
                            y="${TOP_MARGIN - 42}"
                            text-anchor="middle"
                        >
                            ${formatAxisDuration(duration)}
                        </text>
                    </g>
                `;
            })
            .join("");
    }

    function renderRows() {
        return config.timeframes
            .map((timeframe, index) => {
                const y = getYPosition(index);
                const rowTop = y - ROW_HEIGHT / 2;

                const popular =
                    config.popularTimeframes.includes(
                        timeframe.id
                    );

                return `
                    <g class="atlas-row">
                        <rect
                            class="
                                atlas-row-background
                                ${
                                    index % 2 === 0
                                        ? "alternate"
                                        : ""
                                }
                            "
                            x="0"
                            y="${rowTop}"
                            width="${SVG_WIDTH}"
                            height="${ROW_HEIGHT}"
                        ></rect>

                        <line
                            class="atlas-row-line"
                            x1="${LEFT_MARGIN}"
                            y1="${rowTop + ROW_HEIGHT}"
                            x2="${SVG_WIDTH - RIGHT_MARGIN}"
                            y2="${rowTop + ROW_HEIGHT}"
                        ></line>

                        <text
                            class="
                                atlas-row-label
                                ${popular ? "popular" : ""}
                            "
                            x="${LEFT_MARGIN - 18}"
                            y="${y + 4}"
                            text-anchor="end"
                        >
                            ${popular ? "★ " : ""}${timeframe.label}봉
                        </text>
                    </g>
                `;
            })
            .join("");
    }

    function renderFamilyLines() {
        return [...groups.entries()]
            .filter(([, familyNodes]) => {
                return familyNodes.length >= 2;
            })
            .map(([durationKey, familyNodes]) => {
                const minimumY = Math.min(
                    ...familyNodes.map(node => node.y)
                );

                const maximumY = Math.max(
                    ...familyNodes.map(node => node.y)
                );

                const x = familyNodes[0].x;
                const color = familyNodes[0].color;

                return `
                    <line
                        class="atlas-family-line"
                        data-duration="${durationKey}"
                        x1="${x}"
                        y1="${minimumY}"
                        x2="${x}"
                        y2="${maximumY}"
                        style="--family-color: ${color}"
                    ></line>
                `;
            })
            .join("");
    }

    function renderNodes() {
        return nodes
            .map(node => {
                const approximateClass =
                    node.approximate
                        ? "approximate"
                        : "";

                const popularClass =
                    isPopularNode(node)
                        ? "popular"
                        : "is-minor";

                return `
                    <g
                        class="
                            atlas-node
                            ${approximateClass}
                            ${popularClass}
                        "
                        data-duration="${node.durationKey}"
                        data-timeframe="${node.timeframe.id}"
                        data-period="${node.period}"
                        transform="
                            translate(
                                ${node.x},
                                ${node.y}
                            )
                        "
                        tabindex="0"
                        role="button"
                        aria-label="
                            ${node.timeframe.label}봉
                            ${node.period}MA,
                            ${core.formatDuration(
                                node.duration
                            )}
                        "
                        style="
                            --node-color:
                            ${node.color}
                        "
                    >
                        <circle
                            class="atlas-node-hit-area"
                            r="19"
                        ></circle>

                        <circle
                            class="atlas-node-circle"
                            r="7"
                        ></circle>

                        <text
                            class="atlas-node-label"
                            x="0"
                            y="-13"
                            text-anchor="middle"
                        >
                            ${node.period}
                        </text>

                        <title>
                            ${node.timeframe.label}봉
                            ${node.period}MA
                            ·
                            ${core.formatDuration(
                                node.duration
                            )}
                        </title>
                    </g>
                `;
            })
            .join("");
    }

    function getFamilyTitle(durationKey) {
        const familyNodes =
            groups.get(durationKey) || [];

        if (familyNodes.length === 0) {
            return "관계 없음";
        }

        return core.formatDuration(
            familyNodes[0].duration
        );
    }

    function renderFamilyDetails(durationKey) {
        const detailContainer =
            document.getElementById(
                "atlas-family-details"
            );

        if (!detailContainer) {
            return;
        }

        if (
            !durationKey ||
            !groups.has(durationKey)
        ) {
            detailContainer.innerHTML = `
                <div class="atlas-detail-empty">
                    <strong>전체 관계 표시 중</strong>

                    <p>
                        MA 점에 마우스를 올리거나 터치하면
                        동일한 기간을 갖는 관계가 강조됩니다.
                    </p>
                </div>
            `;

            return;
        }

        const familyNodes =
            groups.get(durationKey);

        const exactNodes =
            familyNodes.filter(node => {
                return !node.approximate;
            });

        const approximateNodes =
            familyNodes.filter(node => {
                return node.approximate;
            });

        const chain = familyNodes
            .map(node => {
                return `
                    <article
                        class="
                            atlas-family-item
                            ${
                                node.approximate
                                    ? "approximate"
                                    : ""
                            }
                        "
                    >
                        <span>
                            ${node.timeframe.label}봉
                        </span>

                        <strong>
                            ${node.period}MA
                        </strong>

                        ${
                            node.approximate
                                ? `
                                    <small>
                                        30일 가정
                                    </small>
                                `
                                : ""
                        }
                    </article>
                `;
            })
            .join("");

        detailContainer.innerHTML = `
            <div class="atlas-detail-header">
                <div>
                    <p class="panel-label">
                        SELECTED RELATIONSHIP
                    </p>

                    <h2>
                        ${getFamilyTitle(durationKey)}
                        관계
                    </h2>
                </div>

                <div class="atlas-family-count">
                    <strong>
                        ${exactNodes.length}
                    </strong>

                    <span>정확한 관계</span>
                </div>
            </div>

            <div class="atlas-family-chain">
                ${chain}
            </div>

            <div class="atlas-formula-explanation">
                ${
                    familyNodes
                        .slice(0, 4)
                        .map(node => {
                            return `
                                ${node.timeframe.label}
                                ×
                                ${node.period}MA
                                =
                                ${
                                    core.formatDuration(
                                        node.duration
                                    )
                                }
                            `;
                        })
                        .join("<br>")
                }
            </div>

            ${
                approximateNodes.length > 0
                    ? `
                        <p class="atlas-approximation-note">
                            월봉 관계는 한 달을 30일로 가정한
                            근사 관계입니다.
                        </p>
                    `
                    : ""
            }
        `;
    }

    function applyHighlight(durationKey) {
        const nodeElements =
            document.querySelectorAll(
                ".atlas-node"
            );

        const lineElements =
            document.querySelectorAll(
                ".atlas-family-line"
            );

        nodeElements.forEach(element => {
            const sameFamily =
                Boolean(durationKey) &&
                element.dataset.duration ===
                    durationKey;

            element.classList.toggle(
                "is-active",
                sameFamily
            );

            element.classList.toggle(
                "is-dimmed",
                Boolean(durationKey) &&
                    !sameFamily
            );
        });

        lineElements.forEach(element => {
            const sameFamily =
                Boolean(durationKey) &&
                element.dataset.duration ===
                    durationKey;

            element.classList.toggle(
                "is-active",
                sameFamily
            );

            element.classList.toggle(
                "is-dimmed",
                Boolean(durationKey) &&
                    !sameFamily
            );
        });

        renderFamilyDetails(durationKey);
    }

    function selectNode(element) {
        const durationKey =
            element.dataset.duration;

        pinnedDurationKey = durationKey;

        store.update("map", {
            sourceTimeframeId:
                element.dataset.timeframe,

            sourceMA:
                Number(element.dataset.period)
        });

        applyHighlight(durationKey);
    }

    function bindGraphEvents(container) {
        container
            .querySelectorAll(".atlas-node")
            .forEach(element => {
                element.addEventListener(
                    "pointerenter",
                    () => {
                        applyHighlight(
                            element.dataset.duration
                        );
                    }
                );

                element.addEventListener(
                    "pointerleave",
                    () => {
                        applyHighlight(
                            pinnedDurationKey
                        );
                    }
                );

                element.addEventListener(
                    "click",
                    event => {
                        event.stopPropagation();
                        selectNode(element);
                    }
                );

                element.addEventListener(
                    "keydown",
                    event => {
                        if (
                            event.key === "Enter" ||
                            event.key === " "
                        ) {
                            event.preventDefault();
                            selectNode(element);
                        }
                    }
                );
            });

        container
            .querySelector(
                "#atlas-clear-focus"
            )
            .addEventListener("click", () => {
                pinnedDurationKey = null;
                applyHighlight(null);
            });

        container
            .querySelector(
                "#atlas-example-focus"
            )
            .addEventListener("click", () => {
                pinnedDurationKey =
                    createDurationKey(600);

                applyHighlight(
                    pinnedDurationKey
                );
            });
    }

    function render(container) {
        createGraphData();

        const state = store.getState().map;

        const source =
            core.getTimeframe(
                state.sourceTimeframeId
            );

        defaultDurationKey =
            createDurationKey(
                source.minutes *
                state.sourceMA
            );

        pinnedDurationKey =
            groups.has(defaultDurationKey)
                ? defaultDurationKey
                : createDurationKey(600);

        const graphHeight =
            getGraphHeight();

        container.innerHTML = `
            <section class="atlas-intro">
                <div>
                    <p class="panel-label">
                        VISUAL RELATIONSHIP ATLAS
                    </p>

                    <h2>
                        같은 세로선에 있는 MA는
                        동일한 시간 범위를 봅니다
                    </h2>

                    <p>
                        모든 타임프레임과 MA가 한 화면에
                        표시됩니다. 점에 마우스를 올리거나
                        터치하면 해당 관계 전체가 강조됩니다.
                    </p>
                </div>

                <div class="atlas-actions">
                    <button
                        id="atlas-example-focus"
                        class="
                            atlas-action-button
                            primary
                        "
                        type="button"
                    >
                        600분 예시
                    </button>

                    <button
                        id="atlas-clear-focus"
                        class="atlas-action-button"
                        type="button"
                    >
                        전체 보기
                    </button>
                </div>
            </section>

            <section class="panel atlas-panel">
                <div class="atlas-axis-title">
                    <strong>
                        X축(가로) · 총 시간 범위
                        = 타임프레임 × MA 기간
                    </strong>

                    <span>
                        짧은 기간
                        →
                        긴 기간
                    </span>
                </div>

                <div class="atlas-body">
                    <div class="atlas-y-caption">
                        <span>
                            Y축(세로) · 타임프레임
                        </span>
                    </div>

                    <div class="atlas-scroll">
                        <svg
                            class="atlas-svg"
                            viewBox="
                                0 0
                                ${SVG_WIDTH}
                                ${graphHeight}
                            "
                            role="img"
                            aria-label="
                                타임프레임과 이동평균선의
                                전체 기간 관계 지도
                            "
                        >
                            ${renderRows()}
                            ${renderAxisTicks(graphHeight)}
                            ${renderFamilyLines()}
                            ${renderNodes()}
                        </svg>
                    </div>
                </div>

                <div class="atlas-legend">
                    <span>
                        <i class="legend-dot"></i>
                        정확한 기간 관계
                    </span>

                    <span>
                        <i
                            class="
                                legend-dot
                                approximate
                            "
                        ></i>
                        월봉 30일 근사
                    </span>

                    <span>
                        점 위 숫자 = 이동평균선(MA) 기간
                    </span>

                    <span>
                        ★ = 자주 쓰는 타임프레임 · MA
                    </span>
                </div>
            </section>

            <section
                id="atlas-family-details"
                class="
                    panel
                    atlas-family-details
                "
            ></section>
        `;

        bindGraphEvents(container);
        applyHighlight(pinnedDurationKey);
    }

    return Object.freeze({
        render
    });
})();
