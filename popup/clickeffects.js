// ---------------- Click Effects Base ----------------

// a collection of easing functions for ClickEffects to use
class EasingFunction {

    static linear(t) {
        return Math.max(Math.min(t, 1.0), 0.0)
    }

    static easeInOut(t) {
        if ((t /= 1 / 2) < 1) return 1 / 2 * t * t
        return -1 / 2 * ((--t) * (t - 2) - 1)
    }

    static easeIn(t) {
        return t ** 2
    }

    static easeOut(t) {
        return 1 - (t - 1) ** 2
    }

}

// base class of ClickEffect that all custom effects inherit from
class ClickEffect {

    static name = "Base Click Effect"

    // will store custom configuration options for a ClickEffect
    static customConfig = {}

    // Utility Function to create an sclicks--element
    static createEffectElement({
        tagName = "div",
        position = null,
        appendTo = document.body
    }) {
        const element = document.createElement(tagName)
        element.classList.add("sclicks--element")
        
        if (position !== null) {
            element.style.position = "fixed"
            element.style.left = `${position.x}px`
            element.style.top = `${position.y}px`
            element.style.transform = `translate(-50%, -50%)`
        }

        element.style.pointerEvents = "none"
        element.style.zIndex = 999999

        if (appendTo) {
            appendTo.appendChild(element)
        }

        return element
    }

    constructor({
        startTimestamp = Date.now(),
        lengthMs = 300,
        sizePx = 50,
        color = "blue",
        smoothingFunction = EasingFunction.easeInOut
    }={}) {
        this.startTimestamp = startTimestamp
        this.lengthMs = lengthMs
        this.sizePx = sizePx
        this.color = color

        this.smoothingFunction = smoothingFunction
    }

    // computes the endTimestamp of the ClickEffect
    get endTimestamp() {
        return this.startTimestamp + this.lengthMs
    }

    // returns a value ∈ [0, 1] corresponding to the linear progress of the animation
    get tValue() { 
        const currentTimestamp = Date.now()

        if (currentTimestamp <= this.startTimestamp) {
            return 0.0
        } else if (currentTimestamp >= this.endTimestamp) {
            return 1.0
        } else {
            return (currentTimestamp - this.startTimestamp) / this.lengthMs
        }
    }

    // returns the smoothingFunction applied to the tValue
    get smoothTValue() {
        return this.smoothingFunction(this.tValue)
    }

    // returns wether ClickEffect has been completed
    get isCompleted() {
        return Date.now() >= this.endTimestamp
    }

    // method that's called when event is spawned
    // (mostly used to initialize elements for the effect)
    construct(position) {}

    // method that's called for every visual update
    // (most often at ~60fps)
    update() {}

    // method that's called when the ClickEffect is over and
    // it's element's have to get removed again
    destruct() {}

    // used to spawn an effect at a certain point
    static spawn(position, args={}) {
        const clickEffect = new this(args)
        clickEffect.construct(position)

        function updateAnimation() {
            clickEffect.update()

            if (clickEffect.isCompleted) {
                clickEffect.destruct()
            } else {
                window.requestAnimationFrame(updateAnimation)
            }
        }

        window.requestAnimationFrame(updateAnimation)
    }

}

// ---------------- Custom Click Effects ----------------

class ExpandingCircleEffect extends ClickEffect {

    static name = "Expanding Circle"

    setCircleSize(sizePx) {
        this.circleElement.style.width = `${sizePx}px`
        this.circleElement.style.height = `${sizePx}px`
    }

    construct(position) {
        this.circleElement = ClickEffect.createEffectElement({position})

        this.setCircleSize(0)
        this.circleElement.style.borderRadius = "50%"
        this.circleElement.style.border = `2px solid ${this.color}`
    }

    update() {
        this.setCircleSize(this.smoothTValue * this.sizePx)
        this.circleElement.style.opacity = 1 - this.tValue
    }

    destruct() {
        this.circleElement.remove()
    }

}

class ExpandingBallEffect extends ClickEffect {

    static name = "Expanding Ball"

    setCircleSize(sizePx) {
        this.circleElement.style.width = `${sizePx}px`
        this.circleElement.style.height = `${sizePx}px`
    }

    construct(position) {
        this.circleElement = ClickEffect.createEffectElement({position})

        this.setCircleSize(0)
        this.circleElement.style.borderRadius = "50%"
        this.circleElement.style.backgroundColor = this.color
    }

    update() {
        this.setCircleSize(this.smoothTValue * this.sizePx)
        this.circleElement.style.opacity = 1 - this.smoothTValue
    }

    destruct() {
        this.circleElement.remove()
    }

}

class RadialLinesEffect extends ClickEffect {

    static name = "Radial Lines"

    static customConfig = {
        numLines: 6
    }

    setCircleSize(offsetSize, lineLength) {
        for (let i = 0; i < this.numLines; i++) {
            const lineElement = this.lineElements[i]
            const angle = this.lineAngles[i]
            lineElement.style.width = `${lineLength}px`

            const dx = Math.cos(angle / 180 * Math.PI) * offsetSize
            const dy = Math.sin(angle / 180 * Math.PI) * offsetSize

            lineElement.style.left = `${this.origin.x + dx}px`
            lineElement.style.top = `${this.origin.y + dy}px`
        }
    }

    construct(position) {
        this.numLines = RadialLinesEffect.customConfig.numLines
        this.lineElements = []
        this.lineAngles = []
        this.origin = {x: position.x, y: position.y}

        const angleOffset = Math.random() * 360

        for (let i = 0; i < this.numLines; i++) {
            const lineElement = ClickEffect.createEffectElement({position})
            const angle = i / this.numLines * 360 + angleOffset

            lineElement.style.borderTop = `2px solid ${this.color}`
            lineElement.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`

            this.lineElements.push(lineElement)
            this.lineAngles.push(angle)
        }
    }

    update() {
        const lineLength = (this.tValue - this.tValue ** 2) * this.sizePx
        this.setCircleSize(this.smoothTValue * this.sizePx / 2, lineLength)
    }

    destruct() {
        for (const lineElement of this.lineElements) {
            lineElement.remove()
        }
    }
}

class RadialDotsEffect extends ClickEffect {

    static name = "Radial Dots"

    static customConfig = {
        numDots: 8,
        dotSizePx: 5
    }
    
    setCircleSize(sizePx) {
        for (let i = 0; i < this.numDots; i++) {
            const dotElement = this.dotElements[i]
            const angle = this.dotAngles[i]

            const dx = Math.cos(angle) * sizePx
            const dy = Math.sin(angle) * sizePx

            dotElement.style.left = `${this.origin.x + dx}px`
            dotElement.style.top = `${this.origin.y + dy}px`
        }
    }

    construct(position) {
        this.numDots = RadialDotsEffect.customConfig.numDots
        this.dotElements = []
        this.dotAngles = []
        this.origin = {x: position.x, y: position.y}

        const angleOffset = Math.random() * Math.PI * 2
        for (let i = 0; i < this.numDots; i++) {
            const angle = i / this.numDots * Math.PI * 2 + angleOffset
            const element = ClickEffect.createEffectElement({position})
            
            element.style.borderRadius = "50%"
            element.style.width =  `${RadialDotsEffect.customConfig.dotSizePx}px`
            element.style.height = `${RadialDotsEffect.customConfig.dotSizePx}px`
            element.style.backgroundColor = this.color
            
            this.dotElements.push(element)
            this.dotAngles.push(angle)
        }

        this.setCircleSize(0)
    }

    update() {
        this.setCircleSize(this.smoothTValue * this.sizePx / 2)
        for (const dotElement of this.dotElements) {
            dotElement.style.opacity = 1 - this.smoothTValue
        }
    }

    destruct() {
        for (const dotElement of this.dotElements) {
            dotElement.remove()
        }
    }

}

// ---------------- Configuring ClickEffects ----------------

const clickEffectMap = {
    "expanding-circle": ExpandingCircleEffect,
    "expanding-ball": ExpandingBallEffect,
    "radial-lines": RadialLinesEffect,
    "radial-dots": RadialDotsEffect
}

function getClickEffect(effectId) {
    if (effectId === "random") {
        const allEffectIds = Object.keys(clickEffectMap)
        const randomIndex = Math.floor(Math.random() * allEffectIds.length)
        return clickEffectMap[allEffectIds[randomIndex]]
    } else {
        return clickEffectMap[effectId]
    }
}

// store the current ClickEffect state
const activeClickEffectOptions = {
    effectId: "radial-lines",
    lengthMs: 300,
    sizePx: 50,
    color: "blue",
    smoothingFunction: EasingFunction.easeOut
}

// store default settings as freezed object to access later
const defaultClickEffectOptions = {...activeClickEffectOptions}
Object.freeze(defaultClickEffectOptions)


// returns wether a given element is supposed to be focused
// when a click happens (i.e. if the clickEffect should snap to it)
function isClickFocusElement(element) {
    if (!element) return false
    if (element.tagName == "SPAN" && element.parentElement) {
        element = element.parentElement
    }

    return [
        "TEXTAREA", "BUTTON", "INPUT",
        "LABEL", "A", "SELECT"
    ].includes(element.tagName)
}

// load settings from sync storage
async function loadSettings() {
    const options = await chrome.storage.sync.get(Object.keys(defaultClickEffectOptions))
    Object.assign(activeClickEffectOptions, options)
}

// save settings to sync storage
async function saveSettings() {
    await chrome.storage.sync.set(activeClickEffectOptions)
}