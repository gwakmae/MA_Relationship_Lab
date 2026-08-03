window.MALab = window.MALab || {};

MALab.App = (() => {
    const store = MALab.Store;

    const viewMeta = {
        map: {
            title: "MA Relationship Atlas",
            description:
                "세로축은 타임프레임, 가로축은 총 시간 범위(TF × MA), 점 위 숫자는 MA 기간입니다."
        },

        converter: {
            title: "이동평균선 환산기",
            description:
                "기준 타임프레임의 MA를 다른 타임프레임으로 즉시 변환합니다."
        },

        quiz: {
            title: "반복 학습",
            description:
                "타임프레임 배율과 MA 관계를 직관적으로 익힐 때까지 반복합니다."
        }
    };

    function showToast(message) {
        const container =
            document.getElementById(
                "toast-container"
            );

        const toast =
            document.createElement("div");

        toast.className = "toast";
        toast.textContent = message;

        container.appendChild(toast);

        window.setTimeout(() => {
            toast.remove();
        }, 2200);
    }

    function updateNavigation(activeView) {
        document
            .querySelectorAll("[data-view]")
            .forEach(button => {
                button.classList.toggle(
                    "active",
                    button.dataset.view ===
                        activeView
                );
            });
    }

    function updateHeader(activeView) {
        const meta =
            viewMeta[activeView] ||
            viewMeta.map;

        document.getElementById(
            "page-title"
        ).textContent = meta.title;

        document.getElementById(
            "page-description"
        ).textContent = meta.description;
    }

    function render() {
        const state = store.getState();
        const activeView = state.activeView;

        const container =
            document.getElementById(
                "view-container"
            );

        updateNavigation(activeView);
        updateHeader(activeView);

        if (activeView === "map") {
            MALab.MapView.render(container);
            return;
        }

        if (activeView === "quiz") {
            MALab.QuizView.render(container);
            return;
        }

        MALab.ConverterView.render(container);
    }

    function bindNavigation() {
        document
            .getElementById("main-nav")
            .addEventListener(
                "click",
                event => {
                    const button =
                        event.target.closest(
                            "[data-view]"
                        );

                    if (!button) {
                        return;
                    }

                    store.setActiveView(
                        button.dataset.view
                    );

                    render();
                }
            );
    }

    function init() {
        bindNavigation();
        render();
    }

    document.addEventListener(
        "DOMContentLoaded",
        init
    );

    return Object.freeze({
        showToast,
        render
    });
})();
