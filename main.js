'use strict'
const ACCELERATION = 4000 // px/s^2
let DRONE_MAX_SPEED = 300 // px/s
let SCROLL_SPEED = 200
const GATE_INTERVAL = 300

const app = new Vue({
    el: '#app',
    data: {
        totalScroll: 0,
        lastGateSpawned: 0,
        previousTimestamp: 0,
        isStarted: false,
        isLost: false,
        gate: {
            width: 0,
            height: 0
        },
        drone: {
            pos: {
                top: 0,
                left: 0
            },
            speed: {
                vertical: 0,
                horizontal: 0
            },
            acceleration: {
                vertical: 0,
                horizontal: 0
            }
        },
        // type Gate = { top: number, left: number, checked:boolean }
        gates: [],
        score: 0
    },
    created() {
        window.addEventListener("keydown", this.startAccelerate)
        window.addEventListener("keyup", this.stopAccelerate)
        window.addEventListener("keyup", this.restartOnKeyPress)

        window.requestAnimationFrame(this.gameLoop)
    },
    mounted() {
        const { width: gateWidth, height: gateHeight } = this.$refs.gate.getBoundingClientRect()
        this.gate.width = gateWidth;
        this.gate.height = gateHeight;

        this.setDrone()
    },
    beforeDestroy() {
        window.removeEventListener("keydown", this.startAccelerate)
        window.removeEventListener("keyup", this.stopAccelerate)
        window.removeEventListener("keyup", this.restartOnKeyPress)
    },
    methods: {
        templateLogger(...rest) {
            console.log(...rest)
        },
        setDrone() {
            const { offsetHeight: hStage, offsetWidth: wStage } = this.$refs.stage;
            const { offsetHeight: hDrone, offsetWidth: wDrone } = this.$refs.drone;

            this.drone.pos.top = hStage - hDrone - 60
            this.drone.pos.left = (wStage - wDrone) / 2
            this.drone.speed.vertical = 0
            this.drone.speed.horizontal = 0
            this.drone.acceleration.vertical = 0
            this.drone.acceleration.horizontal = 0
        },
        up(stop = false) {
            this.drone.acceleration.vertical = -Number(!stop)
        },
        down(stop = false) {
            this.drone.acceleration.vertical = Number(!stop)
        },
        left(stop = false) {
            this.drone.acceleration.horizontal = -Number(!stop)
        },
        right(stop = false) {
            this.drone.acceleration.horizontal = Number(!stop)
        },
        moveDrone(direction, stop = false) {
            switch (direction) {
                case 'left':
                    return this.left(stop)
                case 'right':
                    return this.right(stop)
                case 'up':
                    return this.up(stop)
                case 'down':
                    return this.down(stop)
            }
        },
        moveDroneWithKeyboard(e, stop = false) {
            switch (e.code) {
                case "ArrowUp":
                    return this.up(stop)
                case "ArrowDown":
                    return this.down(stop)
                case "ArrowRight":
                    return this.right(stop)
                case "ArrowLeft":
                    return this.left(stop)
            }
        },
        startAccelerate(e) {
            return this.moveDroneWithKeyboard(e)
        },
        stopAccelerate(e) {
            return this.moveDroneWithKeyboard(e, true)
        },
        restartOnKeyPress(e) {
            if (e.code === 'Space') {
                this.restart()
            }
        },
        checkin(dronePosLeft, dronePosTop) {
            for (let i = 0; i < this.gates.length; i++) {
                const gate = this.gates[i]
                const droneHorCenter = dronePosLeft + this.$refs.drone.offsetWidth / 2
                const droneVertCenter = dronePosTop + this.$refs.drone.offsetHeight / 2
                if ((droneHorCenter >= gate.left) &&
                    (droneHorCenter <= gate.left + this.gate.width) &&
                    (gate.top <= droneVertCenter) &&
                    (gate.top + this.gate.height >= droneVertCenter) &&
                    (!gate.checked)) {
                    this.score++
                    gate.checked = true
                }
            }
        },
        upLevel() {
            switch (this.score) {
                case 10:
                    SCROLL_SPEED = 250
                    break;
                case 20:
                    SCROLL_SPEED = 300
                    DRONE_MAX_SPEED = 350
                    break;
                case 30:
                    SCROLL_SPEED = 330
                    break;
                case 40:
                    SCROLL_SPEED = 360
                    DRONE_MAX_SPEED = 400
                    break;
                case 50:
                    SCROLL_SPEED = 390
                    break;
            }
        },
        gameLoop(timestamp) {
            const dT = (timestamp - this.previousTimestamp) / 1000

            if (this.isStarted) {
                const drone = this.drone;

                drone.speed.horizontal = this.calculateSpeed(drone.speed.horizontal, drone.acceleration.horizontal, dT);
                drone.speed.vertical = this.calculateSpeed(drone.speed.vertical, drone.acceleration.vertical, dT);

                const dX = dT * drone.speed.horizontal
                const dY = dT * drone.speed.vertical

                const dS = dT * SCROLL_SPEED
                this.totalScroll += dS

                if (this.totalScroll - this.lastGateSpawned > GATE_INTERVAL) {
                    if (this.gates.length < 10) {
                        this.gates.push(this.spawnGate())
                        this.lastGateSpawned = this.totalScroll;
                    }
                }

                if (this.gates.length > 0 && this.gates[0].top > this.$refs.stage.offsetHeight) {

                    const shiftedGates = this.gates.shift()
                    if (!shiftedGates.checked) {
                        this.isStarted = false
                        this.isLost = true
                    }
                }

                this.gates.forEach(element => {
                    element.top += dS
                });

                drone.pos.left = this.clamp(drone.pos.left + dX, 0, this.$refs.stage.offsetWidth - this.$refs.drone.offsetWidth)
                drone.pos.top = this.clamp(drone.pos.top + dY, 0, this.$refs.stage.offsetHeight - this.$refs.drone.offsetHeight)

                this.checkin(drone.pos.left, drone.pos.top)
                this.upLevel()
            }

            this.previousTimestamp = timestamp
            window.requestAnimationFrame(this.gameLoop)
        },
        clamp(param, min, max) {
            if (param < min) return min
            if (param > max) return max
            return param
        },
        spawnGate() {
            const maxX = this.$refs.stage.offsetWidth - this.gate.width;
            return {
                top: -this.gate.height,
                left: Math.random() * maxX,
                checked: false
            }
        },
        calculateSpeed(currentSpeed, accelerationDirection, dT) {
            const accelerationFraction =
                accelerationDirection !== 0
                    ? accelerationDirection
                    : Math.sign(-currentSpeed)

            const newSpeed = currentSpeed + dT * ACCELERATION * accelerationFraction;
            const v = accelerationDirection === 0 && Math.sign(newSpeed) !== Math.sign(currentSpeed) ? 0 : newSpeed

            return this.clamp(v, -DRONE_MAX_SPEED, DRONE_MAX_SPEED)
        },
        restart() {
            this.isStarted = true
            this.isLost = false
            this.score = 0
            this.gates = []
            SCROLL_SPEED = 200
            this.setDrone()
        }
    }
})
