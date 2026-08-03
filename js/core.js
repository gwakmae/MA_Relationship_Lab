window.MALab = window.MALab || {};

MALab.Core = (() => {
    const config = MALab.Config;

    function getTimeframe(id) {
        return config.timeframes.find(
            timeframe => timeframe.id === id
        );
    }

    function isSupportedMA(value) {
        return config.maPeriods.some(
            period => Math.abs(period - value) < 0.000001
        );
    }

    function isPopularMA(value) {
        return config.popularMAs.includes(value);
    }

    function isPopularTimeframe(id) {
        return config.popularTimeframes.includes(id);
    }

    function formatMA(value) {
        if (Number.isInteger(value)) {
            return String(value);
        }

        return Number(value.toFixed(2)).toString();
    }

    function formatDuration(totalMinutes) {
        if (totalMinutes < 60) {
            return `${formatMA(totalMinutes)}분`;
        }

        if (totalMinutes < 1440) {
            return `${formatMA(totalMinutes / 60)}시간`;
        }

        if (totalMinutes < 10080) {
            return `${formatMA(totalMinutes / 1440)}일`;
        }

        if (totalMinutes < 43200) {
            return `${formatMA(totalMinutes / 10080)}주`;
        }

        if (totalMinutes < 525600) {
            return `약 ${formatMA(totalMinutes / 43200)}개월`;
        }

        return `약 ${formatMA(totalMinutes / 525600)}년`;
    }

    function convert(sourceTimeframeId, sourceMA, targetTimeframeId) {
        const source = getTimeframe(sourceTimeframeId);
        const target = getTimeframe(targetTimeframeId);

        if (!source || !target) {
            throw new Error("지원하지 않는 타임프레임입니다.");
        }

        const totalMinutes = source.minutes * sourceMA;
        const targetMA = totalMinutes / target.minutes;

        return {
            source,
            target,
            sourceMA,
            targetMA,
            totalMinutes,
            supported: isSupportedMA(targetMA),
            approximate:
                Boolean(source.approximate) ||
                Boolean(target.approximate)
        };
    }

    function shuffle(items) {
        const result = [...items];

        for (let i = result.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));

            [result[i], result[j]] = [
                result[j],
                result[i]
            ];
        }

        return result;
    }

    function createQuiz() {
        const weightedPool = [];

        config.timeframes
            .filter(timeframe => !timeframe.approximate)
            .forEach(source => {
                config.maPeriods.forEach(sourceMA => {
                    config.timeframes
                        .filter(target => {
                            return (
                                target.id !== source.id &&
                                !target.approximate
                            );
                        })
                        .forEach(target => {
                            const result = convert(
                                source.id,
                                sourceMA,
                                target.id
                            );

                            if (!result.supported) {
                                return;
                            }

                            const candidate = {
                                source,
                                target,
                                sourceMA,
                                answer: result.targetMA,
                                totalMinutes:
                                    result.totalMinutes
                            };

                            // 인기 조합은 출제 확률 5배
                            const isPopularCombo =
                                isPopularTimeframe(source.id) &&
                                isPopularTimeframe(target.id) &&
                                isPopularMA(sourceMA);

                            const weight =
                                isPopularCombo ? 5 : 1;

                            for (let i = 0; i < weight; i += 1) {
                                weightedPool.push(candidate);
                            }
                        });
                });
            });

        const question =
            weightedPool[
                Math.floor(Math.random() * weightedPool.length)
            ];

        // 정답에 수치가 가까운 값 위주로 오답 구성
        const nearDistractors = config.maPeriods
            .filter(period => period !== question.answer)
            .sort((a, b) => {
                return (
                    Math.abs(Math.log(a / question.answer)) -
                    Math.abs(Math.log(b / question.answer))
                );
            })
            .slice(0, 6);

        const wrongAnswers = shuffle(nearDistractors).slice(0, 3);

        return {
            ...question,
            options: shuffle([
                question.answer,
                ...wrongAnswers
            ])
        };
    }

    return Object.freeze({
        getTimeframe,
        isSupportedMA,
        isPopularMA,
        isPopularTimeframe,
        formatMA,
        formatDuration,
        convert,
        createQuiz
    });
})();
