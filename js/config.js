window.MALab = window.MALab || {};

MALab.Config = Object.freeze({
    storageKey: "ma_relationship_lab_v2",

    maPeriods: Object.freeze([
        5,
        10,
        20,
        30,
        40,
        50,
        60,
        80,
        100,
        120,
        200,
        240,
        480,
        960
    ]),

    // 실전에서 자주 쓰는 MA (강조 대상)
    popularMAs: Object.freeze([
        5,
        10,
        20,
        50,
        60,
        100,
        120,
        200,
        240
    ]),

    // 실전에서 자주 쓰는 타임프레임 (강조 대상)
    popularTimeframes: Object.freeze([
        "m5",
        "m15",
        "m30",
        "h1",
        "h4",
        "d1",
        "w1",
        "mo1"
    ]),

    timeframes: Object.freeze([
        {
            id: "m1",
            label: "1분",
            minutes: 1
        },
        {
            id: "m2",
            label: "2분",
            minutes: 2
        },
        {
            id: "m3",
            label: "3분",
            minutes: 3
        },
        {
            id: "m5",
            label: "5분",
            minutes: 5
        },
        {
            id: "m10",
            label: "10분",
            minutes: 10
        },
        {
            id: "m15",
            label: "15분",
            minutes: 15
        },
        {
            id: "m30",
            label: "30분",
            minutes: 30
        },
        {
            id: "h1",
            label: "1시간",
            minutes: 60
        },
        {
            id: "h2",
            label: "2시간",
            minutes: 120
        },
        {
            id: "h3",
            label: "3시간",
            minutes: 180
        },
        {
            id: "h4",
            label: "4시간",
            minutes: 240
        },
        {
            id: "h6",
            label: "6시간",
            minutes: 360
        },
        {
            id: "h12",
            label: "12시간",
            minutes: 720
        },
        {
            id: "d1",
            label: "일",
            minutes: 1440
        },
        {
            id: "d2",
            label: "2일",
            minutes: 2880
        },
        {
            id: "w1",
            label: "주",
            minutes: 10080
        },
        {
            id: "mo1",
            label: "월",
            minutes: 43200,
            approximate: true
        }
    ])
});
