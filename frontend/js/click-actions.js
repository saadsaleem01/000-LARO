(function () {
    const existingPages = new Set([
        "dark_mode_screenshots.html",
        "dashboard.html",
        "dashboard_dark.html",
        "evidence_timeline.html",
        "final_prototype.html",
        "index.html",
        "index_consolidated.html",
        "index_dark.html",
        "index_fixed.html",
        "investors.html",
        "investors_dark.html",
        "lawyer_matching.html",
        "offline.html",
        "optimized.html",
        "outreach.html",
        "screenshots.html",
        "simple.html",
        "simple_updated.html"
    ]);

    function ensureToast() {
        let toast = document.getElementById("laroActionToast");
        if (toast) return toast;

        const style = document.createElement("style");
        style.textContent = `
            #laroActionToast {
                background: #12213a;
                border: 1px solid rgba(255, 112, 17, 0.45);
                border-radius: 8px;
                bottom: 1.5rem;
                box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
                color: #f4f7fb;
                font: 700 0.9rem/1.35 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                max-width: min(440px, calc(100vw - 2rem));
                opacity: 0;
                padding: 0.85rem 1rem;
                pointer-events: none;
                position: fixed;
                right: 1.5rem;
                transform: translateY(12px);
                transition: opacity 0.2s ease, transform 0.2s ease;
                z-index: 10000;
            }

            #laroActionToast.show {
                opacity: 1;
                transform: translateY(0);
            }
        `;
        document.head.appendChild(style);

        toast = document.createElement("div");
        toast.id = "laroActionToast";
        toast.setAttribute("role", "status");
        toast.setAttribute("aria-live", "polite");
        document.body.appendChild(toast);
        return toast;
    }

    function labelFor(element) {
        return (element.getAttribute("aria-label") || element.textContent || "This control")
            .replace(/\s+/g, " ")
            .trim();
    }

    function showAction(message) {
        const toast = ensureToast();
        toast.textContent = message;
        toast.className = "show";
        window.clearTimeout(window.laroActionToastTimer);
        window.laroActionToastTimer = window.setTimeout(() => {
            toast.className = "";
        }, 5000);
    }

    function isBootstrapManaged(element) {
        return Boolean(element.getAttribute("data-bs-toggle") || element.getAttribute("data-toggle"));
    }

    function samePageHashTarget(href) {
        if (!href || href === "#") return "";
        if (!href.startsWith("#")) return "";
        return href.slice(1);
    }

    function localHtmlTarget(anchor) {
        const raw = anchor.getAttribute("href") || "";
        if (!raw || raw.startsWith("#") || /^[a-z]+:/i.test(raw)) return "";
        try {
            const url = new URL(raw, window.location.href);
            if (url.origin !== window.location.origin) return "";
            const page = url.pathname.split("/").pop();
            return page && page.endsWith(".html") ? page : "";
        } catch (error) {
            return "";
        }
    }

    function activateFallbackLinks() {
        document.querySelectorAll("a").forEach((anchor) => {
            anchor.addEventListener("click", (event) => {
                if (event.defaultPrevented || isBootstrapManaged(anchor)) return;

                const href = anchor.getAttribute("href");
                if (!href || href === "#") {
                    event.preventDefault();
                    const label = labelFor(anchor);
                    if (/home|logo/i.test(label)) {
                        window.scrollTo({ top: 0, behavior: "smooth" });
                        showAction("Returned to the top of this page.");
                        return;
                    }
                    showAction(anchor.dataset.actionMessage || `${label} is not wired to a live destination in this local prototype yet.`);
                    return;
                }

                const targetId = samePageHashTarget(href);
                if (targetId) {
                    const target = document.getElementById(targetId);
                    if (!target) {
                        event.preventDefault();
                        showAction(`${labelFor(anchor)} is not available on this page yet.`);
                        return;
                    }
                    target.scrollIntoView({ behavior: "smooth", block: "start" });
                    return;
                }

                const page = localHtmlTarget(anchor);
                if (page && !existingPages.has(page)) {
                    event.preventDefault();
                    showAction(`${page.replace(".html", "").replace(/[-_]/g, " ")} is not available in this local prototype yet.`);
                }
            });
        });
    }

    function activateFallbackButtons() {
        document.querySelectorAll("button").forEach((button) => {
            const type = (button.getAttribute("type") || "button").toLowerCase();
            if (button.disabled || type === "submit" || type === "reset" || isBootstrapManaged(button)) return;
            if (
                button.id ||
                button.dataset.depth ||
                button.dataset.depthMode ||
                button.dataset.tab ||
                button.dataset.view ||
                button.dataset.missingSource ||
                button.getAttribute("aria-controls")
            ) return;

            button.addEventListener("click", (event) => {
                if (event.defaultPrevented) return;
                showAction(`${labelFor(button)} is a visual prototype control in this page.`);
            });
        });
    }

    document.addEventListener("DOMContentLoaded", () => {
        activateFallbackLinks();
        activateFallbackButtons();
    });
}());
