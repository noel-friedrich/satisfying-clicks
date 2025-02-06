const clickArea = document.getElementById("clickarea")
const effectChoice = document.getElementById("effect-choice")
const effectSizeInput = document.getElementById("effect-size-input")
const effectSizeOutput = document.getElementById("effect-size-output")
const effectDurationInput = document.getElementById("effect-duration-input")
const effectDurationOutput = document.getElementById("effect-duration-output")
const effectColorInput = document.getElementById("effect-color-input")

const toggleActiveButton = document.getElementById("toggle-active-button")
const resetButton = document.getElementById("reset-button")
const feedbackButton = document.getElementById("feedback-button")

const secretEffectCountOutput = document.getElementById("rare-effect-count-output")
const enableSecretButton = document.getElementById("enable-secret-button")
const disableSecretButton = document.getElementById("disable-secret-button")
const secretFieldset = document.getElementById("secret-fieldset")

const onlyShowWhenTurnedOnContainer = document.getElementById("only-show-when-turned-on")

let lastAreaClickTimestamp = null

// write the content scripts a message to update the settings
async function tellContentScriptToUpdate() {
    const allTabs = await chrome.tabs.query({})
    for (const tab of allTabs) {
        try {
            await chrome.tabs.sendMessage(tab.id, {action: "hi there please update thanks goodbye"})
        } catch {
            // sometimes the tabs won't listen. That's fine...
        }
    }
}

let currentSaveTimeout = null
function save() {
    // make sure to not save too often, as there is a limit to how often the api is accessable
    // https://developer.chrome.com/docs/extensions/reference/api/storage
    // -> see "MAX_WRITE_OPERATIONS_PER_MINUTE" and "MAX_WRITE_OPERATIONS_PER_HOUR"

    if (currentSaveTimeout !== null) {
        clearTimeout(currentSaveTimeout)
    }

    currentSaveTimeout = setTimeout(() => {
        saveSettings()
        tellContentScriptToUpdate()
    }, 300)
}

clickArea.addEventListener("mousedown", event => {
    // get the active effect (if it exists), if not abort
    const activeClickEffect = getClickEffect(activeClickEffectOptions.effectId)
    if (!activeClickEffect) {
        return
    }

    // spawn it!
    let position = { x: event.clientX, y: event.clientY }
    activeClickEffect.spawn(position, activeClickEffectOptions)

    lastAreaClickTimestamp = Date.now()
})

// spawn random clickEffects inside the clickarea
setInterval(() => {
    // if there was a manual click in the last 1.5 seconds, don't
    if (lastAreaClickTimestamp !== null && Date.now() - lastAreaClickTimestamp < 1500) {
        return
    }

    // get the active effect (if it exists), if not abort
    const activeClickEffect = getClickEffect(activeClickEffectOptions.effectId)
    if (!activeClickEffect) {
        return
    }

    // choose a random position in the clickArea (well inside)
    const clickAreaRect = clickArea.getBoundingClientRect()
    const randomPosition = {
        x: clickAreaRect.left + clickAreaRect.width * (0.2 + Math.random() * 0.6),
        y: clickAreaRect.top + clickAreaRect.height * (0.2 + Math.random() * 0.6)
    }

    activeClickEffect.spawn(randomPosition, activeClickEffectOptions)
}, 500)

// initializes effect choice with available effects
function initEffectChoice() {
    // delete previous choice (if existant)
    effectChoice.innerHTML = ""

    const allClickEffects = Object.entries(clickEffectMap)
        .concat([["random", {name: "Random"}], ["none", {name: "None"}]])
    for (const [effectId, effect] of allClickEffects) {
        const option = document.createElement("option")
        option.value = effectId
        option.textContent = effect.name
        effectChoice.appendChild(option)
    }

    effectChoice.addEventListener("change", () => {
        activeClickEffectOptions.effectId = effectChoice.value
        updateInputSettingValues()
        save()
    })
}

// convert css color name to hex
function colorNameToHex(str){
    const canvas = document.createElement("canvas")
    const context2d = canvas.getContext("2d")
    context2d.fillStyle = str
    canvas.remove()
    return context2d.fillStyle
}

// Input Conversion Factors
const SIZE_INPUT_MIN = 5
const SIZE_INPUT_MAX = 100
const DURATION_INPUT_MIN = 100
const DURATION_INPUT_MAX = 800

// utility function to help configure a config slider
function updateSliderInput(slider, minVal, maxVal, currVal) {
    slider.min = minVal
    slider.max = maxVal
    slider.value = currVal

    console.log(slider, currVal)
}

// update secret effect count
function getSecretEffectCountMessage() {
    const count = activeClickEffectOptions.secretEffectCount ?? 0
    if (count == 0) {
        return "0 times (never)"
    } else if (count == 1) {
        return "only once"
    } else if (count == 2) {
        return "twice (ever)"
    } else if (count == 3) {
        return "thrice (3 times)"
    } else if (count == 6) {
        return "half a dozen (6) times"
    } else if (count == 12) {
        return "a dozen (12) times"
    } else if (count > 10000) {
        return `${count} times (I hope nobody will ever read this message)`
    } else if (count > 1000) {
        return `too many times (I lost count). Just kidding, it happened ${count} times`
    } else if (count > 100) {
        return `unbelievably many times (${count})`
    } else if (count > 10) {
        return `so many times (${count}, to be exact)`
    } else {
        return `${count} times`
    }
}

// update the values of the inputs
function updateInputSettingValues() {
    effectColorInput.value = colorNameToHex(activeClickEffectOptions.color)

    updateSliderInput(effectSizeInput, SIZE_INPUT_MIN, SIZE_INPUT_MAX, activeClickEffectOptions.sizePx)
    updateSliderInput(effectDurationInput, DURATION_INPUT_MIN, DURATION_INPUT_MAX, activeClickEffectOptions.lengthMs)

    effectChoice.value = activeClickEffectOptions.effectId
    effectSizeOutput.textContent = Math.round(activeClickEffectOptions.sizePx)
    effectDurationOutput.textContent = Math.round(activeClickEffectOptions.lengthMs)

    // check if any setting has been changed
    let settingsAreNonDefault = false
    for (const [settingKey, defaultValue] of Object.entries(defaultClickEffectOptions)) {
        if (activeClickEffectOptions[settingKey] != defaultValue) {
            settingsAreNonDefault = true
            break
        }
    }

    // change resetButton activity accordingly
    if (settingsAreNonDefault) {
        resetButton.classList.add("active")
    } else {
        resetButton.classList.remove("active")
    }
    
    // update active toggle button
    if (activeClickEffectOptions.effectId === "none") {
        toggleActiveButton.textContent = "Turn on"
        onlyShowWhenTurnedOnContainer.style.display = "none"
    } else {
        toggleActiveButton.textContent = "Turn off"
        onlyShowWhenTurnedOnContainer.style.display = "block"
    }

    // update secret effect count
    const secretCountMessage = getSecretEffectCountMessage()
    secretEffectCountOutput.textContent = secretCountMessage

    // update secret setting display
    if (activeClickEffectOptions.secretEffectActive) {
        secretFieldset.classList.add("secret-enabled")
    } else {
        secretFieldset.classList.remove("secret-enabled")
    }
}

// initialize setting elements
function initEffectSettings() {
    // init color input
    effectColorInput.addEventListener("input", () => {
        activeClickEffectOptions.color = effectColorInput.value
        updateInputSettingValues()
        save()
    })

    // init size input
    effectSizeInput.addEventListener("input", () => {
        activeClickEffectOptions.sizePx = parseInt(effectSizeInput.value)
        updateInputSettingValues()
        save()
    })

    // init duration input
    effectDurationInput.addEventListener("input", () => {
        activeClickEffectOptions.lengthMs = parseInt(effectDurationInput.value) 
        updateInputSettingValues()
        save()
    })
    
    updateInputSettingValues()
}

// make the buttons work
function initButtons() {
    // reset button
    resetButton.addEventListener("click", () => {
        for (const [settingKey, defaultValue] of Object.entries(defaultClickEffectOptions)) {
            activeClickEffectOptions[settingKey] = defaultValue
        }
        updateInputSettingValues()
        save()
    })

    // toggle active button
    toggleActiveButton.addEventListener("click", () => {
        if (activeClickEffectOptions.effectId === "none") {
            activeClickEffectOptions.effectId = defaultClickEffectOptions.effectId
        } else {
            activeClickEffectOptions.effectId = "none"
        }
        effectChoice.value = activeClickEffectOptions.effectId
        updateInputSettingValues()
        save()
    })

    // feedback button
    feedbackButton.addEventListener("click", () => {
        // silly protection against stupid email scrapers
        const feedbackEmail = "ed.kooltuo@hcirdeirf.leon".split("").reverse().join("")
        location.href = `mailto:${feedbackEmail}`
    })

    // secret enable
    enableSecretButton.addEventListener("click", () => {
        activeClickEffectOptions.secretEffectActive = true
        updateInputSettingValues()
        save()
    })
    
    // secret disable
    disableSecretButton.addEventListener("click", () => {
        activeClickEffectOptions.secretEffectActive = false
        updateInputSettingValues()
        save()
    })

    updateInputSettingValues()
}

// make some text segments expandable (...)
function initExpandableSegments() {
    const expandableContainers = document.querySelectorAll(".expandable")
    for (const container of expandableContainers) {
        const header = container.querySelector(".expansion-header")
        const body = container.querySelector(".expansion-body")
        if (!header || !body) continue

        header.addEventListener("click", () => {
            container.classList.add("expanded")
        })
    }
}

async function main() {
    // the following should happen immediately
    initExpandableSegments()

    // now let's wait and load the settings
    await loadSettings()
    
    // the following process the loaded settings
    initEffectChoice()
    initEffectSettings()
    initButtons()
}

main()