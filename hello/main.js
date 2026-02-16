{
    const header = document.querySelector("header")
    const hamburger = document.querySelector(".hamburger-icon")
    const headerDropMenu = document.querySelector(".header-drop-menu")

    hamburger.onclick = () => {
        header.classList.toggle("expanded")
        hamburger.classList.toggle("x")
        headerDropMenu.classList.toggle("visible")
    }

    const getLastUrlBit = href => href.split("/").filter(s => s).slice(-1)[0]
    for (const a of document.querySelectorAll("header .link-island a")) {
        if (getLastUrlBit(a.href) == getLastUrlBit(location.href)) {
            a.classList.add("current")
        }
    }

    addEventListener("scroll", () => {
        // on bouncy browser views (e.g. latest safari),
        // window.scrollY can be negative during the bouncing animation!

        if (window.scrollY <= 0) {
            header.classList.add("at-top")
            headerDropMenu.classList.add("at-top")
        } else {
            header.classList.remove("at-top")
            headerDropMenu.classList.remove("at-top")
        }
    })
}

document.getElementById("change-style-a").onclick = event => {
    const styles = ["light", "dark"]
    const currStyle = localStorage.getItem("style") || "light"
    const nextIndex = (styles.indexOf(currStyle) + 1) % styles.length
    localStorage.setItem("style", styles[nextIndex])
    document.body.dataset.style = localStorage.getItem("style") || "light"

    event.preventDefault()
}

const URL_BASE_PATH = ""
        
{
    // update theme
    if (localStorage.getItem("style") == null) {
        // const prefersDarkMode = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
        localStorage.setItem("style", "light")
    }
    document.body.dataset.style = localStorage.getItem("style")

    // update language
    if (localStorage.getItem("lang") == null) {
        const userDefaultLang = navigator.language || navigator.userLanguage
        if (userDefaultLang.startsWith("de")) {
            localStorage.setItem("lang", "de")
        } else {
            localStorage.setItem("lang", "en")
        }
    }
    document.documentElement.lang = localStorage.getItem("lang")


    // replace CSS "100vh" with actual inner height in px
    // (-1 to prevent inaccuracies in some browsers)
    const updateInnerHeight = () => {
        const height = window.screen?.availHeight || window.innerHeight
        document.body.style.setProperty("--full-height", `${height - 1}px`)
    }
    updateInnerHeight()
    addEventListener("resize", updateInnerHeight)

    // make smooth jump links work
    for (const element of document.querySelectorAll(".smooth-jump")) {
        if (!element.dataset.jumpTo) continue
        const target = document.querySelector(element.dataset.jumpTo)
        if (!target) continue
        element.addEventListener("click", () => {
            target.scrollIntoView({
                behavior: "smooth"
            })
        })
    }

    // enable mobile debugging
    const urlParams = new URLSearchParams(window.location.href)
    if (urlParams.has("show_errors")) {
        function log(msg) {
            const textNode = document.createElement("div")
            textNode.textContent = msg
            document.body.appendChild(textNode)
        }

        log("Activated Alert Debug Mode")
        addEventListener("error", event => {
            log(`[L${event.lineno} C${event.colno}] ${event.message} (${event.filename})`)
        })
    }
}

const faqEntries = document.querySelectorAll(".faq-container > .entry")
for (const entry of faqEntries) {
    for (const question of entry.querySelectorAll(".question")) {
        question.onclick = () => {
            entry.classList.toggle("unfolded")
        }
    }
}