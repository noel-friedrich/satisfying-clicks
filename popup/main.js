const clickArea = document.getElementById("clickarea")
const effectChoice = document.getElementById("effect-choice")
const effectSizeInput = document.getElementById("effect-size-input")
const effectSizeOutput = document.getElementById("effect-size-output")
const effectDurationInput = document.getElementById("effect-duration-input")
const effectDurationOutput = document.getElementById("effect-duration-output")
const effectColorInput = document.getElementById("effect-color-input")

const toggleActiveButton = document.getElementById("toggle-active-button")
const resetButton = document.getElementById("reset-button")
const helpButton = document.getElementById("help-button")

const secretEffectCountOutput = document.getElementById("rare-effect-count-output")
const enableSecretButton = document.getElementById("enable-secret-button")
const disableSecretButton = document.getElementById("disable-secret-button")
const secretFieldset = document.getElementById("secret-fieldset")

const fakeCursorElement = document.getElementById("fake-cursor")

const onlyShowWhenTurnedOnContainer = document.getElementById("only-show-when-turned-on")

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

// fake cursor class to manage fake cursor moving around
class FakeCursor {

    constructor() {
        this.pos = { x: 0.5, y: 0.5 }
        this.goalPos = { x: 0.5, y: 0.5 }
        this.speed = 3
        this.opacity = 1
        
        this.followingRealCursor = false
    }

    get visible() {
        return this.opacity > 0.99
    }

    get globalPos() {
        // get position relative to body
        const clickAreaRect = clickArea.getBoundingClientRect()
        return {
            x: clickAreaRect.left + clickAreaRect.width * this.pos.x,
            y: clickAreaRect.top + clickAreaRect.height * this.pos.y
        }
    }

    getRandomPosition(padding=0.2) {
        // get random position with padding
        return {
            x: padding + Math.random() * (1 - padding * 2),
            y: padding + Math.random() * (1 - padding * 2)
        }
    }

    updateHtml() {
        // update the html fakeCursorElement to match current status
        fakeCursorElement.style.opacity = this.opacity
        fakeCursorElement.style.display = this.visible ? "block" : "none"

        // update pos
        const clickAreaRect = clickArea.getBoundingClientRect()
        fakeCursorElement.style.left = `${clickAreaRect.width * this.pos.x - 1}px`
        fakeCursorElement.style.top = `${clickAreaRect.height * this.pos.y - 1}px`
    }

    spawnEffectAtCurrPos() {
        // get the active effect (if it exists), if not abort
        const activeClickEffect = getClickEffect(activeClickEffectOptions.effectId)
        if (!activeClickEffect) {
            return
        }

        // ClickEffect needs to be spawned relative to popup viewport (globalPos)
        activeClickEffect.spawn(this.globalPos, activeClickEffectOptions)
    }
    
    initListeners() {
        // init event listeners to make cursor take over

        // sometimes, the browser doesn't fire the correct mouseleave.
        // in that case, the mouse won't start moving on its own. So let's
        // pretend that not moving/clicking the mouse for 3 seconds is equivalent.
        let releaseMoveTimeout = null

        // utility to get coord from event normalized
        function getEventPos(event) {
            const clickAreaRect = clickArea.getBoundingClientRect()
            return {
                x: (event.clientX - clickAreaRect.left) / clickAreaRect.width,
                y: (event.clientY - clickAreaRect.top) / clickAreaRect.height
            }
        }

        // on mouseenter, make mouse take over
        clickArea.addEventListener("mouseenter", event => {
            this.goalPos = getEventPos(event)
            this.followingRealCursor = true
            releaseMoveTimeout && clearTimeout(releaseMoveTimeout)
        })

        // on mousemove, move the goal to adjust dynamically
        clickArea.addEventListener("mousemove", event => {
            this.goalPos = getEventPos(event)
            this.followingRealCursor = true
            
            releaseMoveTimeout && clearTimeout(releaseMoveTimeout)
            releaseMoveTimeout = setTimeout(() => {this.followingRealCursor = false}, 3000)
        })

        // on mouseleave, the normal cursor should take over again
        clickArea.addEventListener("mouseleave", event => {
            this.followingRealCursor = false
        })

        // on mouseclick, spawn effect!
        clickArea.addEventListener("mousedown", event => {
            this.spawnEffectAtCurrPos()
            this.goalPos = getEventPos(event)
            this.followingRealCursor = true
            
            releaseMoveTimeout && clearTimeout(releaseMoveTimeout)
            releaseMoveTimeout = setTimeout(() => {this.followingRealCursor = false}, 3000)
        })
    }

    initMovement() {
        // function to be called on every animation tick (~60fps)
        let lastFrameTime = performance.now()
        const update = async () => {
            // compute time delta
            const dt = Math.min(performance.now() - lastFrameTime, 100)
            lastFrameTime = performance.now()

            // compute goal delta to go to
            const goalDelta = {
                x: this.goalPos.x - this.pos.x,
                y: this.goalPos.y - this.pos.y
            }
            const goalDeltaLength = Math.sqrt(goalDelta.x ** 2 + goalDelta.y ** 2)

            // change opacity based on real cursor status
            if (this.followingRealCursor) {
                // this.opacity = Math.max(0, this.opacity - 0.01)
            } else {
                this.opacity = Math.min(1, this.opacity + 0.01)
            }

            // exponentially decrease the distance to goal until we reach it
            if (goalDeltaLength < 0.01) {
                if (!this.followingRealCursor) {
                    this.goalPos = this.getRandomPosition()
    
                    // only spawn effect if currently visible
                    if (this.visible) {
                        this.spawnEffectAtCurrPos()
                    }
                    
                    // wait a bit before moving again
                    await new Promise(resolve => setTimeout(resolve, 100))
                } else {
                    // we're close enough to just move it manually
                    this.pos.x = this.goalPos.x
                    this.pos.y = this.goalPos.y
                }
            } else {
                this.pos.x += goalDelta.x / dt * this.speed
                this.pos.y += goalDelta.y / dt * this.speed
            }

            // update html and do it again in a bit (blit haha)
            this.updateHtml()
            window.requestAnimationFrame(update)
        }

        window.requestAnimationFrame(update)
    }

}

const fakeCursor = new FakeCursor()

// initializes effect choice with available effects
function initEffectChoice() {
    // delete previous choice (if existant)
    effectChoice.innerHTML = ""

    const allClickEffects = Object.entries(clickEffectMap)
        .concat([["random", {name: "Random Effect"}], ["none", {name: "None"}]])
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

// rounding util (to not be used later oopsie)
function roundToNearestMultiple(numberToRound, base) {
    return Math.round(numberToRound / base) * base
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
        activeClickEffectOptions.sizePx = roundToNearestMultiple(parseInt(effectSizeInput.value), 5)
        updateInputSettingValues()
        save()
    })

    // init duration input
    effectDurationInput.addEventListener("input", () => {
        activeClickEffectOptions.lengthMs = roundToNearestMultiple(parseInt(effectDurationInput.value), 5)
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
    helpButton.addEventListener("click", () => {
        const helloUrl = chrome.runtime.getURL("hello/index.html")
        chrome.tabs.create({ url: helloUrl })
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

    fakeCursor.initListeners()
    fakeCursor.initMovement()
}

main()