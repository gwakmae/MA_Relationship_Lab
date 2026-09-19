window.MALab = window.MALab || {};

MALab.MapView = (() => {
    const config = MALab.Config;
    const core = MALab.Core;
    const store = MALab.Store;

    const SVG_WIDTH = 2100;
    const LEFT_MARGIN = 44;
    const RIGHT_MARGIN = 72;
    const TOP_MARGIN = 92;
    const ROW_HEIGHT = 76;
    const BOTTOM_MARGIN = 76;

    const LABEL_COLLISION_GAP = 34;

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

        assignNodeLabelPositions();
    }

    function assignNodeLabelPositions() {
        config.timeframes.forEach(timeframe => {
            const rowNodes = nodes
                .filter(node => {
                    return node.timeframe.id === timeframe.id;
                })
                .sort((a, b) => a.x - b.x);

            let previousX = Number.NEGATIVE_INFINITY;
            let clusterIndex = 0;

            rowNodes.forEach(node => {
                if (
                    node.x - previousX <
                    LABEL_COLLISION_GAP
                ) {
                    clusterIndex += 1;
                } else {
                    clusterIndex = 0;
                }

                node.labelY =
                    clusterIndex % 2 === 0
                        ? -18
                        : -34;

                previousX = node.x;
            });
        });
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
                            y1="${TOP_MARGIN - 34}"
                            x2="${x}"
                            y2="${graphHeight - 32}"
                        ></line>

                        <text
                            x="${x}"
                            y="${TOP_MARGIN - 48}"
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

                return `
                    <g
                        class="atlas-row"
                        data-timeframe="${timeframe.id}"
                    >
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
                    </g>
                `;
            })
            .join("");
    }

    function renderTimeframeLabels() {
        const labels = config.timeframes
            .map((timeframe, index) => {
                const popular =
                    config.popularTimeframes.includes(
                        timeframe.id
                    );

                return `
                    <div
                        class="
                            atlas-timeframe-label
                            ${
                                index % 2 === 0
                                    ? "alternate"
                                    : ""
                            }
                            ${popular ? "popular" : ""}
                        "
                        data-timeframe="${timeframe.id}"
                    >
                        ${popular ? "★ " : ""}
                        ${timeframe.label}봉
                    </div>
                `;
            })
            .join("");

        return `
            <div
                class="atlas-timeframe-axis"
                aria-label="타임프레임"
            >
                <div class="atlas-timeframe-axis-header">
                    타임프레임
                </div>

                ${labels}

                <div
                    class="atlas-timeframe-axis-footer"
                    aria-hidden="true"
                ></div>
            </div>
        `;
    }

    function renderSearchControls() {
        const state = store.getState().map;

        const timeframeOptions =
            config.timeframes
                .map(timeframe => {
                    const selected =
                        timeframe.id ===
                        state.sourceTimeframeId
                            ? "selected"
                            : "";

                    return `
                        <option
                            value="${timeframe.id}"
                            ${selected}
                        >
                            ${timeframe.label}봉
                        </option>
                    `;
                })
                .join("");

        const maOptions =
            config.maPeriods
                .map(period => {
                    const selected =
                        period === state.sourceMA
                            ? "selected"
                            : "";

                    return `
                        <option
                            value="${period}"
                            ${selected}
                        >
                            ${period}MA
                        </option>
                    `;
                })
                .join("");

        return `
            <form
                id="atlas-search-form"
                class="atlas-search-form"
                role="search"
            >
                <div class="atlas-search-field">
                    <label for="atlas-search-timeframe">
                        타임프레임
                    </label>

                    <select
                        id="atlas-search-timeframe"
                        class="atlas-search-select"
                    >
                        ${timeframeOptions}
                    </select>
                </div>

                <div class="atlas-search-field">
                    <label for="atlas-search-ma">
                        이동평균선
                    </label>

                    <select
                        id="atlas-search-ma"
                        class="atlas-search-select"
                    >
                        ${maOptions}
                    </select>
                </div>

                <button
                    class="atlas-search-button"
                    type="submit"
                >
                    찾기
                </button>
            </form>
        `;
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
                            r="26"
                        ></circle>

                        <circle
                            class="atlas-node-circle"
                            r="8.5"
                        ></circle>

                        <text
                            class="atlas-node-label"
                            x="0"
                            y="${node.labelY}"
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
                        점을 클릭하면 관계가 고정되고,
                        전체 보기 버튼으로 해제할 수 있습니다.
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

                <div class="atlas-detail-actions">
                    <button
                        class="atlas-clear-selection"
                        type="button"
                        data-clear-atlas-selection
                    >
                        선택 해제
                    </button>

                    <div class="atlas-family-count">
                        <strong>
                            ${exactNodes.length}
                        </strong>

                        <span>정확한 관계</span>
                    </div>
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

        const rowElements =
            document.querySelectorAll(
                ".atlas-row"
            );

        const timeframeLabelElements =
            document.querySelectorAll(
                ".atlas-timeframe-label"
            );

        const activeTimeframes = new Set(
            (
                groups.get(durationKey) ||
                []
            ).map(node => node.timeframe.id)
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

        [
            ...rowElements,
            ...timeframeLabelElements
        ].forEach(element => {
            const sameTimeframe =
                Boolean(durationKey) &&
                activeTimeframes.has(
                    element.dataset.timeframe
                );

            element.classList.toggle(
                "is-active",
                sameTimeframe
            );

            element.classList.toggle(
                "is-dimmed",
                Boolean(durationKey) &&
                    !sameTimeframe
            );
        });

        renderFamilyDetails(durationKey);
    }

    function clearSelection() {
        pinnedDurationKey = null;
        applyHighlight(null);
    }

    function selectNode(
        element,
        allowToggle = true
    ) {
        const durationKey =
            element.dataset.duration;

        if (
            allowToggle &&
            pinnedDurationKey === durationKey
        ) {
            clearSelection();
            return;
        }

        pinnedDurationKey = durationKey;

        store.update("map", {
            sourceTimeframeId:
                element.dataset.timeframe,

            sourceMA:
                Number(element.dataset.period)
        });

        applyHighlight(durationKey);
    }

    function scrollToNode(element) {
        const scrollContainer =
            element.closest(".atlas-scroll");

        if (!scrollContainer) {
            return;
        }

        const elementRect =
            element.getBoundingClientRect();

        const scrollRect =
            scrollContainer.getBoundingClientRect();

        const targetLeft =
            scrollContainer.scrollLeft +
            elementRect.left -
            scrollRect.left -
            scrollContainer.clientWidth / 2;

        scrollContainer.scrollTo({
            left: Math.max(0, targetLeft),
            behavior: "smooth"
        });

        const targetTop =
            window.scrollY +
            elementRect.top -
            window.innerHeight / 2;

        window.scrollTo({
            top: Math.max(0, targetTop),
            behavior: "smooth"
        });

        element.focus({
            preventScroll: true
        });
    }

    function findAndSelectNode(container) {
        const timeframeId =
            container.querySelector(
                "#atlas-search-timeframe"
            ).value;

        const period =
            Number(
                container.querySelector(
                    "#atlas-search-ma"
                ).value
            );

        const element =
            container.querySelector(
                `.atlas-node[data-timeframe="${timeframeId}"][data-period="${period}"]`
            );

        if (!element) {
            MALab.App.showToast(
                "해당 MA 노드를 찾을 수 없습니다."
            );

            return;
        }

        selectNode(element, false);
        scrollToNode(element);

        const timeframe =
            core.getTimeframe(timeframeId);

        MALab.App.showToast(
            `${timeframe.label}봉 ${period}MA를 선택했습니다.`
        );
    }

    function bindGraphEvents(container) {
        container
            .querySelectorAll(".atlas-node")
            .forEach(element => {
                element.addEventListener(
                    "pointerenter",
                    () => {
                        if (pinnedDurationKey) {
                            return;
                        }

                        applyHighlight(
                            element.dataset.duration
                        );
                    }
                );

                element.addEventListener(
                    "pointerleave",
                    () => {
                        if (pinnedDurationKey) {
                            return;
                        }

                        applyHighlight(null);
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

        container.addEventListener(
            "click",
            event => {
                const clearButton =
                    event.target.closest(
                        "[data-clear-atlas-selection]"
                    );

                if (!clearButton) {
                    return;
                }

                clearSelection();
            }
        );

        container
            .querySelector(
                "#atlas-search-form"
            )
            .addEventListener(
                "submit",
                event => {
                    event.preventDefault();
                    findAndSelectNode(container);
                }
            );
    }

    function render(container) {
        createGraphData();

        // 기본 상태는 항상 전체 보기입니다.
        pinnedDurationKey = null;

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
                        터치하면 해당 관계 전체가 강조되고,
                        클릭하면 관계가 고정됩니다.
                    </p>
                </div>

                <div class="atlas-actions">
                    ${renderSearchControls()}

                    <button
                        id="atlas-clear-focus"
                        class="
                            atlas-action-button
                            primary
                        "
                        type="button"
                        data-clear-atlas-selection
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
                    ${renderTimeframeLabels()}

                    <div class="atlas-scroll">
                        <svg
                            class="atlas-svg"
                            style="
                                --atlas-width:
                                ${SVG_WIDTH}px
                            "
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
        applyHighlight(null);
    }

    return Object.freeze({
        render
    });
})();
